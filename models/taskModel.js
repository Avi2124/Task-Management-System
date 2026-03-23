import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    taskId: {type: String, required: true, trim: true},
    title: {type: String, required: true, trim: true},
    description: {type: String, default: "", trim: true},
    company: {type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true},
    project: {type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true},
    refDoc: {type: String, default: null},
    refDocViewUrl: {type: String, default: null},
    refDocPublicId: {type: String, default: null},
    refDocOriginalName: {type: String, default: null},
    refDocMimeType: {type: String, default: null},
    refDocExtension: {type: String, default: null},
    refDocResourceType: {type: String, default: null},
    assignedTo: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    reportTo: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    priority: {type: String, enum: ["high", "medium", "low"], default: "medium"},
    status: {type: String, enum: ["to-do", "in-progress", "done", "testing", "qa-verified", "re-open", "deployment"], default: "to-do"},
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    updatedBy: {type: mongoose.Schema.Types.ObjectId, ref: "User", default: null},
    dueDate: {type: Date, default: null},
    isDeleted: {type: Boolean, default: false},
    dueRemainder1dSentAt: {type: Date, default: null},
}, {timestamps: true});

taskSchema.index({project: 1, taskId: 1}, {unique: true});
taskSchema.index({company: 1, project: 1, status: 1});

export const Task = mongoose.model("Task", taskSchema);