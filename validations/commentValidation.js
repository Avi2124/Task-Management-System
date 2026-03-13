import Joi from "joi";

export const addCommentSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required(),
});

export const updateCommentSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required(),
});

export const taskIdParamSchema = Joi.object({
  taskId: Joi.string().hex().length(24).required(),
});

export const commentIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});