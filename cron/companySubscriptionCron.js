import cron from "node-cron";
import Company from "../models/companyModel.js";
import { User } from "../models/userModel.js";
import { sendSubscriptionReminderEmail } from "../config/mailer.js";

export const startCompanySubscriptionCron = () => {

  // Runs every day at 1 AM
  cron.schedule("* * * * *", async () => {

    try {

      console.log("Running subscription cron...");

      const now = new Date();

      const companies = await Company.find({
        planExpiresAt: { $ne: null }
      }).populate("plan");

      for (const company of companies) {

        const admin = await User.findOne({
          company: company._id,
          role: "admin"
        });

        if (!admin || !admin.email) continue;

        const expiry = new Date(company.planExpiresAt);

        const diffDays = Math.ceil(
          (expiry - now) / (1000 * 60 * 60 * 24)
        );

        // =============================
        // 7 DAY REMINDER
        // =============================

        if (diffDays === 7 && !company.reminders?.sevenDaySent) {

          await sendSubscriptionReminderEmail({
            to: admin.email,
            name: admin.name,
            companyName: company.name,
            planName: company.plan?.name,
            expiryDate: company.planExpiresAt,
            daysLeft: 7
          });

          company.reminders.sevenDaySent = true;
          await company.save();

          console.log(`7 day reminder sent -> ${company.name}`);
        }

        // =============================
        // 3 DAY REMINDER
        // =============================

        if (diffDays === 3 && !company.reminders?.threeDaySent) {

          await sendSubscriptionReminderEmail({
            to: admin.email,
            name: admin.name,
            companyName: company.name,
            planName: company.plan?.name,
            expiryDate: company.planExpiresAt,
            daysLeft: 3
          });

          company.reminders.threeDaySent = true;
          await company.save();

          console.log(`3 day reminder sent -> ${company.name}`);
        }

        // =============================
        // 1 DAY REMINDER
        // =============================

        if (diffDays === 1 && !company.reminders?.oneDaySent) {

          await sendSubscriptionReminderEmail({
            to: admin.email,
            name: admin.name,
            companyName: company.name,
            planName: company.plan?.name,
            expiryDate: company.planExpiresAt,
            daysLeft: 1
          });

          company.reminders.oneDaySent = true;
          await company.save();

          console.log(`1 day reminder sent -> ${company.name}`);
        }

        // =============================
        // EXPIRE COMPANY + USERS
        // =============================

        if (expiry < now && company.status !== "expired") {

          company.status = "expired";

          await company.save();

          // deactivate all users of company
          await User.updateMany(
            { company: company._id },
            { $set: { status: "inactive" } }
          );

          console.log(`Company expired -> ${company.name}`);
          console.log(`All users deactivated -> ${company.name}`);
        }

      }

    } catch (error) {

      console.error("Subscription Cron Error:", error);

    }

  });

};