import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import {
  addCommentSchema,
  updateCommentSchema,
  taskIdParamSchema,
  commentIdParamSchema
} from "../validations/commentValidation.js";
import {
  addComment,
  getTaskComments,
  updateComment,
  deleteComment,
} from "../controllers/commentController.js";

const commentRoutes = express.Router();

commentRoutes.post(
  "/tasks/:taskId/comments",
  userMiddleware({
    auth: true,
    roles: ["admin", "user"],
    params: taskIdParamSchema,
    body: addCommentSchema,
  }),
  addComment
);

commentRoutes.get(
  "/tasks/:taskId/comments",
  userMiddleware({
    auth: true,
    roles: ["admin", "user"],
    params: taskIdParamSchema,
  }),
  getTaskComments
);

commentRoutes.put(
  "/comments/:id",
  userMiddleware({
    auth: true,
    roles: ["admin", "user"],
    params: commentIdParamSchema,
    body: updateCommentSchema,
  }),
  updateComment
);

commentRoutes.delete(
  "/comments/:id",
  userMiddleware({
    auth: true,
    roles: ["admin", "user"],
    params: commentIdParamSchema,
  }),
  deleteComment
);

export default commentRoutes;