const fs = require("node:fs/promises");
const path = require("node:path");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { UPLOAD_DIRECTORY } = require("../middleware/courseNoteUpload");
const {
  canManageLinkedCourse,
  canReadLinkedCourse,
  enrichCourseLabels,
  getLinkedCourse,
  resourceVisibilityFilter,
  resolveCourseForResourceWrite,
} = require("../utils/courseAccess");

const COLLECTION = "courseNotes";
const RELATIVE_UPLOAD_DIRECTORY = path.posix.join("uploads", "course-notes");

const validateNoteDetails = (body = {}) => {
  const { title, description = "", courseId } = body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    typeof courseId !== "string" ||
    !ObjectId.isValid(courseId)
  ) {
    return null;
  }

  return {
    title: title.trim(),
    description: description.trim(),
    courseId: new ObjectId(courseId),
  };
};

const accessFilter = (id, user) => {
  const filter = { _id: new ObjectId(id) };

  if (user.role === "cr") {
    filter["uploadedBy._id"] = user._id;
    filter["uploadedBy.role"] = "cr";
  }

  return filter;
};

const serializedNote = (note) => {
  const id = String(note._id);
  return {
    id,
    title: note.title,
    description: note.description || "",
    course: note.course,
    courseId: note.courseId ? String(note.courseId) : null,
    courseCode: note.courseCode || null,
    courseTitle: note.courseTitle || null,
    originalFileName: note.originalFileName,
    fileSize: note.fileSize,
    uploadedBy: note.uploadedBy
      ? {
          _id: String(note.uploadedBy._id),
          name: note.uploadedBy.name || "",
          role: note.uploadedBy.role,
        }
      : null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    fileUrl: `/api/course-notes/${id}/file`,
  };
};

const validStoredFilePath = (note) => {
  if (
    typeof note.storedFileName !== "string" ||
    !/^[0-9a-f-]{36}\.pdf$/i.test(note.storedFileName)
  ) {
    return null;
  }

  const filePath = path.resolve(UPLOAD_DIRECTORY, note.storedFileName);
  return path.dirname(filePath) === UPLOAD_DIRECTORY ? filePath : null;
};

const removeUploadedFile = async (file) => {
  if (!file?.path) return;
  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Remove failed course note upload error:", error);
    }
  }
};

const removeStoredFile = async (note) => {
  const filePath = validStoredFilePath(note);
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const hasPdfSignature = async (filePath) => {
  const file = await fs.open(filePath, "r");
  try {
    const header = Buffer.alloc(5);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    if (bytesRead !== header.length || header.toString("ascii") !== "%PDF-") {
      return false;
    }

    const { size } = await file.stat();
    const tail = Buffer.alloc(Math.min(size, 1024));
    const { bytesRead: tailBytes } = await file.read(
      tail,
      0,
      tail.length,
      Math.max(0, size - tail.length),
    );
    return tailBytes > 0 && tail.toString("ascii", 0, tailBytes).includes("%%EOF");
  } finally {
    await file.close();
  }
};

const originalFileName = (name) =>
  path
    .basename(String(name || "").replaceAll("\\", "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .slice(0, 255) || "course-note.pdf";

const fileDetails = (file) => ({
  originalFileName: originalFileName(file.originalname),
  storedFileName: file.filename,
  filePath: path.posix.join(RELATIVE_UPLOAD_DIRECTORY, file.filename),
  fileSize: file.size,
});

const getCourseNotes = async (req, res) => {
  try {
    const db = getDB();
    const filter = await resourceVisibilityFilter(db, req.user);
    const notes = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedNotes = await enrichCourseLabels(db, notes);
    res.status(200).json(enrichedNotes.map(serializedNote));
  } catch (error) {
    console.error("Get course notes error:", error);
    res.status(500).json({ message: "Failed to fetch course notes." });
  }
};

const createCourseNote = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "A PDF file is required." });
  }

  const details = validateNoteDetails(req.body);
  if (!details) {
    await removeUploadedFile(req.file);
    return res.status(400).json({
      message: "Please provide a title and course for this note.",
    });
  }

  let inserted = false;
  try {
    const db = getDB();
    const resolved = await resolveCourseForResourceWrite(db, req.user, details.courseId);
    if (resolved.error) {
      await removeUploadedFile(req.file);
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    if (!(await hasPdfSignature(req.file.path))) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: "The uploaded file is not a valid PDF." });
    }

    const now = new Date();
    const note = {
      title: details.title,
      description: details.description,
      courseId: resolved.course._id,
      course: resolved.course.courseCode,
      ...fileDetails(req.file),
      uploadedBy: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTION).insertOne(note);
    inserted = true;
    res.status(201).json({
      message: "Course note uploaded successfully.",
      note: serializedNote({
        ...note,
        _id: result.insertedId,
        courseCode: resolved.course.courseCode,
        courseTitle: resolved.course.title,
      }),
    });
  } catch (error) {
    if (!inserted) await removeUploadedFile(req.file);
    console.error("Create course note error:", error);
    res.status(500).json({ message: "Failed to save course note." });
  }
};

