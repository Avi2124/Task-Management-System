import bcrypt from "bcrypt";
// import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import stripe from "../config/stripe.js";
import { User } from "../models/userModel.js";
import { Plan } from "../models/planModel.js";
import { AppError } from "../utils/AppError.js";
import Company from "../models/companyModel.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { sendOtpEmail, sendResetPasswordEmail } from "../config/mailer.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";
import { notifyUserCreated } from "./notificationService.js";

const OTP_EXP_MINUTES = Number(process.env.OTP_EXP_MINUTES || 5);

const uploadProfileImage = async (file) => {
  if (!file) return null;

  const result = await cloudinary.uploader.upload(file.path, {
    folder: "task-management/profile-images",
    resource_type: "image",
  });

  await fs.unlink(file.path).catch(() => {});
  return result.secure_url;
};

const getCompanyForLogin = async (companyId) => {
  const company = await Company.findById(companyId).populate("plan");

  if (!company) {
    throw new AppError("Company not found", 400, "COMPANY_NOT_FOUND");
  }

  const now = new Date();

  if (
    company.status === "active" &&
    company.planExpiresAt &&
    company.planExpiresAt < now
  ) {
    company.status = "expired";
    await company.save();
  }
  return company;
};

const ensureActiveCompanyAndPlan = async (companyId) => {
  const company = await Company.findById(companyId).populate("plan");

  if (company.status !== "active") {
    throw new AppError(
      company.status === "expired"
        ? "Company subscription expired"
        : "Company subscription not active",
      403,
      company.status === "expired" ? "PLAN_EXPIRED" : "COMPANY_NOT_ACTIVE",
    );
  }

  if (!company.plan || !company.plan.isActive) {
    throw new AppError("Plan not found", 400, "PLAN_NOT_FOUND");
  }

  return company;
};

// SUPERADMIN SELF SIGNUP
export const createSuperadmin = async (payload = {}, file) => {
  const { name, email, password } = payload;

  //   const existing = await User.findOne({ email });
  //   if (existing) {
  //     throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  //   }

  const existingSuperadmin = await User.findOne({ role: "superadmin" });
  if (existingSuperadmin) {
    throw new AppError("Superadmin already exists. ");
  }

  const profileImageUrl = await uploadProfileImage(file);

  const superadmin = await User.create({
    name,
    email,
    password,
    role: "superadmin",
    status: "active",
    ...(profileImageUrl && { profileImage: profileImageUrl }),
  });

  return {
    superadmin: {
      id: superadmin._id,
      name: superadmin.name,
      email: superadmin.email,
      role: superadmin.role,
      status: superadmin.status,
      profileImage: superadmin.profileImage,
    },
  };
};

// ADMIN CREATES USER
export const createUser = async (payload = {}, file, requester) => {
  if (!requester?.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const adminUser = await User.findById(requester.id);
  if (!adminUser || adminUser.role !== "admin") {
    throw new AppError("Only admin can create users", 403, "FORBIDDEN");
  }

  if (!adminUser.company || !adminUser.companyId) {
    throw new AppError(
      "Admin does not have a company assigned",
      400,
      "ADMIN_NO_COMPANY",
    );
  }

  const company = await ensureActiveCompanyAndPlan(adminUser.company);
  const { name, email, password } = payload;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }

  const currentUsers = await User.countDocuments({
    company: adminUser.company,
    role: "user",
  });

  if (company.plan.userLimit !== -1 && currentUsers >= company.plan.userLimit) {
    throw new AppError("User limit reached", 400, "USER_LIMIT_REACHED");
  }

  const profileImageUrl = await uploadProfileImage(file);

  const user = await User.create({
    name,
    email,
    password,
    role: "user",
    company: adminUser.company,
    companyId: adminUser.companyId,
    status: "active",
    ...(profileImageUrl && { profileImage: profileImageUrl }),
  });

  try {
    await notifyUserCreated({
      user,
      companyName: company.name,
      rawPassword: password,
    });
  } catch (error) {
    console.error("User creation notification failed:", error.message);
  }

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

// ADMIN SELF SIGNUP WITH COMPANY + PAYMENT
export const registerAdmin = async (payload = {}, file) => {
  const { company, admin, planId } = payload;

  if (!company || !admin) {
    throw new AppError(
      "Company and Admin details are required",
      400,
      "INVALID_PAYLOAD",
    );
  }

  const selectedPlan = await Plan.findById(planId);
  if (!selectedPlan || !selectedPlan.isActive) {
    throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
  }

  const existingUser = await User.findOne({ email: admin.email });
  if (existingUser) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }

  const existingCompany = await Company.findOne({
    companyId: company.companyId,
  });
  if (existingCompany) {
    throw new AppError("companyId already exists", 409, "COMPANY_ID_EXISTS");
  }

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

  const profileImageUrl = await uploadProfileImage(file);

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
            unit_amount: Math.round(Number(selectedPlan.price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        companyId: newCompany._id.toString(),
        adminId: newAdmin._id.toString(),
        planId: selectedPlan._id.toString(),
      },
      success_url:
        process.env.STRIPE_SUCCESS_URL ||
        "http://localhost:1312/payment-success",
      cancel_url:
        process.env.STRIPE_CANCEL_URL || "http://localhost:1312/payment-failed",
    });

    newCompany.stripe = {
      checkout_session_id: session.id,
      checkout_url: session.url,
      payment_intent_id: session.payment_intent || null,
      status: session.payment_status || "created",
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
    await User.findByIdAndDelete(newAdmin._id).catch(() => {});
    await Company.findByIdAndDelete(newCompany._id).catch(() => {});

    throw new AppError(
      error.message || "Failed to create Stripe checkout session",
      500,
      "STRIPE_SESSION_CREATE_FAILED",
    );
  }
};

