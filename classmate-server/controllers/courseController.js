const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { safeUser } = require("../middleware/authMiddleware");
const { canManageLinkedCourse, canViewCourseRecord } = require("../utils/courseAccess");

const COLLECTION = "courses";
const COURSE_FIELDS = ["courseCode", "title", "description", "department", "semester", "academicYear"];

const normalizeCode = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
const normalizeText = (value) => String(value || "").trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactLabel = (value) => new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, "i");

const getResourceCounts = async (db, course) => {
  const labels = [...new Set([
    course.courseCode,
    course.title,
    `${course.courseCode} - ${course.title}`,
  ].map(normalizeText).filter(Boolean))].map(exactLabel);
  const queryFor = (fields) => ({
    $or: [
      { courseId: course._id },
      ...fields.flatMap((field) => labels.map((pattern) => ({ [field]: pattern }))),
    ],
  });
  const [assignments, presentations, courseNotes] = await Promise.all([
    db.collection("assignments").countDocuments(queryFor(["course", "courseName"])),
    db.collection("presentations").countDocuments(queryFor(["course", "courseName"])),
    db.collection("courseNotes").countDocuments(queryFor(["course", "courseName"])),
  ]);
  return { assignments, presentations, courseNotes };
};

const validateCourseDetails = (body = {}) => {
  const courseCode = normalizeCode(body.courseCode);
  const title = normalizeText(body.title);
  const department = normalizeText(body.department);
  const semester = normalizeText(body.semester);
  const academicYear = normalizeText(body.academicYear);
  const description = normalizeText(body.description);

  if (!courseCode || !title || !department || !semester || !academicYear) {
    return { error: "Course code, title, department, semester, and academic year are required." };
  }
  if (
    courseCode.length > 40 ||
    title.length > 160 ||
    department.length > 120 ||
    semester.length > 80 ||
    academicYear.length > 40 ||
    description.length > 2000
  ) {
    return { error: "One or more course fields exceed the allowed length." };
  }

  return { courseCode, title, description, department, semester, academicYear };
};

const getAssignableUser = async (db, value, role) => {
  if (value == null || value === "") return { user: null };
  if (!ObjectId.isValid(String(value))) {
    return { error: { status: 400, message: `Invalid ${role} user ID.` } };
  }

  const user = await db.collection("users").findOne({
    _id: new ObjectId(value),
    role,
    active: { $ne: false },
  });
  if (!user) {
    return { error: { status: 400, message: `Select an active ${role} account.` } };
  }
  return { user };
};

const getUpdatedAssignee = async (db, value, role, currentId) => {
  if (value && currentId && String(value) === String(currentId)) {
    const user = await db.collection("users").findOne({
      _id: new ObjectId(currentId),
      role,
    });
    if (user) return { user };
  }
  return getAssignableUser(db, value, role);
};

const serializeUsers = async (db, courses, includeStudents = false) => {
  const ids = new Map();
  for (const course of courses) {
    for (const id of [course.facultyId, course.crId]) {
      if (id) ids.set(String(id), id);
    }
    if (includeStudents) {
      for (const id of course.studentIds || []) ids.set(String(id), id);
    }
  }

  const users = ids.size
    ? await db.collection("users").find(
        { _id: { $in: [...ids.values()] } },
        { projection: { passwordHash: 0 } },
      ).toArray()
    : [];
  const byId = new Map(users.map((user) => [String(user._id), safeUser(user)]));

  return courses.map((course) => ({
    ...course,
    _id: String(course._id),
    createdBy: String(course.createdBy),
    facultyId: course.facultyId ? String(course.facultyId) : null,
    crId: course.crId ? String(course.crId) : null,
    studentIds: includeStudents ? (course.studentIds || []).map(String) : undefined,
    enrollmentCount: (course.studentIds || []).length,
    faculty: course.facultyId ? byId.get(String(course.facultyId)) || null : null,
    cr: course.crId ? byId.get(String(course.crId)) || null : null,
    students: includeStudents
      ? (course.studentIds || []).map((id) => byId.get(String(id))).filter(Boolean)
      : undefined,
  }));
};

