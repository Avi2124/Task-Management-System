import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
    name: {type: String, required: true},
    price: {type: Number, required: true},
    durationDays: {type: Number, default: 0},
    projectLimit: {type: Number, default: 0},
    userLimit: {type: Number, defaut: 0},
    isActive: {type: Boolean, default: true},
}, {timestamps: true});

export const Plan = mongoose.model("Plan", planSchema);