import { getIO, getUserSocketId } from "../config/socket.js";
import {
  sendTaskAssignedEmail,
  sendUserCreatedEmail,
  sendImportantAlertEmail,
  sendTaskStatusUpdatedEmail,
  sendProjectAssignedEmail,
} from "../config/mailer.js";

export const emitToUser = ({ userId, event, payload }) => {
  try {
    const socketId = getUserSocketId(userId);
    if (!socketId) return;

    const io = getIO();
    io.to(socketId).emit(event, payload);
  } catch (error) {
    console.error("Socket emit error:", error.message);
  }
};

export const notifyUserCreated = async ({
  user,
  companyName,
  rawPassword,
}) => {
  await sendUserCreatedEmail({
    to: user.email,
    name: user.name,
    companyName,
    password: rawPassword,
  });
};
export const notifyProjectAssigned = async ({
  user,
  project,
}) => {
  if (!user || !project) return;

  emitToUser({
    userId: user._id,
    event: "project_assigned",
    payload: {
      type: "project_assigned",
      title: "Project Assigned",
      message: `You have been assigned to project "${project.name}"`,
      projectId: project._id,
      projectName: project.name,
      projectCode: project.shortCode || null,
      description: project.description,
    },
  });

  await sendProjectAssignedEmail({
    to: user.email,
    name: user.name,
    projectName: project.name,
    projectCode: project.shortCode,
    description: project.description,
  });
};

export const notifyTaskAssigned = async ({
  assignee,
  task,
  projectName,
}) => {
  emitToUser({
    userId: assignee._id,
    event: "task_assigned",
    payload: {
      type: "task_assigned",
      title: "New Task Assigned",
      message: `Task "${task.title}" has been assigned to you`,
      taskId: task._id,
      taskTitle: task.title,
      projectName: projectName || null,
      dueDate: task.dueDate || null,
    },
  });

  await sendTaskAssignedEmail({
    to: assignee.email,
    name: assignee.name,
    taskTitle: task.title,
    projectName,
    dueDate: task.dueDate,
  });
};

export const notifyTaskStatusUpdated = async ({
  user,
  task,
  oldStatus,
  newStatus,
}) => {
  if (!user) return;

  emitToUser({
    userId: user._id,
    event: "task_status_updated",
    payload: {
      type: "task_status_updated",
      title: "Task Status Updated",
      message: `Task "${task.title}" changed from "${oldStatus}" to "${newStatus}"`,
      taskId: task._id,
      oldStatus,
      newStatus,
    },
  });

  await sendTaskStatusUpdatedEmail({
    to: user.email,
    name: user.name,
    taskTitle: task.title,
    oldStatus,
    newStatus,
  });
};

export const notifyImportantAlert = async ({
  user,
  title,
  message,
}) => {
  emitToUser({
    userId: user._id,
    event: "important_alert",
    payload: {
      type: "important_alert",
      title,
      message,
    },
  });

  await sendImportantAlertEmail({
    to: user.email,
    name: user.name,
    title,
    message,
  });
};