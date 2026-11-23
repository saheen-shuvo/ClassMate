
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  Presentation,
  Brain,
  ClipboardList,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const COURSES = [
  { code: "CSE 412", name: "Machine Learning", color: "blue" },
  { code: "CSE 321", name: "Operating Systems", color: "violet" },
  { code: "CSE 331", name: "Database Systems", color: "emerald" },
  { code: "CSE 421", name: "Cloud Computing", color: "amber" },
];

const getList = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getCourseCode = (value) => {
  const match = String(value || "").toUpperCase().match(/CSE\s*\d{3}/);
  return match ? match[0].replace(/\s+/g, " ") : "";
};

const colorStyles = {
  blue: {
    icon: "bg-blue-50 text-blue-600",
    accent: "text-blue-600",
    border: "hover:border-blue-300",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    accent: "text-violet-600",
    border: "hover:border-violet-300",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    accent: "text-emerald-600",
    border: "hover:border-emerald-300",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    accent: "text-amber-600",
    border: "hover:border-amber-300",
  },
};

export default function CourseOverview({ notes = [], onNavigate }) {
  const [assignments, setAssignments] = useState(null);
  const [presentations, setPresentations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    const results = await Promise.allSettled([
      fetch(`${API_URL}/api/assignments`, {
        credentials: "include",
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load assignments.");
        }
        return getList(data, "assignments");
      }),

      fetch(`${API_URL}/api/presentations`, {
        credentials: "include",
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load presentations.");
        }
        return getList(data, "presentations");
      }),
    ]);

    const nextErrors = [];

    if (results[0].status === "fulfilled") {
      setAssignments(results[0].value);
    } else {
      setAssignments(null);
      nextErrors.push("Assignments could not be loaded.");
      console.error(results[0].reason);
    }

    if (results[1].status === "fulfilled") {
      setPresentations(results[1].value);
    } else {
      setPresentations(null);
      nextErrors.push("Presentations could not be loaded.");
      console.error(results[1].reason);
    }

    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCounts = (courseCode) => {
    const assignmentCount =
      assignments === null
        ? null
        : assignments.filter(
            (item) => getCourseCode(item.course) === courseCode,
          ).length;

    const presentationCount =
      presentations === null
        ? null
        : presentations
            .filter(
              (item) => getCourseCode(item.courseName) === courseCode,
            )
            .reduce(
              (total, item) =>
                total + (Array.isArray(item.topics) ? item.topics.length : 0),
              0,
            );

    const noteCount = notes.filter(
      (item) => getCourseCode(item.course) === courseCode,
    ).length;

    return { assignmentCount, presentationCount, noteCount };
  };

  const Metric = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-slate-600">
        <Icon size={16} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">
        {value === null ? "--" : value}
      </span>
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Course Overview
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Monitor assignments, presentations and learning materials
            across your courses.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            Some course information could not be loaded.
          </p>
          {errors.map((error) => (
            <p key={error} className="mt-1 text-xs text-amber-700">
              {error}
            </p>
          ))}
          <button
            onClick={loadData}
            className="mt-3 text-xs font-bold text-amber-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {COURSES.map((course) => {
          const styles = colorStyles[course.color];
          const counts = getCounts(course.code);

          return (
            <div
              key={course.code}
              className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.border}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon}`}
                  >
                    <BookOpen size={22} />
                  </div>

                  <div>
                    <p className={`text-xs font-bold ${styles.accent}`}>
                      {course.code}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">
                      {course.name}
                    </h3>
                  </div>
                </div>

                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                  Course
                </span>
              </div>

              <div className="mt-5 space-y-2">
                {loading ? (
                  <>
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-11 animate-pulse rounded-xl bg-slate-100"
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <Metric
                      icon={ClipboardList}
                      label="Assignments"
                      value={counts.assignmentCount}
                    />
                    <Metric
                      icon={Presentation}
                      label="Presentation Topics"
                      value={counts.presentationCount}
                    />
                    <Metric
                      icon={FileText}
                      label="Course Notes"
                      value={counts.noteCount}
                    />
                  </>
                )}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Actions
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onNavigate("assignments")}
                    className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2.5 text-left text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Assignments <ArrowRight size={13} />
                  </button>

                  <button
                    onClick={() => onNavigate("presentations")}
                    className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2.5 text-left text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    Presentations <ArrowRight size={13} />
                  </button>

                  <button
                    onClick={() => onNavigate("notes")}
                    className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5 text-left text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Course Notes <ArrowRight size={13} />
                  </button>

                  <button
                    onClick={() => onNavigate("quizzes")}
                    className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5 text-left text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Quiz Bank <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
