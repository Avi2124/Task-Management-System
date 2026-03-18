import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import "dotenv/config";
import { startCompanySubscriptionCron } from "./cron/companySubscriptionCron.js";
import { initSocket } from "./config/socket.js";

const PORT = process.env.PORT || 1312;

connectDB();

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Socket test page: http://localhost:${PORT}/socket-test`);
  startCompanySubscriptionCron();
});
