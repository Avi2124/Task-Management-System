import express from "express";
import { handleStripeWebhook } from "../controllers/webhookController.js";

const webhookRoutes = express.Router();

webhookRoutes.post("/stripe", handleStripeWebhook);

export default webhookRoutes;