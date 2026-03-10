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

export const createPlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  price: Joi.number().min(0).required(),
  durationDays: Joi.number().min(0).required(),
  projectLimit: Joi.number().min(-1).required(),
  userLimit: Joi.number().min(-1).required()
});

export const updatePlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  price: Joi.number().min(0).optional(),
  durationDays: Joi.number().min(0).optional(),
  projectLimit: Joi.number().min(-1).optional(),
  userLimit: Joi.number().min(0).optional()
});