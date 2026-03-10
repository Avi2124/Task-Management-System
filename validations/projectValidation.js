import Joi from "joi";
import mongoose from "mongoose";

const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.message("Invalid Id");
    }
    return value;
  }, "ObjectId validation");

export const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  shortCode: Joi.string().min(2).max(10).required(),
  description: Joi.string().trim().allow("").optional(),
  members: Joi.array().items(objectId()).optional()
});

export const updateProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  shortCode: Joi.string().min(2).max(10),
  description: Joi.string().allow(""),
  members: Joi.array().items(objectId()),
  isActive: Joi.boolean(),
}).min(1);

export const assignProjectMembersSchema = Joi.object({
  members: Joi.array().items(objectId()).min(1).required(),
});