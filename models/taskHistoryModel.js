import mongoose from "mongoose";

const taskHistorySchema = new mongoose.Schema(
    {
        company: {type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true},
        task: {type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true},
        action: {type: String, required: true, trim: true},
        field: {type: String, default: null, trim: true},
        oldValue: {type: mongoose.Schema.Types.Mixed, default: null},
        newValue: {type: mongoose.Schema.Types.Mixed, default: null},
        changedBy: {type: mongoose.Types.ObjectId, ref: "User", required: true}
    },
{timestamps: true});

export const TaskHistory = mongoose.model("TaskHistory", taskHistorySchema);