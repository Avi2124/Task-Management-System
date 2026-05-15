import Company from "../models/companyModel.js";
import { Plan } from "../models/planModel.js";
import { User } from "../models/userModel.js";
import { Project } from "../models/projectModel.js";
import { Task } from "../models/taskModel.js";
import { Comment } from "../models/commentModel.js";
import { TaskHistory } from "../models/taskHistoryModel.js";
import { AppError } from "../utils/AppError.js";

export const getDashboard = async ({ requester }) => {
  const requesterUser = await User.findById(requester.id).populate("company");

  if (!requesterUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(now.getDate() + 7);

    // ========= Super Admin Dashboard =========

  if (requesterUser.role === "superadmin") {
    const [
      totalCompanies,
      activeCompanies,
      expiredCompanies,
      pendingPaymentCompanies,
      totalSubscriptionPlans,
      totalUsersAcrossAllCompanies,
      totalAdmins,
      totalNormalUsers,
      totalProjects,
      activeProjects,
      recentCompanies,
      expiringSubscriptions,
      revenueData,
    ] = await Promise.all([
      Company.countDocuments({}),
      Company.countDocuments({
        status: "active",
        planExpiresAt: { $gte: now },
      }),
      Company.countDocuments({
        $or: [{ status: "expired" }, { planExpiresAt: { $lt: now } }],
      }),
      Company.countDocuments({
        status: "pending_payment",
      }),
      Plan.countDocuments({
        isActive: true,
      }),
      User.countDocuments({
        role: { $ne: "superadmin" },
      }),
      User.countDocuments({
        role: "admin",
      }),
      User.countDocuments({
        role: "user",
      }),
      Project.countDocuments({
        isDeleted: false,
      }),
      Project.countDocuments({
        isDeleted: false,
        isActive: true,
      }),

      // recentCompanies with $lookup instead of populate("plan")
      Company.aggregate([
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "plans",
            localField: "plan",
            foreignField: "_id",
            as: "plan",
          },
        },
        {
          $unwind: {
            path: "$plan",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            name: 1,
            companyId: 1,
            status: 1,
            planStartAt: 1,
            planExpiresAt: 1,
            createdAt: 1,
            plan: {
              _id: "$plan._id",
              name: "$plan.name",
              price: "$plan.price",
              durationDays: "$plan.durationDays",
            },
          },
        },
      ]),

      // expiringSubscriptions with $lookup instead of populate("plan")
      Company.aggregate([
        {
          $match: {
            status: "active",
            planExpiresAt: {
              $gte: now,
              $lte: next7Days,
            },
          },
        },
        {
          $sort: { planExpiresAt: 1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "plans",
            localField: "plan",
            foreignField: "_id",
            as: "plan",
          },
        },
        {
          $unwind: {
            path: "$plan",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            name: 1,
            companyId: 1,
            status: 1,
            planExpiresAt: 1,
            plan: {
              _id: "$plan._id",
              name: "$plan.name",
              price: "$plan.price",
              durationDays: "$plan.durationDays",
            },
          },
        },
      ]),

      Company.aggregate([
        {
          $match: {
            plan: { $ne: null },
            status: { $in: ["active", "expired"] },
          },
        },
        {
          $lookup: {
            from: "plans",
            localField: "plan",
            foreignField: "_id",
            as: "planDetails",
          },
        },
        {
          $unwind: {
            path: "$planDetails",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$planDetails.price" },
          },
        },
      ]),
    ]);

    return {
      role: "superadmin",
      stats: {
        totalCompanies,
        activeCompanies,
        expiredCompanies,
        pendingPaymentCompanies,
        totalSubscriptionPlans,
        totalUsersAcrossAllCompanies,
        totalAdmins,
        totalNormalUsers,
        totalProjects,
        activeProjects,
      },
      recentCompanies,
      expiringSubscriptions,
      revenueSummary: revenueData[0] || {
        totalRevenue: 0,
      },
    };
  }

    // ========= Admin Dashboard =========

  if (requesterUser.role === "admin") {
    if (!requesterUser.company) {
      throw new AppError("Company not found for admin", 404, "COMPANY_NOT_FOUND");
    }

    const companyId = requesterUser.company._id;

    const [
      totalCompanyUsers,
      activeCompanyUsers,
      inactiveCompanyUsers,
      companyAdmins,
      companyNormalUsers,
      totalProjects,
      activeProjects,
      inactiveProjects,
      totalComments,
      totalTaskHistories,
      recentCompanyUsers,
      recentProjects,
      recentTasks,
      recentComments,
      recentTaskActivity,
      companyPlan,
    ] = await Promise.all([
      User.countDocuments({
        company: companyId,
        role: { $in: ["admin", "user"] },
      }),
      User.countDocuments({
        company: companyId,
        status: "active",
        role: { $in: ["admin", "user"] },
      }),
      User.countDocuments({
        company: companyId,
        status: "inactive",
        role: { $in: ["admin", "user"] },
      }),
      User.countDocuments({
        company: companyId,
        role: "admin",
      }),
      User.countDocuments({
        company: companyId,
        role: "user",
      }),
      Project.countDocuments({
        company: companyId,
        isDeleted: false,
      }),
      Project.countDocuments({
        company: companyId,
        isDeleted: false,
        isActive: true,
      }),
      Project.countDocuments({
        company: companyId,
        isDeleted: true,
        isActive: false,
      }),
      Comment.countDocuments({
        company: companyId,
        isDeleted: false,
      }),
      TaskHistory.countDocuments({
        company: companyId,
      }),
      User.find({
        company: companyId,
      })
        .select("name email status")
        .sort({ createdAt: -1 })
        .limit(1),
      Project.find({
        company: companyId,
        isDeleted: false,
      })
        .select("name shortCode description isActive")
        .sort({ createdAt: -1 })
        .limit(1),

      // recentTasks with $lookup instead of populate
      Task.aggregate([
        {
          $match: {
            company: companyId,
            isDeleted: false,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project",
          },
        },
        {
          $unwind: {
            path: "$project",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignedTo",
            foreignField: "_id",
            as: "assignedTo",
          },
        },
        {
          $unwind: {
            path: "$assignedTo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "reportTo",
            foreignField: "_id",
            as: "reportTo",
          },
        },
        {
          $unwind: {
            path: "$reportTo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            taskId: 1,
            title: 1,
            priority: 1,
            status: 1,
            dueDate: 1,
            project: {
              _id: "$project._id",
              name: "$project.name",
              shortCode: "$project.shortCode",
            },
            assignedTo: {
              _id: "$assignedTo._id",
              name: "$assignedTo.name",
            },
            reportTo: {
              _id: "$reportTo._id",
              name: "$reportTo.name",
            },
          },
        },
      ]),

      // recentComments with $lookup instead of populate
      Comment.aggregate([
        {
          $match: {
            company: companyId,
            isDeleted: false,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "task",
          },
        },
        {
          $unwind: {
            path: "$task",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            message: 1,
            isEdited: 1,
            user: {
              _id: "$user._id",
              name: "$user.name",
              email: "$user.email",
            },
            task: {
              _id: "$task._id",
              taskId: "$task.taskId",
              title: "$task.title",
            },
          },
        },
      ]),

      // recentTaskActivity with $lookup instead of populate
      TaskHistory.aggregate([
        {
          $match: {
            company: companyId,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "task",
          },
        },
        {
          $unwind: {
            path: "$task",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "changedBy",
            foreignField: "_id",
            as: "changedBy",
          },
        },
        {
          $unwind: {
            path: "$changedBy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            action: 1,
            field: 1,
            oldValue: 1,
            newValue: 1,
            task: {
              _id: "$task._id",
              taskId: "$task.taskId",
              title: "$task.title",
              status: "$task.status",
            },
            changedBy: {
              _id: "$changedBy._id",
              name: "$changedBy.name",
              email: "$changedBy.email",
            },
          },
        },
      ]),

      requesterUser.company.plan
        ? Plan.findById(requesterUser.company.plan).select(
            "name price durationDays projectLimit userLimit isActive"
          )
        : null,
    ]);

    const adminTaskStatsResult = await Task.aggregate([
      {
        $match: {
          company: companyId,
          isDeleted: false,
        },
      },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          overdue: [
            {
              $match: {
                dueDate: { $lt: now },
                status: { $ne: "done" },
              },
            },
            {
              $match: {
                $expr: {
                  $not: {
                    $and: [
                      { $eq: ["$status", "deployment"] },
                      { $lte: ["$updatedAt", "$dueDate"] },
                    ],
                  },
                },
              },
            },
            {
              $count: "count",
            },
          ],
          total: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    const adminStatusMap = {};
    (adminTaskStatsResult[0]?.statusCounts || []).forEach((item) => {
      adminStatusMap[item._id] = item.count;
    });

    const totalTasks = adminTaskStatsResult[0]?.total?.[0]?.count || 0;
    const overdueTasks = adminTaskStatsResult[0]?.overdue?.[0]?.count || 0;
    const todoTasks = adminStatusMap["to-do"] || 0;
    const inProgressTasks = adminStatusMap["in-progress"] || 0;
    const doneTasks = adminStatusMap["done"] || 0;
    const testingTasks = adminStatusMap["testing"] || 0;
    const qaVerifiedTasks = adminStatusMap["qa-verified"] || 0;
    const reopenedTasks = adminStatusMap["re-open"] || 0;
    const deploymentTasks = adminStatusMap["deployment"] || 0;

    const isPlanExpired =
      requesterUser.company.planExpiresAt &&
      requesterUser.company.planExpiresAt < now;

    const daysLeft =
      requesterUser.company.planExpiresAt && !isPlanExpired
        ? Math.ceil(
            (new Date(requesterUser.company.planExpiresAt).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

    return {
      stats: {
        users: {
          totalCompanyUsers,
          activeCompanyUsers,
          inactiveCompanyUsers,
          companyAdmins,
          companyNormalUsers,
        },
        projects: {
          totalProjects,
          activeProjects,
          inactiveProjects,
        },
        tasks: {
          totalTasks,
          todoTasks,
          inProgressTasks,
          doneTasks,
          testingTasks,
          qaVerifiedTasks,
          reopenedTasks,
          deploymentTasks,
          overdueTasks,
        },
        engagement: {
          totalComments,
          totalTaskHistories,
        },
      },
      profile: {
        id: requesterUser._id,
        name: requesterUser.name,
        email: requesterUser.email,
        role: requesterUser.role,
        status: requesterUser.status,
        profileImage: requesterUser.profileImage,
      },
      company: {
        _id: requesterUser.company._id,
        name: requesterUser.company.name,
        companyId: requesterUser.company.companyId,
        status: requesterUser.company.status,
      },
      subscription: {
        plan: companyPlan,
        planStartAt: requesterUser.company.planStartAt,
        planExpiresAt: requesterUser.company.planExpiresAt,
        isPlanExpired,
        daysLeft,
      },
      recentUsers: recentCompanyUsers,
      recentProjects,
      recentTasks,
      recentComments,
      recentTaskActivity,
    };
  }

  // ========= User Dashboard =========

  if (requesterUser.role === "user") {
    if (!requesterUser.company) {
      throw new AppError("Company not found for user", 404, "COMPANY_NOT_FOUND");
    }

    const companyId = requesterUser.company._id;
    const userId = requesterUser._id;

    const [
      myCommentsCount,
      myTaskActivityCount,
      myRecentTasks,
      myRecentComments,
      myRecentTaskActivity,
      myProjects,
    ] = await Promise.all([
      Comment.countDocuments({
        company: companyId,
        user: userId,
        isDeleted: false,
      }),
      TaskHistory.countDocuments({
        company: companyId,
        changedBy: userId,
      }),

      // myRecentTasks with $lookup instead of populate
      Task.aggregate([
        {
          $match: {
            company: companyId,
            assignedTo: userId,
            isDeleted: false,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project",
          },
        },
        {
          $unwind: {
            path: "$project",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "reportTo",
            foreignField: "_id",
            as: "reportTo",
          },
        },
        {
          $unwind: {
            path: "$reportTo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            taskId: 1,
            title: 1,
            description: 1,
            priority: 1,
            status: 1,
            dueDate: 1,
            project: {
              _id: "$project._id",
              name: "$project.name",
              shortCode: "$project.shortCode",
            },
            reportTo: {
              _id: "$reportTo._id",
              name: "$reportTo.name",
              email: "$reportTo.email",
            },
          },
        },
      ]),

      // myRecentComments with $lookup instead of populate
      Comment.aggregate([
        {
          $match: {
            company: companyId,
            user: userId,
            isDeleted: false,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "task",
          },
        },
        {
          $unwind: {
            path: "$task",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            message: 1,
            isEdited: 1,
            task: {
              _id: "$task._id",
              taskId: "$task.taskId",
              title: "$task.title",
            },
          },
        },
      ]),

      // myRecentTaskActivity with $lookup instead of populate
      TaskHistory.aggregate([
        {
          $match: {
            company: companyId,
            changedBy: userId,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "task",
          },
        },
        {
          $unwind: {
            path: "$task",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            action: 1,
            field: 1,
            oldValue: 1,
            newValue: 1,
            task: {
              _id: "$task._id",
              taskId: "$task.taskId",
              title: "$task.title",
              status: "$task.status",
            },
          },
        },
      ]),

      Project.find({
        company: companyId,
        members: userId,
        isDeleted: false,
        isActive: true,
      }).select("name shortCode description isActive createdAt"),
    ]);

    const userTaskStatsResult = await Task.aggregate([
      {
        $match: {
          company: companyId,
          assignedTo: userId,
          isDeleted: false,
        },
      },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          overdue: [
            {
              $match: {
                dueDate: { $lt: now },
                status: { $ne: "done" },
              },
            },
            {
              $match: {
                $expr: {
                  $not: {
                    $and: [
                      { $eq: ["$status", "deployment"] },
                      { $lte: ["$updatedAt", "$dueDate"] },
                    ],
                  },
                },
              },
            },
            {
              $count: "count",
            },
          ],
          total: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    const userStatusMap = {};
    (userTaskStatsResult[0]?.statusCounts || []).forEach((item) => {
      userStatusMap[item._id] = item.count;
    });

    const assignedTasks = userTaskStatsResult[0]?.total?.[0]?.count || 0;
    const overdueTasks = userTaskStatsResult[0]?.overdue?.[0]?.count || 0;
    const todoTasks = userStatusMap["to-do"] || 0;
    const inProgressTasks = userStatusMap["in-progress"] || 0;
    const doneTasks = userStatusMap["done"] || 0;
    const testingTasks = userStatusMap["testing"] || 0;
    const qaVerifiedTasks = userStatusMap["qa-verified"] || 0;
    const reopenedTasks = userStatusMap["re-open"] || 0;
    const deploymentTasks = userStatusMap["deployment"] || 0;

    return {
      stats: {
        tasks: {
          assignedTasks,
          todoTasks,
          inProgressTasks,
          doneTasks,
          testingTasks,
          qaVerifiedTasks,
          reopenedTasks,
          deploymentTasks,
          overdueTasks,
        },
        engagement: {
          myCommentsCount,
          myTaskActivityCount,
        },
      },
      profile: {
        id: requesterUser._id,
        name: requesterUser.name,
        email: requesterUser.email,
        role: requesterUser.role,
        status: requesterUser.status,
        companyId: requesterUser.companyId,
        profileImage: requesterUser.profileImage,
      },
      company: {
        _id: requesterUser.company._id,
        name: requesterUser.company.name,
        companyId: requesterUser.company.companyId,
        status: requesterUser.company.status,
        address: requesterUser.company.address,
        website: requesterUser.company.website,
      },
      projects: myProjects,
      recentTasks: myRecentTasks,
      recentComments: myRecentComments,
      recentTaskActivity: myRecentTaskActivity,
    };
  }

  throw new AppError("Invalid role", 403, "INVALID_ROLE");
};