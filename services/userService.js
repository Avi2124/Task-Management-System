import cloudinary from "../config/cloudinary.js";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/AppError.js";
import fs from "fs/promises";

// Update User
export const updateUser = async ({ id, payload, requester, file }) => {
  if (!requester || !requester.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  if (requester.role !== "superadmin" && requester.id !== id) {
    throw new AppError("You are not allowed to update this user", 403, "FORBIDDEN");
  }

  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const { name, password } = payload;
  if (name) user.name = name;
  if (password) user.password = password;

  if (file) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "task-management/profile-images",
      resource_type: "image",
    });

    user.profileImage = result.secure_url;

    await fs.unlink(file.path).catch(() => {});
  }

  if (!file && payload.profileImage) {
    user.profileImage = payload.profileImage;
  }

  await user.save();

  return {
    user: {
      id: user._id,
      name: user.name,
      profileImage: user.profileImage,
    },
  };
};

// Delete User
export const deleteUser = async ({ id, requester }) => {
  if (!requester || !["superadmin", "admin"].includes(requester.role)) {
    throw new AppError("Only admin or superadmin can delete users", 403, "FORBIDDEN");
  }

  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  await User.findByIdAndDelete(id);
};

// Get User By Id
export const getUserById = async ({ id, requester }) => {
  if (!requester || !requester.id) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  const requesterRole = requester.role;
  const requesterId = requester.id;

  if (requesterRole === "user" && requesterId !== id) {
    throw new AppError("You are not allowed to view this user", 403, "FORBIDDEN");
  }

  let filter = { _id: id };

  if (requesterRole === "admin") {
    const adminUser = await User.findById(requesterId);
    if (!adminUser || !adminUser.companyId) {
      throw new AppError("Admin does not have a comapny assigned", 400, "ADMIN_NO_COMPANY");
    }
    filter = { _id: id, companyId: adminUser.companyId };
  }

  const user = await User.findOne(filter).select("-password -otpCode -otpExpiresAt -__v");
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

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

// Get All Users
export const getAllUsers = async ({ query, requester }) => {
  if (!requester || !requester.id) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  if (requester.role === "user") throw new AppError("You are not allowed to view all users", 403, "FORBIDDEN");

  const requesterRole = requester.role;
  const requesterId = requester.id;

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "createdAt",
    sortOrder = "desc",
    ...filters
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const match = {};

  if (requesterRole === "admin") {
    const adminUser = await User.findById(requesterId);
    if (!adminUser || !adminUser.companyId) {
      throw new AppError("Admin does not have a company assigned", 400, "ADMIN_NO_COMPANY");
    }
    match.companyId = adminUser.companyId;
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    const values = String(value)
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "");

    if (!values.length) return;

    match[key] = values.length === 1 ? values[0] : { $in: values };
  });

  const pipeline = [{ $match: match }];

  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: ["name", "email"].map((field) => ({ [field]: { $regex: regex } })),
      },
    });
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortKey]: sortDir, _id: -1 } });

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

  const safeUsers = data.map((u) => {
    const { password, otpCode, otpExpiresAt, refreshToken, __v, ...rest } = u;
    return rest;
  });

  return {
    users: safeUsers,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};