import Company from "../models/companyModel.js";
import { AppError } from "../utils/AppError.js";
import stripe from "../config/stripe.js";
import { Plan } from "../models/planModel.js";
import { User } from "../models/userModel.js";

const toCompanyDTO = (c) => ({
  id: c._id,
  name: c.name,
  description: c.description,
  address: c.address,
  website: c.website,
  companyId: c.companyId,
  status: c.status,
  plan: c.plan,
  planStartAt: c.planStartAt,
  planExpiresAt: c.planExpiresAt,
  razorpay: c.razorpay,
});

export const createCompany = async ({
  name,
  description,
  address,
  website,
  companyId,
}) => {
  const existing = await Company.findOne({
    companyId,
    isDeleted: { $ne: true },
  });

  if (existing) {
    throw new AppError(
      "companyId already exists. Please choose another.",
      409,
      "COMPANY_ID_EXISTS"
    );
  }

  const company = await Company.create({
    name,
    description,
    address,
    website,
    companyId,
    status: "pending_payment",
  });

  return { company: toCompanyDTO(company) };
};

export const getCompanyById = async (companyId) => {
  const company = await Company.findOne({
    companyId,
    isDeleted: { $ne: true },
  });

  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }

  return { company: toCompanyDTO(company) };
};

export const getAllCompanies = async ({ query, requester }) => {
  if (!requester || requester.role !== "superadmin") {
    throw new AppError(
      "Only superadmin can view all companies",
      403,
      "FORBIDDEN"
    );
  }

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "name",
    sortOrder = "asc",
    ...filters
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;

  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const match = {
    isDeleted: { $ne: true },
  };

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    const values = String(value)
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "");

    if (!values.length) return;

    match[key] = values.length === 1 ? values[0] : { $in: values };
  });

  if (search) {
    const regex = new RegExp(search, "i");
    match.$or = [
      { name: { $regex: regex } },
      { description: { $regex: regex } },
      { address: { $regex: regex } },
      { website: { $regex: regex } },
      { companyId: { $regex: regex } },
    ];
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;
  const sort = { [sortKey || "name"]: sortDir, _id: -1 };
  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    Company.find(match).sort(sort).skip(skip).limit(limit),
    Company.countDocuments(match),
  ]);

  return {
    companies: companies.map(toCompanyDTO),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const updateCompany = async ({ id, payload }) => {
  const updates = { ...payload };

  if (Object.prototype.hasOwnProperty.call(updates, "companyId")) {
    delete updates.companyId;
  }

  const company = await Company.findOneAndUpdate(
    {
      _id: id,
      isDeleted: { $ne: true },
    },
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }

  return { company: toCompanyDTO(company) };
};

export const deleteCompany = async (id) => {
  const company = await Company.findOne({
    _id: id,
    isDeleted: { $ne: true },
  });

  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }

  company.isDeleted = true;
  company.isActive = false;
  company.status = "expired";
  await company.save();

  await User.updateMany(
    {
      company: company._id,
      isDeleted: { $ne: true },
    },
    {
      $set: {
        isDeleted: true,
        isActive: false,
        status: "inactive",
        refreshToken: null,
      },
    }
  );

  return { message: "Company deleted successfully" };
};

export const getRenewalPlans = async ({ requester }) => {
  if (!requester?.id || requester.role !== "admin") {
    throw new AppError("Only admin can view renewal plans", 403, "FORBIDDEN");
  }

  const adminUser = await User.findOne({
    _id: requester.id,
    isDeleted: { $ne: true },
  });

  if (!adminUser || !adminUser.company) {
    throw new AppError("Admin company not found", 404, "COMPANY_NOT_FOUND");
  }

  const company = await Company.findOne({
    _id: adminUser.company,
    isDeleted: { $ne: true },
  });

  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }

  const plans = await Plan.find({
    isActive: true,
    isDeleted: { $ne: true },
  }).sort({ price: 1 });

  return {
    company: {
      id: company._id,
      name: company.name,
      companyId: company.companyId,
      status: company.status,
      currentPlan: company.plan,
      planStartAt: company.planStartAt,
      planExpiresAt: company.planExpiresAt,
    },
    plans,
  };
};

export const createRenewPlanCheckout = async ({ requester, planId }) => {
  if (!requester?.id || requester.role !== "admin") {
    throw new AppError("Only admin can renew company plan", 403, "FORBIDDEN");
  }

  const adminUser = await User.findOne({
    _id: requester.id,
    isDeleted: { $ne: true },
  });

  if (!adminUser || !adminUser.company) {
    throw new AppError("Admin company not found", 404, "COMPANY_NOT_FOUND");
  }

  const company = await Company.findOne({
    _id: adminUser.company,
    isDeleted: { $ne: true },
  });

  if (!company) {
    throw new AppError("Company not found", 404, "COMPANY_NOT_FOUND");
  }

  const selectedPlan = await Plan.findOne({
    _id: planId,
    isDeleted: { $ne: true },
  });

  if (!selectedPlan || !selectedPlan.isActive) {
    throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: selectedPlan.name,
            description: `Renewal subscription for ${company.name}`,
          },
          unit_amount: Math.round(Number(selectedPlan.price) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      companyId: company._id.toString(),
      adminId: adminUser._id.toString(),
      planId: selectedPlan._id.toString(),
      renewal: "true",
    },
    success_url:
      process.env.STRIPE_SUCCESS_URL ||
      "http://localhost:1213/payment-success",
    cancel_url:
      process.env.STRIPE_CANCEL_URL || "http://localhost:1213/payment-failed",
  });

  company.plan = selectedPlan._id;
  company.stripe = {
    checkout_session_id: session.id,
    checkout_url: session.url,
    payment_intent_id: session.payment_intent || null,
    status: session.payment_status || "created",
  };

  if (company.status === "expired" || company.status === "payment_failed") {
    company.status = "pending_payment";
  }

  await company.save();

  return {
    company: {
      id: company._id,
      name: company.name,
      companyId: company.companyId,
      status: company.status,
      plan: company.plan,
    },
    payment: {
      checkoutSessionId: session.id,
      checkout_url: session.url,
    },
  };
};