import mongoose from "mongoose";

const comapnySchema = new mongoose.Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    address: {type: String, required: true},
    website: {type: String, required: true},
    companyId: {type: String, required: true},
}, {timestamps: true});

export default mongoose.model("Company", comapnySchema);