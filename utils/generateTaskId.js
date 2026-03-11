import { Task } from "../models/taskModel.js";

export const generateTaskId = async (project) => {
  const count = await Task.countDocuments({
    project: project._id,
    // company: project.company,
  });

  const nextNumber = String(count + 1).padStart(2, "0");
  return `${project.shortCode}-${nextNumber}`;
};  