import { Task } from "../models/taskModel.js";
import { Project } from "../models/projectModel.js";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/AppError.js";
import { generateTaskId } from "../utils/generateTaskId.js";
import { TaskHistory } from "../models/taskHistoryModel.js";
import cloudinary from "../config/cloudinary.js";
import {
  notifyTaskAssigned,
  notifyTaskStatusUpdated,
} from "./notificationService.js";

const sanitizeTask = (task) => ({
  id: task._id,
  taskId: task.taskId,
  title: task.title,
  description: task.description,
  company: task.company,
  project: task.project,
  refDoc: task.refDoc,
  refDocViewUrl: task.refDocViewUrl,
  refDocPublicId: task.refDocPublicId,
  refDocOriginalName: task.refDocOriginalName,
  refDocMimeType: task.refDocMimeType,
  assignedTo: task.assignedTo,
  reportTo: task.reportTo,
  priority: task.priority,
  status: task.status,
  createdBy: task.createdBy,
  updatedBy: task.updatedBy,
  dueDate: task.dueDate,
  isDeleted: task.isDeleted,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const populateTaskDetails = (query) =>
  query
    .populate("project", "name shortCode")
    .populate("assignedTo", "name email")
    .populate("reportTo", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

const ensureProjectAccess = async ({ projectId, requesterUser, allowAdmin = true }) => {
  const filter = {
    _id: projectId,
    company: requesterUser.company,
    isDeleted: false,
    isActive: true,
  };

  if (requesterUser.role === "user") {
    filter.members = requesterUser._id;
  }

  if (requesterUser.role === "admin" && !allowAdmin) {
    filter.members = requesterUser._id;
  }

  const project = await Project.findOne(filter);
  if (!project) {
    throw new AppError("Project not found or access denied", 404, "PROJECT_NOT_FOUND");
  }

  return project;
};

export const createTask = async ({ payload, requester, refDocData = null }) => {
  const requesterUser = await User.findById(requester.id);

  if (!requesterUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (!["admin", "user"].includes(requesterUser.role)) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  const {
    title,
    description = "",
    project: projectId,
    assignedTo,
    reportTo,
    priority = "medium",
    status = "to-do",
    dueDate = null,
  } = payload;

  const project = await ensureProjectAccess({
    projectId,
    requesterUser,
    allowAdmin: true,
  });

  const assignedUser = await User.findOne({
    _id: assignedTo,
    company: requesterUser.company,
    role: "user",
  });

  if (!assignedUser) {
    throw new AppError(
      "Assigned user not found",
      404,
      "ASSIGNED_USER_NOT_FOUND"
    );
  }

  const reportToUser = await User.findOne({
    _id: reportTo,
    company: requesterUser.company,
    role: { $in: ["admin", "user"] },
  });

  if (!reportToUser) {
    throw new AppError(
      "Report to user not found",
      404,
      "REPORT_TO_USER_NOT_FOUND"
    );
  }

  const memberIds = project.members.map((member) => member.toString());

  if (!memberIds.includes(assignedUser._id.toString())) {
    throw new AppError(
      "Assigned user is not a member of this project",
      400,
      "INVALID_PROJECT_MEMBER"
    );
  }

  const taskId = await generateTaskId(project);

  const task = await Task.create({
    taskId,
    title,
    description,
    company: requesterUser.company,
    project: project._id,
    refDoc: refDocData?.url || null,
    refDocViewUrl: refDocData?.viewUrl || null,
    refDocPublicId: refDocData?.publicId || null,
    refDocOriginalName: refDocData?.originalName || null,
    refDocMimeType: refDocData?.mimeType || null,
    assignedTo: assignedUser._id,
    reportTo: reportToUser._id,
    priority,
    status,
    createdBy: requesterUser._id,
    updatedBy: requesterUser._id,
    dueDate,
  });

  await TaskHistory.create({
    company: requesterUser.company,
    task: task._id,
    refDoc: refDocData?.url || null,
    refDocViewUrl: refDocData?.viewUrl || null,
    refDocPublicId: refDocData?.publicId || null,
    refDocOriginalName: refDocData?.originalName || null,
    refDocMimeType: refDocData?.mimeType || null,
    action: "task_created",
    oldValue: null,
    newValue: {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      refDoc: task.refDoc,
      refDocViewUrl: task.refDocViewUrl,
      refDocOriginalName: task.refDocOriginalName,
      refDocMimeType: task.refDocMimeType,
  refDocViewUrl: task.refDocViewUrl,
  refDocPublicId: task.refDocPublicId,
  refDocOriginalName: task.refDocOriginalName,
  refDocMimeType: task.refDocMimeType,
    },
    changedBy: requesterUser._id,
  });

  try {
    await notifyTaskAssigned({
      assignee: assignedUser,
      task,
      projectName: project.name,
    });
  } catch (error) {
    console.error("Task assignment notification failed:", error.message);
  }

  const populatedTask = await populateTaskDetails(
    Task.findById(task._id)
  );

  return {
    task: sanitizeTask(populatedTask),
  };
};

export const getAllTasks = async ({ query, requester }) => {
  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  let {
    page = 1,
    limit = 10,
    search = "",
    status = "",
    priority = "",
    project = "",
    sortKey = "createdAt",
    sortOrder = "desc",
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;

  const match = {
    company: requesterUser.company,
    isDeleted: false,
  };

  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (project) match.project = project;

  if (requesterUser.role === "user") {
    match.assignedTo = requesterUser._id;
  }

  const pipeline = [{ $match: match }];

  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: regex } },
          { taskId: { $regex: regex } },
        ],
      },
    });
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortKey]: sortDir, _id: -1 } });

  const skip = (page - 1) * limit;
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      total: [{ $count: "count" }],
    },
  });

  const result = await Task.aggregate(pipeline);
  const data = result[0]?.data || [];
  const total = result[0]?.total?.[0]?.count || 0;

  const taskIds = data.map((task) => task._id);

  let tasks = await populateTaskDetails(
    Task.find({ _id: { $in: taskIds } })
  );

  const taskMap = new Map(
    tasks.map((task) => [task._id.toString(), sanitizeTask(task)])
  );

  const orderedTasks = taskIds.map((id) => taskMap.get(id.toString()));

  return {
    tasks: orderedTasks,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getTaskById = async ({ id, requester }) => {
  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const filter = {
    _id: id,
    company: requesterUser.company,
    isDeleted: false,
  };

  if (requesterUser.role === "user") {
    filter.assignedTo = requesterUser._id;
  }

  const task = await populateTaskDetails(
    Task.findOne(filter)
  );

  if (!task) {
    throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  }

  return { task: sanitizeTask(task) };
};

export const updateTask = async ({ id, payload, requester, refDocData = null }) => {
  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const filter = {
    _id: id,
    company: requesterUser.company,
    isDeleted: false,
  };

  if (requesterUser.role === "user") {
    filter.assignedTo = requesterUser._id;
  }

  const task = await Task.findOne(filter);
  if (!task) {
    throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  }

  const oldSnapshot = {
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    reportTo: task.reportTo,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    refDoc: task.refDoc,
    refDocViewUrl: task.refDocViewUrl,
    refDocOriginalName: task.refDocOriginalName,
    refDocMimeType: task.refDocMimeType,
  };

  const oldAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;

  const { title, description, assignedTo, reportTo, priority, status, dueDate } = payload;

  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (status) task.status = status;

  if (requesterUser.role === "admin") {
    if (assignedTo) {
      const assignedUser = await User.findOne({
        _id: assignedTo,
        company: requesterUser.company,
        role: "user",
      });
      if (!assignedUser) {
        throw new AppError("Assigned user not found", 404, "ASSIGNED_USER_NOT_FOUND");
      }
      task.assignedTo = assignedUser._id;
    }

    if (reportTo) {
      const reportToUser = await User.findOne({
        _id: reportTo,
        company: requesterUser.company,
        role: { $in: ["admin", "user"] },
      });
      if (!reportToUser) {
        throw new AppError("Report to user not found", 404, "REPORT_TO_USER_NOT_FOUND");
      }
      task.reportTo = reportToUser._id;
    }
  }

  if (refDocData) {
    if (task.refDocPublicId) {
      try {
        await cloudinary.uploader.destroy(task.refDocPublicId, { resource_type: "raw" });
      } catch (error) {
        console.error("Old task document delete failed:", error.message);
      }
    }

    task.refDoc = refDocData.url;
    task.refDocViewUrl = refDocData.viewUrl;
    task.refDocPublicId = refDocData.publicId;
    task.refDocOriginalName = refDocData.originalName;
    task.refDocMimeType = refDocData.mimeType;
  }

  task.updatedBy = requesterUser._id;
  await task.save();

  await TaskHistory.create({
    company: requesterUser.company,
    task: task._id,
    action: "task_updated",
    oldValue: oldSnapshot,
    newValue: {
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      reportTo: task.reportTo,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      refDoc: task.refDoc,
      refDocViewUrl: task.refDocViewUrl,
      refDocOriginalName: task.refDocOriginalName,
      refDocMimeType: task.refDocMimeType,
    },
    changedBy: requesterUser._id
  });

  if (task.assignedTo && oldAssignedTo !== task.assignedTo.toString()) {
    const newAssignee = await User.findById(task.assignedTo).select("name email");
    const taskProject = await Project.findById(task.project).select("name");

    if (newAssignee) {
      try {
        await notifyTaskAssigned({
          assignee: newAssignee,
          task,
          projectName: taskProject?.name || null,
        });
      } catch (error) {
        console.error("Task reassignment notification failed:", error.message);
      }
    }
  }

  const populatedTask = await populateTaskDetails(
    Task.findById(task._id)
  );
  return { task: sanitizeTask(populatedTask) };
};

export const updateTaskStatus = async ({ id, payload, requester }) => {
  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  const filter = {
    _id: id,
    company: requesterUser.company,
    isDeleted: false,
  };

  if (requesterUser.role === "user") {
    filter.assignedTo = requesterUser._id;
  }

  const task = await Task.findOne(filter);
  if (!task) {
    throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  }

  const oldStatus = task.status;
  task.status = payload.status;
  task.updatedBy = requesterUser._id;
  await task.save();

  await TaskHistory.create({
    company: requesterUser.company,
    task: task._id,
    action: "status_changed",
    oldValue: oldStatus,
    newValue: task.status,
    changedBy: requesterUser._id,
  });

  const reportToUser = await User.findOne({
    _id: task.reportTo,
    company: requesterUser.company,
    role: { $in: ["admin", "user"] },
  }).select("name email");

  console.log("task.reportTo:", task.reportTo);
  console.log("reportToUser:", reportToUser);

  if (reportToUser) {
    try {
      await notifyTaskStatusUpdated({
        user: reportToUser,
        task,
        oldStatus,
        newStatus: task.status,
      });
    } catch (error) {
      console.error("Task status notification failed:", error.message);
    }
  } else {
    console.log("reportTo user not found for notification");
  }

  const populatedTask = await populateTaskDetails(
    Task.findById(task._id)
  );

  return { task: sanitizeTask(populatedTask) };
};

export const getAllTaskHistory = async ({ query, requester }) => {
  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  let {
    page = 1,
    limit = 10,
    search = "",
    action = "",
    taskId = "",
    sortOrder = "desc",
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const match = {
    company: requesterUser.company,
  };

  if (action) match.action = action;
  if (taskId) match.task = taskId;

  if (requesterUser.role === "user") {
    const assignedTasks = await Task.find({
      company: requesterUser.company,
      assignedTo: requesterUser._id,
    }).select("_id");

    const taskIds = assignedTasks.map((t) => t._id);
    match.task = { $in: taskIds };
  }

  const pipeline = [{ $match: match }];

  // TASK LOOKUP
  pipeline.push({
    $lookup: {
      from: "tasks",
      localField: "task",
      foreignField: "_id",
      as: "task",
    },
  });

  pipeline.push({
    $unwind: {
      path: "$task",
      preserveNullAndEmptyArrays: true,
    },
  });

  // CHANGED BY USER
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "changedBy",
      foreignField: "_id",
      as: "changedBy",
    },
  });

  pipeline.push({
    $unwind: {
      path: "$changedBy",
      preserveNullAndEmptyArrays: true,
    },
  });

  // ASSIGNED USER
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "task.assignedTo",
      foreignField: "_id",
      as: "assignedTo",
    },
  });

  pipeline.push({
    $unwind: {
      path: "$assignedTo",
      preserveNullAndEmptyArrays: true,
    },
  });

  // REPORT TO USER
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "task.reportTo",
      foreignField: "_id",
      as: "reportTo",
    },
  });

  pipeline.push({
    $unwind: {
      path: "$reportTo",
      preserveNullAndEmptyArrays: true,
    },
  });

  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: [
          { action: { $regex: regex } },
          { "task.taskId": { $regex: regex } },
          { "task.title": { $regex: regex } },
          { "changedBy.name": { $regex: regex } },
        ],
      },
    });
  }

  // PROJECT RESPONSE
  pipeline.push({
    $project: {
      _id: 1,
      action: 1,
      oldValue: 1,
      newValue: 1,
      createdAt: 1,
      updatedAt: 1,

      changedBy: {
        _id: "$changedBy._id",
        name: "$changedBy.name",
        email: "$changedBy.email",
      },

      task: {
        _id: "$task._id",
        taskId: "$task.taskId",
        title: "$task.title",
        status: "$task.status",
        priority: "$task.priority",

        assignedTo: {
          _id: "$assignedTo._id",
          name: "$assignedTo.name",
          email: "$assignedTo.email",
        },

        reportTo: {
          _id: "$reportTo._id",
          name: "$reportTo.name",
          email: "$reportTo.email",
        },
      },
    },
  });

  const sortDir = sortOrder === "asc" ? 1 : -1;
  pipeline.push({ $sort: { createdAt: sortDir, _id: -1 } });

  const skip = (page - 1) * limit;

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      total: [{ $count: "count" }],
    },
  });

  const result = await TaskHistory.aggregate(pipeline);
  const data = result[0]?.data || [];
  const total = result[0]?.total?.[0]?.count || 0;

  return {
    history: data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};