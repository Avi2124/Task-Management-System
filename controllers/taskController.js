import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import * as taskService from "../services/taskService.js";

export const createTask = asyncHandler(async (req, res) => {
  const data = await taskService.createTask({
    payload: req.body,
    requester: req.user,
    refDocData: req.fileData || null,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Task created successfully",
    data,
    error: null,
  });
});

export const getAllTasks = asyncHandler(async (req, res) => {
  const result = await taskService.getAllTasks({
    query: req.query,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Tasks fetched successfully",
    data: result,
    error: null,
  });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const result = await taskService.getTaskById({
    id: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Task fetched successfully",
    data: result,
    error: null,
  });
});

export const updateTask = asyncHandler(async (req, res) => {
  const result = await taskService.updateTask({
    id: req.params.id,
    payload: req.body,
    requester: req.user,
    refDocData: req.fileData || null,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Task updated successfully",
    data: result,
    error: null,
  });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const result = await taskService.updateTaskStatus({
    id: req.params.id,
    payload: req.body,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Task status updated successfully",
    data: result,
    error: null,
  });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const result = await taskService.deleteTask({
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

export const getAllTaskHistory = asyncHandler(async (req, res) => {
  const result = await taskService.getAllTaskHistory({
    query: req.query,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Task history fetched successfully",
    data: result,
    error: null,
  });
});