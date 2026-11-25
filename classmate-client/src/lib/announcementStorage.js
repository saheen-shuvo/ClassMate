const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const ANNOUNCEMENTS_URL = `${API_URL}/api/announcements`;

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

  if (!response.ok) {
    throw new Error(data.message || "Announcement request failed.");
  }

  return data;
};

export const getAnnouncements = () => request(ANNOUNCEMENTS_URL);

export const createAnnouncement = (announcement) =>
  request(ANNOUNCEMENTS_URL, {
    method: "POST",
    body: JSON.stringify(announcement),
  });

export const updateAnnouncement = (id, announcement) =>
  request(`${ANNOUNCEMENTS_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(announcement),
  });

export const deleteAnnouncement = (id) =>
  request(`${ANNOUNCEMENTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
