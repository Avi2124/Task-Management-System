import cloudinary from "../config/cloudinary.js";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/AppError.js";
import fs from "fs/promises";
import Company from "../models/companyModel.js";
import { Project } from "../models/projectModel.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  company: user.company,
  companyId: user.companyId,
  project: user.project,
  status: user.status,
  profileImage: user.profileImage,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const uploadProfileImage = async (file) => {
  if (!file) return null;

  const result = await cloudinary.uploader.upload(file.path, {
    folder: "task-management/profile-images",
    resource_type: "image",
  });

  await fs.unlink(file.path).catch(() => {});
  return result.secure_url;
};

const ensureActiveCompanyForAdmin = async (companyId) => {
  const company = await Company.findById(companyId).populate("plan");
  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
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

  return company;
};

// ==============================
// ADMIN CRUD BY SUPERADMIN
// ==============================

export const getAdminById = async ({ id, requester }) => {
  if (!requester?.id || requester.role !== "superadmin") {
    throw new AppError("Only superadmin can view admin", 403, "FORBIDDEN");
  }

  const admin = await User.findOne({
    _id: id,
    role: "admin",
  }).select("-password -otpCode -otpExpiresAt -refreshToken -__v");

  if (!admin) {
    throw new AppError("Admin not found", 404, "ADMIN_NOT_FOUND");
  }

  return { admin: sanitizeUser(admin) };
};

export const getAllAdmins = async ({ query, requester }) => {
  if (!requester?.id || requester.role !== "superadmin") {
    throw new AppError("Only superadmin can view admins", 403, "FORBIDDEN");
  }

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "createdAt",
    sortOrder = "desc",
    companyId = "",
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const match = { role: "admin" };
  if (companyId) match.companyId = companyId;

  const pipeline = [{ $match: match }];

  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }],
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

  const safeAdmins = data.map((u) => {
    const { password, otpCode, otpExpiresAt, refreshToken, __v, ...rest } = u;
    return rest;
  });

  return {
    admins: safeAdmins,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

export const updateAdmin = async ({ id, payload, requester, file }) => {
  if (!requester?.id || requester.role !== "superadmin") {
    throw new AppError("Only superadmin can update admin", 403, "FORBIDDEN");
  }

  const admin = await User.findOne({ _id: id, role: "admin" });
  if (!admin) {
    throw new AppError("Admin not found", 404, "ADMIN_NOT_FOUND");
  }

  const { name, password, status } = payload;

  if (name) admin.name = name;
  if (password) admin.password = password;
  if (status) admin.status = status;

  const profileImageUrl = await uploadProfileImage(file);
  if (profileImageUrl) admin.profileImage = profileImageUrl;
  if (!file && payload.profileImage) admin.profileImage = payload.profileImage;

  await admin.save();

  return { admin: sanitizeUser(admin) };
};

export const deleteAdmin = async ({ id, requester }) => {
  if (!requester?.id || requester.role !== "superadmin") {
    throw new AppError("Only superadmin can delete admin", 403, "FORBIDDEN");
  }

  const admin = await User.findOne({ _id: id, role: "admin" });
  if (!admin) {
    throw new AppError("Admin not found", 404, "ADMIN_NOT_FOUND");
  }

  await User.findByIdAndDelete(id);

  return { message: "Admin deleted successfully" };
};

// ==============================
// USER VIEW / UPDATE / DELETE
// ==============================

export const updateUser = async ({ id, payload, requester, file }) => {
  if (!requester?.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) {
    throw new AppError("Requester not found", 401, "REQUESTER_NOT_FOUND");
  }

  const user = await User.findOne({ _id: id, role: "user" });
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (requesterUser.role === "superadmin") {
    throw new AppError("Superadmin cannot update normal users", 403, "FORBIDDEN");
  }

  if (requesterUser.role === "admin") {
    await ensureActiveCompanyForAdmin(requesterUser.company);

    if (requesterUser.companyId !== user.companyId) {
      throw new AppError(
        "Admin can update only users of own company",
        403,
        "FORBIDDEN"
      );
    }
  }

  if (requesterUser.role === "user") {
    if (requesterUser._id.toString() !== user._id.toString()) {
      throw new AppError("You are not allowed to update this user", 403, "FORBIDDEN");
    }
  }

  const { name, password, project } = payload;

  if (name) user.name = name;
  if (password) user.password = password;

  if (requesterUser.role === "admin" && payload.hasOwnProperty("project")) {
    if (!project) {
      user.project = null;
    } else {
      const projectDoc = await Project.findOne({
        _id: project,
        company: requesterUser.company,
        isDeleted: false,
        isActive: true,
      });

      if (!projectDoc) {
        throw new AppError(
          "Project not found for this company",
          400,
          "PROJECT_NOT_FOUND"
        );
      }

      user.project = projectDoc._id;
    }
  }

  const profileImageUrl = await uploadProfileImage(file);
  if (profileImageUrl) user.profileImage = profileImageUrl;
  if (!file && payload.profileImage) user.profileImage = payload.profileImage;

  await user.save();

  return { user: sanitizeUser(user) };
};

export const deleteUser = async ({ id, requester }) => {
  if (!requester?.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const adminUser = await User.findById(requester.id);
  if (!adminUser || adminUser.role !== "admin") {
    throw new AppError("Only admin can delete users", 403, "FORBIDDEN");
  }

  await ensureActiveCompanyForAdmin(adminUser.company);

  const user = await User.findOne({ _id: id, role: "user" });
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (adminUser.companyId !== user.companyId) {
    throw new AppError("Admin can delete only users of own company", 403, "FORBIDDEN");
  }

  await User.findByIdAndDelete(id);

  return { message: "User deleted successfully" };
};

export const getUserById = async ({ id, requester }) => {
  if (!requester?.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) {
    throw new AppError("Requester not found", 401, "REQUESTER_NOT_FOUND");
  }

  const user = await User.findOne({ _id: id, role: "user" }).select(
    "-password -otpCode -otpExpiresAt -refreshToken -__v"
  );

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (requesterUser.role === "superadmin") {
    return { user: sanitizeUser(user) };
  }

  if (requesterUser.role === "admin") {
    await ensureActiveCompanyForAdmin(requesterUser.company);

    if (requesterUser.companyId !== user.companyId) {
      throw new AppError("Admin can view only users of own company", 403, "FORBIDDEN");
    }
    return { user: sanitizeUser(user) };
  }

  if (requesterUser.role === "user") {
    if (requesterUser._id.toString() !== user._id.toString()) {
      throw new AppError("You are not allowed to view this user", 403, "FORBIDDEN");
    }
    return { user: sanitizeUser(user) };
  }

  throw new AppError("Forbidden", 403, "FORBIDDEN");
};

export const getAllUsers = async ({ query, requester }) => {
  if (!requester?.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) {
    throw new AppError("Requester not found", 401, "REQUESTER_NOT_FOUND");
  }

  if (requesterUser.role === "user") {
    throw new AppError("You are not allowed to view all users", 403, "FORBIDDEN");
  }

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "createdAt",
    sortOrder = "desc",
    companyId = "",
    ...filters
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const match = { role: "user" };

  if (requesterUser.role === "superadmin") {
    if (companyId) {
      const companyExists = await Company.findOne({ companyId });
      if (!companyExists) {
        throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
      }
      match.companyId = companyId;
    }
  }

  if (requesterUser.role === "admin") {
    await ensureActiveCompanyForAdmin(requesterUser.company);
    match.companyId = requesterUser.companyId;
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
        $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }],
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