
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB, getDB } = require("./config/db");

// Import Routes
const presentationRoutes = require("./routes/presentationRoutes");
const announcementRoutes = require("./routes/announcementRoutes");

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

app.use(express.json());

// API Routes
app.use("/api/presentations", presentationRoutes);
app.use("/api/announcements", announcementRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("Express server is running!");
});

// Database Test Route
app.get("/test-db", async (req, res) => {
  try {
    const db = getDB();

    await db.command({ ping: 1 });

    res.json({
      message: "MongoDB is working!",
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: "Database test failed",
    });
  }
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5001;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
