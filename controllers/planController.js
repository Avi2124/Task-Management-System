import { asyncHandler } from "../middleware/asyncHandler.js";
import * as planService from "../services/planService.js";
import { sendResponse } from "../utils/sendResponse.js";

export const createPlan = asyncHandler(async (req, res) => {
  const data = await planService.createPlan({
    payload: req.body,
    requester: req.user,
  });
  return sendResponse(res, {
    status: true,
    statusCode: 201,
    message: "Plan Created",
    data,
    error: null,
  });
});

export const getPlans = asyncHandler(async (req, res) => {
  const data = await planService.getPlans({
    query: req.query
  });
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Plans fetched",
    data,
    error: null,
  });
});

export const updatePlan = asyncHandler(async (req, res) => {
  const data = await planService.updatePlan({
    planId: req.params.id,
    payload: req.body,
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Plan updated successfully",
    data,
    error: null,
  });
});

export const deletePlan = asyncHandler(async (req, res) => {
  const data = await planService.deletePlan({
    planId: req.params.id,
    requester: req.user,
  });
  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Plan deleted successfully",
    data,
    error: null,
  });
});