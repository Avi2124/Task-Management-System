import Company from "../models/companyModel.js";
import { sendResponse } from "../utils/sendResponse.js";

// ---------- CREATE COMPANY ----------
export const createCompany = async (req, res) => {
  try {
    const { name, description, address, website, companyId } = req.body;

    const existing = await Company.findOne({ companyId });
    if (existing) {
      return sendResponse(res, {
        status: false,
        statusCode: 409,
        message: "companyId already exists. Please choose another.",
        data: null,
        error: { code: "COMPANY_ID_EXISTS" },
      });
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
  } catch (error) {
    console.error("createCompany error:", error);
    return sendResponse(res, {
      status: false,
      statusCode: 500,
      message: "Internal server error",
      data: null,
      error: { details: error.message },
    });
  }
};

// ---------- GET COMPANY BY companyId ----------
export const getCompanyById = async (req, res) => {
  try {
    // Expect route like: GET /api/companies/code/:companyId
    const { companyId } = req.params;

    const company = await Company.findOne({ companyId });

    if (!company) {
      return sendResponse(res, {
        status: false,
        statusCode: 404,
        message: "Company not found",
        data: null,
        error: { code: "COMPANY_NOT_FOUND" },
      });
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
  } catch (error) {
    console.error("getCompanyById error:", error);
    return sendResponse(res, {
      status: false,
      statusCode: 500,
      message: "Internal server error",
      data: null,
      error: { details: error.message },
    });
  }
};

// ---------- GET ALL COMPANIES ----------
export const getAllCompanies = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return sendResponse(res, {
        status: false,
        statusCode: 403,
        message: "Only superadmin can view all companies",
        data: null,
        error: { code: "FORBIDDEN" },
      });
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
  } catch (error) {
    console.error("getAllCompanies error:", error);
    return sendResponse(res, {
      status: false,
      statusCode: 500,
      message: "Internal server error",
      data: null,
      error: { details: error.message },
    });
  }
};

// ---------- UPDATE COMPANY (by Mongo _id) ----------
export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params; // Mongo _id
    const updates = { ...req.body };

    // do not allow changing companyId from this route
    if (Object.prototype.hasOwnProperty.call(updates, "companyId")) {
      delete updates.companyId;
    }

    const company = await Company.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!company) {
      return sendResponse(res, {
        status: false,
        statusCode: 404,
        message: "Company not found",
        data: null,
        error: { code: "COMPANY_NOT_FOUND" },
      });
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
  } catch (error) {
    console.error("updateCompany error:", error);
    return sendResponse(res, {
      status: false,
      statusCode: 500,
      message: "Internal server error",
      data: null,
      error: { details: error.message },
    });
  }
};

// ---------- DELETE COMPANY (by Mongo _id) ----------
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByIdAndDelete(id);
    if (!company) {
      return sendResponse(res, {
        status: false,
        statusCode: 404,
        message: "Company not found",
        data: null,
        error: { code: "COMPANY_NOT_FOUND" },
      });
    }

    return sendResponse(res, {
      status: true,
      statusCode: 200,
      message: "Company deleted successfully",
      data: null,
      error: null,
    });
  } catch (error) {
    console.error("deleteCompany error:", error);
    return sendResponse(res, {
      status: false,
      statusCode: 500,
      message: "Internal server error",
      data: null,
      error: { details: error.message },
    });
  }
};