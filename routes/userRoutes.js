import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { idParamSchema, loginSchema, logoutSchema, refreshTokenSchema, signupSchema, updateUserSchema, verifyOtpSchema } from "../validations/userValidation.js";
import { deleteUser, getAllUsers, getUserById, login, logout, refreshAccessToken, signup, updateUser, verifyOtpAndIssueTokens } from "../controllers/userController.js";
import { upload } from "../middleware/uploadMiddleware.js";


const userRoutes = express.Router();
userRoutes.post("/signup", upload.single("profileImage"), userMiddleware({body: signupSchema}), signup);
userRoutes.post("/login", userMiddleware({body: loginSchema}), login);
userRoutes.post("/verify-otp", userMiddleware({body: verifyOtpSchema}), verifyOtpAndIssueTokens);
userRoutes.post("/refresh-token", userMiddleware({body: refreshTokenSchema}), refreshAccessToken);
userRoutes.post("/logout", userMiddleware({auth: true, body: logoutSchema}), logout);

userRoutes.put("/update-user/:id", upload.single("profileImage"), userMiddleware({auth: true, params: idParamSchema ,body: updateUserSchema}), updateUser);
userRoutes.delete("/delete-user/:id", userMiddleware({auth: true, params: idParamSchema , roles: ["superadmin", "admin"]}), deleteUser);
userRoutes.get("/get-user/:id", userMiddleware({auth: true, params: idParamSchema}), getUserById);
userRoutes.get("/get-users", userMiddleware({auth: true, roles: ["superadmin", "admin"]}), getAllUsers);

export default userRoutes;