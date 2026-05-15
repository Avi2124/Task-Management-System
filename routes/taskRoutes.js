import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { idParamSchema } from "../validations/userValidation.js";
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema } from "../validations/taskValidation.js";
import { createTask, getAllTasks, getTaskById, updateTask, updateTaskStatus, deleteTask, getAllTaskHistory } from "../controllers/taskController.js";
import { uploadTaskRefDoc } from "../middleware/taskUploadMiddleware.js";

const taskRoutes = express.Router();

taskRoutes.post("/",userMiddleware({ auth: true, roles: ["admin"], body: createTaskSchema }), uploadTaskRefDoc, createTask);
taskRoutes.get("/",userMiddleware({ auth: true, roles: ["admin", "user"] }), getAllTasks);
taskRoutes.get("/history",userMiddleware({auth: true, roles: ["admin", "user"],}), getAllTaskHistory);
taskRoutes.get("/:id",userMiddleware({ auth: true, roles: ["admin","user"], params: idParamSchema }), getTaskById);
taskRoutes.put("/:id",userMiddleware({auth: true, roles: ["admin"],params: idParamSchema,body: updateTaskSchema,}), uploadTaskRefDoc, updateTask);
taskRoutes.patch("/status/:id",userMiddleware({auth: true, roles: ["admin", "user"], params: idParamSchema,body: updateTaskStatusSchema}), updateTaskStatus);
taskRoutes.delete("/delete/:id",userMiddleware({auth: true, roles: ["admin"], params: idParamSchema}), deleteTask);

export default taskRoutes;