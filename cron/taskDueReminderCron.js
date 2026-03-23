import cron from "node-cron"
import { sendTaskDueRemainderEmail } from "../config/mailer.js";
import { Task } from "../models/taskModel.js";

export const startTaskDueReminderCron = () => {
    cron.schedule("* * * * *", async () => {
        try {
            console.log("Running task due remainder cron...");
            const now = new Date();
            const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const tasks = await Task.find({
                isDeleted: {$ne: true},
                dueDate: {$gt: now, $lte: next24Hours},
                dueRemainder1dSentAt: null,
                status: {$nin: ["done"]},
            }).populate("assignedTo", "name email status").populate("project", "name");
            for (const task of tasks){
                const assignedUser = task.assignedTo;
                if(!assignedUser || assignedUser.isDeleted === true || assignedUser.status !== "active" || !assignedUser.email){
                    continue;
                }

                await sendTaskDueRemainderEmail({
                    to: assignedUser.email,
                    name: assignedUser.name,
                    taskTitle: task.title,
                    projectName: task.project?.name,
                    dueDate: task.dueDate
                });
                task.dueRemainder1dSentAt = new Date();
                await task.save();
                console.log(`1 day task reminder sent -> ${task.title}`);
            }
        } catch (error) {
            console.error("Task Due Reminder Cron Error:", error);
        }
    });
};