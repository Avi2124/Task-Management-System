import { asyncHandler } from "../middleware/asyncHandler.js";
import * as projectService from "../services/projectService.js";
import { sendResponse } from "../utils/sendResponse.js";

export const createProject = asyncHandler(async (req, res) => {
  const result = await projectService.createProject({
    payload: req.body,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Project created successfully",
    data: result,
    error: null,
  });
});

export const getAllProjects = asyncHandler(async (req, res) => {
  const result = await projectService.getAllProjects({
    query: req.query,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Projects fetched successfully",
    data: result,
    error: null,
  });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const result = await projectService.getProjectById({
    id: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Project fetched successfully",
    data: result,
    error: null,
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const result = await projectService.updateProject({
    id: req.params.id,
    payload: req.body,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Project updated successfully",
    data: result,
    error: null,
  });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const result = await projectService.deleteProject({
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

export const assignMembersToProject = asyncHandler(async (req, res) => {
    const result = await projectService.assignMembersToProject({
        id: req.params.id,
        payload: req.body,
        requester: req.user
    });

    return sendResponse(res, {
        status: true,
        statusCode: 200,
        message: "Project members assigned successfully",
        data: result,
        error: null
    });
});