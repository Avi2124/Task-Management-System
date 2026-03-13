import Company from "../models/companyModel.js";
import { Plan } from "../models/planModel.js";
import { User } from "../models/userModel.js"
import { AppError } from "../utils/AppError.js";

export const getSuperAdminDashboard = async ({requester}) => {
    const requesterUser = await User.findById(requester.id);

    if(!requesterUser){
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if(requesterUser.role !== "superadmin"){
        throw new AppError("Unauthorized access", 403, "UNAUTHORIZED");
    }

    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);

    const [
        totalCompanies,
        activeCompanies,
        expiredCompanies,
        totalSubscriptionPlans,
        totalUserAcrossAllCompanies,
        recentCompanies,
        expiringSubscriptions,
        revenueData
    ] = await Promise.all([
        Company.countDocuments({}),

        Company.countDocuments({
            status: "active",
            planExpiresAt: {$gte: now}
        }),
        Company.countDocuments({
            $or: [
                {status: "expired"},
                {planExpiresAt: {$lt: now}}
            ]
        }),
        Plan.countDocuments({
            isActive: true
        }),

        User.countDocuments({
            role: {$ne: "superadmin"}
        }),
        Company.find({}).populate("plan", "name price, durationDays")
        .sort({createdAt: -1}).limit(5)
        .select("name companyId status plan planStartAt planExpiresAt createdAt"),

        Company.find({
            status: "active",
            planExpiresAt: {
                $gte: now,
                $lte: next7Days
            }
        })
            .populate("plan", "name price durationDays").sort({planExpiresAt: 1})
            .limit(5).select("name companyId status plan planExpiresAt"),
        Company.aggregate([
            {
                $match: {
                    plan: {$ne: null},
                    status: {$in: ["active", "expired"]},
                },
            },
            {
                $lookup: {
                    from: "plans",
                    localField: "plan",
                    foreignField: "_id",
                    as: "planDetails"
                },
            },
            {
                $unwind:{
                    path: "$planDetails",
                    preserveNullAndEmptyArrays: false
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {$sum: "$planDetails.price"},
                    monthlyRevenue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        {$eq: [{$year: "$createdAt"}, now.getFullYear()]},
                                        {$eq: [{$month: "$createdAt"}, now.getMonth() + 1]}
                                    ],
                                },
                                "$planDetails.price",
                                0,
                            ],
                        },
                    },
                    yearlyRevenue: {
                        $sum: {
                            $cond: [
                                {$eq: [{$year: "$createdAt"}, now.getFullYear()]},
                                "$planDetails.price",
                                0,
                            ],
                        },
                    },
                },
            },
        ]),
        ]);

        return{
            stats: {
                totalCompanies,
                activeCompanies,
                expiredCompanies,
                totalSubscriptionPlans,
                totalUserAcrossAllCompanies
            },
            recentCompanies,
            expiringSubscriptions,
            revenueSummary: revenueData[0] || {
                totalRevenue: 0,
                monthlyRevenue: 0,
                yearlyRevenue: 0
            },
        };
};