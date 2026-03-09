import { asyncHandler } from "../middleware/asyncHandler.js";
import * as projectService from "../services/projectService.js";
import { sendResponse } from "../utils/sendResponse.js";

export const createProject = asyncHandler(async (req, res) => {
  const data = await projectService.createProject({
    payload: req.body,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Project created successfully",
    data,
    error: null,
  });
});

export const getAllProjects = asyncHandler(async (req, res) => {
  const data = await projectService.getAllProjects({
    query: req.query,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Projects fetched successfully",
    data,
    error: null,
  });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const data = await projectService.getProjectById({
    projectId: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Project fetched successfully",
    data,
    error: null,
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const data = await projectService.updateProject({
    projectId: req.params.id,
    payload: req.body,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Project updated successfully",
    data,
    error: null,
  });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const data = await projectService.deleteProject({
    projectId: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Project deleted successfully",
    data,
    error: null,
  });
});