import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import * as commentService from "../services/commentService.js";

// ---------- ADD COMMENT ----------
export const addComment = asyncHandler(async (req, res) => {
  const data = await commentService.addComment({
    taskId: req.params.taskId,
    payload: req.body,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Comment added successfully",
    data,
    error: null,
  });
});

// ---------- GET TASK COMMENTS ----------
export const getTaskComments = asyncHandler(async (req, res) => {
  const data = await commentService.getTaskComments({
    taskId: req.params.taskId,
    query: req.query,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Comments fetched successfully",
    data,
    error: null,
  });
});

// ---------- UPDATE COMMENT ----------
export const updateComment = asyncHandler(async (req, res) => {
  const data = await commentService.updateComment({
    commentId: req.params.id,
    payload: req.body,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Comment updated successfully",
    data,
    error: null,
  });
});

// ---------- DELETE COMMENT ----------
export const deleteComment = asyncHandler(async (req, res) => {
  const data = await commentService.deleteComment({
    commentId: req.params.id,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Comment deleted successfully",
    data,
    error: null,
  });
});