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

export const sendUserCreatedEmail = async ({
  to, name, companyName, password
}) => {
  try {
    await transporter.sendMail({
      from: `"Task Management"<${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "Your account has been created",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Hello ${name},</h2>
          <p>Your account has been created successfully.</p>

          <p>
            <b>Company:</b> ${companyName || "N/A"} <br/>
            <b>Email:</b> ${to} <br/>
            <b>Password:</b> ${password}
          </p>

          <p>Please login and change your password after first login.</p>

          <br/>

          <p>
            Regards,<br/>
            <b>Task Management Platform</b>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending user created email:", error);
  }
};

export const sendProjectAssignedEmail = async ({
  to,
  name,
  projectName,
  projectCode,
  description,
}) => {
  try {
    await transporter.sendMail({
      from: `"Task Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "Project Assigned",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Hello ${name},</h2>
          <p>You have been assigned to a project.</p>

          <p>
            <b>Project Name:</b> ${projectName} <br/>
            <b>Project Code:</b> ${projectCode || "N/A"} <br/>
            <b>Description:</b> ${description}
          </p>

          <br/>
          <p>
            Regards,<br/>
            <b>Task Management Platform</b>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending project assigned email:", error);
  }
};

export const sendTaskAssignedEmail = async ({
  to, name, taskTitle, projectName, dueDate
}) => {
  try {
    await transporter.sendMail({
      from: `"Task Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "New Task Assigned",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Hello ${name},</h2>
          <p>A new task has been assigned to you.</p>

          <p>
            <b>Task:</b> ${taskTitle} <br/>
            <b>Project:</b> ${projectName || "N/A"} <br/>
            <b>Due Date:</b> ${dueDate ? new Date(dueDate).toDateString() : "N/A"}
          </p>

          <br/>

          <p>
            Regards,<br/>
            <b>Task Management Platform</b>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending task assignment email:", error);
  }
};

export const sendImportantAlertEmail = async ({
  to, name, title, message
}) => {
  try {
    await transporter.sendMail({
      from: `"Task Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Hello ${name},</h2>
          <p>${message}</p>

          <br/>

          <p>
            Regards,<br/>
            <b>Task Management Platform</b>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending important alert email:", error);
  }
};

export const sendTaskStatusUpdatedEmail = async ({
  to,
  name,
  taskTitle,
  oldStatus,
  newStatus,
}) => {
  try {
    await transporter.sendMail({
      from: `"Task Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "Task Status Updated",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Hello ${name},</h2>
          <p>The task status has been updated.</p>

          <p>
            <b>Task:</b> ${taskTitle} <br/>
            <b>Old Status:</b> ${oldStatus} <br/>
            <b>New Status:</b> ${newStatus}
          </p>

          <br/>
          <p>
            Regards,<br/>
            <b>Task Management Platform</b>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending task status updated email:", error);
  }
};

export const sendTaskDueRemainderEmail = async ({
  to, name,
  taskTitle, projectName,
  dueDate
}) => {
  try {
    await transporter.sendMail({
      from: `"Task Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "Task Due Remainder - 1 day left",
      html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hello ${name},</h2>
        <p>This is a remainder that one of your tasks is due within <b>1 day</b>.</p>
        <p>
          <b>Task:</b> ${taskTitle}<br/>
          <b>Project:</b> ${projectName || "N/A"}<br/>
          <b>Due Date:</b> ${dueDate ? new Date(dueDate).toDateString(): "N/A"}
        </p>
        <p>Please make sure to complete it before the deadline.</p>
        <br/>
        <p>
          Regards,<br/>
          <b>Task management Plateform</p>
        </p>
        </div>
      `
    });
  } catch (error) {
    console.error("Error sending task due remainder email:", error);
  }
};

export const sendResetPasswordEmail = async ({ to, name, token }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Password Reset Request",
    html: `
    <div style="font-family: Arial, sens-serif; line-height: 1.6;">
      <h2>Password Reset</h2>
      <p>Hello ${name || "User"},</p>
      <p>You requested to reset your password.</p>
      <p>Use this reset token:</p>
      <p style="fint-size: 18px; font-weight: bold;">${token}</p>
      <p>This token will expire in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
    `,
  });
};