import Company from "../models/companyModel.js";
import { AppError } from "../utils/AppError.js";

const toCompanyDTO = (c) => ({
  id: c._id,
  name: c.name,
  description: c.description,
  address: c.address,
  website: c.website,
  companyId: c.companyId,
});

export const createCompany = async ({ name, description, address, website, companyId }) => {
  const existing = await Company.findOne({ companyId });
  if (existing) {
    throw new AppError(
      "companyId already exists. Please choose another.",
      409,
      "COMPANY_ID_EXISTS"
    );
  }

  const company = await Company.create({ name, description, address, website, companyId });

  return { company: toCompanyDTO(company) };
};

export const getCompanyById = async (companyId) => {
  const company = await Company.findOne({ companyId });
  if (!company) throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");

  return { company: toCompanyDTO(company) };
};

export const getAllCompanies = async ({ query, requester }) => {
  if (!requester || requester.role !== "superadmin") {
    throw new AppError("Only superadmin can view all companies", 403, "FORBIDDEN");
  }

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "name",
    sortOrder = "asc",
    ...filters
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const match = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    const values = String(value)
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "");

    if (!values.length) return;
    match[key] = values.length === 1 ? values[0] : { $in: values };
  });

  if (search) {
    const regex = new RegExp(search, "i");
    match.$or = [
      { name: { $regex: regex } },
      { description: { $regex: regex } },
      { address: { $regex: regex } },
      { website: { $regex: regex } },
      { companyId: { $regex: regex } },
    ];
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;
  const sort = { [sortKey || "name"]: sortDir, _id: -1 };
  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    Company.find(match).sort(sort).skip(skip).limit(limit),
    Company.countDocuments(match),
  ]);

  return {
    companies: companies.map(toCompanyDTO),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const updateCompany = async ({ id, payload }) => {
  const updates = { ...payload };
  if (Object.prototype.hasOwnProperty.call(updates, "companyId")) delete updates.companyId;

  const company = await Company.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!company) throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");

  return { company: toCompanyDTO(company) };
};

export const deleteCompany = async (id) => {
  const company = await Company.findByIdAndDelete(id);
  if (!company) throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
};