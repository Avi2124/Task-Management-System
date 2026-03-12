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
  try {
    await transporter.sendMail({
      from: `"Task Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "Your login OTP",
      text: `Your login OTP is ${otp}. It is valid for 5 minutes.`,
      html: `<p>Your login OTP is <h1 style="letter-spacing: 4px;">${otp}</h1>. It is valid for <b>5 minutes</b>.</p><p>If you did not request this, please ignore this email.</p>`,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

export const sendSubscriptionReminderEmail = async ({
  to,
  name,
  companyName,
  planName,
  expiryDate,
  daysLeft,
}) => {
  try {
    await transporter.sendMail({
      from: `"Task Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `Subscription Expiry Reminder (${daysLeft} day${daysLeft > 1 ? "s" : ""} left)`,

      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Hello ${name},</h2>

          <p>Your company subscription will expire in <b>${daysLeft} day${daysLeft > 1 ? "s" : ""}</b>.</p>

          <p>
            <b>Company:</b> ${companyName} <br/>
            <b>Plan:</b> ${planName || "N/A"} <br/>
            <b>Expiry Date:</b> ${new Date(expiryDate).toDateString()}
          </p>

          <p>Please renew your subscription to continue using the platform.</p>

          <br/>

          <p>
            Regards,<br/>
            <b>Task Management Platform</b>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending subscription reminder email:", error);
  }
};