import { User } from "../models/userModel.js";
import Company from "../models/companyModel.js";
import bcrypt from "bcrypt";
import { sendResponse } from "../utils/sendResponse.js";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { sendOtpEmail } from "../config/mailer.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const OTP_EXP_MINUTES = Number(process.env.OTP_EXP_MINUTES || 5);

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
    throw new AppError(
      "Refresh token is required",
      400,
      "REFRESH_TOKEN_REQUIRED",
    );
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
    status: true,
    statusCode: 200,
    message: "Token refreshed",
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
    error: null,
  });
});

// ---------- UPADTE USER PROFILE ----------
export const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, password, profileImage } = req.body;

  if (!req.user || !req.user.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  if (req.user.role !== "superadmin") {
    if (req.user.id !== id) {
      throw new AppError(
        "You are not allowed to update this user",
        403,
        "FORBIDDEN"
      );
    }
  }

  const user = await User.findById(id);
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (name) user.name = name;
  if (profileImage) user.profileImage = profileImage;
  if (password) user.password = password;

  await user.save();

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "User Updated Successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        profileImage: user.profileImage,
      },
    },
    error: null,
  });
});

// ---------- DELETE USER ----------
export const deleteUser = asyncHandler(async(req, res, next) => {
    const {id} = req.params;
    if(!req.user || !["superadmin", "admin"].includes(req.user.role)){
        throw new AppError("Only admin or superadmin can delete users", 403, "FORBIDDEN");
    }
    const user = await User.findById(id);
    if(!user){
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    await User.findByIdAndDelete(id);
    return sendResponse(res, {
        status: true,
        statusCode: 200,
        message: "User deleted successfully",
        data: null,
        error: null
    });
});

// --------- GET USER BY ID ---------
export const getUserById = asyncHandler(async(req, res, next) => {
    const {id} = req.params;
    if(!req.user || !req.user.id){
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const requesterRole = req.user.role;
    const requesterId = req.user.id;

    if(requesterRole === "user"){
        if(requesterId !== id){
            throw new AppError("You are not allowed to view this user", 403, "FORBIDDEN");
        }
    }

    let filter = {_id: id};
    if(requesterRole === "admin"){
        const adminUser = await User.findById(requesterId);
        if(!adminUser || !adminUser.companyId){
            throw new AppError("Admin does not have a comapny assigned", 400, "ADMIN_NO_COMPANY");
        }
        filter = {_id: id, companyId: adminUser.companyId};
    }
    const user = await User.findOne(filter).select("-password -otpCode -otpExpiresAt -__v");
    if(!user){
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    return sendResponse(res, {
        status: true,
        statusCode: 200,
        message: "User fetched successfully",
        data: {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company,
                companyId: user.companyId,
                profileImage: user.profileImage
            },
        },
        error: null
    });
});

// -------- LIST USERS ALL USERS --------
export const getAllUsers = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const requesterRole = req.user.role;
  const requesterId = req.user.id;

  if (requesterRole === "user") {
    throw new AppError(
      "You are not allowed to view all users",
      403,
      "FORBIDDEN"
    );
  }

  let {
    page = 1,
    limit = 2,
    search = "",
    sortKey = "createdAt",
    sortOrder = "desc",
    ...filters
  } = req.query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  // --- RBAC BASE MATCH ---
  const match = {};
  if (requesterRole === "admin") {
    const adminUser = await User.findById(requesterId);
    if (!adminUser || !adminUser.companyId) {
      throw new AppError(
        "Admin does not have a company assigned",
        400,
        "ADMIN_NO_COMPANY"
      );
    }
    match.companyId = adminUser.companyId;
  }

  // --- EXTRA FILTERS FROM QUERY ---
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    const values = String(value)
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "");

    if (!values.length) return;

    if (values.length === 1) {
      match[key] = values[0];
    } else {
      match[key] = { $in: values };
    }
  });

  const pipeline = [];
  pipeline.push({ $match: match });

  // --- SEARCH ---
  const searchFields = ["name", "email"];
  if (search && searchFields.length) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: searchFields.map((field) => ({
          [field]: { $regex: regex },
        })),
      },
    });
  }

  // --- SORT ---
  const sortDir = sortOrder === "asc" ? 1 : -1;
  if (!sortKey) sortKey = "createdAt";

  pipeline.push({
    $sort: { [sortKey]: sortDir, _id: -1 },
  });

  // --- PAGINATION / FACET ---
  const skip = (page - 1) * limit;
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      total: [{ $count: "count" }],
    },
  });

  const result = await User.aggregate(pipeline);
  const data = result[0]?.data || [];
  const total = result[0]?.total?.[0]?.count || 0;

  const safeUsers = data.map((user) => {
    const { password, otpCode, otpExpiresAt, refreshToken, __v, ...rest } =
      user;
    return rest;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Users fetched successfully",
    data: {
      users: safeUsers,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    },
    error: null,
  });
});

// ---------- LOGOUT ----------
export const logout = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError(
      "Refresh token is required to logout",
      400,
      "NO_REFRESH_TOKEN",
    );
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
      throw new AppError(
        "Invalid or expired refresh token during logout",
        400,
        "INVALID_REFRESH_TOKEN",
      );
    }

    return sendResponse(res, {
      status: true,
      statusCode: 200,
      message: "Logged out",
      data: null,
      error: null,
    });
  }
});
