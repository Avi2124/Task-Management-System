import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import stripe from "../config/stripe.js";
import { User } from "../models/userModel.js";
import { Plan } from "../models/planModel.js";
import { AppError } from "../utils/AppError.js";
import Company from "../models/companyModel.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { sendOtpEmail } from "../config/mailer.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";

const OTP_EXP_MINUTES = Number(process.env.OTP_EXP_MINUTES || 5);

// Signup
export const signup = async (payload = {}, file) => {
  const { name, email, password, role, companyId } = payload;

  if (role === "admin") {
    throw new AppError(
      "Use /api/auth/register-admin to create company admin",
      400,
      "USE_REGISTER_ADMIN"
    );
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }

  let companyObjectId = null;
  let finalCompanyId = null;

  if (role !== "superadmin") {
    const company = await Company.findOne({ companyId });
    if (!company) {
      throw new AppError("Company not found", 400, "COMPANY_NOT_FOUND");
    }

    companyObjectId = company._id;
    finalCompanyId = company.companyId;
  }

  let profileImageUrl;
  if (file) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "task-management/profile-images",
      resource_type: "image",
    });
    profileImageUrl = result.secure_url;
    await fs.unlink(file.path).catch(() => {});
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    company: companyObjectId,
    companyId: finalCompanyId,
    ...(profileImageUrl && { profileImage: profileImageUrl }),
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      companyId: user.companyId,
      profileImage: user.profileImage,
    },
  };
};

export const registerAdmin = async (payload = {}, file) => {
  const { company, admin, planId } = payload;

  if (!company || !admin) {
    throw new AppError(
      "Company and Admin details are required",
      400,
      "INVALID_PAYLOAD"
    );
  }

  if (!planId) {
    throw new AppError("Plan is required", 400, "PLAN_REQUIRED");
  }

  // check admin email unique
  const existingUser = await User.findOne({ email: admin.email });
  if (existingUser) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }

  // check companyId unique
  const existingCompany = await Company.findOne({ companyId: company.companyId });
  if (existingCompany) {
    throw new AppError("companyId already exists", 409, "COMPANY_ID_EXISTS");
  }

  // validate selected plan
  const selectedPlan = await Plan.findById(planId);
  if (!selectedPlan || !selectedPlan.isActive) {
    throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
  }

  // create company as pending
  const newCompany = await Company.create({
    name: company.name,
    description: company.description,
    address: company.address,
    website: company.website,
    companyId: company.companyId,
    status: "pending_payment",
    plan: selectedPlan._id,
    planStartAt: null,
    planExpiresAt: null,
  });

  // upload image (optional)
  let profileImageUrl;
  if (file) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "task-management/profile-images",
      resource_type: "image",
    });
    profileImageUrl = result.secure_url;
    await fs.unlink(file.path).catch(() => {});
  }

  // create admin as inactive until payment
  const newAdmin = await User.create({
    name: admin.name,
    email: admin.email,
    password: admin.password,
    role: "admin",
    company: newCompany._id,
    companyId: newCompany.companyId,
    status: "inactive",
    ...(profileImageUrl && { profileImage: profileImageUrl }),
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: selectedPlan.name,
              description: `Subscription for ${newCompany.name}`,
            },
            unit_amount: Number(selectedPlan.price) * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        companyId: newCompany._id.toString(),
        adminId: newAdmin._id.toString(),
        planId: selectedPlan._id.toString(),
      },

      // backend-only project: keep placeholder URLs
      // user can still pay using session.url
      success_url: process.env.STRIPE_SUCCESS_URL || "https://example.com/success",
      cancel_url: process.env.STRIPE_CANCEL_URL || "https://example.com/cancel",
    });

    // save stripe session details in company
    newCompany.stripe = {
      checkout_session_id: session.id,
      checkout_url: session.url,
      payment_intent_id: null,
      status: "created",
    };

    await newCompany.save();

    return {
      company: {
        id: newCompany._id,
        name: newCompany.name,
        companyId: newCompany.companyId,
        status: newCompany.status,
        plan: newCompany.plan,
      },
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        status: newAdmin.status,
        profileImage: newAdmin.profileImage,
      },
      payment: {
        checkoutSessionId: session.id,
        checkout_url: session.url,
      },
    };
  } catch (error) {
    // rollback if stripe session creation fails
    await User.findByIdAndDelete(newAdmin._id).catch(() => {});
    await Company.findByIdAndDelete(newCompany._id).catch(() => {});

    throw new AppError(
      error.message || "Failed to create Stripe checkout session",
      500,
      "STRIPE_SESSION_CREATE_FAILED"
    );
  }
};

// Login
export const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid email", 401, "INVALID_CREDENTIALS");
  }

  const isCorrect = await user.isPasswordCorrect(password);
  if (!isCorrect) {
    throw new AppError("Invalid password", 401, "INVALID_CREDENTIALS");
  }

  if (user.status && user.status !== "active") {
    throw new AppError(
      "User is not active. Complete payment.",
      403,
      "USER_INACTIVE"
    );
  }

  if (user.role !== "superadmin") {
    const company = await Company.findById(user.company);
    if (!company) {
      throw new AppError("Company not found", 400, "COMPANY_NOT_FOUND");
    }

    if (company.status !== "active") {
      throw new AppError(
        "Company subscription not active",
        403,
        "COMPANY_NOT_ACTIVE"
      );
    }

    if (company.planExpiresAt && company.planExpiresAt < new Date()) {
      throw new AppError("Plan expired", 403, "PLAN_EXPIRED");
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.otpCode = hashedOtp;
  user.otpExpiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);
  await user.save();

  await sendOtpEmail({ to: user.email, otp });

  return { email: user.email };
};

// Verify OTP and Issue Tokens
export const verifyOtpAndIssueTokens = async ({ email, otp }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 400, "USER_NOT_FOUND");
  }

  if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError(
      "OTP expired or not found. Please login again.",
      400,
      "OTP_EXPIRED"
    );
  }

  const isMatch = await bcrypt.compare(otp, user.otpCode);
  if (!isMatch) {
    throw new AppError("Invalid OTP", 400, "OTP_INCORRECT");
  }

  user.otpCode = null;
  user.otpExpiresAt = null;

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      companyId: user.companyId,
      profileImage: user.profileImage,
      accessToken,
      refreshToken,
    },
  };
};

// RefreshAccessToken
export const refreshAccessToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new AppError(
      "Refresh token is required",
      400,
      "REFRESH_TOKEN_REQUIRED"
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError(
      "Invalid refresh token",
      401,
      "INVALID_REFRESH_TOKEN"
    );
  }

  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError(
      "Refresh token not valid",
      401,
      "INVALID_REFRESH_TOKEN"
    );
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logout = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new AppError(
      "Refresh token is required to logout",
      400,
      "NO_REFRESH_TOKEN"
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError(
      "Invalid or expired refresh token during logout",
      400,
      "INVALID_REFRESH_TOKEN"
    );
  }

  const user = await User.findById(decoded._id);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
};