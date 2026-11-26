const { ObjectId } = require("mongodb");

const normalizeCourseLabel = (value) =>
  typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";

const courseLabels = (course) => [
  course.courseCode,
  course.title,
  course.courseCode && course.title ? `${course.courseCode} - ${course.title}` : null,
].filter((label) => typeof label === "string").map(normalizeCourseLabel).filter(Boolean);

const resolveLegacyCourseFromCourses = (courses, labels) => {
  const normalizedLabels = new Set(labels.map(normalizeCourseLabel).filter(Boolean));
  if (!normalizedLabels.size) return { course: null, ambiguous: false };

  const matches = courses.filter((course) =>
    courseLabels(course).some((label) => normalizedLabels.has(label)),
  );
  return {
    course: matches.length === 1 ? matches[0] : null,
    ambiguous: matches.length > 1,
  };
};

const isCourseMember = (course, user) => {
  if (!course || !user) return false;
  const userId = String(user._id);

  if (user.role === "faculty") return String(course.facultyId) === userId;
  if (user.role === "cr") return String(course.crId) === userId;
  if (user.role === "student") {
    return (course.studentIds || []).some((id) => String(id) === userId);
  }
  return user.role === "admin";
};

const courseIdsForUser = async (db, user, { includeInactive = false } = {}) => {
  if (user.role === "admin") return null;
  if (!ObjectId.isValid(user._id)) return [];

  const filter = {};
  const userId = new ObjectId(user._id);

  if (user.role === "faculty") filter.facultyId = userId;
  else if (user.role === "cr") filter.crId = userId;
  else if (user.role === "student") filter.studentIds = userId;
  else return [];

  if (!includeInactive || user.role === "student") filter.status = "active";

  const courses = await db.collection("courses").find(filter, {
    projection: { _id: 1 },
  }).toArray();
  return courses.map((course) => course._id);
};

const resourceVisibilityFilter = async (
  db,
  user,
  {
    collectionName,
    legacyLabelFields = [],
    legacyOwnerField = null,
  } = {},
) => {
  if (user.role === "admin") return {};
  const courseIds = await courseIdsForUser(db, user);
  const visibleLegacyIds = [];

  if (collectionName && (legacyLabelFields.length || legacyOwnerField)) {
    const [activeCourses, legacyResources] = await Promise.all([
      db.collection("courses").find({ status: "active" }).toArray(),
      db.collection(collectionName).find({
        $or: [{ courseId: { $exists: false } }, { courseId: null }, { courseId: "" }],
      }).toArray(),
    ]);

    for (const resource of legacyResources) {
      const labels = legacyLabelFields.map((field) =>
        field.split(".").reduce((value, part) => value?.[part], resource),
      ).filter((value) => typeof value === "string");
      const { course } = resolveLegacyCourseFromCourses(activeCourses, labels);
      const isMemberOfUniqueCourse = course && canReadLinkedCourse(course, user);
      const isLegacyOwner = legacyOwnerField &&
        String(legacyOwnerField.split(".").reduce((value, part) => value?.[part], resource)) === String(user._id);

      if (isMemberOfUniqueCourse || isLegacyOwner) visibleLegacyIds.push(resource._id);
    }
  }

  return {
    $or: [
      { courseId: { $in: courseIds } },
      { _id: { $in: visibleLegacyIds } },
    ],
  };
};

const findLegacyCourseMatches = async (db, labels) => {
  const normalizedLabels = new Set(labels.map(normalizeCourseLabel).filter(Boolean));
  if (!normalizedLabels.size) return [];
  const courses = await db.collection("courses").find({ status: "active" }).toArray();
  return courses.filter((course) =>
    courseLabels(course).some((label) => normalizedLabels.has(label)),
  );
};

const resolveLegacyCourse = async (db, labels) => {
  const matches = await findLegacyCourseMatches(db, labels);
  return { course: matches.length === 1 ? matches[0] : null, ambiguous: matches.length > 1 };
};

const canManageLegacyResource = async (db, resource, user, labelFields) => {
  if (user.role === "admin") return { authorized: true, course: null };
  const labels = labelFields.map((field) => resource[field]).filter((value) => typeof value === "string");
  const { course, ambiguous } = await resolveLegacyCourse(db, labels);
  return {
    authorized: Boolean(course && canManageLinkedCourse(course, user)),
    course,
    ambiguous,
  };
};

const canReadLegacyResource = async (db, resource, user, labelFields) => {
  if (user.role === "admin") return { authorized: true, course: null };
  const labels = labelFields.map((field) => resource[field]).filter((value) => typeof value === "string");
  const { course, ambiguous } = await resolveLegacyCourse(db, labels);
  return {
    authorized: Boolean(course && canReadLinkedCourse(course, user)),
    course,
    ambiguous,
  };
};

const getLinkedCourse = async (db, courseId) => {
  if (!ObjectId.isValid(String(courseId || ""))) return null;
  return db.collection("courses").findOne({ _id: new ObjectId(courseId) });
};

const canReadLinkedCourse = (course, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!course) return false;
  return course.status === "active" && isCourseMember(course, user);
};

const canViewCourseRecord = (course, user) => {
  if (!course || !user) return false;
  if (user.role === "admin") return true;
  if (user.role === "student") {
    return course.status === "active" && isCourseMember(course, user);
  }
  return isCourseMember(course, user);
};

const canManageLinkedCourse = (course, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!course) return false;
  return (
    course.status === "active" &&
    ((user.role === "faculty" && String(course.facultyId) === String(user._id)) ||
      (user.role === "cr" && String(course.crId) === String(user._id)))
  );
};

const resolveCourseForResourceWrite = async (db, user, courseId) => {
  if (!ObjectId.isValid(String(courseId || ""))) {
    return { error: { status: 400, message: "A valid courseId is required." } };
  }

  const course = await getLinkedCourse(db, courseId);
  if (!course) return { error: { status: 404, message: "Course not found." } };
  if (course.status !== "active") {
    return { error: { status: 409, message: "Resources cannot be added to an inactive course." } };
  }
  if (!canManageLinkedCourse(course, user)) {
    return { error: { status: 403, message: "You are not assigned to manage this course." } };
  }

  return { course };
};

const enrichCourseLabels = async (db, resources) => {
  const courseIds = [...new Set(
    resources
      .map((resource) => resource.courseId)
      .filter((id) => id instanceof ObjectId)
      .map(String),
  )].map((id) => new ObjectId(id));

  if (!courseIds.length) return resources;

  const courses = await db.collection("courses").find(
    { _id: { $in: courseIds } },
    { projection: { courseCode: 1, title: 1 } },
  ).toArray();
  const byId = new Map(courses.map((course) => [String(course._id), course]));

  return resources.map((resource) => {
    const course = byId.get(String(resource.courseId));
    if (!course) return resource;
    return {
      ...resource,
      courseCode: course.courseCode,
      courseTitle: course.title,
    };
  });
};

module.exports = {
  canManageLinkedCourse,
  canManageLegacyResource,
  canReadLinkedCourse,
  canReadLegacyResource,
  canViewCourseRecord,
  courseIdsForUser,
  enrichCourseLabels,
  getLinkedCourse,
  isCourseMember,
  resolveLegacyCourse,
  resourceVisibilityFilter,
  resolveCourseForResourceWrite,
};
