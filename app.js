import express from "express";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import path from "path";
import planRoutes from "./routes/planRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const parseCookies = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf("=");
      if (index === -1) return acc;

      const key = part.slice(0, index).trim();
      const value = decodeURIComponent(part.slice(index + 1).trim());

      acc[key] = value;
      return acc;
    }, {});
};

const app = express();

app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), (req, res, next) => {
  req.rawBody = req.body.toString("utf-8");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie || "");
  next();
})

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.send("Task Management API");
});

app.get("/socket-test", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "socket-test.html"));
});

app.get("/payment-success", (req, res) => {
  res.send(`
        <h1>Payment Successful ✅</h1>
        <p>Your payment has been completed successfully.</p>
    `);
});

app.get("/payment-failed", (req, res) => {
  res.send(`
        <h1>Payment Failed ❌</h1>
        <p>Your payment was cancelled or failed.</p>
    `);
});

app.use((err, req, res, next) => {
  console.log("Unhandled erorr:", err);
  res.status(500).json({
    status: false,
    message: "Something went wrong",
    data: null,
    error: { details: err.message },
  });
});

app.use("/api/auth", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/tasks", taskRoutes)
app.use("/api", commentRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/public", express.static(path.join(process.cwd(), "public")));
app.use(errorHandler);

export default app;