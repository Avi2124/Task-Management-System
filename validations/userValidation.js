import Joi from "joi";
import mongoose from "mongoose";

const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.message("Invalid Id");
    }
    return value;
  }, "ObjectId validation");

// User registration
export const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(16).required(),
  companyId: Joi.when("role", {
    is: "superadmin",
    then: Joi.string().optional().allow(null, ""),
    otherwise: Joi.string().min(2).max(50).required(),
  }),
  role: Joi.string().valid("superadmin", "admin", "user").default("user"),
  profileImage: Joi.string().uri()
});

// User Update
export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  password: Joi.string().min(6).max(16),
  profileImage: Joi.string().uri()
}).min(1);

// login
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// login OTP validation
export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

// refresh token
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// logout
export const logoutSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// params with id
export const idParamSchema = Joi.object({
  id: objectId().required(),
});