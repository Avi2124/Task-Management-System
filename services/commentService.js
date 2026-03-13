import { Comment } from "../models/commentModel.js";
import { Task } from "../models/taskModel.js";
import { User } from "../models/userModel.js";
import { Project } from "../models/projectModel.js";
import { TaskHistory } from "../models/taskHistoryModel.js";
import { AppError } from "../utils/AppError.js";

const sanitizeComment = (comment) => ({
  id: comment._id,
  company: comment.company,
  project: comment.project,
  task: comment.task,
  user: comment.user,
  message: comment.message,
  isEdited: comment.isEdited,
  editedAt: comment.editedAt,
  isDeleted: comment.isDeleted,
  deletedAt: comment.deletedAt,
  deletedBy: comment.deletedBy,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

const getRequesterUser = async (requester) => {
  const requesterUser = await User.findById(requester.id);
  if (!requesterUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (requesterUser.role === "superadmin") {
    throw new AppError(
      "Superadmin cannot access comment module",
      403,
      "COMMENT_ACCESS_FORBIDDEN"
    );
  }

  return requesterUser;
};

const getTaskWithAccess = async ({ taskId, requesterUser }) => {
  const task = await Task.findOne({
    _id: taskId,
    company: requesterUser.company,
    isDeleted: false,
  });

  if (!task) {
    throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  }

  if (requesterUser.role === "admin") {
    return task;
  }

  const project = await Project.findOne({
    _id: task.project,
    company: requesterUser.company,
    isDeleted: { $ne: true },
    $or: [
      { users: requesterUser._id },
      { assignedUsers: requesterUser._id },
      { members: requesterUser._id },
      { teamMembers: requesterUser._id },
      { createdBy: requesterUser._id },
      { admin: requesterUser._id },
    ],
  });

  // Keep only your real project-user field from above

  if (!project) {
    throw new AppError(
      "You are not allowed to access comments for this task",
      403,
      "TASK_COMMENT_ACCESS_FORBIDDEN"
    );
  }

  return task;
};

const getCommentWithAccess = async ({ commentId, requesterUser }) => {
  const comment = await Comment.findOne({
    _id: commentId,
    company: requesterUser.company,
    isDeleted: false,
  });

  if (!comment) {
    throw new AppError("Comment not found", 404, "COMMENT_NOT_FOUND");
  }

  await getTaskWithAccess({
    taskId: comment.task,
    requesterUser,
  });

  return comment;
};

const canModifyComment = ({ requesterUser, comment }) => {
  if (requesterUser.role === "admin") return true;
  return String(comment.user) === String(requesterUser._id);
};

export const addComment = async ({ taskId, payload, requester }) => {
  const requesterUser = await getRequesterUser(requester);
  const task = await getTaskWithAccess({ taskId, requesterUser });

  const comment = await Comment.create({
    company: requesterUser.company,
    project: task.project,
    task: task._id,
    user: requesterUser._id,
    message: payload.message,
  });

  await TaskHistory.create({
    company: requesterUser.company,
    task: task._id,
    action: "comment_added",
    oldValue: null,
    newValue: { message: payload.message },
    changedBy: requesterUser._id,
  });

  const populatedComment = await Comment.findById(comment._id).populate("task", "title").populate("project", "name").populate("user","name");

  return {
    comment: {
      ...sanitizeComment(populatedComment),
      user: populatedComment.user,
    },
  };
};

export const getTaskComments = async ({ taskId, query, requester }) => {
  const requesterUser = await getRequesterUser(requester);
  const task = await getTaskWithAccess({ taskId, requesterUser });

  let {
    page = 1,
    limit = 10,
    search = "",
    sortKey = "createdAt",
    sortOrder = "asc",
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;

  const match = {
    task: task._id,
    company: requesterUser.company,
    project: task.project,
    isDeleted: false,
  };

  const pipeline = [{ $match: match }];

  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        message: { $regex: regex },
      },
    });
  }

  const allowedSortKeys = ["createdAt", "updatedAt", "message"];
  const finalSortKey = allowedSortKeys.includes(sortKey) ? sortKey : "createdAt";
  const sortDir = sortOrder === "desc" ? -1 : 1;

  pipeline.push({
    $sort: { [finalSortKey]: sortDir, _id: 1 },
  });

  const skip = (page - 1) * limit;

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      total: [{ $count: "count" }],
    },
  });

  const result = await Comment.aggregate(pipeline);
  const data = result[0]?.data || [];
  const total = result[0]?.total?.[0]?.count || 0;

  const commentIds = data.map((comment) => comment._id);

  const comments = await Comment.find({
    _id: { $in: commentIds },
  }).populate("task", "title").populate("project", "name").populate("user", "name");

  const commentMap = new Map(
    comments.map((comment) => [comment._id.toString(), sanitizeComment(comment)])
  );

  const userMap = new Map(
    comments.map((comment) => [comment._id.toString(), comment.user])
  );

  const orderedComments = commentIds.map((id) => ({
    ...commentMap.get(id.toString()),
    user: userMap.get(id.toString()),
  }));

  return {
    comments: orderedComments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const updateComment = async ({ commentId, payload, requester }) => {
  const requesterUser = await getRequesterUser(requester);
  const comment = await getCommentWithAccess({ commentId, requesterUser });

  if (!canModifyComment({ requesterUser, comment })) {
    throw new AppError(
      "You are not allowed to update this comment",
      403,
      "COMMENT_UPDATE_FORBIDDEN"
    );
  }

  const oldMessage = comment.message;

  comment.message = payload.message;
  comment.isEdited = true;
  comment.editedAt = new Date();

  await comment.save();

  await TaskHistory.create({
    company: comment.company,
    task: comment.task,
    action: "comment_updated",
    oldValue: { message: oldMessage },
    newValue: { message: comment.message },
    changedBy: requesterUser._id,
  });

  const populatedComment = await Comment.findById(comment._id).populate("task", "title").populate("project", "name").populate(
    "user",
    "name email role"
  );

  return {
    comment: {
      ...sanitizeComment(populatedComment),
      user: populatedComment.user,
    },
  };
};

export const deleteComment = async ({ commentId, requester }) => {
  const requesterUser = await getRequesterUser(requester);
  const comment = await getCommentWithAccess({ commentId, requesterUser });

  if (!canModifyComment({ requesterUser, comment })) {
    throw new AppError(
      "You are not allowed to delete this comment",
      403,
      "COMMENT_DELETE_FORBIDDEN"
    );
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  comment.deletedBy = requesterUser._id;

  await comment.save();

  await TaskHistory.create({
    company: comment.company,
    task: comment.task,
    action: "comment_deleted",
    oldValue: { message: comment.message },
    newValue: null,
    changedBy: requesterUser._id,
  });

  return {
    // comment: {
    //   id: comment._id,
    //   isDeleted: comment.isDeleted,
    //   deletedAt: comment.deletedAt,
    //   deletedBy: comment.deletedBy,
    // },
  };
};