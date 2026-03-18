import Company from "../models/companyModel.js";
import { Plan } from "../models/planModel.js";
import { User } from "../models/userModel.js";
import { Project } from "../models/projectModel.js";
import { Task } from "../models/taskModel.js";
import { Comment } from "../models/commentModel.js";
import { TaskHistory } from "../models/taskHistoryModel.js";
import { AppError } from "../utils/AppError.js";

export const getDashboard = async ({ requester }) => {
  const requesterUser = await User.findById(requester.id)
    .populate("company");

  if (!requesterUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(now.getDate() + 7);

  // =====================================================
  // SUPERADMIN DASHBOARD
  // =====================================================
  if (requesterUser.role === "superadmin") {
    const [
      totalCompanies,
      activeCompanies,
      expiredCompanies,
      pendingPaymentCompanies,
      //   paymentFailedCompanies,
      totalSubscriptionPlans,
      totalUsersAcrossAllCompanies,
      totalAdmins,
      totalNormalUsers,
      totalProjects,
      activeProjects,
      //   totalTasks,
      //   totalComments,
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

      //   Company.countDocuments({
      //     status: "payment_failed",
      //   }),

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

      //   Task.countDocuments({
      //     isDeleted: false,
      //   }),

      //   Comment.countDocuments({
      //     isDeleted: false,
      //   }),

      Company.find({})
        .populate("plan", "name price durationDays")
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "name companyId status plan planStartAt planExpiresAt createdAt",
        ),

      Company.find({
        status: "active",
        planExpiresAt: {
          $gte: now,
          $lte: next7Days,
        },
      })
        .populate("plan", "name price durationDays")
        .sort({ planExpiresAt: 1 })
        .limit(5)
        .select("name companyId status plan planExpiresAt"),

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
            // monthlyRevenue: {
            //   $sum: {
            //     $cond: [
            //       {
            //         $and: [
            //           { $eq: [{ $year: "$createdAt" }, now.getFullYear()] },
            //           { $eq: [{ $month: "$createdAt" }, now.getMonth() + 1] },
            //         ],
            //       },
            //       "$planDetails.price",
            //       0,
            //     ],
            //   },
            // },
            // yearlyRevenue: {
            //   $sum: {
            //     $cond: [
            //       { $eq: [{ $year: "$createdAt" }, now.getFullYear()] },
            //       "$planDetails.price",
            //       0,
            //     ],
            //   },
            // },
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
        // paymentFailedCompanies,
        totalSubscriptionPlans,
        totalUsersAcrossAllCompanies,
        totalAdmins,
        totalNormalUsers,
        totalProjects,
        activeProjects,
        // totalTasks,
        // totalComments,
      },
      recentCompanies,
      expiringSubscriptions,
      revenueSummary: revenueData[0] || {
        totalRevenue: 0,
        // monthlyRevenue: 0,
        // yearlyRevenue: 0,
      },
    };
  }

  // =====================================================
  // ADMIN DASHBOARD
  // =====================================================
  if (requesterUser.role === "admin") {
    if (!requesterUser.company) {
      throw new AppError(
        "Company not found for admin",
        404,
        "COMPANY_NOT_FOUND",
      );
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

      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      testingTasks,
      qaVerifiedTasks,
      reopenedTasks,
      deploymentTasks,
      overdueTasks,

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

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
      }),

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
        status: "to-do",
      }),

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
        status: "in-progress",
      }),

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
        status: "done",
      }),

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
        status: "testing",
      }),

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
        status: "qa-verified",
      }),

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
        status: "re-open",
      }),

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
        status: "deployment",
      }),

      Task.countDocuments({
        company: companyId,
        isDeleted: false,
        dueDate: { $lt: now },
        status: { $ne: "done" },
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
        .limit(3),

      Project.find({
        company: companyId,
        isDeleted: false,
      })
        .select("name shortCode description isActive")
        .sort({ createdAt: -1 })
        .limit(3),

      Task.find({
        company: companyId,
        isDeleted: false,
      })
        .populate("project", "name shortCode")
        .populate("assignedTo", "name")
        .populate("reportTo", "name")
        .select(
          "taskId title priority status dueDate project assignedTo reportTo",
        )
        .sort({ createdAt: -1 })
        .limit(3),

      Comment.find({
        company: companyId,
        isDeleted: false,
      })
        .populate("user", "name email")
        .populate("task", "taskId title")
        .select("message isEdited user task")
        .sort({ createdAt: -1 })
        .limit(3),

      TaskHistory.find({
        company: companyId,
      })
        .populate("task", "taskId title status")
        .populate("changedBy", "name email")
        .select("action field oldValue newValue task changedBy")
        .sort({ createdAt: -1 })
        .limit(3),

      requesterUser.company.plan
        ? Plan.findById(requesterUser.company.plan).select(
            "name price durationDays projectLimit userLimit isActive",
          )
        : null,
    ]);

    const isPlanExpired =
      requesterUser.company.planExpiresAt &&
      requesterUser.company.planExpiresAt < now;

    const daysLeft =
      requesterUser.company.planExpiresAt && !isPlanExpired
        ? Math.ceil(
            (new Date(requesterUser.company.planExpiresAt).getTime() -
              now.getTime()) /
              (1000 * 60 * 60 * 24),
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
      //   role: "admin",
      profile: {
        id: requesterUser._id,
        name: requesterUser.name,
        email: requesterUser.email,
        role: requesterUser.role,
        status: requesterUser.status,
        profileImage: requesterUser.profileImage,
        // createdAt: requesterUser.createdAt,
      },
      company: {
        _id: requesterUser.company._id,
        name: requesterUser.company.name,
        companyId: requesterUser.company.companyId,
        // description: requesterUser.company.description,
        // address: requesterUser.company.address,
        // website: requesterUser.company.website,
        status: requesterUser.company.status,
        // createdAt: requesterUser.company.createdAt,
      },
      subscription: {
        plan: companyPlan,
        planStartAt: requesterUser.company.planStartAt,
        planExpiresAt: requesterUser.company.planExpiresAt,
        isPlanExpired,
        daysLeft,
        // reminders: requesterUser.company.reminders,
        // stripe: requesterUser.company.stripe,
      },
      recentUsers: recentCompanyUsers,
      recentProjects,
      recentTasks,
      recentComments,
      recentTaskActivity,
    };
  }

  // =====================================================
  // USER DASHBOARD
  // =====================================================
  if (requesterUser.role === "user") {
  if (!requesterUser.company) {
    throw new AppError(
      "Company not found for user",
      404,
      "COMPANY_NOT_FOUND",
    );
  }

  const companyId = requesterUser.company._id;
  const userId = requesterUser._id;

  const [
    assignedTasks,
    todoTasks,
    inProgressTasks,
    doneTasks,
    testingTasks,
    qaVerifiedTasks,
    reopenedTasks,
    deploymentTasks,
    overdueTasks,

    myCommentsCount,
    myTaskActivityCount,

    myRecentTasks,
    myRecentComments,
    myRecentTaskActivity,
    myProjects,
  ] = await Promise.all([
    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
    }),

    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
      status: "to-do",
    }),

    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
      status: "in-progress",
    }),

    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
      status: "done",
    }),

    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
      status: "testing",
    }),

    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
      status: "qa-verified",
    }),

    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
      status: "re-open",
    }),

    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
      status: "deployment",
    }),

    Task.countDocuments({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
      dueDate: { $lt: now },
      status: { $ne: "done" },
    }),

    Comment.countDocuments({
      company: companyId,
      user: userId,
      isDeleted: false,
    }),

    TaskHistory.countDocuments({
      company: companyId,
      changedBy: userId,
    }),

    Task.find({
      company: companyId,
      assignedTo: userId,
      isDeleted: false,
    })
      .populate("project", "name shortCode")
      .populate("reportTo", "name email")
      .select(
        "taskId title description priority status dueDate project reportTo",
      )
      .sort({ createdAt: -1 })
      .limit(3),

    Comment.find({
      company: companyId,
      user: userId,
      isDeleted: false,
    })
      .populate("task", "taskId title")
      .select("message isEdited task")
      .sort({ createdAt: -1 })
      .limit(3),

    TaskHistory.find({
      company: companyId,
      changedBy: userId,
    })
      .populate("task", "taskId title status")
      .select("action field oldValue newValue task")
      .sort({ createdAt: -1 })
      .limit(3),

    Project.find({
      company: companyId,
      members: userId,
      isDeleted: false,
      isActive: true,
    }).select("name shortCode description isActive createdAt"),
  ]);

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
