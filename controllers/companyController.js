import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import * as companyService from "../services/companyService.js";

// ---------- CREATE COMPANY ----------
export const createCompany = asyncHandler(async (req, res) => {
  const data = await companyService.createCompany(req.body);
  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Company created successfully",
    data,
    error: null,
  });
});

// ---------- GET COMPANY BY companyId ----------
export const getCompanyById = asyncHandler(async (req, res) => {
  const data = await companyService.getCompanyById(req.params.companyId);
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Company fetched successfully",
    data,
    error: null,
  });
});

// ---------- GET ALL COMPANIES ----------
export const getAllCompanies = asyncHandler(async (req, res) => {
  const data = await companyService.getAllCompanies({
    query: req.query,
    requester: req.user,
  });
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "All companies fetched successfully",
    data,
    error: null,
  });
});

// ---------- UPDATE COMPANY (by Mongo _id) ----------
export const updateCompany = asyncHandler(async (req, res) => {
  const data = await companyService.updateCompany({
    id: req.params.id,
    payload: req.body,
  });
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Company updated successfully",
    data,
    error: null,
  });
});

// ---------- DELETE COMPANY (by Mongo _id) ----------
export const deleteCompany = asyncHandler(async (req, res) => {
  await companyService.deleteCompany(req.params.id);
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Company deleted successfully",
    data: null,
    error: null,
  });
});