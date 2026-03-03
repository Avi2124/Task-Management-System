import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"]},
     password: {type: String, required: true},
     role: {type: String, enum: ["superadmin", "admin", "user"], default: "user"},
     company: {type: mongoose.Schema.Types.ObjectId, ref: "Company", required: function () {
        return this.role !== "superadmin";
      },},
     companyId: {type: String, required: function () {
        return this.role !== "superadmin";
      },},
     profileImage: {type: String, default: "https://t4.ftcdn.net/jpg/07/03/86/11/360_F_703861114_7YxIPnoH8NfmbyEffOziaXy0EO1NpRHD.jpg"},
     refreshToken: {type: String},
     otpCode: {type: String},
     otpExpiresAt: {type: Date},
}, {timestamps: true});

userSchema.pre("save", async function () {
    if(!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);