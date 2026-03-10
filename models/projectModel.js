import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    name: {type: String, required: true, trim: true},
    shortCode: {type: String, required: true, trim: true, uppercase: true},
    description: {type: String, default: "", trim: true},
    company: {
        type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId, ref: "User", required: true
    },
    members: [
        {type: mongoose.Schema.Types.ObjectId, ref: "User"}
    ],
    isActive: {type: Boolean, default: true},
    isDeleted: {type: Boolean, default: false}
}, {timestamps: true});

projectSchema.index({company: 1, shortCode: 1}, {unique: true});
projectSchema.index({company: 1, name: 1});
export const Project = mongoose.model("Project", projectSchema);