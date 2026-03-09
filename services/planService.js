import { Plan } from "../models/planModel.js";
import { AppError } from "../utils/AppError.js"


export const createPlan = async ({payload, requester}) => {
    if(!requester || requester.role !== "superadmin"){
        throw new AppError("Only superadmin can create plans", 403, "FORBIDDEN");
    }
    const {name, price, durationDays, projectLimit, userLimit} = payload;
    const existing = await Plan.findOne({name});
    if(existing){
        throw new AppError("Plan already exists", 409, "PLAN_EXISTS");
    }
    const plan = await Plan.create({name, price, durationDays, projectLimit, userLimit});

    return{
        plan: {
            id: plan._id,
            name: plan.name,
            price: plan.price,
            durationDays: plan.durationDays,
            projectLimit: plan.projectLimit,
            userLimit: plan.userLimit,
            isActive: plan.isActive
        },
    };
};

export const getPlans = async ({ query }) => {

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "createdAt",
    sortOrder = "desc",
    ...filters
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;

  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const match = {};

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    const values = String(value)
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "");

    if (values.length === 1) {
      match[key] = values[0];
    } else {
      match[key] = { $in: values };
    }
  });

  const pipeline = [{ $match: match }];

  // Search
  if (search) {
    const regex = new RegExp(search, "i");

    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: regex } }
        ],
      },
    });
  }

  // Sorting
  const sortDir = sortOrder === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortKey]: sortDir, _id: -1 } });

  // Pagination
  const skip = (page - 1) * limit;

  pipeline.push({
    $facet: {
      data: [
        { $skip: skip },
        { $limit: limit }
      ],
      total: [
        { $count: "count" }
      ],
    },
  });

  const result = await Plan.aggregate(pipeline);

  const plans = result[0]?.data || [];
  const total = result[0]?.total?.[0]?.count || 0;

  return {
    plans: plans.map((p) => ({
      id: p._id,
      name: p.name,
      price: p.price,
      durationDays: p.durationDays,
      projectLimit: p.projectLimit,
      userLimit: p.userLimit,
      isActive: p.isActive
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updatePlan = async ({planId, payload, requester}) => {
    if(!requester || requester.role !== "superadmin"){
        throw new AppError("Only superadmin can update plans", "FORBIDDEN");
    }
    const plan = await Plan.findById(planId);
    if(!plan){
        throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
    }
    const {name, price, durationDays, projectLimit, userLimit} = payload;

    if(name) plan.name = name;
    if(price) plan.price = price;
    if(durationDays) plan.durationDays = durationDays;
    if(projectLimit) plan.projectLimit = projectLimit;
    if(userLimit) plan.userLimit = userLimit;

    await plan.save();
    return {
        plan: {
            id: plan._id,
            name: plan.name,
            price: plan.price,
            durationDays: plan.durationDays,
            projectLimit: plan.projectLimit,
            userLimit: plan.userLimit,
            isActive: plan.isActive
        },
    };
};

export const deletePlan = async ({planId, requester}) => {
    if(!requester || requester.role !== "superadmin"){
        throw new AppError("only superadmin can delete plans", 403, "FORBIDDEN");
    }
    const plan = await Plan.findById(planId);
    if(!plan){
        throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
    }
    await Plan.findByIdAndDelete(planId);
};