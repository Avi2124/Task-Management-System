import jwt from "jsonwebtoken";
import { sendResponse } from "../utils/sendResponse.js";
import { User } from "../models/userModel.js";
import { asyncHandler } from "./asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import Company from "../models/companyModel.js";

export const userMiddleware = ({
  body = null,
  params = null,
  auth = false,
  roles = [],
} = {}) =>
  asyncHandler(async (req, res, next) => {
    if (auth) {
      const header = req.headers.authorization || req.headers.Authorization;

      if (!header || !header.startsWith("Bearer ")) {
        throw new AppError(
          "Authorization header missing or invalid",
          401,
          "NO_TOKEN",
        );
      }

      const token = header.split(" ")[1];

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      } catch (error) {
        const isExpired = error.name === "TokenExpiredError";
        throw new AppError(
          isExpired ? "Access token expired" : "Invalid access token",
          401,
          isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
        );
      }

      const user = await User.findById(decoded._id).select("-password");
      if (!user) {
        throw new AppError(
          "User not found for this token",
          401,
          "USER_NOT_FOUND",
        );
      }

      if (user.company) {
        const company = await Company.findById(user.company);

        if (!company) {
          throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
        }

        const now = new Date();

        if (
          company.status === "active" &&
          company.planExpiresAt &&
          company.planExpiresAt < now
        ) {
          company.status = "pending_payment";
          company.plan = null;
          company.planStartAt = null;
          company.planExpiresAt = null;
          company.stripe.checkout_session_id = null;
          company.stripe.checkout_url = null;
          company.stripe.payment_intent_id = null;
          company.stripe.status = null;

          await company.save();

          throw new AppError(
            "Company subscription expired. Please renew your plan.",
            403,
            "PLAN_EXPIRED",
          );
        }

        if (company.status !== "active") {
          throw new AppError(
            "Company subscription is not active",
            403,
            "COMPANY_PLAN_INACTIVE",
          );
        }
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
        company: user.company ? user.company.toString() : null,
        companyId: user.companyId || null,
        status: user.status,
        profileImage: user.profileImage || null,
      };
    }

    if (body) {
      const { error, value } = body.validate(req.body, { abortEarly: false });

      if (error) {
        const details = error.details.map((d) => d.message);
        throw new AppError(
          "Validation error",
          400,
          "VALIDATION_ERROR",
          details,
        );
      }

      req.body = value;
    }

    if (params) {
      const { error, value } = params.validate(req.params, {
        abortEarly: false,
      });

      if (error) {
        const details = error.details.map((d) => d.message);
        throw new AppError(
          "Validation error",
          400,
          "VALIDATION_ERROR",
          details,
        );
      }

      req.params = value;
    }
    return next();
  });
