import { User } from "../models/userModel.js";
import Company from "../models/companyModel.js";
import bcrypt from "bcrypt";
import { sendResponse } from "../utils/sendResponse.js";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { sendOtpEmail } from "../config/mailer.js";

const OTP_EXP_MINUTES = 5;

// ---------- SIGNUP ----------
export const signup = async (req, res) => {
    try {
        const {name, email, password, role, companyId} = req.body;
        const existing = await User.findOne({email});
        if(existing){
            return sendResponse(res, {
                staus: false,
                statusCode: 409,
                message: "Email already registerd",
                data: null,
                error: {code: "EMAIL_EXISTS"},
            });
        }

        let companyObjectId = null;
        let finalCompanyId = null;

        if(role !== "superadmin"){
            const company = await Company.findOne({companyId});
            if(!company){
                return sendResponse(res, {
                    status: false,
                    statusCode: 400,
                    message: "Company not found.",
                    data: null,
                    error: {code: "COMPANY_NOT_FOUND"}
                });
            }
            companyObjectId = company._id;
            finalCompanyId = company.companyId;
        }

        const user = await User.create({name, email, password, role, company: companyObjectId, companyId: finalCompanyId});
        
        return sendResponse(res, {
            status: true,
            statusCode: 201,
            message: "User Created Successfuly",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    company: user.company,
                    companyId: user.companyId,
                    profileImage: user.profileImage,
                },
            },            
            error: null
        });
    } catch (error) {
        return sendResponse(res, {
            status: false,
            statusCode: 500,
            message: "Internal server error",
            data: null,
            error: {details: error.message}
        });
    }
};

// ---------- LOGIN ----------
export const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return sendResponse(res, {
                status: false,
                statusCode: 401,
                message: "Invalid credentials",
                data: null,
                error: {code: "INVALID_CREDENTIALS"}
            });
        }

        const isCorrect = await user.isPasswordCorrect(password);
        if(!isCorrect){
            return sendResponse(res, {
                status: false,
                statusCode: 401,
                message: "invalid credentials",
                data: null,
                error: {code: "INVALID_CREDENTIALS"}
            });
        }
        // if(user.role !== "superadmin"){
        //     if(!companyId || user.companyId !== companyId){
        //         return sendResponse(res, {
        //             status: false,
        //             statusCode: 400,
        //             message: "Invalid companyId",
        //             data: null,
        //             error: {code: "INVALID_COMPANY_ID"}
        //         });
        //     }
        // }
        // OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        user.otpCode = hashedOtp;
        user.otpExpiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000)
        await user.save();
        await sendOtpEmail({to: user.email, otp});
        return sendResponse(res, {
            status: true,
            statusCode: 200,
            message: "OTP sent to email",
            data: { email: user.email },
            error: null
        });
    } catch (error) {
        return sendResponse(res, {
            status: false,
            statusCode: 500,
            message: "Internal server error during login",
            data: null,
             error: {details: error.message}
        });
    }
};

// ---------- VERIFY OTP ----------
export const verifyOtpAndIssueTokens = async (req, res) => {
    try {
        const {email, otp} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return sendResponse(res, {
                status: false,
                statusCode: 400,
                message: "User not found",
                error: {code: "USER_NOT_FOUND"}
            });
        }

        if(!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()){
            return sendResponse(res, {
                status: false,
                statusCode: 400,
                message: "OTP expired or not found. Please login again.",
                data: null,
                error: {code: "OTP_EXPIRED"}
            });
        }

        const isMatch = await bcrypt.compare(otp, user.otpCode);
        if(!isMatch){
            return sendResponse(res, {
                status: false,
                statusCode: 400,
                message: "Invalid OTP",
                data: null,
                error: {code: "OTP_INCORRECT"}
            });
        }

        user.otpCode = null;
        user.otpExpiresAt = null;

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        user.refreshToken = refreshToken;
        await user.save();
        return sendResponse(res, {
            status: true,
            statusCode: 200,
            message: "OTP verified. Login successful",
            data: {                
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    company: user.company,
                    companyId: user.companyId,
                    profileImage: user.profileImage,
                    accessToken,
                    refreshToken                    
                },
            },
        });
    } catch (error) {
        console.error("verifyOtp error:", error);
        return sendResponse(res, {
            status: false,
            statusCode: 500,
            message: "Internal server error",
            erorr: {details: error.message}
        });
    }
};

// ---------- Refresh Access Token ----------
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendResponse(res, {
        status: false,
        statusCode: 400,
        message: "Refresh token is required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      return sendResponse(res, {
        status: false,
        statusCode: 401,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== refreshToken) {
      return sendResponse(res, {
        status: false,
        statusCode: 401,
        message: "Refresh token not valid",
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    return sendResponse(res, {
      message: "Token refreshed",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("refreshAccessToken error:", error);
    return sendResponse(res, {
      status: false,
      statusCode: 500,
      message: "Internal server error",
      error: { details: error.message },
    });
  }
};

// ---------- LOGOUT ----------
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendResponse(res, {
        status: false,
        statusCode: 400,
        message: "Refresh token is required to logout",
        data: null,
        error: { code: "NO_REFRESH_TOKEN" },
      });
    }

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decoded._id);
        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      } catch {
        return sendResponse(res, {
            status: false,
            statusCode: 500,
            message: "Internal server error during logout",
            data: null,
            error: { details: error.message },
        });
      }
    }

    return sendResponse(res, {
      message: "Logged out",
    });
  } catch (error) {
    console.error("logout error:", error);
    return sendResponse(res, {
      status: false,
      statusCode: 500,
      message: "Internal server error",
      error: { details: error.message },
    });
  }
};