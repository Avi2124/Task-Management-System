import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { handleStripeWebhook as handleStripeWebhookService } from "../services/paymentService.js";

export const handleStripeWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers["stripe-signature"] || req.headers["Stripe-Signature"];

    const result = await handleStripeWebhookService({
        rawBody: req.rawBody,
        signature
    });
    return sendResponse(res, {
        status: true,
        statusCode: 200,
        message: "Stripe webhook processed successfully",
        data: result,
        error: null
    });
});