// server.js
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

// Tạo HTTP server từ Express app
const server = http.createServer(app);

// Khởi tạo socket.io với CORS
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://mazonepoly-admin.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Ghi log khi có client kết nối
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// Gắn `io` vào app để dùng được trong controller
app.set("io", io);

// Lắng nghe port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
