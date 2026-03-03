export class AppError extends Error {
    constructor(message, statusCode = 500, code = "INTERNAL_ERROR", data = null){
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.data = data;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}