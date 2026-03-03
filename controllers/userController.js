import { User } from "../models/userModel.js";
import Company from "../models/companyModel.js";
import bcrypt from "bcrypt";
import { sendResponse } from "../utils/sendResponse.js";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { sendOtpEmail } from "../config/mailer.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const OTP_EXP_MINUTES = 5;

// ---------- SIGNUP ----------
export const signup = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, companyId } = req.body;
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

  const user = await User.create({
    name,
    email,
    password,
    role,
    company: companyObjectId,
    companyId: finalCompanyId,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "User Created Successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        companyId: user.companyId,
        profileImage: user.profileImage,
      },
    },
  });
});

// ---------- LOGIN ----------
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid email", 401, "INVALID_CREDENTIALS");
  }

  const isCorrect = await user.isPasswordCorrect(password);
  if (!isCorrect) {
    throw new AppError("Invalid password", 401, "INVALID_CREDENTIALS");
  }
  // if(user.role !== "superadmin"){
  //     if(!companyId || user.companyId !== companyId){
  //         return sendResponse(res, {
  //             status: false,
  //             statusCode: 400,
  //             message: "Invalid companyId",
  //             data: null,
  //             error: {code: "INVALID_COMPANY_ID"}
  //         });
  //     }
  // }
  // OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  user.otpCode = hashedOtp;
  user.otpExpiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);
  await user.save();
  await sendOtpEmail({ to: user.email, otp });
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "OTP sent to email",
    data: { email: user.email },
    error: null,
  });
});

// ---------- VERIFY OTP ----------
export const verifyOtpAndIssueTokens = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 400, "USER_NOT_FOUND");
  }

  if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError("OTP expired or not found. Please login again.", 400, "OTP_EXPIRED");
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
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "OTP verified. Login successful",
    data: {
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
    },
  });
});

// ---------- Refresh Access Token ----------
export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400, "REFRESH_TOKEN_REQUIRED");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
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

  return sendResponse(res, {
    message: "Token refreshed",
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

// ---------- LOGOUT ----------
export const logout = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw new AppError("Refresh token is required to logout", 400, "NO_REFRESH_TOKEN");
    }

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
        );
        const user = await User.findById(decoded._id);
        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      } catch {
        throw new AppError("Invalid or expired refresh token during logout", 400, "INVALID_REFRESH_TOKEN");
        };

    return sendResponse(res, {
      message: "Logged out",
    });
  }
});
