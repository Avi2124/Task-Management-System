import nodemailer from "nodemailer";
import "dotenv/config";
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async ({ to, otp }) => {
  await transporter.sendMail({
    from: `"Task Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: "Your login OTP",
    text: `Your login OTP is ${otp}. It is valid for 5 minutes.`,
    html: `<p>Your login OTP is <b>${otp}</b>. It is valid for <b>5 minutes</b>.</p>`,
  });
};