const updateCourseNote = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    await removeUploadedFile(req.file);
    return res.status(400).json({ message: "Invalid course note ID." });
  }

  const details = validateNoteDetails(req.body);
  if (!details) {
    await removeUploadedFile(req.file);
    return res.status(400).json({
      message: "Please provide a title and course for this note.",
    });
  }

  let databaseUpdated = false;
  try {
    const db = getDB();
    const filter = accessFilter(id, req.user);
    const existing = await db.collection(COLLECTION).findOne(filter);
    if (!existing) {
      await removeUploadedFile(req.file);
      return res.status(404).json({ message: "Course note not found." });
    }

    if (existing.courseId) {
      const currentCourse = await getLinkedCourse(db, existing.courseId);
      if (!canManageLinkedCourse(currentCourse, req.user)) {
        await removeUploadedFile(req.file);
        return res.status(403).json({ message: "You are not assigned to manage this note's course." });
      }
    }
    const resolved = await resolveCourseForResourceWrite(db, req.user, details.courseId);
    if (resolved.error) {
      await removeUploadedFile(req.file);
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    if (req.file && !(await hasPdfSignature(req.file.path))) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: "The uploaded file is not a valid PDF." });
    }

    const updates = {
      title: details.title,
      description: details.description,
      courseId: resolved.course._id,
      course: resolved.course.courseCode,
      updatedAt: new Date(),
    };
    if (req.file) Object.assign(updates, fileDetails(req.file));

    const result = await db.collection(COLLECTION).updateOne(filter, {
      $set: updates,
    });
    if (!result.matchedCount) {
      await removeUploadedFile(req.file);
      return res.status(404).json({ message: "Course note not found." });
    }
    databaseUpdated = true;

    const updatedNote = await db.collection(COLLECTION).findOne(filter);
    let warning;
    if (req.file) {
      try {
        await removeStoredFile(existing);
      } catch (error) {
        console.error("Remove replaced course note PDF error:", error);
        warning = "The note was updated, but its previous PDF could not be removed.";
      }
    }

    res.status(200).json({
      message: "Course note updated successfully.",
      note: serializedNote({
        ...updatedNote,
        courseCode: resolved.course.courseCode,
        courseTitle: resolved.course.title,
      }),
      warning,
    });
  } catch (error) {
    if (!databaseUpdated) await removeUploadedFile(req.file);
    console.error("Update course note error:", error);
    res.status(500).json({ message: "Failed to update course note." });
  }
};

const deleteCourseNote = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid course note ID." });
  }

  try {
    const db = getDB();
    const filter = accessFilter(id, req.user);
    const note = await db.collection(COLLECTION).findOne(filter);
    if (!note) {
      return res.status(404).json({ message: "Course note not found." });
    }
    if (note.courseId) {
      const course = await getLinkedCourse(db, note.courseId);
      if (!canManageLinkedCourse(course, req.user)) {
        return res.status(403).json({ message: "You are not assigned to manage this note's course." });
      }
    }

    const result = await db.collection(COLLECTION).deleteOne(filter);
    if (!result.deletedCount) {
      return res.status(404).json({ message: "Course note not found." });
    }

    try {
      await removeStoredFile(note);
    } catch (error) {
      console.error("Remove deleted course note PDF error:", error);
      return res.status(500).json({
        message: "The note was deleted, but its PDF could not be removed.",
      });
    }

    res.status(200).json({ message: "Course note deleted successfully." });
  } catch (error) {
    console.error("Delete course note error:", error);
    res.status(500).json({ message: "Failed to delete course note." });
  }
};

const serveCourseNoteFile = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid course note ID." });
  }

  try {
    const db = getDB();
    const note = await db.collection(COLLECTION).findOne({
      _id: new ObjectId(id),
    });
    if (!note) {
      return res.status(404).json({ message: "Course note not found." });
    }
    if (note.courseId) {
      const course = await getLinkedCourse(db, note.courseId);
      if (!canReadLinkedCourse(course, req.user)) {
        return res.status(403).json({ message: "You are not enrolled in this course." });
      }
    }

    const filePath = validStoredFilePath(note);
    if (!filePath) {
      return res.status(404).json({ message: "Course note PDF not found." });
    }

    const safeName = originalFileName(note.originalFileName);
    const fallbackName = safeName.replace(/[^\x20-\x7e]|["\\;]/g, "_");
    const encodedName = encodeURIComponent(safeName).replace(
      /['()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    const disposition = req.query.download === "1" ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
    );
    res.sendFile(filePath, (error) => {
      if (!error || res.headersSent) return;
      if (error.code === "ENOENT") {
        return res.status(404).json({ message: "Course note PDF not found." });
      }
      console.error("Serve course note PDF error:", error);
      return res.status(500).json({ message: "Failed to open course note PDF." });
    });
  } catch (error) {
    console.error("Get course note PDF error:", error);
    res.status(500).json({ message: "Failed to open course note PDF." });
  }
};

module.exports = {
  createCourseNote,
  deleteCourseNote,
  getCourseNotes,
  serveCourseNoteFile,
  updateCourseNote,
};
