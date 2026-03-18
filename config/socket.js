import { Server } from "socket.io";

let io;
const onlineUsers = new Map(); // userId -> socketId

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // later replace with your frontend URL
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("register", (userId) => {
      if (!userId) return;
      onlineUsers.set(String(userId), socket.id);
      socket.data.userId = String(userId);
      console.log(`User registered: ${userId} -> ${socket.id}`);
    });

    socket.on("disconnect", (reason) => {
      const userId = socket.data.userId;
      if (userId && onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
      } else {
        for (const [storedUserId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            onlineUsers.delete(storedUserId);
            break;
          }
        }
      }
      console.log("Socket disconnected:", socket.id, reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
};

export const getUserSocketId = (userId) => {
  return onlineUsers.get(String(userId));
};