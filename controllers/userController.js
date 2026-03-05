import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import * as authService from "../services/authService.js"
import * as userService from "../services/userService.js";

// ---------- SIGNUP ----------
export const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body, req.file,);
  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "User Created Successfully",
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

// ---------- Refresh Access Token ----------
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

// ---------- UPADTE USER PROFILE ----------
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
    message: "User Updated Successfully",
    data: result,
    error: null,
  });
});

// ---------- DELETE USER ----------
export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser({ id: req.params.id, requester: req.user });
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "User deleted successfully",
    data: null,
    error: null,
  });
});

// --------- GET USER BY ID ---------
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

// -------- LIST USERS ALL USERS --------
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