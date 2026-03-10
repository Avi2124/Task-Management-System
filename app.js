import express from "express";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import path from "path";
import planRoutes from "./routes/planRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();

app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), (req, res, next) => {
  req.rawBody = req.body.toString("utf-8");
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.send("Task Management API");
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
app.use("/api/webhooks/stripe", webhookRoutes);
app.use(errorHandler);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export default app;