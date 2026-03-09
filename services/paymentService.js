import stripe from "../config/stripe.js";
import Company from "../models/companyModel.js";
import { User } from "../models/userModel.js";
import { Plan } from "../models/planModel.js";
import { AppError } from "../utils/AppError.js";

const SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const FAILURE_EVENTS = new Set([
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
]);

export const handleStripeWebhook = async ({ rawBody, signature }) => {
  if (!rawBody) {
    throw new AppError("Webhook raw body is missing", 400, "RAW_BODY_MISSING");
  }

  let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      throw new AppError(
        `Invalid Stripe webhook signature: ${error.message}`,
        400,
        "INVALID_STRIPE_SIGNATURE"
      );
    }
//   }

  const eventType = event.type;
  const session = event.data?.object;

  let checkoutSessionId = null;
  let paymentIntentId = null;

  if (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded" ||
    eventType === "checkout.session.async_payment_failed" ||
    eventType === "checkout.session.expired"
  ) {
    checkoutSessionId = session?.id || null;
    paymentIntentId = session?.payment_intent || null;
  }

  if (eventType === "payment_intent.payment_failed") {
    paymentIntentId = session?.id || null;
  }

  let company = null;

  if (checkoutSessionId) {
    company = await Company.findOne({
      "stripe.checkout_session_id": checkoutSessionId,
    });
  }

  if (!company && paymentIntentId) {
    company = await Company.findOne({
      "stripe.payment_intent_id": paymentIntentId,
    });
  }

  if (!company) {
    return {
      processed: false,
      event: eventType,
      message: "Company not found for Stripe webhook",
    };
  }

  const adminUser = await User.findOne({
    company: company._id,
    role: "admin",
  });

  if (SUCCESS_EVENTS.has(eventType)) {
    if (!company.plan) {
      throw new AppError("Plan not attached to company", 400, "PLAN_NOT_ATTACHED");
    }

    const plan = await Plan.findById(company.plan);
    if (!plan) {
      throw new AppError("Plan not found or inactive", 400, "PLAN_NOT_FOUND");
    }

    if (
      company.status === "active" &&
      company.stripe?.checkout_session_id === checkoutSessionId
    ) {
      return {
        processed: true,
        event: eventType,
        companyId: company.companyId,
        message: "Webhook already processed",
      };
    }

    const startAt = new Date();
    const expiresAt = new Date(startAt);
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    company.status = "active";
    company.planStartAt = startAt;
    company.planExpiresAt = expiresAt;

    company.stripe = {
      ...(company.stripe || {}),
      checkout_session_id:
        checkoutSessionId || company.stripe?.checkout_session_id || null,
      payment_intent_id:
        paymentIntentId || company.stripe?.payment_intent_id || null,
      status: "paid",
    };

    await company.save();

    if (adminUser) {
      adminUser.status = "active";
      await adminUser.save();
    }

    return {
      processed: true,
      event: eventType,
      companyId: company.companyId,
      message: "Stripe payment success processed",
    };
  }

  if (FAILURE_EVENTS.has(eventType)) {
    company.status = "payment_failed";
    company.stripe = {
      ...(company.stripe || {}),
      checkout_session_id:
        checkoutSessionId || company.stripe?.checkout_session_id || null,
      payment_intent_id:
        paymentIntentId || company.stripe?.payment_intent_id || null,
      status: "failed",
    };

    await company.save();

    if (adminUser) {
      adminUser.status = "inactive";
      await adminUser.save();
    }

    return {
      processed: true,
      event: eventType,
      companyId: company.companyId,
      message: "Stripe payment failure processed",
    };
  }

  return {
    processed: false,
    event: eventType,
    companyId: company.companyId,
    message: "Unhandled Stripe webhook event",
  };
};