import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    website: { type: String, required: true },
    companyId: { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: ["pending_payment", "active", "payment_failed"],
      default: "pending_payment",
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },

    planStartAt: { type: Date, default: null },
    planExpiresAt: { type: Date, default: null },

    stripe: {
      checkout_session_id: { type: String, default: null },
      checkout_url: { type: String, default: null },
      payment_intent_id: { type: String, default: null },
      status: { type: String, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);