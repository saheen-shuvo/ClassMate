
const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const {
  canManageLegacyResource,
  canManageLinkedCourse,
  enrichCourseLabels,
  getLinkedCourse,
  resourceVisibilityFilter,
  resolveCourseForResourceWrite,
} = require("../utils/courseAccess");

const COLLECTION = "assignments";

const getAssignments = async (req, res) => {
  try {
    const db = getDB();
    const filter = await resourceVisibilityFilter(db, req.user, {
      collectionName: COLLECTION,
      legacyLabelFields: ["course", "courseName"],
    });
    const assignments = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(await enrichCourseLabels(db, assignments));
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ message: "Failed to fetch assignments." });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { title, description, instructions, dueDate, totalMarks, courseId } =
      req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !dueDate ||
      totalMarks === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all required assignment information.",
      });
    }

    const parsedMarks = Number(totalMarks);
    const parsedDueDate = new Date(dueDate);

    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      return res.status(400).json({
        message: "Total marks must be greater than zero.",
      });
    }

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: "Invalid due date." });
    }

    const db = getDB();
    const resolved = await resolveCourseForResourceWrite(db, req.user, courseId);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    const assignment = {
      title: title.trim(),
      description: description.trim(),
      instructions: (instructions || "").trim(),
      courseId: resolved.course._id,
      course: resolved.course.courseCode,
      dueDate: parsedDueDate,
      totalMarks: parsedMarks,
      status: "Published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(assignment);

    res.status(201).json({
      message: "Assignment created successfully.",
      assignment: { ...assignment, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ message: "Failed to create assignment." });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid assignment ID." });
    }

    const { title, description, instructions, dueDate, totalMarks, courseId } =
      req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !dueDate ||
      totalMarks === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all required assignment information.",
      });
    }

    const parsedMarks = Number(totalMarks);
    const parsedDueDate = new Date(dueDate);

    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      return res.status(400).json({
        message: "Total marks must be greater than zero.",
      });
    }

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: "Invalid due date." });
    }

    const db = getDB();
    const _id = new ObjectId(id);
    const existing = await db.collection(COLLECTION).findOne({ _id });
    if (!existing) return res.status(404).json({ message: "Assignment not found." });

    let courseUpdate = {};
    if (existing.courseId) {
      const currentCourse = await getLinkedCourse(db, existing.courseId);
      const targetCourseId = courseId || existing.courseId;
      if (!canManageLinkedCourse(currentCourse, req.user)) {
        return res.status(403).json({ message: "You are not assigned to manage this assignment's course." });
      }
      if (req.user.role !== "admin" && String(existing.courseId) !== String(targetCourseId)) {
        return res.status(403).json({ message: "Only an administrator can move an assignment to another course." });
      }
    } else {
      const legacyAccess = await canManageLegacyResource(
        db,
        existing,
        req.user,
        ["course", "courseName"],
      );
      if (!legacyAccess.authorized) {
        return res.status(403).json({ message: "You are not authorized to manage this legacy assignment." });
      }
      const targetCourseId = courseId || legacyAccess.course?._id;
      if (
        req.user.role !== "admin" &&
        (!legacyAccess.course || String(legacyAccess.course._id) !== String(targetCourseId))
      ) {
        return res.status(403).json({ message: "Only an administrator can move an assignment to another course." });
      }
    }

    if (existing.courseId) {
      const resolved = await resolveCourseForResourceWrite(
        db,
        req.user,
        courseId || existing.courseId,
      );
      if (resolved.error) {
        return res.status(resolved.error.status).json({ message: resolved.error.message });
      }
      courseUpdate = {
        courseId: resolved.course._id,
        course: resolved.course.courseCode,
      };
    }

    const updatedData = {
      title: title.trim(),
      description: description.trim(),
      instructions: (instructions || "").trim(),
      ...courseUpdate,
      dueDate: parsedDueDate,
      totalMarks: parsedMarks,
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).updateOne(
      { _id },
      { $set: updatedData }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    const updatedAssignment = await db
      .collection(COLLECTION)
      .findOne({ _id });

    res.status(200).json({
      message: "Assignment updated successfully.",
      assignment: (await enrichCourseLabels(db, [updatedAssignment]))[0],
    });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({ message: "Failed to update assignment." });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid assignment ID." });
    }

    const db = getDB();
    const _id = new ObjectId(id);
    const existing = await db.collection(COLLECTION).findOne({ _id });
    if (!existing) return res.status(404).json({ message: "Assignment not found." });
    if (existing.courseId) {
      const course = await getLinkedCourse(db, existing.courseId);
      if (!canManageLinkedCourse(course, req.user)) {
        return res.status(403).json({ message: "You are not assigned to manage this assignment's course." });
      }
    } else {
      const legacyAccess = await canManageLegacyResource(
        db,
        existing,
        req.user,
        ["course", "courseName"],
      );
      if (!legacyAccess.authorized) {
        return res.status(403).json({ message: "You are not authorized to manage this legacy assignment." });
      }
    }
    const result = await db.collection(COLLECTION).deleteOne({
      _id,
    });

    if (!result.deletedCount) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    res.status(200).json({
      message: "Assignment deleted successfully.",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ message: "Failed to delete assignment." });
  }
};

module.exports = {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
