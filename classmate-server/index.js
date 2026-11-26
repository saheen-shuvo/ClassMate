require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { connectDB, getDB } = require("./config/db");

const presentationRoutes = require("./routes/presentationRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const authRoutes = require("./routes/authRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const courseNoteRoutes = require("./routes/courseNoteRoutes");
const adminRoutes = require("./routes/adminRoutes");
const courseRoutes = require("./routes/courseRoutes");
const { ensureCourseIndexes } = require("./controllers/courseController");


const app = express();
const cors = require("cors");

if (process.env.NODE_ENV === "production") {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production.");
  }
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        process.env.CLIENT_URL,
      ].filter(Boolean);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json());

app.use(
  session({
    name: "classmate.sid",
    secret: process.env.SESSION_SECRET || "classmate-development-session-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: process.env.DB_NAME,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 7,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use((req, res, next) => {
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  const allowedOrigins = ["http://localhost:3000", process.env.CLIENT_URL].filter(Boolean);
  if (allowedOrigins.includes(origin)) return next();
  return res.status(403).json({ message: "Request origin is not allowed." });
});

app.use("/api/assignments", assignmentRoutes);
app.use("/api/presentations", presentationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/course-notes", courseNoteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courses", courseRoutes);

app.get("/", (req, res) => {
  res.send("Express server is running!");
});

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

const startServer = async () => {
  await connectDB();
  await ensureCourseIndexes();

  const PORT = process.env.PORT || 5001;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
