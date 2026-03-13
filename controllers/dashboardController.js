import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import * as dashboardService from "../services/dashboardService.js";

export const getSuperAdminDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSuperAdminDashboard({
    requester: req.user,
  });

  return sendResponse(res, {
    status: true,
    statusCode: 200,
    message: "Superadmin dashboard fetched successfully",
    data,
    error: null,
  });
});