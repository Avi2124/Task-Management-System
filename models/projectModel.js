import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true
    },
    name: {type: String, required: true, trim: true},
    description: {type: String, default: "", trim: true},
    createdBy: {
        type: mongoose.Schema.Types.ObjectId, ref: "User", required: true
    },
    members: [
        {type: mongoose.Schema.Types.ObjectId, ref: "User"}
    ],
    isActive: {type: Boolean, default: true},
    isDeleted: {type: Boolean, default: false}
}, {timestamps: true});

projectSchema.index({company: 1, name: 1}, {unique: true});
export const Project = mongoose.model("Project", projectSchema);