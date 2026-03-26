import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import * as dashboardService from "../services/dashboardService.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboard({
    requester: req.user,
  });
  console.log(req.user.role);

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: `${req.user.role} dashboard fetched successfully`,
    data,
    error: null,
  });
});