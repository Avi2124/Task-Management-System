import { asyncHandler } from "../middleware/asyncHandler.js";
import Company from "../models/companyModel.js";
import { AppError } from "../utils/AppError.js";
import { sendResponse } from "../utils/sendResponse.js";

// ---------- CREATE COMPANY ----------
export const createCompany = asyncHandler(async (req, res, next) => {
  const { name, description, address, website, companyId } = req.body;

  const existing = await Company.findOne({ companyId });
  if (existing) {
    throw new AppError(
      "companyId already exists. Please choose another.",
      409,
      "COMPANY_ID_EXISTS",
    );
  }

  const company = await Company.create({
    name,
    description,
    address,
    website,
    companyId,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Company created successfully",
    data: {
      company: {
        id: company._id,
        name: company.name,
        description: company.description,
        address: company.address,
        website: company.website,
        companyId: company.companyId,
      },
    },
    error: null,
  });
});

// ---------- GET COMPANY BY companyId ----------
export const getCompanyById = asyncHandler(async (req, res, next) => {
  const { companyId } = req.params;

  const company = await Company.findOne({ companyId });

  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Company fetched successfully",
    data: {
      company: {
        id: company._id,
        name: company.name,
        description: company.description,
        address: company.address,
        website: company.website,
        companyId: company.companyId,
      },
    },
  });
});

// ---------- GET ALL COMPANIES ----------
export const getAllCompanies = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "superadmin") {
    throw new AppError(
      "Only superadmin can view all companies",
      403,
      "FORBIDDEN",
    );
  }

  const companies = await Company.find();

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "All companies fetched successfully",
    data: {
      companies: companies.map((c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        address: c.address,
        website: c.website,
        companyId: c.companyId,
      })),
    },
  });
});

// ---------- UPDATE COMPANY (by Mongo _id) ----------
export const updateCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = { ...req.body };

  if (Object.prototype.hasOwnProperty.call(updates, "companyId")) {
    delete updates.companyId;
  }

  const company = await Company.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Company updated successfully",
    data: {
      company: {
        id: company._id,
        name: company.name,
        description: company.description,
        address: company.address,
        website: company.website,
        companyId: company.companyId,
      },
    },
  });
});

// ---------- DELETE COMPANY (by Mongo _id) ----------
export const deleteCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const company = await Company.findByIdAndDelete(id);
  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Company deleted successfully",
  });
});
