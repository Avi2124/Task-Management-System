import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import * as authService from "../services/authService.js";
import * as userService from "../services/userService.js";

// ---------- SUPERADMIN SIGNUP ----------
export const createSuperadmin = asyncHandler(async (req, res) => {
  const result = await authService.createSuperadmin(req.body, req.file);

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Superadmin created successfully",
    data: result,
    error: null,
  });
});

// ---------- CREATE USER BY ADMIN ----------
export const createUser = asyncHandler(async (req, res) => {
  const result = await authService.createUser(req.body, req.file, req.user);

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "User created successfully",
    data: result,
    error: null,
  });
});

// ---------- LOGIN ----------
export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "OTP sent to email",
    data: result,
    error: null,
  });
});

// ---------- VERIFY OTP ----------
export const verifyOtpAndIssueTokens = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtpAndIssueTokens(req.body);

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "OTP verified. Login successful",
    data: result,
    error: null,
  });
});

// ---------- REFRESH TOKEN ----------
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshAccessToken(req.body);

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Token refreshed",
    data: result,
    error: null,
  });
});

// ---------- UPDATE USER ----------
export const updateUser = asyncHandler(async (req, res) => {
  const result = await userService.updateUser({
    id: req.params.id,
    payload: req.body,
    requester: req.user,
    file: req.file,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "User updated successfully",
    data: result,
    error: null,
  });
});

// ---------- DELETE USER ----------
export const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser({
    id: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: result.message,
    data: null,
    error: null,
  });
});

// ---------- GET USER BY ID ----------
export const getUserById = asyncHandler(async (req, res) => {
  const result = await userService.getUserById({
    id: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "User fetched successfully",
    data: result,
    error: null,
  });
});

// ---------- GET ALL USERS ----------
export const getAllUsers = asyncHandler(async (req, res) => {
  const result = await userService.getAllUsers({
    query: req.query,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Users fetched successfully",
    data: result,
    error: null,
  });
});

// ---------- LOGOUT ----------
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body);

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Logged out",
    data: null,
    error: null,
  });
});

// ---------- ADMIN SELF SIGNUP ----------
export const registerAdmin = asyncHandler(async (req, res) => {
  const result = await authService.registerAdmin(req.body, req.file);

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Company + Admin created. Complete payment to activate workspace.",
    data: result,
    error: null,
  });
});

// ---------- GET ADMIN BY ID ----------
export const getAdminById = asyncHandler(async (req, res) => {
  const result = await userService.getAdminById({
    id: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Admin fetched successfully",
    data: result,
    error: null,
  });
});

// ---------- GET ALL ADMINS ----------
export const getAllAdmins = asyncHandler(async (req, res) => {
  const result = await userService.getAllAdmins({
    query: req.query,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Admins fetched successfully",
    data: result,
    error: null,
  });
});

// ---------- UPDATE ADMIN ----------
export const updateAdmin = asyncHandler(async (req, res) => {
  const result = await userService.updateAdmin({
    id: req.params.id,
    payload: req.body,
    requester: req.user,
    file: req.file,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Admin updated successfully",
    data: result,
    error: null,
  });
});

// ---------- DELETE ADMIN ----------
export const deleteAdmin = asyncHandler(async (req, res) => {
  const result = await userService.deleteAdmin({
    id: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: result.message,
    data: null,
    error: null,
  });
});

// --------- FORGOT PASSWORD ---------
export const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword({
    email: req.body.email,
  });
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: data.message,
    data,
    error: null
  });
});

// ---------- RESET PASSWORD ---------
export const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword({
    token: req.body.token,
    newPassword: req.body.newPassword,
  });
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: data.message,
    data,
    error: null
  });
});