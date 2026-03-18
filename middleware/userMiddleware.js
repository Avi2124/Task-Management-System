import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { asyncHandler } from "./asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import Company from "../models/companyModel.js";

const buildUserMiddleware = ({
  body = null,
  params = null,
  auth = false,
  roles = [],
  allowExpiredPlan = false,
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

      let company = null;

      if (user.company) {
        company = await Company.findById(user.company);

        if (!company) {
          throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
        }

        const now = new Date();

        if (
          company.status === "active" &&
          company.planExpiresAt &&
          company.planExpiresAt < now
        ) {
          company.status = "expired";
          await company.save();
        }

        if (!allowExpiredPlan && company.status !== "active") {
          throw new AppError(
            company.status === "expired"
              ? "Company subscription expired. Please renew your plan."
              : "Company subscription is not active",
            403,
            company.status === "expired"
              ? "PLAN_EXPIRED"
              : "COMPANY_PLAN_INACTIVE",
          );
        }
      }
      if (roles.length > 0 && !roles.includes(user.role)) {
        throw new AppError("Access denied", 403, "FORBIDDEN");
      }

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
      req.company = company;
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

  export const userMiddleware = (options = {}) => 
    buildUserMiddleware({...options, allowExpiredPlan: false});

  export const userMiddlewareAllowExpiredPlan = (options = {}) =>
    buildUserMiddleware({...options, allowExpiredPlan: true});
