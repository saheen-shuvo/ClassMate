"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "@/lib/announcementStorage";

const EMPTY_FORM = {
  title: "",
  description: "",
  course: "",
  priority: "Medium",
};

const PRIORITY_STYLES = {
  High: "bg-rose-50 text-rose-600",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-500",
};

function formatAnnouncement(announcement) {
  const date = announcement.createdAt ? new Date(announcement.createdAt) : null;
  return {
    ...announcement,
    id: String(announcement._id || announcement.id),
    date:
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleString()
        : "Date unavailable",
  };
}

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await getAnnouncements();
      if (!Array.isArray(data)) {
        throw new Error("Unexpected announcements response.");
      }
      setAnnouncements(data.map(formatAnnouncement));
      setError("");
    } catch (requestError) {
      console.error("Fetch admin announcements error:", requestError);
      setError(requestError.message || "Failed to load announcements.");
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadAnnouncements);
  }, [loadAnnouncements]);

  const openCreate = () => {
    setEditingAnnouncement(null);
    setForm(EMPTY_FORM);
    setModal("create");
  };

  const openEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title || "",
      description: announcement.description || "",
      course: announcement.course || "",
      priority: announcement.priority || "Medium",
    });
    setModal("edit");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const details = {
      title: form.title.trim(),
      description: form.description.trim(),
      course: form.course.trim(),
      priority: form.priority,
    };

    try {
      setSaving(true);
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, details);
      } else {
        await createAnnouncement(details);
      }
      setModal(null);
      setEditingAnnouncement(null);
      setForm(EMPTY_FORM);
      await loadAnnouncements();
      await Swal.fire({
        icon: "success",
        title: editingAnnouncement ? "Announcement updated" : "Announcement published",
        confirmButtonColor: "#2563eb",
      });
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: "Could not save announcement",
        text: requestError.message,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (announcement) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete announcement?",
      text: "This announcement will be permanently deleted.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!result.isConfirmed || deletingId) return;

    try {
      setDeletingId(announcement.id);
      await deleteAnnouncement(announcement.id);
      await loadAnnouncements();
    } catch (requestError) {
      setError(requestError.message || "Failed to delete announcement.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Announcements</h2>
          <p className="mt-1 text-xs text-slate-500">
            Manage announcements shared with the ClassMate community.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Plus size={15} /> New Announcement
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <span>{error}</span>
          <button onClick={loadAnnouncements} className="ml-3 font-bold underline">
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          <RefreshCw size={18} className="mx-auto animate-spin text-blue-600" />
          <p className="mt-3">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Bell size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">No announcements yet</p>
          <p className="mt-1 text-xs text-slate-400">Publish an announcement to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                      {announcement.course || "General"}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${PRIORITY_STYLES[announcement.priority] || PRIORITY_STYLES.Low}`}>
                      {announcement.priority || "Low"} Priority
                    </span>
                  </div>
                  <h3 className="break-words text-sm font-bold text-slate-900">{announcement.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                    {announcement.description}
                  </p>
                  <p className="mt-3 text-[10px] text-slate-400">
                    {announcement.date}
                    {announcement.createdBy?.name ? ` · ${announcement.createdBy.name}` : ""}
                  </p>
                </div>
                <div className="flex self-end gap-1 sm:self-start">
                  <button
                    onClick={() => openEdit(announcement)}
                    aria-label={`Edit ${announcement.title}`}
                    className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement)}
                    disabled={deletingId === announcement.id}
                    aria-label={`Delete ${announcement.title}`}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="my-auto max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">Share an academic update with the community.</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                aria-label="Close announcement form"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Course or audience
              <input
                required
                maxLength={120}
                value={form.course}
                onChange={(event) => setForm({ ...form, course: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Title
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Priority
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Description
              <textarea
                required
                rows={5}
                maxLength={5000}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>
            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                {saving ? "Saving..." : editingAnnouncement ? "Save Changes" : "Publish Announcement"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
