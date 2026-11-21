/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Clock,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  Search,
  Presentation,
  CalendarDays,
  Download,
  Dices,
  X,
  Sparkles,
  Trophy,
  RotateCw,
  Lock,
  Unlock,
  UserPlus,
  Crown,
  ListChecks,
  UsersRound,
} from "lucide-react";

import { presentationStudents } from "@/lib/presentationStudents";
import {
  getPresentationCourseById,
  assignPresentationTopic,
  setPresentationTopicLocked,
  updatePresentationSettings,
  unassignPresentationTopic,
} from "@/lib/presentationStorage";

const SPIN_DURATION_MS = 3200;

const WHEEL_COLORS = [
  "#2563eb", "#7c3aed", "#0891b2", "#d97706", "#059669",
  "#db2777", "#4f46e5", "#0d9488", "#ea580c", "#9333ea",
];

const STATUS_STYLES = {
  available: "bg-blue-50 text-blue-700 border-blue-100",
  full: "bg-amber-50 text-amber-700 border-amber-100",
  selected: "bg-amber-50 text-amber-700 border-amber-100",
  submitted: "bg-green-50 text-green-700 border-green-100",
  locked: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABELS = {
  available: "Available",
  full: "Full",
  selected: "Selected",
  submitted: "Submitted",
  locked: "Locked by CR",
};

const formatDateTime = (date) => {
  if (!date) return "Not available";
  return new Date(date).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
};

const formatDay = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function PresentationDetailsPage() {
  const params = useParams();
  const courseId = decodeURIComponent(params.courseId);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("topics"); // "topics" | "groups"
  const [search, setSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [actionError, setActionError] = useState("");
  const [busyIndex, setBusyIndex] = useState(null); // topic being locked/unlocked

  // Manual assign modal
  const [assignTarget, setAssignTarget] = useState(null); // indexed topic
  const [studentSearch, setStudentSearch] = useState("");
  const [assigningStudentId, setAssigningStudentId] = useState(null);
  const [assignError, setAssignError] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ maxStudentsPerTopic: "1", maxTopicsPerStudent: "1" });
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Lucky spin
  const [showLuckySpin, setShowLuckySpin] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinFinished, setSpinFinished] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [spinError, setSpinError] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const spinTimeoutRef = useRef(null);

  /* ───── Data loading ───── */

  const loadCourse = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPresentationCourseById(courseId);
      setCourse(data);
    } catch (error) {
      console.error("Failed to load presentation:", error);
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  /* ───── Derived data ───── */

  // Keep each topic's original index so actions always target the right one
  const maxStudentsPerTopic = Number(course?.maxStudentsPerTopic) || 1;
  const maxTopicsPerStudent = Number(course?.maxTopicsPerStudent) || 1;
  const topics = (course?.topics || []).map((topic, index) => {
    const selections = Array.isArray(topic.selections)
      ? topic.selections
      : topic.selectedBy?.id
        ? [{ id: topic.selectedBy.id, name: topic.selectedBy.name, submission: topic.submission || null }]
        : [];
    const status = topic.locked === true
      ? "locked"
      : selections.length >= maxStudentsPerTopic
        ? "full"
        : "available";
    return { ...topic, selections, status, originalIndex: index };
  });

  const availableTopics = topics.filter((topic) => topic.status === "available");

  const selectionsByStudent = new Map();
  topics.forEach((topic) => {
    topic.selections.forEach((selection) => {
      const id = String(selection.id);
      const held = selectionsByStudent.get(id) || [];
      held.push({ topic, selection });
      selectionsByStudent.set(id, held);
    });
  });

  const availableStudents = presentationStudents.filter((student) => {
    const held = selectionsByStudent.get(String(student.id)) || [];
    return held.length < maxTopicsPerStudent;
  });

  const studentTopicTitles = new Map(
    [...selectionsByStudent.entries()].map(([id, held]) => [
      id,
      held.map((item) => item.topic.title),
    ]),
  );

  // Groups: students split by "teammates" per group, first student is the leader
  const groupSize = Math.max(1, Number(course?.teammates) || 1);
  const groups = [];
  for (let i = 0; i < presentationStudents.length; i += groupSize) {
    const members = presentationStudents.slice(i, i + groupSize);
    groups.push({ number: groups.length + 1, leader: members[0], members });
  }

  const stats = {
    total: topics.length,
    available: availableTopics.length,
    full: topics.filter((t) => t.status === "full").length,
    submitted: topics.reduce((count, topic) =>
      count + topic.selections.filter((selection) => selection.submission).length, 0),
    locked: topics.filter((t) => t.status === "locked").length,
  };

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "submitted"
        ? topic.selections.some((selection) => selection.submission)
        : topic.status === activeFilter);
    return matchesSearch && matchesFilter;
  });

  const q = groupSearch.trim().toLowerCase();
  const filteredGroups = q
    ? groups.filter((g) =>
        g.members.some((m) => m.name.toLowerCase().includes(q) || String(m.id).includes(q)),
      )
    : groups;

  const filteredAssignStudents = availableStudents
    .filter((student) => {
      if (!assignTarget) return true;
      const alreadyOnTopic = (assignTarget.selections || []).some(
        (selection) => String(selection.id) === String(student.id),
      );
      return !alreadyOnTopic;
    })
    .filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        String(s.id).includes(studentSearch),
    );

  const eligibleSpinPairs = availableTopics.flatMap((topic) =>
    availableStudents
      .filter((student) => !(topic.selections || []).some(
        (selection) => String(selection.id) === String(student.id),
      ))
      .map((student) => ({ topic, student })),
  );

  /* ───── Lock / unlock ───── */

  const openSettings = () => {
    setSettingsForm({
      maxStudentsPerTopic: String(maxStudentsPerTopic),
      maxTopicsPerStudent: String(maxTopicsPerStudent),
    });
    setSettingsError("");
    setShowSettings(true);
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    const nextStudents = Number(settingsForm.maxStudentsPerTopic);
    const nextTopics = Number(settingsForm.maxTopicsPerStudent);
    if (!Number.isInteger(nextStudents) || nextStudents < 1)
      return setSettingsError("Max students per topic must be a whole number of at least 1.");
    if (!Number.isInteger(nextTopics) || nextTopics < 1)
      return setSettingsError("Max topics per student must be a whole number of at least 1.");
    if (nextTopics > topics.length)
      return setSettingsError(`Max topics per student cannot exceed ${topics.length} topics.`);

    try {
      setSavingSettings(true);
      setSettingsError("");
      await updatePresentationSettings(courseId, {
        maxStudentsPerTopic: nextStudents,
        maxTopicsPerStudent: nextTopics,
      });
      await loadCourse();
      setShowSettings(false);
    } catch (error) {
      setSettingsError(error.message || "Could not update presentation settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleLock = async (topic) => {
    if (busyIndex !== null) return;
    const lock = topic.status !== "locked";

    try {
      setBusyIndex(topic.originalIndex);
      setActionError("");
      await setPresentationTopicLocked(courseId, topic.originalIndex, lock);
      await loadCourse();
    } catch (error) {
      console.error("Lock toggle failed:", error);
      setActionError(error.message || "Could not update the topic.");
    } finally {
      setBusyIndex(null);
    }
  };

  /* ───── Manual assign ───── */

  const openAssign = (topic) => {
    setAssignTarget(topic);
    setStudentSearch("");
    setAssignError("");
  };

  const closeAssign = () => {
    if (assigningStudentId) return;
    setAssignTarget(null);
    setAssignError("");
  };

  const handleManualAssign = async (student) => {
    if (!assignTarget || assigningStudentId) return;

    try {
      setAssigningStudentId(student.id);
      setAssignError("");
      await assignPresentationTopic(courseId, assignTarget.originalIndex, student);
      await loadCourse();
      setAssignTarget(null);
    } catch (error) {
      console.error("Manual assignment failed:", error);
      setAssignError(error.message || "Failed to assign topic.");
    } finally {
      setAssigningStudentId(null);
    }
  };

  const handleUnassign = async (topic, selection) => {
    let confirmSubmission = false;
    if (selection.submission) {
      confirmSubmission = window.confirm(
        "This student has submitted a presentation. Unassigning will clear the submission. Continue?",
      );
      if (!confirmSubmission) return;
    } else if (!window.confirm(`Remove ${selection.name} from "${topic.title}"?`)) {
      return;
    }

    try {
      setActionError("");
      await unassignPresentationTopic(
        courseId,
        topic.originalIndex,
        selection.id,
        confirmSubmission,
      );
      await loadCourse();
    } catch (error) {
      setActionError(error.message || "Could not remove the student selection.");
    }
  };

  /* ───── Lucky spin ───── */

  const clearSpinTimer = () => {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
  };

  const openLuckySpin = () => {
    clearSpinTimer();
    setWheelRotation(0);
    setIsSpinning(false);
    setSpinFinished(false);
    setSpinResult(null);
    setSpinError("");
    setShowLuckySpin(true);
  };

  const closeLuckySpin = () => {
    if (isSpinning || isAssigning) return;
    clearSpinTimer();
    setShowLuckySpin(false);
    setSpinResult(null);
    setSpinFinished(false);
    setSpinError("");
    setWheelRotation(0);
  };

  const handleSpin = () => {
    if (isSpinning || isAssigning) return;

    if (!eligibleSpinPairs.length) {
      setSpinError("No available topics or students left!");
      return;
    }

    setSpinError("");
    setSpinResult(null);
    setSpinFinished(false);

    const randomPairIndex = Math.floor(Math.random() * eligibleSpinPairs.length);
    const randomPair = eligibleSpinPairs[randomPairIndex];
    const randomTopic = randomPair.topic;
    const randomStudent = randomPair.student;
    const randomIndex = availableTopics.findIndex((topic) => topic.originalIndex === randomTopic.originalIndex);

    // Rotate so the middle of the winning segment ends up under the top pointer
    const segmentAngle = 360 / availableTopics.length;
    const selectedAngle = (randomIndex + 0.5) * segmentAngle;
    const currentAngle = ((wheelRotation % 360) + 360) % 360;
    const targetAngle = (360 - selectedAngle) % 360;
    const delta = (targetAngle - currentAngle + 360) % 360;

    setSpinResult({ topic: randomTopic, student: randomStudent });
    setIsSpinning(true);
    setWheelRotation(wheelRotation + 360 * 5 + delta);

    clearSpinTimer();
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false);
      setSpinFinished(true);
      spinTimeoutRef.current = null;
    }, SPIN_DURATION_MS + 100);
  };

  const handleSpinAgain = () => {
    setSpinResult(null);
    setSpinFinished(false);
    setSpinError("");
    handleSpin();
  };

  const handleConfirmSpin = async () => {
    if (!spinResult || isAssigning || !spinFinished) return;

    try {
      setIsAssigning(true);
      setSpinError("");

      await assignPresentationTopic(courseId, spinResult.topic.originalIndex, spinResult.student);
      await loadCourse();

      setSpinResult(null);
      setSpinFinished(false);
      setWheelRotation(0);
      setShowLuckySpin(false);
    } catch (error) {
      console.error("Topic assignment failed:", error);
      setSpinError(error.message || "Failed to assign topic.");
    } finally {
      setIsAssigning(false);
    }
  };

  /* ───── Wheel geometry ───── */

  const wheelFontSize =
    availableTopics.length > 16 ? "6" : availableTopics.length > 12 ? "7" : availableTopics.length > 7 ? "9" : "11";

  const wheelSegments = (() => {
    const total = availableTopics.length;
    if (!total) return [];

    const angle = 360 / total;
    const radius = 140;
    const textRadius = radius * 0.62;

    return availableTopics.map((topic, index) => {
      const startAngle = -90 + index * angle; // segment 0 starts at 12 o'clock
      const endAngle = startAngle + angle;
      const middleAngle = startAngle + angle / 2;
      const rad = (deg) => (deg * Math.PI) / 180;

      const startX = 150 + radius * Math.cos(rad(startAngle));
      const startY = 150 + radius * Math.sin(rad(startAngle));
      const endX = 150 + radius * Math.cos(rad(endAngle));
      const endY = 150 + radius * Math.sin(rad(endAngle));
      const textX = 150 + textRadius * Math.cos(rad(middleAngle));
      const textY = 150 + textRadius * Math.sin(rad(middleAngle));

      // Keep labels upright on the left half
      const normalized = ((middleAngle % 360) + 360) % 360;
      const textAngle = normalized > 90 && normalized < 270 ? middleAngle + 180 : middleAngle;

      return {
        ...topic,
        color: WHEEL_COLORS[index % WHEEL_COLORS.length],
        // A single segment is a full circle, which an SVG arc can't draw
        path:
          total === 1
            ? null
            : `M 150 150 L ${startX} ${startY} A ${radius} ${radius} 0 ${angle > 180 ? 1 : 0} 1 ${endX} ${endY} Z`,
        textX,
        textY,
        textAngle,
      };
    });
  })();

  /* ───── Loading / not found ───── */

  if (loading && !course) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50/70">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw size={18} className="animate-spin text-blue-600" />
          Loading course details...
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-5">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <BookOpen size={32} className="mx-auto text-slate-400" />
          <h2 className="mt-4 font-semibold text-slate-900">Course not found</h2>
          <p className="mt-2 text-sm text-slate-500">This presentation group may have been deleted.</p>
          <Link
            href="/dashboard/cr#presentations"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Presentations
          </Link>
        </div>
      </div>
    );
  }

  /* ───── Render ───── */

  const statCards = [
    { label: "Total Topics", value: stats.total, icon: BookOpen, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Available", value: stats.available, icon: Clock, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Full", value: stats.full, icon: Users, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    { label: "Submitted", value: stats.submitted, icon: CheckCircle2, iconBg: "bg-green-50", iconColor: "text-green-600" },
    { label: "Locked", value: stats.locked, icon: Lock, iconBg: "bg-slate-100", iconColor: "text-slate-600" },
  ];

  const filters = [
    { value: "all", label: "All", count: stats.total },
    { value: "available", label: "Available", count: stats.available },
    { value: "full", label: "Full", count: stats.full },
    { value: "submitted", label: "Submitted", count: stats.submitted },
    { value: "locked", label: "Locked", count: stats.locked },
  ];

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/dashboard/cr#presentations"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={17} />
          Back to Presentations
        </Link>

        {/* Course header */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Presentation size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Course Presentation</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{course.courseName}</h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users size={15} />
                    {course.teammates} per group · {groups.length} groups
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={15} />
                    {stats.total} topics
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={15} />
                    Due {formatDay(course.submissionDeadline)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Presentation size={15} />
                    Present {formatDay(course.presentationDate)}
                  </span>
                  <span>
                    Up to {maxStudentsPerTopic} {maxStudentsPerTopic === 1 ? "student" : "students"} per topic · {maxTopicsPerStudent} {maxTopicsPerStudent === 1 ? "topic" : "topics"} per student
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openSettings}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
              >
                Selection Settings
              </button>
              <button
                onClick={openLuckySpin}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Dices size={17} />
                Lucky Spin
              </button>

              <button
                onClick={loadCourse}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${stat.iconBg}`}>
                    <Icon size={20} className={stat.iconColor} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-fit">
          {[
            { id: "topics", label: "Topics", icon: ListChecks },
            { id: "groups", label: "Groups & Leaders", icon: UsersRound },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                  tab === t.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {actionError && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <span>{actionError}</span>
            <button onClick={() => setActionError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ───────── Topics tab ───────── */}
        {tab === "topics" && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Presentation Topics</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Lock topics, assign students manually, and monitor submissions.
                  </p>
                </div>

                <div className="relative w-full lg:max-w-xs">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search topics..."
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      activeFilter === filter.value
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {filter.label}
                    <span className="ml-1.5 opacity-80">{filter.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredTopics.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <Search size={27} className="mx-auto text-slate-300" />
                  <h3 className="mt-3 font-semibold text-slate-800">No topics found</h3>
                  <p className="mt-1 text-sm text-slate-500">Try another search or filter.</p>
                </div>
              ) : (
                filteredTopics.map((topic) => {
                  const isBusy = busyIndex === topic.originalIndex;

                  return (
                    <div
                      key={topic._id || `${topic.title}-${topic.originalIndex}`}
                      className="p-5 transition hover:bg-slate-50/70"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                            {String(topic.originalIndex + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900">{topic.title}</h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {topic.selections.length}/{maxStudentsPerTopic} taken
                              {" · "}
                              {Math.max(0, maxStudentsPerTopic - topic.selections.length)} of {maxStudentsPerTopic} left
                            </p>
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  STATUS_STYLES[topic.status] || "border-slate-200 bg-slate-50 text-slate-600"
                                }`}
                              >
                                {topic.status === "locked" && <Lock size={11} />}
                                {STATUS_LABELS[topic.status] || topic.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:items-end">
                          {/* CR actions */}
                          <div className="flex flex-wrap gap-2">
                            {topic.status === "available" && (
                              <button
                                onClick={() => openAssign(topic)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                <UserPlus size={14} />
                                Assign Student
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleLock(topic)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {isBusy ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : topic.status === "locked" ? (
                                <Unlock size={14} />
                              ) : (
                                <Lock size={14} />
                              )}
                              {topic.status === "locked" ? "Unlock Topic" : "Lock Topic"}
                            </button>
                          </div>

                          {topic.status === "available" && (
                            <p className="text-sm text-blue-600">Open for student selection</p>
                          )}

                          {topic.status === "locked" && (
                            <p className="text-sm text-slate-500">Students can&apos;t select this topic</p>
                          )}

                          {topic.selections.length > 0 && (
                            <div className="w-full space-y-2 lg:max-w-md">
                              {topic.selections.map((selection) => (
                                <div
                                  key={String(selection.id)}
                                  className="rounded-lg border border-slate-200 bg-white p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">{selection.name}</p>
                                      <p className="mt-1 text-xs text-slate-500">ID: {selection.id}</p>
                                      <p className={`mt-2 text-xs font-semibold ${selection.submission ? "text-green-700" : "text-slate-500"}`}>
                                        {selection.submission ? "Submitted" : "Not submitted"}
                                      </p>
                                      {selection.submission?.submittedAt && (
                                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                          <CalendarDays size={12} />
                                          {formatDateTime(selection.submission.submittedAt)}
                                        </p>
                                      )}
                                      {selection.submission?.fileUrl && (
                                        <a
                                          href={selection.submission.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                                        >
                                          <Download size={13} />
                                          View Presentation
                                        </a>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleUnassign(topic, selection)}
                                      className="rounded-lg border border-red-100 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      Unassign
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
              <p className="text-xs text-slate-500">
                Showing {filteredTopics.length} of {stats.total} topics
              </p>
            </div>
          </div>
        )}

        {/* ───────── Groups tab ───────── */}
        {tab === "groups" && (
          <div className="space-y-5">
            {/* Team leaders overview */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Crown size={18} className="text-amber-500" />
                    Team Leaders
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {presentationStudents.length} students · {groups.length} groups · {groupSize} per group
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {groups.map((g) => (
                  <span
                    key={g.number}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-800"
                  >
                    <span className="rounded-full bg-amber-200/70 px-1.5 text-[10px] font-bold">G{g.number}</span>
                    {g.leader.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Find a student by name or ID..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Group cards */}
            {filteredGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
                No student matches your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {filteredGroups.map((group) => {
                  const withTopic = group.members.filter((m) => studentTopicTitles.has(String(m.id))).length;

                  return (
                    <div key={group.number} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Group {String(group.number).padStart(2, "0")}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">{group.members.length} members</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {withTopic}/{group.members.length} with topic
                        </span>
                      </div>

                      <ul className="divide-y divide-slate-100">
                        {group.members.map((member, i) => {
                          const selectedTopics = studentTopicTitles.get(String(member.id)) || [];
                          const isLeader = i === 0;

                          return (
                            <li key={member.id} className="flex items-start justify-between gap-3 px-5 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    isLeader ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {isLeader ? <Crown size={15} /> : member.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {member.name}
                                    {isLeader && (
                                      <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                        LEADER
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400">ID: {member.id}</p>
                                </div>
                              </div>

                              {selectedTopics.length > 0 ? (
                                <div className="flex max-w-[55%] flex-wrap justify-end gap-1">
                                  {selectedTopics.map((topicTitle) => (
                                    <span
                                      key={topicTitle}
                                      title={topicTitle}
                                      className="max-w-full truncate rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                                    >
                                      {topicTitle}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="shrink-0 text-[11px] text-slate-400">No topic</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───────── Selection settings modal ───────── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !savingSettings) setShowSettings(false);
          }}
        >
          <form onSubmit={handleSaveSettings} className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Selection Settings</h3>
                <p className="mt-1 text-sm text-slate-500">Update topic and student limits.</p>
              </div>
              <button type="button" onClick={() => setShowSettings(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Students per Topic</label>
                <input
                  type="number"
                  min="1"
                  value={settingsForm.maxStudentsPerTopic}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxStudentsPerTopic: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <p className="mt-1.5 text-xs text-slate-400">How many students can choose the same topic</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Topics per Student</label>
                <input
                  type="number"
                  min="1"
                  max={topics.length}
                  value={settingsForm.maxTopicsPerStudent}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxTopicsPerStudent: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <p className="mt-1.5 text-xs text-slate-400">How many topics one student can choose</p>
              </div>
            </div>
            {settingsError && (
              <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{settingsError}</p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowSettings(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={savingSettings} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {savingSettings ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ───────── Manual assign modal ───────── */}
      {assignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAssign();
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Assign Topic</p>
                <h3 className="mt-1 font-bold text-slate-900">{assignTarget.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {filteredAssignStudents.length} eligible students
                </p>
              </div>
              <button
                onClick={closeAssign}
                disabled={!!assigningStudentId}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </div>

            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {assignError && (
                <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {assignError}
                </p>
              )}
            </div>

            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {filteredAssignStudents.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-slate-500">No matching students available.</li>
              ) : (
                filteredAssignStudents.map((student) => (
                  <li key={student.id}>
                    <button
                      onClick={() => handleManualAssign(student)}
                      disabled={!!assigningStudentId}
                      className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-blue-50/50 disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-400">ID: {student.id}</p>
                      </div>

                      {assigningStudentId === student.id ? (
                        <RefreshCw size={16} className="animate-spin text-blue-600" />
                      ) : (
                        <span className="text-xs font-semibold text-blue-600">Assign</span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {/* ───────── Lucky spin modal ───────── */}
      {showLuckySpin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
            <button
              onClick={closeLuckySpin}
              disabled={isSpinning || isAssigning}
              className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Dices size={28} />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">Lucky Spin</h2>
              <p className="mt-2 text-sm text-slate-500">Randomly assign a presentation topic to a student.</p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{availableTopics.length}</p>
                <p className="text-xs font-medium text-slate-600">Available Topics</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{eligibleSpinPairs.length}</p>
                <p className="text-xs font-medium text-slate-600">Valid Topic-Student Pairs</p>
              </div>
            </div>

            {/* Wheel */}
            <div className="relative mx-auto mt-8 flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
              <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2">
                <div className="h-0 w-0 border-x-[15px] border-t-[26px] border-x-transparent border-t-red-500 drop-shadow-md" />
              </div>

              {wheelSegments.length > 0 ? (
                <div
                  className="h-full w-full rounded-full border-[7px] border-white shadow-xl"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning
                      ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.75, 0.15, 1)`
                      : "none",
                  }}
                >
                  <svg viewBox="0 0 300 300" className="h-full w-full">
                    {wheelSegments.map((segment, index) => (
                      <g key={segment._id || index}>
                        {segment.path ? (
                          <path d={segment.path} fill={segment.color} stroke="white" strokeWidth="2" />
                        ) : (
                          <circle cx="150" cy="150" r="140" fill={segment.color} stroke="white" strokeWidth="2" />
                        )}

                        <text
                          x={segment.textX}
                          y={segment.textY}
                          fill="white"
                          fontSize={wheelFontSize}
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${segment.textAngle}, ${segment.textX}, ${segment.textY})`}
                        >
                          {segment.title.length > 16 ? `${segment.title.substring(0, 14)}...` : segment.title}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full border-8 border-slate-100 bg-slate-50 text-center">
                  <p className="max-w-40 text-sm font-medium text-slate-500">No available topics left</p>
                </div>
              )}

              <div className="absolute flex h-16 w-16 flex-col items-center justify-center rounded-full border-4 border-white bg-white shadow-lg sm:h-20 sm:w-20">
                <Sparkles className="text-blue-600" size={24} />
                <span className="text-[10px] font-black text-slate-800">SPIN</span>
              </div>
            </div>

            {spinError && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {spinError}
              </div>
            )}

            {/* Result */}
            {spinResult && spinFinished && !isSpinning && (
              <div className="mt-7 rounded-xl border border-green-200 bg-green-50/60 p-5">
                <div className="text-center">
                  <Trophy className="mx-auto text-amber-500" size={32} />
                  <h3 className="mt-2 text-lg font-bold text-green-800">We Have a Winner!</h3>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Selected Topic</p>
                    <h4 className="mt-2 font-bold text-slate-900">{spinResult.topic.title}</h4>
                  </div>

                  <div className="rounded-lg border border-purple-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Selected Student</p>
                    <h4 className="mt-2 font-bold text-slate-900">{spinResult.student.name}</h4>
                    <p className="mt-1 text-sm text-slate-500">ID: {spinResult.student.id}</p>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">
                  Confirm to permanently assign this topic to the student, or spin again to re-draw.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleSpinAgain}
                    disabled={isAssigning}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                  >
                    <RotateCw size={16} />
                    Spin Again
                  </button>

                  <button
                    onClick={handleConfirmSpin}
                    disabled={isAssigning}
                    className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAssigning ? (
                      <>
                        <RefreshCw size={17} className="animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Sparkles size={17} />
                        Confirm Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Spin button */}
            {(!spinResult || !spinFinished) && (
              <button
                onClick={handleSpin}
                disabled={isSpinning || isAssigning || eligibleSpinPairs.length === 0}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCw size={20} className={isSpinning ? "animate-spin" : ""} />
                {isSpinning ? "Spinning..." : "SPIN NOW"}
              </button>
            )}

            <p className="mt-4 text-center text-xs text-slate-400">
              Locked topics and students who already have a topic are excluded.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}