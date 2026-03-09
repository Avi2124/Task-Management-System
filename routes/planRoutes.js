import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { createPlan, deletePlan, getPlans, updatePlan } from "../controllers/planController.js";
import { createPlanSchema, idParamSchema, updatePlanSchema } from "../validations/planValidation.js";

const planRoutes = express.Router();

planRoutes.post("/create", userMiddleware({auth: true, roles: ["superadmin"], body: createPlanSchema}), createPlan)
planRoutes.get("/getPlans", getPlans);
planRoutes.put("/update-plan/:id", userMiddleware({auth: true, roles: ["superadmin"], body: updatePlanSchema, params: idParamSchema}), updatePlan);
planRoutes.delete("/delete-plan/:id", userMiddleware({auth: true, roles: ["superadmin"]}), deletePlan);

export default planRoutes;