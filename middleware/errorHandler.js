import { sendResponse } from "../utils/sendResponse.js";


export const errorHandler = (err, req, res, next) => {
    console.error("GLOBAL ERROR HANDLER:", err);

    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";
    let code = err.code || "INTERNAL_ERROR";
    let data = err.data || null;

    if(err.isJoi){
        statusCode = 400;
        message = err.details?.[0]?.message || "Validation error";
        code = "VALIDATION_ERROR";
    }

    if(err.name === "CastError"){
        statusCode = 400;
        message = "Invalid ID format";
        code = "INVALID_ID";
    }

    if(err.name === "JsonWebTokenError"){
        statusCode = 401;
        message = "Invalid token",
        code = "INVALID_TOKEN";
    }
    if(err.name === "TokenExpiredError"){
        statusCode = 401;
        message = "Token expired";
        code = "TOKEN_EXPIRED";
    }

    return sendResponse(res, {
        status: false,
        statusCode,
        message,
        data,
        error: {
            code,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        },
    });
};