import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import {
  idParamSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerAdminSchema,
  createUserSchema,
  updateUserSchema,
  verifyOtpSchema,
  createSuperadminSchema,
  updateAdminSchema,
} from "../validations/userValidation.js";
import {
  createSuperadmin,
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  login,
  logout,
  refreshAccessToken,
  registerAdmin,
  updateUser,
  verifyOtpAndIssueTokens,
  getAdminById,
  getAllAdmins,
  updateAdmin,
  deleteAdmin,
} from "../controllers/userController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const userRoutes = express.Router();

// public auth
userRoutes.post(
  "/signup-superadmin",
  upload.single("profileImage"),
  userMiddleware({ body: createSuperadminSchema }),
  createSuperadmin
);

userRoutes.post(
  "/register",
  upload.single("profileImage"),
  userMiddleware({ body: registerAdminSchema }),
  registerAdmin
);

userRoutes.post("/login", userMiddleware({ body: loginSchema }), login);
userRoutes.post("/verify-otp", userMiddleware({ body: verifyOtpSchema }), verifyOtpAndIssueTokens);
userRoutes.post("/refresh-token", userMiddleware({ body: refreshTokenSchema }), refreshAccessToken);
userRoutes.post("/logout", userMiddleware({ auth: true, body: logoutSchema }), logout);

// superadmin manages admins
userRoutes.get(
  "/get-admin/:id",
  userMiddleware({
    auth: true,
    roles: ["superadmin"],
    params: idParamSchema,
  }),
  getAdminById
);

userRoutes.get(
  "/get-admins",
  userMiddleware({
    auth: true,
    roles: ["superadmin"],
  }),
  getAllAdmins
);

userRoutes.put(
  "/update-admin/:id",
  upload.single("profileImage"),
  userMiddleware({
    auth: true,
    roles: ["superadmin"],
    params: idParamSchema,
    body: updateAdminSchema,
  }),
  updateAdmin
);

userRoutes.delete(
  "/delete-admin/:id",
  userMiddleware({
    auth: true,
    roles: ["superadmin"],
    params: idParamSchema,
  }),
  deleteAdmin
);

// admin creates company users
userRoutes.post(
  "/create-user",
  upload.single("profileImage"),
  userMiddleware({
    auth: true,
    roles: ["admin"],
    body: createUserSchema,
  }),
  createUser
);

// user management
userRoutes.put(
  "/update-user/:id",
  upload.single("profileImage"),
  userMiddleware({
    auth: true,
    params: idParamSchema,
    body: updateUserSchema,
  }),
  updateUser
);

userRoutes.delete(
  "/delete-user/:id",
  userMiddleware({
    auth: true,
    roles: ["admin"],
    params: idParamSchema,
  }),
  deleteUser
);

userRoutes.get(
  "/get-user/:id",
  userMiddleware({
    auth: true,
    params: idParamSchema,
  }),
  getUserById
);

userRoutes.get(
  "/get-users",
  userMiddleware({
    auth: true,
    roles: ["superadmin", "admin"],
  }),
  getAllUsers
);

export default userRoutes;