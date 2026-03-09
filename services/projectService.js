import mongoose from "mongoose";
import Company from "../models/companyModel.js";
import { Plan } from "../models/planModel.js";
import { Project } from "../models/projectModel.js";
import { AppError } from "../utils/AppError.js";

const ensureCompanyActive = async (companyId) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }
  if (company.status !== "active") {
    throw new AppError(
      "Company subscription is not active",
      403,
      "COMPANY_NOT_ACTIVE"
    );
  }
  if (company.planExpiresAt && company.planExpiresAt < new Date()) {
    throw new AppError("Plan expired", 403, "PLAN_EXPIRED");
  }
  return company;
};

const ensureProjectLimit = async (company) => {
  if (!company.plan) {
    throw new AppError("Plan not attached", 400, "PLAN_NOT_ATTACHED");
  }

  const plan = await Plan.findById(company.plan);
  if (!plan || !plan.isActive) {
    throw new AppError("Plan not found", 400, "PLAN_NOT_FOUND");
  }

  const count = await Project.countDocuments({
    company: company._id,
    isDeleted: false
  });

  if (plan.projectLimit !== -1 && count >= plan.projectLimit) {
    throw new AppError("Project limit reached", 400, "PROJECT_LIMIT_REACHED");
  }
};

const normalizeMembers = (members) => {
  if (members === undefined) {
    return [];
  }

  if (!Array.isArray(members)) {
    throw new AppError("Members must be an array", 400, "INVALID_MEMBERS");
  }

  const uniqueMembers = [];
  const seen = new Set();

  for (const memberId of members) {
    const value = String(memberId);

    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new AppError("Invalid member id", 400, "INVALID_MEMBER_ID");
    }

    if (!seen.has(value)) {
      seen.add(value);
      uniqueMembers.push(memberId);
    }
  }

  return uniqueMembers;
};

const ensureAdminWithCompany = (requester) => {
    const requesterId = requester?._id || requester?.id;
    if(!requesterId){
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if(requester.role !== "admin"){
        throw new AppError("Only admin can access projects", 403, "FORBIDDEN");
    }
    if(!requester.company){
        throw new AppError("Company not assigned", 400, "NO_COMPANY");
    }
    return{
        requesterId,
        companyId: requester.company,
    };
};

// Get all projects
export const getAllProjects = async ({ query, requester }) => {
  const { companyId } = ensureAdminWithCompany(requester);

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const search = query.search ? String(query.search).trim() : "";
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const filter = {
    company: companyId,
    isDeleted: false,
  };

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("members", "name email"),
    Project.countDocuments(filter),
  ]);

  return {
    projects,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Get Project By Id
export const getProjectById = async ({ projectId, requester }) => {
  const { companyId } = ensureAdminWithCompany(requester);

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError("Invalid project id", 400, "INVALID_PROJECT_ID");
  }

  const project = await Project.findOne({
    _id: projectId,
    company: companyId,
    isDeleted: false,
  })
    .populate("createdBy", "name email")
    .populate("members", "name email");

  if (!project) {
    throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  }

  return { project };
};

// Update Project
export const updateProject = async ({ projectId, payload, requester }) => {
  const { companyId } = ensureAdminWithCompany(requester);

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError("Invalid project id", 400, "INVALID_PROJECT_ID");
  }

  const project = await Project.findOne({
    _id: projectId,
    company: companyId,
    isDeleted: false,
  });

  if (!project) {
    throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  }

  const { name, description, members } = payload;

  if (name !== undefined) {
    if (!String(name).trim()) {
      throw new AppError("Project name is required", 400, "NAME_REQUIRED");
    }
    project.name = String(name).trim();
  }

  if (description !== undefined) {
    project.description = String(description).trim();
  }

  if (members !== undefined) {
    project.members = normalizeMembers(members);
  }

  try {
    await project.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(
        "Project with this name already exists",
        400,
        "PROJECT_ALREADY_EXISTS"
      );
    }
    throw error;
  }

  return { project };
};

// Delete Project
export const deleteProject = async ({ projectId, requester }) => {
  const { companyId } = ensureAdminWithCompany(requester);

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError("Invalid project id", 400, "INVALID_PROJECT_ID");
  }

  const project = await Project.findOne({
    _id: projectId,
    company: companyId,
    isDeleted: false,
  });

  if (!project) {
    throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  }

  project.isDeleted = true;
  project.isActive = false;

  await project.save();

  return {
    project: {
      id: project._id,
      name: project.name
    },
  };
};



export const createProject = async ({ payload, requester }) => {
  const requesterId = requester?._id || requester?.id;

  if (!requesterId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  if (!requester?.role || requester.role !== "admin") {
    throw new AppError("Only admin can create projects", 403, "FORBIDDEN");
  }

  const companyId = requester.company;
  if (!companyId) {
    throw new AppError("Company not assigned", 400, "NO_COMPANY");
  }

  const company = await ensureCompanyActive(companyId);
  await ensureProjectLimit(company);

  const { name, description = "", members } = payload;

  if (!name || !String(name).trim()) {
    throw new AppError("Project name is required", 400, "NAME_REQUIRED");
  }

  const normalizedMembers = normalizeMembers(members);

  try {
    const project = await Project.create({
      company: company._id,
      name: String(name).trim(),
      description: String(description).trim(),
      createdBy: requesterId,
      members: normalizedMembers
    });

    return {
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        company: project.company,
        createdBy: project.createdBy,
        members: project.members,
        isActive: project.isActive,
        isDeleted: project.isDeleted,
        createdAt: project.createdAt
      }
    };
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(
        "Project with this name already exists",
        400,
        "PROJECT_ALREADY_EXISTS"
      );
    }
    throw error;
  }
};