import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
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

  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email already registered", 409, "EMAIL_EXISTS");

  let companyObjectId = null;
  let finalCompanyId = null;

  if (role !== "superadmin") {
    const company = await Company.findOne({ companyId });
    if (!company) throw new AppError("Company not found", 400, "COMPANY_NOT_FOUND");
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

// Login
export const login = async ({email, password}) => {
    const user = await User.findOne({email});
    if(!user){
        throw new AppError("Invalid email", 401, "INVALID_CREDENTIALS");
    }
    const isCorrect = await user.isPasswordCorrect(password);
    if(!isCorrect){
        throw new AppError("Invalid password", 401, "INVALID_CREDENTIALS");
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.otpCode = hashedOtp;
    user.otpExpiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);
    await user.save();
    await sendOtpEmail({to: user.email, otp});
    return { email: user.email };
};

// Verify OTP and Issue Tokens
export const verifyOtpAndIssueTokens = async ({email, otp}) => {
    const user = await User.findOne({email});
    if(!user){
        throw new AppError("User not found", 400, "USER_NOT_FOUND");
    }
    if(!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()){
        throw new AppError("OTP expired or not found. Please login again.", 400, "OTP_EXPIRED");
    }
    const isMatch = await bcrypt.compare(otp, user.otpCode);
    if(!isMatch){
        throw new AppError("Invalid OTP", 400, "OTP_INCORRECT");
    }

    user.otpCode = null;
    user.otpExpiresAt = null;

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();
    return{
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
    throw new AppError("Refresh token is required", 400, "REFRESH_TOKEN_REQUIRED");
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

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logout = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new AppError("Refresh token is required to logout", 400, "NO_REFRESH_TOKEN");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError("Invalid or expired refresh token during logout", 400, "INVALID_REFRESH_TOKEN");
  }

  const user = await User.findById(decoded._id);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
};