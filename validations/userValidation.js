import Joi from "joi";
import mongoose from "mongoose";

const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.message("Invalid Id");
    }
    return value;
  }, "ObjectId validation");

// superadmin self signup
export const createSuperadminSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(16).required(),
  profileImage: Joi.string().uri().optional(),
});

// admin creates user
export const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(16).required(),
  project: objectId().optional().allow(null, ""),
  profileImage: Joi.string().uri().optional(),
});

// update admin
export const updateAdminSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  password: Joi.string().min(6).max(16),
  status: Joi.string().valid("active", "inactive"),
  profileImage: Joi.string().uri(),
}).min(1);

// update user
export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  password: Joi.string().min(6).max(16),
  profileImage: Joi.string().uri(),
  project: objectId().optional().allow(null, ""),
}).min(1);

// login
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// verify otp
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

// params
export const idParamSchema = Joi.object({
  id: objectId().required(),
});

// admin self signup with company + plan
export const registerAdminSchema = Joi.object({
  company: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    address: Joi.string().required(),
    website: Joi.string().required(),
    companyId: Joi.string().required(),
  }).required(),

  admin: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }).required(),

  planId: objectId().required(),
});

// forgot password
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

// reset password
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).max(16).required()
});