const ensureCourseIndexes = async () => {
  const db = getDB();
  await Promise.all([
    db.collection(COLLECTION).createIndex(
      { normalizedCode: 1, semester: 1, academicYear: 1 },
      { unique: true, name: "unique_course_term" },
    ),
    db.collection(COLLECTION).createIndex({ facultyId: 1, status: 1 }),
    db.collection(COLLECTION).createIndex({ crId: 1, status: 1 }),
    db.collection(COLLECTION).createIndex({ studentIds: 1, status: 1 }),
    db.collection("assignments").createIndex({ courseId: 1 }),
    db.collection("courseNotes").createIndex({ courseId: 1 }),
    db.collection("presentations").createIndex({ courseId: 1 }),
  ]);
};

const getCourses = async (req, res) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const filter = {};

    if (req.user.role === "faculty") filter.facultyId = userId;
    else if (req.user.role === "cr") filter.crId = userId;
    else if (req.user.role === "student") {
      filter.studentIds = userId;
      filter.status = "active";
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "You do not have permission to view courses." });
    }

    if (req.user.role === "admin") {
      const { search, academicYear, status } = req.query;
      if (academicYear) filter.academicYear = normalizeText(academicYear);
      if (["active", "inactive"].includes(status)) filter.status = status;
      if (typeof search === "string" && search.trim()) {
        const pattern = new RegExp(escapeRegex(search.trim()), "i");
        filter.$or = [
          { courseCode: pattern },
          { title: pattern },
          { department: pattern },
          { semester: pattern },
        ];
      }
    }

    const courses = await db.collection(COLLECTION).find(filter).sort({
      academicYear: -1,
      semester: 1,
      courseCode: 1,
    }).toArray();
    res.status(200).json(await serializeUsers(db, courses));
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ message: "Failed to fetch courses." });
  }
};

const getCourseById = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const db = getDB();
    const course = await db.collection(COLLECTION).findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (!canViewCourseRecord(course, req.user)) {
      return res.status(403).json({ message: "You are not a member of this course." });
    }

    const [serialized] = await serializeUsers(db, [course]);
    const resourceCounts = await getResourceCounts(db, course);

    res.status(200).json({
      ...serialized,
      resourceCounts,
    });
  } catch (error) {
    console.error("Get course error:", error);
    res.status(500).json({ message: "Failed to fetch course." });
  }
};

const getCourseStudents = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const db = getDB();
    const course = await db.collection(COLLECTION).findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (!canViewCourseRecord(course, req.user) || req.user.role === "student") {
      return res.status(403).json({ message: "You cannot view this course roster." });
    }

    const students = course.studentIds?.length
      ? await db.collection("users").find(
          { _id: { $in: course.studentIds }, role: "student" },
          { projection: { passwordHash: 0 } },
        ).sort({ name: 1 }).toArray()
      : [];
    res.status(200).json(students.map(safeUser));
  } catch (error) {
    console.error("Get course students error:", error);
    res.status(500).json({ message: "Failed to fetch enrolled students." });
  }
};

