import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { createProject, getAllProjects, getProjectById, updateProject, deleteProject } from "../controllers/projectController.js";
import { createProjectSchema, idParamSchema, updateProjectSchema } from "../validations/projectValidation.js";

const projectRoutes = express.Router();

projectRoutes.post("/create", userMiddleware({ auth: true, roles: ["admin"], body: createProjectSchema}), createProject);
projectRoutes.get("/all", userMiddleware({ auth: true, roles: ["admin"] }), getAllProjects);
projectRoutes.get("/:id", userMiddleware({ auth: true, roles: ["admin"], params: idParamSchema }), getProjectById);
projectRoutes.put("/:id", userMiddleware({ auth: true, roles: ["admin"], body: updateProjectSchema, params: idParamSchema}), updateProject);
projectRoutes.delete("/:id", userMiddleware({ auth: true, roles: ["admin"], params: idParamSchema }), deleteProject);

export default projectRoutes;