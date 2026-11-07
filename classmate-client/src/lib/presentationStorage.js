
const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/presentations`;

// Reusable API request handler
const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
};

// GET: Fetch all presentation groups
export const getPresentationCourses = async () => {
  return await apiRequest(API_URL);
};

// GET: Fetch one presentation group
export const getPresentationCourseById = async (id) => {
  return await apiRequest(`${API_URL}/${id}`);
};

// POST: Create a presentation group
export const createPresentationCourse = async (courseData) => {
  return await apiRequest(API_URL, {
    method: "POST",
    body: JSON.stringify(courseData),
  });
};

// DELETE: Delete a presentation group
export const deletePresentationCourse = async (id) => {
  return await apiRequest(`${API_URL}/${id}`, {
    method: "DELETE",
  });
};
