import { Task } from "../models/taskModel.js";
import { Project } from "../models/projectModel.js";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/AppError.js";
import { generateTaskId } from "../utils/generateTaskId.js";

const sanitizeTask = (task) => ({
  id: task._id,
  taskId: task.taskId,
  title: task.title,
  description: task.description,
  company: task.company,
  project: task.project,
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

export const createTask = async ({ payload, requester }) => {
  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) throw new AppError("User not found", 404, "USER_NOT_FOUND");

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
    throw new AppError("Assigned user not found", 404, "ASSIGNED_USER_NOT_FOUND");
  }

  const reportToUser = await User.findOne({
    _id: reportTo,
    company: requesterUser.company,
    role: { $in: ["admin", "user"] },
  });

  if (!reportToUser) {
    throw new AppError("Report to user not found", 404, "REPORT_TO_USER_NOT_FOUND");
  }

  const memberIds = project.members.map((m) => m.toString());
  if (!memberIds.includes(assignedUser._id.toString())) {
    throw new AppError("Assigned user is not a member of this project", 400, "INVALID_PROJECT_MEMBER");
  }

  const taskId = await generateTaskId(project);

  const task = await Task.create({
    taskId,
    title,
    description,
    company: requesterUser.company,
    project: project._id,
    assignedTo: assignedUser._id,
    reportTo: reportToUser._id,
    priority,
    status,
    createdBy: requesterUser._id,
    updatedBy: requesterUser._id,
    dueDate,
  });

  const populatedTask = await populateTaskDetails(
    Task.findById(task._id)
  );

  return { task: sanitizeTask(populatedTask) };
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

export const updateTask = async ({ id, payload, requester }) => {
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

  task.updatedBy = requesterUser._id;
  await task.save();

  const populatedTask = await populateTaskDetails(
    Task.findById(task._id)
  );

  return { task: sanitizeTask(populatedTask) };
};

export const updateTaskStatus = async ({ id, payload, requester }) => {
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

  task.status = payload.status;
  task.updatedBy = requesterUser._id;
  await task.save();

  const populatedTask = await populateTaskDetails(
    Task.findById(task._id)
  );

  return { task: sanitizeTask(populatedTask) };
};

export const deleteTask = async ({ id, requester }) => {
  const requesterUser = await User.findById(requester.id);
  if (!requesterUser || requesterUser.role !== "admin") {
    throw new AppError("Only admin can delete task", 403, "FORBIDDEN");
  }

  const task = await Task.findOne({
    _id: id,
    company: requesterUser.company,
    isDeleted: false,
  });

  if (!task) {
    throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  }

  task.isDeleted = true;
  task.updatedBy = requesterUser._id;
  await task.save();

  return { message: "Task deleted successfully" };
};