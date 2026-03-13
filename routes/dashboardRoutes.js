import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { getSuperAdminDashboard } from "../controllers/dashboardController.js";

const dashboardRoutes = express.Router();
dashboardRoutes.get("/superadmin", userMiddleware({auth: true, roles: ["superadmin"]}), getSuperAdminDashboard);

export default dashboardRoutes;