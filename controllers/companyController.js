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
    error: null,
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

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "name",
    sortOrder = "asc",
    ...filters
  } = req.query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  if(page < 1) page = 1;
  if(limit < 1) limit = 10;

  const match = {};

  Object.entries(filters).forEach(([key, value]) => {
    if(value === undefined || value === null || value === "") return;
    const values = String(value).split(",").map((v) => v.trim()).filter((v) => v !== "");
    if(!values.length) return;
    if(values.length === 1){
        match[key] = values[0];
    } else {
        match[key] = {$in: values};
    }
});

if(search) {
    const regex = new RegExp(search, "i");
    match.$or = [
        {name: {$regex: regex}},
        {description: {$regex: regex}},
        {address: {$regex: regex}},
        {website: {$regex: regex}},
        {companyId: {$regex: regex}}
    ];
}

const sortDir = sortOrder === "asc" ? 1 : -1;
if(!sortKey) sortKey = "name";
const sort = {[sortKey]: sortDir, _id: -1};

const skip = (page - 1) * limit;

const [companies, total] = await Promise.all([
    Company.find(match).sort(sort).skip(skip).limit(limit),
    Company.countDocuments(match)
]);

const totalPages = Math.ceil(total / limit) || 1;

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
      meta: {
        page,
        limit,
        total,
        totalPages
      },
    },
    error: null
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
    error: null,
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
    data: null,
    error: null
  });
});
