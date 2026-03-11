import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { createProject, getAllProjects, getProjectById, updateProject, deleteProject, assignMembersToProject } from "../controllers/projectController.js";
import { assignProjectMembersSchema, createProjectSchema, updateProjectSchema } from "../validations/projectValidation.js";
import { idParamSchema } from "../validations/userValidation.js";

const projectRoutes = express.Router();

projectRoutes.post("/create", userMiddleware({ auth: true, roles: ["admin"], body: createProjectSchema}), createProject);
projectRoutes.get("/all", userMiddleware({ auth: true, roles: ["admin", "user"] }), getAllProjects);
projectRoutes.get("/:id", userMiddleware({ auth: true, roles: ["admin", "user"], params: idParamSchema }), getProjectById);
projectRoutes.put("/:id", userMiddleware({ auth: true, roles: ["admin"], body: updateProjectSchema, params: idParamSchema}), updateProject);
projectRoutes.delete("/:id", userMiddleware({ auth: true, roles: ["admin"], params: idParamSchema }), deleteProject);
projectRoutes.put("/members/:id", userMiddleware({ auth: true, roles: ["admin"], params: idParamSchema, body: assignProjectMembersSchema }), assignMembersToProject);

export default projectRoutes;