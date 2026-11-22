/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  Presentation,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getStudentPresentations,
  selectStudentPresentationTopic,
} from "@/lib/presentationStorage";

const formatDate = (value) => {
  if (!value) return "Recently created";
  return new Date(value).toLocaleDateString();
};

export default function StudentPresentations({ studentEmail }) {
  const [presentations, setPresentations] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState("");
  const [error, setError] = useState("");

  const loadPresentations = useCallback(async () => {
    if (!studentEmail) {
      setLoading(false);
      setError("Sign in as a student to view presentation groups.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await getStudentPresentations(studentEmail);
      setPresentations(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("Fetch student presentations error:", requestError);
      setError(requestError.message || "Could not load presentation groups.");
    } finally {
      setLoading(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    loadPresentations();
  }, [loadPresentations]);

  const courses = useMemo(
    () => [...new Set(presentations.map((item) => item.courseName).filter(Boolean))],
    [presentations],
  );

  const filteredPresentations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return presentations.filter((item) => {
      const matchesSearch =
        !query ||
        item.courseName?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query);
      const matchesCourse = courseFilter === "all" || item.courseName === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [courseFilter, presentations, search]);

  const currentSelection = useMemo(
    () =>
      presentations.flatMap((presentation) =>
        presentation.topics
          .filter((topic) => topic.selectedByCurrentStudent)
          .map((topic) => ({ presentation, topic })),
      ),
    [presentations],
  );

  const handleSelect = async (presentation, topic) => {
    const result = await Swal.fire({
      icon: "question",
      title: "Select this topic?",
      text: `You are selecting "${topic.title}" from "${presentation.courseName}". This may reserve the topic for you.`,
      showCancelButton: true,
      confirmButtonText: "Confirm selection",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const key = `${presentation._id}:${topic.index}`;
    try {
      setSelecting(key);
      await selectStudentPresentationTopic(presentation._id, topic.index, studentEmail);
      await Swal.fire({
        icon: "success",
        title: "Topic selected",
        text: "Your presentation selection has been saved.",
        confirmButtonColor: "#2563eb",
      });
      await loadPresentations();
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: "Selection failed",
        text: requestError.message || "The topic could not be selected.",
        confirmButtonColor: "#2563eb",
      });
      await loadPresentations();
    } finally {
      setSelecting("");
    }
  };

  if (selectedGroup) {
    const group = presentations.find((item) => item._id === selectedGroup._id) || selectedGroup;
    return (
      <section className="space-y-5">
        <button
          onClick={() => setSelectedGroup(null)}
          className="flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft size={16} /> Back to presentation groups
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Presentation group</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">{group.courseName}</h2>
              {group.description && <p className="mt-2 text-sm text-slate-500">{group.description}</p>}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <CalendarDays size={14} /> Created {formatDate(group.createdAt)}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {group.topics.map((topic) => {
            const full = topic.selectionCount >= (group.maxStudentsPerTopic || 1);
            const studentHasSelection = group.topics.some((item) => item.selectedByCurrentStudent);
            const available = !topic.locked && !full && !topic.selectedByCurrentStudent && !studentHasSelection;
            const key = `${group._id}:${topic.index}`;
            return (
              <article key={`${topic.index}-${topic.title}`} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-900">{topic.title}</h3>
                  {topic.selectedByCurrentStudent ? (
                    <CheckCircle2 className="shrink-0 text-emerald-600" size={19} />
                  ) : topic.locked || full ? (
                    <LockKeyhole className="shrink-0 text-slate-400" size={19} />
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {topic.selectedByCurrentStudent
                    ? `Selected on ${formatDate(topic.selectedAt)}`
                    : studentHasSelection
                      ? "You already selected one topic in this presentation group."
                    : topic.locked
                      ? "This topic is locked by the course representative."
                      : full
                        ? "This topic has reached its selection limit."
                        : "Available for selection."}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Users size={13} /> {topic.selectionCount || 0}/{group.maxStudentsPerTopic || 1} selected
                </p>
                <button
                  disabled={!available || selecting === key}
                  onClick={() => handleSelect(group, topic)}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {selecting === key ? "Saving..." : topic.selectedByCurrentStudent ? "Selected" : "Select topic"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Presentation size={20} className="text-blue-600" />
            <h2 className="text-xl font-extrabold text-slate-900">Presentation groups</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Browse groups and reserve an available presentation topic.</p>
        </div>
        <button onClick={loadPresentations} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {currentSelection.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">My presentation</p>
          {currentSelection.map(({ presentation, topic }) => (
            <button key={`${presentation._id}-${topic.index}`} onClick={() => setSelectedGroup(presentation)} className="mt-2 block text-left">
              <p className="text-sm font-bold text-slate-900">{topic.title}</p>
              <p className="text-xs text-slate-600">{presentation.courseName} · Selected {formatDate(topic.selectedAt)}</p>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <Search size={16} className="text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search presentation groups..." className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
        </label>
        <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none">
          <option value="all">All courses</option>
          {courses.map((course) => <option key={course} value={course}>{course}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button onClick={loadPresentations} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700">Try again</button>
        </div>
      ) : filteredPresentations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Presentation size={28} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-700">{presentations.length ? "No matching groups" : "No presentation groups yet"}</h3>
          <p className="mt-1 text-xs text-slate-400">{presentations.length ? "Try a different search or course filter." : "Check back when a course representative creates a group."}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPresentations.map((presentation) => {
            const available = presentation.topics.filter((topic) => !topic.locked && topic.selectionCount < (presentation.maxStudentsPerTopic || 1)).length;
            const selected = presentation.topics.filter((topic) => topic.selectedByCurrentStudent).length;
            return (
              <button key={presentation._id} onClick={() => setSelectedGroup(presentation)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Presentation size={21} /></div>
                  <span className="text-[10px] font-semibold text-slate-400">{formatDate(presentation.createdAt)}</span>
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900">{presentation.courseName}</h3>
                {presentation.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{presentation.description}</p>}
                <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{presentation.topics.length} topics</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{available} available</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{selected} selected by you</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
