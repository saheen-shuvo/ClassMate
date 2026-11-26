"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ClipboardList, RefreshCw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const formatDate = (value) => {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid due date"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export default function AssignmentList() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/assignments`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load assignments.");
      if (!Array.isArray(data)) throw new Error("Unexpected assignments response.");
      setAssignments(data);
    } catch (requestError) {
      setError(requestError.message || "Failed to load assignments.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadAssignments);
  }, [loadAssignments]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Course Assignments</h2>
          <p className="mt-1 text-xs text-slate-500">Assignments for courses in which you are enrolled.</p>
        </div>
        <button onClick={loadAssignments} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">{error}</div>}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-200" />)}</div>
      ) : assignments.length ? (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <article key={assignment._id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ClipboardList size={19} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div><p className="text-sm font-bold text-slate-900">{assignment.title}</p><p className="mt-1 text-xs font-semibold text-blue-700">{assignment.courseCode ? `${assignment.courseCode} · ` : ""}{assignment.courseTitle || assignment.course || "Course"}</p></div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><CalendarDays size={13} /> Due {formatDate(assignment.dueDate)}</span>
                  </div>
                  {assignment.description && <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{assignment.description}</p>}
                  {assignment.instructions && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"><span className="font-bold text-slate-700">Instructions: </span>{assignment.instructions}</div>}
                  {assignment.totalMarks != null && <p className="mt-3 text-[11px] font-semibold text-slate-500">Total marks: {assignment.totalMarks}</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <ClipboardList size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">No assignments yet</p>
          <p className="mt-1 text-xs text-slate-500">Assignments for your enrolled courses will appear here.</p>
        </div>
      ) : null}
    </section>
  );
}
