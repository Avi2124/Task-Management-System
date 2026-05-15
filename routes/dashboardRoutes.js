import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { getDashboard } from "../controllers/dashboardController.js";

const dashboardRoutes = express.Router();

dashboardRoutes.get("/",userMiddleware({ auth: true, roles: ["superadmin", "admin", "user"] }),getDashboard);

export default dashboardRoutes;