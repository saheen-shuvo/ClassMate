const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const COURSES_URL = `${API_URL}/api/courses`;

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) throw new Error(data.message || "Course request failed.");
  return data;
};

export const getCourses = (filters = {}) => {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value != null && value !== ""),
  );
  return request(`${COURSES_URL}${query.size ? `?${query}` : ""}`);
};

export const getCourse = (id) =>
  request(`${COURSES_URL}/${encodeURIComponent(id)}`);

export const getCourseStudents = (id) =>
  request(`${COURSES_URL}/${encodeURIComponent(id)}/students`);

export const createCourse = (course) =>
  request(COURSES_URL, {
    method: "POST",
    body: JSON.stringify(course),
  });

export const updateCourse = (id, updates) =>
  request(`${COURSES_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

export const deleteCourse = (id) =>
  request(`${COURSES_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

export const enrollStudent = (courseId, studentId) =>
  request(`${COURSES_URL}/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}`, {
    method: "POST",
  });

export const removeCourseStudent = (courseId, studentId) =>
  request(`${COURSES_URL}/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}`, {
    method: "DELETE",
  });
