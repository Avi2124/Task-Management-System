import Joi from "joi";
import mongoose from "mongoose";

const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.message("Invalid Id");
    }
    return value;
  }, "ObjectId validation");

export const idParamSchema = Joi.object({
  id: objectId().required(),
});

export const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().allow("").optional(),
  members: Joi.array().items(Joi.string().hex().length(24)).optional()
});

export const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().allow("").optional(),
  members: Joi.array().items(Joi.string().hex().length(24)).optional()
});