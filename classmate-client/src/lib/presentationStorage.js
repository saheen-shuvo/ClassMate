
const STORAGE_KEY = "classmate_presentations";

// Demo students for frontend testing
export const demoStudents = [
  { id: "STU001", name: "Rahim Ahmed" },
  { id: "STU002", name: "Nusrat Jahan" },
  { id: "STU003", name: "Tanvir Hasan" },
  { id: "STU004", name: "Sadia Islam" },
  { id: "STU005", name: "Mehedi Hasan" },
  { id: "STU006", name: "Ayesha Rahman" },
];

const initialCourses = [
  {
    id: "machine-learning",
    courseName: "Machine Learning",
    teammates: 4,
    createdAt: new Date().toISOString(),
    topics: [
      {
        id: "ml-topic-1",
        title: "Introduction to Artificial Intelligence",
        status: "available",
        selectedBy: null,
        submission: null,
      },
      {
        id: "ml-topic-2",
        title: "Supervised Learning",
        status: "selected",
        selectedBy: {
          id: "STU001",
          name: "Rahim Ahmed",
        },
        submission: null,
      },
      {
        id: "ml-topic-3",
        title: "Unsupervised Learning",
        status: "submitted",
        selectedBy: {
          id: "STU002",
          name: "Nusrat Jahan",
        },
        submission: {
          fileName: "Unsupervised-Learning.pptx",
          submittedBy: "Nusrat Jahan",
          studentId: "STU002",
          submittedAt: new Date().toISOString(),
          fileUrl: null,
        },
      },
      {
        id: "ml-topic-4",
        title: "Neural Networks",
        status: "available",
        selectedBy: null,
        submission: null,
      },
      {
        id: "ml-topic-5",
        title: "Deep Learning",
        status: "available",
        selectedBy: null,
        submission: null,
      },
    ],
  },
  {
    id: "cloud-computing",
    courseName: "Cloud Computing",
    teammates: 3,
    createdAt: new Date().toISOString(),
    topics: [
      {
        id: "cc-topic-1",
        title: "Introduction to Cloud Computing",
        status: "available",
        selectedBy: null,
        submission: null,
      },
      {
        id: "cc-topic-2",
        title: "Cloud Service Models",
        status: "selected",
        selectedBy: {
          id: "STU003",
          name: "Tanvir Hasan",
        },
        submission: null,
      },
      {
        id: "cc-topic-3",
        title: "Virtualization",
        status: "available",
        selectedBy: null,
        submission: null,
      },
      {
        id: "cc-topic-4",
        title: "Distributed Systems",
        status: "available",
        selectedBy: null,
        submission: null,
      },
    ],
  },
];

// Normalize course names to prevent duplicates
export const normalizeCourseName = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

// Read courses from localStorage
export const getPresentationCourses = () => {
  if (typeof window === "undefined") return [];

  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCourses));
      return initialCourses;
    }

    return JSON.parse(savedData);
  } catch (error) {
    console.error("Could not read presentation data:", error);
    return [];
  }
};

// Save courses to localStorage
export const savePresentationCourses = (courses) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));

  // Notify other components/tabs in the same browser
  window.dispatchEvent(new Event("presentations-updated"));
};

// Create a new course
export const createPresentationCourse = (courseData) => {
  const courses = getPresentationCourses();

  const alreadyExists = courses.some(
    (course) =>
      normalizeCourseName(course.courseName) ===
      normalizeCourseName(courseData.courseName)
  );

  if (alreadyExists) {
    throw new Error("A presentation group for this course already exists.");
  }

  const courseId = normalizeCourseName(courseData.courseName)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const newCourse = {
    id: courseId,
    courseName: courseData.courseName.trim(),
    teammates: Number(courseData.teammates),
    createdAt: new Date().toISOString(),
    topics: courseData.topics.map((title, index) => ({
      id: `${courseId}-topic-${Date.now()}-${index}`,
      title: title.trim(),
      status: "available",
      selectedBy: null,
      submission: null,
    })),
  };

  savePresentationCourses([...courses, newCourse]);

  return newCourse;
};

// Update one course
export const updatePresentationCourse = (courseId, updatedData) => {
  const courses = getPresentationCourses();

  const updatedCourses = courses.map((course) =>
    course.id === courseId
      ? { ...course, ...updatedData }
      : course
  );

  savePresentationCourses(updatedCourses);

  return updatedCourses;
};

// Delete a course
export const deletePresentationCourse = (courseId) => {
  const courses = getPresentationCourses();

  const updatedCourses = courses.filter(
    (course) => course.id !== courseId
  );

  savePresentationCourses(updatedCourses);
};
