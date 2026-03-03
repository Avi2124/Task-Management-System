import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { loginSchema, logoutSchema, refreshTokenSchema, signupSchema, verifyOtpSchema } from "../validations/userValidation.js";
import { login, logout, refreshAccessToken, signup, verifyOtpAndIssueTokens } from "../controllers/userController.js";

const userRoutes = express.Router();
userRoutes.post("/signup", userMiddleware({body: signupSchema}), signup);
userRoutes.post("/login", userMiddleware({body: loginSchema}), login);
userRoutes.post("/verify-otp", userMiddleware({body: verifyOtpSchema}), verifyOtpAndIssueTokens);
userRoutes.post("/refresh-token", userMiddleware({body: refreshTokenSchema}), refreshAccessToken);
userRoutes.post("/logout", userMiddleware({body: logoutSchema}), logout);

export default userRoutes;