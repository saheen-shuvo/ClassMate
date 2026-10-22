
require("dotenv").config();

const express = require("express");
const { connectDB, getDB } = require("./config/db");

const app = express();

app.use(express.json());

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

  const PORT = process.env.PORT || 5001;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
