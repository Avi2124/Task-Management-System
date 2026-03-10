import { Project } from "../models/projectModel.js";
import { User } from "../models/userModel.js";
import Company from "../models/companyModel.js";
import { AppError } from "../utils/AppError.js";

const sanitizeProject = (project) => ({
  id: project._id,
  name: project.name,
  shortCode: project.shortCode,
  description: project.description,
  company: project.company,
  createdBy: project.createdBy,
  members: project.members,
  isActive: project.isActive,
  isDeleted: project.isDeleted,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

const ensureAdminCompanyAndPlan = async (companyId) => {
  const company = await Company.findById(companyId).populate("plan");
  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }

  if (company.status !== "active") {
    throw new AppError("Company subscription not active", 403, "COMPANY_NOT_ACTIVE");
  }

  if (company.planExpiresAt && company.planExpiresAt < new Date()) {
    throw new AppError("Plan expired", 403, "PLAN_EXPIRED");
  }

  if (!company.plan || !company.plan.isActive) {
    throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
  }

  return company;
};

export const createProject = async ({ payload, requester }) => {
  if (!requester?.id) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  const adminUser = await User.findById(requester.id);
  if (!adminUser || adminUser.role !== "admin") {
    throw new AppError("Only admin can create project", 403, "FORBIDDEN");
  }

  const company = await ensureAdminCompanyAndPlan(adminUser.company);

  const currentProjects = await Project.countDocuments({
    company: adminUser.company,
    isDeleted: false,
  });

  if (
    company.plan.projectLimit !== -1 &&
    currentProjects >= company.plan.projectLimit
  ) {
    throw new AppError("Project limit reached", 400, "PROJECT_LIMIT_REACHED");
  }

  const { name, shortCode, description = "", members = [] } = payload;

  const existingShortCode = await Project.findOne({
    company: adminUser.company,
    shortCode: shortCode.toUpperCase(),
    isDeleted: false,
  });

  if (existingShortCode) {
    throw new AppError("Project shortCode already exists", 409, "SHORTCODE_EXISTS");
  }

  const validMembers = [];
  if (members.length) {
    const users = await User.find({
      _id: { $in: members },
      company: adminUser.company,
      role: "user",
    });

    if (users.length !== members.length) {
      throw new AppError("Some users do not belong to this company", 400, "INVALID_USERS");
    }

    validMembers.push(...users.map((u) => u._id));
  }

  const project = await Project.create({
    name,
    shortCode: shortCode.toUpperCase(),
    description,
    company: adminUser.company,
    createdBy: adminUser._id,
    members: validMembers,
  });

  return { project: sanitizeProject(project) };
};

export const getAllProjects = async ({ query, requester }) => {
  if (!requester?.id) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  const user = await User.findById(requester.id);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "createdAt",
    sortOrder = "desc",
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;

  const match = {
    company: user.company,
    isDeleted: false,
  };

  if (user.role === "user") {
    match.members = user._id;
  }

  const pipeline = [{ $match: match }];

  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: regex } },
          { shortCode: { $regex: regex } },
        ],
      },
    });
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortKey]: sortDir, _id: -1 } });

  const skip = (page - 1) * limit;
  pipeline.push({
    $facet: {
      data: [
        { $skip: skip },
        { $limit: limit },
      ],
      total: [{ $count: "count" }],
    },
  });

  const result = await Project.aggregate(pipeline);
  const data = result[0]?.data || [];
  const total = result[0]?.total?.[0]?.count || 0;

  return {
    projects: data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getProjectById = async ({ id, requester }) => {
  const user = await User.findById(requester.id);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const filter = {
    _id: id,
    company: user.company,
    isDeleted: false,
  };

  if (user.role === "user") {
    filter.members = user._id;
  }

  const project = await Project.findOne(filter)
    .populate("members", "name email role")
    .populate("createdBy", "name email role");

  if (!project) {
    throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  }

  return { project: sanitizeProject(project) };
};

export const updateProject = async ({ id, payload, requester }) => {
  const adminUser = await User.findById(requester.id);
  if (!adminUser || adminUser.role !== "admin") {
    throw new AppError("Only admin can update project", 403, "FORBIDDEN");
  }

  const project = await Project.findOne({
    _id: id,
    company: adminUser.company,
    isDeleted: false,
  });

  if (!project) {
    throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  }

  const { name, shortCode, description, members, isActive } = payload;

  if (name) project.name = name;
  if (description !== undefined) project.description = description;
  if (isActive !== undefined) project.isActive = isActive;

  if (shortCode) {
    const existing = await Project.findOne({
      _id: { $ne: project._id },
      company: adminUser.company,
      shortCode: shortCode.toUpperCase(),
      isDeleted: false,
    });

    if (existing) {
      throw new AppError("Project shortCode already exists", 409, "SHORTCODE_EXISTS");
    }

    project.shortCode = shortCode.toUpperCase();
  }

  if (members) {
    const users = await User.find({
      _id: { $in: members },
      company: adminUser.company,
      role: "user",
    });

    if (users.length !== members.length) {
      throw new AppError("Some users do not belong to this company", 400, "INVALID_USERS");
    }

    project.members = users.map((u) => u._id);
  }

  await project.save();

  return { project: sanitizeProject(project) };
};

export const deleteProject = async ({ id, requester }) => {
  const adminUser = await User.findById(requester.id);
  if (!adminUser || adminUser.role !== "admin") {
    throw new AppError("Only admin can delete project", 403, "FORBIDDEN");
  }

  const project = await Project.findOne({
    _id: id,
    company: adminUser.company,
    isDeleted: false,
  });

  if (!project) {
    throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  }

  project.isDeleted = true;
  project.isActive = false;
  await project.save();

  return { message: "Project deleted successfully" };
};

export const assignMembersToProject = async ({ id, payload, requester }) => {
  const adminUser = await User.findById(requester.id);
  if (!adminUser || adminUser.role !== "admin") {
    throw new AppError("Only admin can assign users to project", 403, "FORBIDDEN");
  }

  const project = await Project.findOne({
    _id: id,
    company: adminUser.company,
    isDeleted: false,
  });

  if (!project) {
    throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  }

  const { members } = payload;

  const users = await User.find({
    _id: { $in: members },
    company: adminUser.company,
    role: "user",
  });

  if (users.length !== members.length) {
    throw new AppError("Some users do not belong to this company", 400, "INVALID_USERS");
  }

  project.members = [...new Set(users.map((u) => u._id.toString()))];
  await project.save();

  return { project: sanitizeProject(project) };
};