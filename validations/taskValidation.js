import Joi from "joi";
import mongoose from "mongoose";

const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.message("Invalid Id");
    }
    return value;
  });

export const createTaskSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().allow("").optional(),
  project: objectId().required(),
  assignedTo: objectId().required(),
  reportTo: objectId().required(),
  priority: Joi.string().valid("high", "medium", "low").optional(),
  status: Joi.string()
    .valid(
      "to-do",
      "in-progress",
      "done",
      "testing",
      "qa-verified",
      "re-open",
      "deployment"
    )
    .optional(),
  dueDate: Joi.date().optional().allow(null),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  description: Joi.string().allow(""),
  assignedTo: objectId(),
  reportTo: objectId(),
  priority: Joi.string().valid("high", "medium", "low"),
  status: Joi.string().valid(
    "to-do",
    "in-progress",
    "done",
    "testing",
    "qa-verified",
    "re-open",
    "deployment"
  ),
  dueDate: Joi.date().optional().allow(null),
}).min(1);

export const updateTaskStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "to-do",
      "in-progress",
      "done",
      "testing",
      "qa-verified",
      "re-open",
      "deployment"
    )
    .required(),
});