const createCourse = async (req, res) => {
  try {
    const details = validateCourseDetails(req.body);
    if (details.error) return res.status(400).json({ message: details.error });
    const db = getDB();

    const [faculty, cr] = await Promise.all([
      getAssignableUser(db, req.body.facultyId, "faculty"),
      getAssignableUser(db, req.body.crId, "cr"),
    ]);
    if (faculty.error) return res.status(faculty.error.status).json({ message: faculty.error.message });
    if (cr.error) return res.status(cr.error.status).json({ message: cr.error.message });

    const now = new Date();
    const course = {
      ...details,
      normalizedCode: normalizeCode(details.courseCode),
      facultyId: faculty.user?._id || null,
      crId: cr.user?._id || null,
      studentIds: [],
      status: "active",
      createdBy: new ObjectId(req.user._id),
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection(COLLECTION).insertOne(course);
    res.status(201).json({
      message: "Course created successfully.",
      course: (await serializeUsers(db, [{ ...course, _id: result.insertedId }]))[0],
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A course with this code, semester, and academic year already exists." });
    }
    console.error("Create course error:", error);
    res.status(500).json({ message: "Failed to create course." });
  }
};

const updateCourse = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const db = getDB();
    const _id = new ObjectId(req.params.id);
    const existing = await db.collection(COLLECTION).findOne({ _id });
    if (!existing) return res.status(404).json({ message: "Course not found." });

    const updates = {};
    if (COURSE_FIELDS.some((field) => Object.hasOwn(req.body, field))) {
      const details = validateCourseDetails({ ...existing, ...req.body });
      if (details.error) return res.status(400).json({ message: details.error });
      Object.assign(updates, details, { normalizedCode: normalizeCode(details.courseCode) });
    }

    if (Object.hasOwn(req.body, "facultyId")) {
      const result = await getUpdatedAssignee(db, req.body.facultyId, "faculty", existing.facultyId);
      if (result.error) return res.status(result.error.status).json({ message: result.error.message });
      updates.facultyId = result.user?._id || null;
    }
    if (Object.hasOwn(req.body, "crId")) {
      const result = await getUpdatedAssignee(db, req.body.crId, "cr", existing.crId);
      if (result.error) return res.status(result.error.status).json({ message: result.error.message });
      updates.crId = result.user?._id || null;
    }
    if (Object.hasOwn(req.body, "status")) {
      if (!["active", "inactive"].includes(req.body.status)) {
        return res.status(400).json({ message: "Course status must be active or inactive." });
      }
      updates.status = req.body.status;
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No valid course updates supplied." });
    }

    updates.updatedAt = new Date();
    await db.collection(COLLECTION).updateOne({ _id }, { $set: updates });
    const course = await db.collection(COLLECTION).findOne({ _id });
    res.status(200).json({
      message: "Course updated successfully.",
      course: (await serializeUsers(db, [course]))[0],
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A course with this code, semester, and academic year already exists." });
    }
    console.error("Update course error:", error);
    res.status(500).json({ message: "Failed to update course." });
  }
};

const addCourseStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid course or student ID." });
    }

    const db = getDB();
    const _id = new ObjectId(id);
    const course = await db.collection(COLLECTION).findOne({ _id });
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (course.status !== "active") {
      return res.status(409).json({ message: "Students cannot be enrolled in an inactive course." });
    }

    const student = await db.collection("users").findOne({
      _id: new ObjectId(studentId),
      role: "student",
      active: { $ne: false },
    });
    if (!student) return res.status(400).json({ message: "Select an active student account." });

    const result = await db.collection(COLLECTION).updateOne(
      { _id, status: "active", studentIds: { $ne: student._id } },
      { $addToSet: { studentIds: student._id }, $set: { updatedAt: new Date() } },
    );
    if (!result.modifiedCount) {
      return res.status(409).json({ message: "This student is already enrolled or the course became inactive." });
    }
    res.status(200).json({ message: "Student enrolled successfully." });
  } catch (error) {
    console.error("Enroll student error:", error);
    res.status(500).json({ message: "Failed to enroll student." });
  }
};

const removeCourseStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid course or student ID." });
    }

    const db = getDB();
    const result = await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), studentIds: new ObjectId(studentId) },
      { $pull: { studentIds: new ObjectId(studentId) }, $set: { updatedAt: new Date() } },
    );
    if (!result.modifiedCount) {
      return res.status(404).json({ message: "Student is not enrolled in this course." });
    }
    res.status(200).json({ message: "Student removed from the course." });
  } catch (error) {
    console.error("Remove course student error:", error);
    res.status(500).json({ message: "Failed to remove student from course." });
  }
};

const deleteCourse = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const db = getDB();
    const _id = new ObjectId(req.params.id);
    const course = await db.collection(COLLECTION).findOne({ _id });
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (course.status !== "inactive") {
      return res.status(409).json({ message: "Deactivate the course before deleting it." });
    }

    const resourceCounts = await getResourceCounts(db, course);
    const enrollmentCount = course.studentIds?.length || 0;
    const { assignments, presentations, courseNotes } = resourceCounts;
    if (assignments || presentations || courseNotes || enrollmentCount) {
      return res.status(409).json({
        message: "This course has enrolled students or linked academic resources. Deactivate it instead of deleting it.",
        enrollmentCount,
        resourceCounts,
      });
    }

    const result = await db.collection(COLLECTION).deleteOne({
      _id,
      status: "inactive",
      studentIds: { $size: 0 },
    });
    if (!result.deletedCount) {
      return res.status(409).json({ message: "Course state changed before it could be deleted." });
    }
    res.status(200).json({ message: "Course deleted successfully." });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({ message: "Failed to delete course." });
  }
};

module.exports = {
  addCourseStudent,
  createCourse,
  deleteCourse,
  ensureCourseIndexes,
  getCourseById,
  getCourseStudents,
  getCourses,
  removeCourseStudent,
  updateCourse,
};
