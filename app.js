import express from "express";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express()
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send("Task Management API");
});

app.use((err, req, res, next) => {
    console.log("Inhandled erorr:", err);
    res.status(500).json({status: false, message: "Something went wrong", data: null, error: {details: err.message}});
});

app.use("/api/auth", userRoutes);
app.use("/api/companies", companyRoutes);

app.use(errorHandler);

export default app;