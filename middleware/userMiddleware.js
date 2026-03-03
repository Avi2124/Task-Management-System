import jwt from "jsonwebtoken";
import { sendResponse } from "../utils/sendResponse.js";
import { User } from "../models/userModel.js";
import { asyncHandler } from "./asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const userMiddleware =
  ({ body = null, params = null, auth = false, roles = [] } = {}) =>
  asyncHandler (async (req, res, next) => {
      if (auth) {
        const header = req.headers.authorization || req.headers.Authorization;

        if (!header || !header.startsWith("Bearer ")) {
            throw new AppError("Authorization header missing or invalid", 401, "NO_TOKEN");
        }

        const token = header.split(" ")[1];

        let decoded;
        try {
          decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        } catch (error) {
          const isExpired = error.name === "TokenExpiredError";
          throw new AppError(isExpired ? "Access token expired" : "Invalid access token", 401, isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN");
        }

        const user = await User.findById(decoded._id).select("-password");
        if (!user) {
            throw new AppError("User not found for this token", 401, "USER_NOT_FOUND");
        }

        if (roles.length > 0 && !roles.includes(user.role)) {
            throw new AppError("Access denied", 403, "FORBIDDEN");
        }

        // attach user info to request
        req.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }

      if (body) {
        const { error, value } = body.validate(req.body, { abortEarly: false });

        if (error) {
            const details = error.details.map((d) => d.message);
            throw new AppError("Validation error", 400, "VALIDATION_ERROR", details);
        }

        req.body = value;
      }

      if (params) {
        const { error, value } = params.validate(req.params, {
          abortEarly: false,
        });

        if (error) {
            const details = error.details.map((d) => d.message);
            throw new AppError("Validation error", 400, "VALIDATION_ERROR", details);
        }

        req.params = value;
      }
      return next();
  });