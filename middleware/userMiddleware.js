import jwt from "jsonwebtoken";
import { sendResponse } from "../utils/sendResponse.js";
import { User } from "../models/userModel.js";

export const userMiddleware =
  ({ body = null, params = null, auth = false, roles = [] } = {}) =>
  async (req, res, next) => {
    try {
      if (auth) {
        const header = req.headers.authorization || req.headers.Authorization;

        if (!header || !header.startsWith("Bearer ")) {
          return sendResponse(res, {
            status: false,
            statusCode: 401,
            message: "Authorization header missing or invalid",
            data: null,
            error: { details: "NO_TOKEN" },
          });
        }

        const token = header.split(" ")[1];

        let decoded;
        try {
          decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        } catch (error) {
          const isExpired = error.name === "TokenExpiredError";
          return sendResponse(res, {
            status: false,
            statusCode: 401,
            message: isExpired
              ? "Access token expired"
              : "Invalid access token",
            data: null,
            error: { code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN" },
          });
        }

        const user = await User.findById(decoded._id).select("-password");
        if (!user) {
          return sendResponse(res, {
            status: false,
            statusCode: 401,
            message: "User not found for this token",
            data: null,
            error: { code: "USER_NOT_FOUND" },
          });
        }

        if (roles.length > 0 && !roles.includes(user.role)) {
          return sendResponse(res, {
            status: false,
            statusCode: 403,
            message: "Access denied",
            data: null,
            error: { code: "FORBIDDEN" },
          });
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
          return sendResponse(res, {
            status: false,
            statusCode: 400,
            message: "Validation error",
            data: null,
            error: {
              details: error.details.map((d) => d.message),
            },
          });
        }

        req.body = value;
      }

      if (params) {
        const { error, value } = params.validate(req.params, {
          abortEarly: false,
        });

        if (error) {
          return sendResponse(res, {
            status: false,
            statusCode: 400,
            message: "Validation error",
            data: null,
            error: {
              details: error.details.map((d) => d.message),
            },
          });
        }

        req.params = value;
      }
      return next();
    } catch (error) {
      console.error("User middleware error:", error);
      return sendResponse(res, {
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
        error: { details: error.message },
      });
    }
  };