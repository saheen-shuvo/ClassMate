const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const multer = require("multer");

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const UPLOAD_DIRECTORY = path.join(__dirname, "..", "uploads", "course-notes");

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdir(UPLOAD_DIRECTORY, { recursive: true })
      .then(() => callback(null, UPLOAD_DIRECTORY))
      .catch(callback);
  },
  filename: (req, file, callback) => {
    callback(null, `${randomUUID()}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, callback) => {
    if (
      path.extname(file.originalname).toLowerCase() !== ".pdf" ||
      file.mimetype !== "application/pdf"
    ) {
      return callback(new Error("Only PDF files are allowed."));
    }

    callback(null, true);
  },
});

const handleCourseNoteUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      return res.status(tooLarge ? 413 : 400).json({
        message: tooLarge
          ? "PDF files must be 15 MB or smaller."
          : "Invalid PDF upload.",
      });
    }

    if (error.message === "Only PDF files are allowed.") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Course note upload error:", error);
    return res.status(500).json({ message: "Failed to receive PDF upload." });
  });
};

module.exports = {
  MAX_FILE_SIZE,
  UPLOAD_DIRECTORY,
  handleCourseNoteUpload,
};