// LOGIN
export const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid email", 401, "INVALID_CREDENTIALS");
  }

  const isCorrect = await user.isPasswordCorrect(password);
  if (!isCorrect) {
    throw new AppError("Invalid password", 401, "INVALID_CREDENTIALS");
  }

  let company = null;

  if (user.role !== "superadmin") {
    company = await getCompanyForLogin(user.company);

    if (user.role === "user") {
      if (user.status && user.status !== "active") {
        throw new AppError(
          "User is not active. Please contact admin.",
          403,
          "USER_INACTIVE",
        );
      }

      if (company.status !== "active") {
        throw new AppError(
          company.status === "expired"
            ? "Company subscription expired. Please contact admin."
            : "Company subscription not active",
          403,
          company.status === "expired" ? "PLAN_EXPIRED" : "COMPANY_NOT_ACTIVE",
        );
      }
      if (!company.plan || !company.plan.isActive) {
        throw new AppError("Plan not found", 400, "PLAN_NOT_FOUND");
      }
    }
    if (user.role === "admin") {
      if (
        !["active", "expired", "pending_payment", "payment_failed"].includes(
          company.status,
        )
      ) {
        throw new AppError(
          "Company subscription status is invalid",
          403,
          "COMPANY_NOT_ACTIVE",
        );
      }
    }
  } else {
    if (user.status && user.status !== "active") {
      throw new AppError(
        "User is not active. Complete payment.",
        403,
        "USER_INACTIVE",
      );
    }
  }

  // if (user.role !== "superadmin") {
  //   await ensureActiveCompanyAndPlan(user.company);
  // }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.otpCode = hashedOtp;
  user.otpExpiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);
  await user.save();

  await sendOtpEmail({ to: user.email, otp });

  return {
    email: user.email,
    role: user.role,
    companyStatus: company?.status || null,
    renewRequired: user.role === "admin" && company?.status !== "active",
  };
};

export const verifyOtpAndIssueTokens = async ({ email, otp }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 400, "USER_NOT_FOUND");
  }

  if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError(
      "OTP expired or not found. Please login again.",
      400,
      "OTP_EXPIRED",
    );
  }

  const isMatch = await bcrypt.compare(otp, user.otpCode);
  if (!isMatch) {
    throw new AppError("Invalid OTP", 400, "OTP_INCORRECT");
  }
  let company = null;

  if(user.role !== "superadmin"){
    company = await getCompanyForLogin(user.company);
    if(user.role === "user"){
      if(company.status !== "active"){
        throw new AppError(
          company.status === "expired"
          ? "Company subscription exppired. Please contact admin."
          : "Company subscription not active",
          403,
          company.status === "expired"
          ? "PLAN_EXPIRED"
          : "COMPANY_NOT_ACTIVE"
        );
      }

      if(!company.plan || !company.plan.isActive) {
        throw new AppError("Plan not found", 400, "PLAN_NOT_FOUND");
      }
    }
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
      companyStatus: company?.status || null,
      renewRequired: user.role === "admin" && company?.status !== "active",
      accessToken,
      refreshToken,
    },
  };
};

export const refreshAccessToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new AppError(
      "Refresh token is required",
      400,
      "REFRESH_TOKEN_REQUIRED",
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError("Refresh token not valid", 401, "INVALID_REFRESH_TOKEN");
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
      "NO_REFRESH_TOKEN",
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError(
      "Invalid or expired refresh token during logout",
      400,
      "INVALID_REFRESH_TOKEN",
    );
  }

  const user = await User.findById(decoded._id);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
};

// Reset Password and Forgot Password

export const forgotPassword = async ({email}) => {
  const user = await User.findOne({email});
  if(!user){
    return{message: "If an account with that email exists, a reset token has sent."};
  }
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save({vallidateBeforeSave: false});
  await sendResetPasswordEmail({
    to: user.email,
    name: user.name,
    token: rawToken
  });
  return{
    message: "If an account with that email exists, a reset token has been sent."
  };
};

export const resetPassword = async ({token, newPassword}) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiresAt: {$gt: new Date()}
  });

  if(!user){
    throw new AppError("Invalid or expired reset token", 400);
  }

  const salt = await bcrypt.genSalt(10);
  user.password = newPassword;
  // user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordToken = null;
  user.resetPasswordExpiresAt = null;
  user.refreshToken = null;

  await user.save();
  return{
    message: "Password reset successful. Please login again."
  };
};