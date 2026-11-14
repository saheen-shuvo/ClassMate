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
  FileText,
  RefreshCw,
  Search,
  Presentation,
  CalendarDays,
  Download,
} from "lucide-react";

import { Dices, X, Sparkles, Trophy, RotateCw } from "lucide-react";

import { presentationStudents } from "@/lib/presentationStudents";
import { assignPresentationTopic } from "@/lib/presentationStorage";

import { getPresentationCourseById } from "@/lib/presentationStorage";

const SPIN_DURATION_MS = 3200;

export default function PresentationDetailsPage() {
  const params = useParams();
  const courseId = decodeURIComponent(params.courseId);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showLuckySpin, setShowLuckySpin] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinFinished, setSpinFinished] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [spinError, setSpinError] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  const spinTimeoutRef = useRef(null);

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

  // Clear any pending spin timer on unmount
  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const handleRefresh = () => {
    loadCourse();
  };

  const topics = course?.topics || [];

  // Topics available for random assignment
  const availableTopics = topics
    .map((topic, index) => ({
      ...topic,
      originalIndex: index,
    }))
    .filter((topic) => topic.status === "available");

  // Students who haven't received a topic yet
  const assignedStudentIds = new Set(
    topics
      .filter((topic) => topic.status !== "available" && topic.selectedBy?.id)
      .map((topic) => String(topic.selectedBy.id)),
  );

  const availableStudents = presentationStudents.filter(
    (student) => !assignedStudentIds.has(String(student.id)),
  );

  const wheelColors = [
    "#2563eb",
    "#7c3aed",
    "#0891b2",
    "#d97706",
    "#059669",
    "#db2777",
    "#4f46e5",
    "#0d9488",
    "#ea580c",
    "#9333ea",
  ];

  const getWheelSegments = () => {
    const total = availableTopics.length;

    if (!total) return [];

    const angle = 360 / total;

    return availableTopics.map((topic, index) => {
      // Segment 0 starts at the top (12 o'clock) and goes clockwise
      const startAngle = -90 + index * angle;
      const endAngle = startAngle + angle;
      const middleAngle = startAngle + angle / 2;

      const radius = 140;
      const textRadius = radius * 0.62;

      const startX = 150 + radius * Math.cos((startAngle * Math.PI) / 180);
      const startY = 150 + radius * Math.sin((startAngle * Math.PI) / 180);

      const endX = 150 + radius * Math.cos((endAngle * Math.PI) / 180);
      const endY = 150 + radius * Math.sin((endAngle * Math.PI) / 180);

      const textX = 150 + textRadius * Math.cos((middleAngle * Math.PI) / 180);
      const textY = 150 + textRadius * Math.sin((middleAngle * Math.PI) / 180);

      const largeArc = angle > 180 ? 1 : 0;

      // Radial text; flip labels on the left half so they're never upside down
      const normalized = ((middleAngle % 360) + 360) % 360;
      const isLeftHalf = normalized > 90 && normalized < 270;
      const textAngle = isLeftHalf ? middleAngle + 180 : middleAngle;

      return {
        ...topic,
        color: wheelColors[index % wheelColors.length],
        // A single segment is a full circle, which an SVG arc can't draw
        path:
          total === 1
            ? null
            : `M 150 150 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`,
        textX,
        textY,
        textAngle,
        angle,
        middleAngle,
      };
    });
  };

  const wheelSegments = getWheelSegments();

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

    if (!availableTopics.length || !availableStudents.length) {
      setSpinError("No available topics or students left!");
      return;
    }

    setSpinError("");
    setSpinResult(null);
    setSpinFinished(false);

    // Randomly select topic and student
    const randomIndex = Math.floor(Math.random() * availableTopics.length);
    const randomTopic = availableTopics[randomIndex];

    const randomStudent =
      availableStudents[Math.floor(Math.random() * availableStudents.length)];

    // Angle (clockwise from the top) of the middle of the winning segment
    const segmentAngle = 360 / availableTopics.length;
    const selectedAngle = (randomIndex + 0.5) * segmentAngle;

    // We need: (finalRotation + selectedAngle) % 360 === 0
    // so the winning segment's middle sits under the pointer at the top.
    const currentAngle = ((wheelRotation % 360) + 360) % 360;
    const targetAngle = (360 - selectedAngle) % 360;
    const delta = (targetAngle - currentAngle + 360) % 360;

    const finalRotation = wheelRotation + 360 * 5 + delta;

    setSpinResult({
      topic: randomTopic,
      student: randomStudent,
    });

    setIsSpinning(true);
    setWheelRotation(finalRotation);

    clearSpinTimer();
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false);
      setSpinFinished(true);
      spinTimeoutRef.current = null;
    }, SPIN_DURATION_MS + 100);
  };

  const handleAssignTopic = async () => {
    if (!spinResult || isAssigning || !spinFinished) return;

    try {
      setIsAssigning(true);
      setSpinError("");

      await assignPresentationTopic(
        courseId,
        spinResult.topic.originalIndex,
        spinResult.student,
      );

      // Refresh course data from MongoDB
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

  const stats = {
    total: topics.length,
    available: topics.filter((topic) => topic.status === "available").length,
    selected: topics.filter((topic) => topic.status === "selected").length,
    submitted: topics.filter((topic) => topic.status === "submitted").length,
  };

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      activeFilter === "all" || topic.status === activeFilter;

    return matchesSearch && matchesFilter;
  });

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-BD", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const statusStyles = {
    available: "bg-blue-50 text-blue-700 border-blue-100",
    selected: "bg-amber-50 text-amber-700 border-amber-100",
    submitted: "bg-green-50 text-green-700 border-green-100",
  };

  const statusLabels = {
    available: "Available",
    selected: "Selected",
    submitted: "Submitted",
  };

  const wheelFontSize =
    availableTopics.length > 16
      ? "6"
      : availableTopics.length > 12
        ? "7"
        : availableTopics.length > 7
          ? "9"
          : "11";

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
          <h2 className="mt-4 font-semibold text-slate-900">
            Course not found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            This presentation group may have been deleted.
          </p>
          <Link
            href="/dashboard/cr"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/dashboard/cr"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={17} />
          Back to Presentations
        </Link>

        {/* Course Header */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Presentation size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Course Presentation
                </p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                  {course.courseName}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users size={15} />
                    {course.teammates} teammates
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={15} />
                    {stats.total} topics
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openLuckySpin}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Dices size={17} />
                Lucky Spin
              </button>

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            {
              label: "Total Topics",
              value: stats.total,
              icon: BookOpen,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
            {
              label: "Available",
              value: stats.available,
              icon: Clock,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
            {
              label: "Selected",
              value: stats.selected,
              icon: Users,
              iconBg: "bg-amber-50",
              iconColor: "text-amber-600",
            },
            {
              label: "Submitted",
              value: stats.submitted,
              icon: CheckCircle2,
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>

                  <div className={`rounded-lg p-3 ${stat.iconBg}`}>
                    <Icon size={20} className={stat.iconColor} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Topic Management */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Presentation Topics
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Monitor topic availability and student submissions.
                </p>
              </div>

              <div className="relative w-full lg:max-w-xs">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search topics..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { value: "all", label: "All Topics", count: stats.total },
                {
                  value: "available",
                  label: "Available",
                  count: stats.available,
                },
                { value: "selected", label: "Selected", count: stats.selected },
                {
                  value: "submitted",
                  label: "Submitted",
                  count: stats.submitted,
                },
              ].map((filter) => (
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

          {/* Topic List */}
          <div className="divide-y divide-slate-100">
            {filteredTopics.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Search size={27} className="mx-auto text-slate-300" />
                <h3 className="mt-3 font-semibold text-slate-800">
                  No topics found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try another search or filter.
                </p>
              </div>
            ) : (
              filteredTopics.map((topic, index) => (
                <div
                  key={topic._id || `${topic.title}-${index}`}
                  className="p-5 transition hover:bg-slate-50/70"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">
                          {topic.title}
                        </h3>

                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              statusStyles[topic.status] ||
                              "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            {statusLabels[topic.status] || topic.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {topic.status === "available" && (
                      <p className="text-sm text-blue-600 lg:text-right">
                        Open for student selection
                      </p>
                    )}

                    {topic.status === "selected" && topic.selectedBy && (
                      <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 lg:min-w-64">
                        <p className="text-xs font-medium text-amber-700">
                          Selected by
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {topic.selectedBy.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Student ID: {topic.selectedBy.id}
                        </p>
                      </div>
                    )}

                    {topic.status === "submitted" && topic.submission && (
                      <div className="w-full rounded-lg border border-green-100 bg-green-50/50 p-4 lg:max-w-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                          <FileCheck size={17} />
                          Presentation Submitted
                        </div>

                        <p className="mt-3 break-all text-sm font-medium text-slate-800">
                          {topic.submission.fileName}
                        </p>

                        <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                          <p>
                            Submitted by:{" "}
                            <span className="font-medium text-slate-700">
                              {topic.submission.submittedBy}
                            </span>
                          </p>
                          <p>Student ID: {topic.submission.studentId}</p>
                          <p className="flex items-center gap-1">
                            <CalendarDays size={13} />
                            {formatDate(topic.submission.submittedAt)}
                          </p>
                        </div>

                        {topic.submission.fileUrl ? (
                          <a
                            href={topic.submission.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            <Download size={14} />
                            View Presentation
                          </a>
                        ) : (
                          <p className="mt-3 text-xs text-slate-400">
                            Demo record — no actual file attached.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-slate-500">
              Showing {filteredTopics.length} of {stats.total} topics
            </p>
          </div>
        </div>
      </div>

      {showLuckySpin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
            {/* Close Button */}
            <button
              onClick={closeLuckySpin}
              disabled={isSpinning || isAssigning}
              className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Dices size={28} />
              </div>

              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                Lucky Spin
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Randomly assign a presentation topic to a student.
              </p>
            </div>

            {/* Available Counts */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {availableTopics.length}
                </p>
                <p className="text-xs font-medium text-slate-600">
                  Available Topics
                </p>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">
                  {availableStudents.length}
                </p>
                <p className="text-xs font-medium text-slate-600">
                  Available Students
                </p>
              </div>
            </div>

            {/* Topic Roulette Wheel */}
            <div className="relative mx-auto mt-8 flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
              {/* Pointer */}
              <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2">
                <div className="h-0 w-0 border-x-[15px] border-t-[26px] border-x-transparent border-t-red-500 drop-shadow-md" />
              </div>

              {/* Wheel */}
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
                          <path
                            d={segment.path}
                            fill={segment.color}
                            stroke="white"
                            strokeWidth="2"
                          />
                        ) : (
                          <circle
                            cx="150"
                            cy="150"
                            r="140"
                            fill={segment.color}
                            stroke="white"
                            strokeWidth="2"
                          />
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
                          {segment.title.length > 16
                            ? `${segment.title.substring(0, 14)}...`
                            : segment.title}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full border-8 border-slate-100 bg-slate-50 text-center">
                  <p className="max-w-40 text-sm font-medium text-slate-500">
                    No available topics left
                  </p>
                </div>
              )}

              {/* Center Decoration */}
              <div className="absolute flex h-16 w-16 flex-col items-center justify-center rounded-full border-4 border-white bg-white shadow-lg sm:h-20 sm:w-20">
                <Sparkles className="text-blue-600" size={24} />
                <span className="text-[10px] font-black text-slate-800">
                  SPIN
                </span>
              </div>
            </div>

            {/* Error */}
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

                  <h3 className="mt-2 text-lg font-bold text-green-800">
                    We Have a Winner!
                  </h3>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {/* Topic */}
                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Selected Topic
                    </p>

                    <h4 className="mt-2 font-bold text-slate-900">
                      {spinResult.topic.title}
                    </h4>
                  </div>

                  {/* Student */}
                  <div className="rounded-lg border border-purple-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                      Selected Student
                    </p>

                    <h4 className="mt-2 font-bold text-slate-900">
                      {spinResult.student.name}
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      ID: {spinResult.student.id}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">
                  Confirm to permanently assign this topic to the student.
                </p>

                <button
                  onClick={handleAssignTopic}
                  disabled={isAssigning}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
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
            )}

            {/* Spin Button */}
            {(!spinResult || (spinResult && !spinFinished)) && (
              <button
                onClick={handleSpin}
                disabled={
                  isSpinning ||
                  isAssigning ||
                  availableTopics.length === 0 ||
                  availableStudents.length === 0
                }
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCw
                  size={20}
                  className={isSpinning ? "animate-spin" : ""}
                />

                {isSpinning ? "Spinning..." : "SPIN NOW"}
              </button>
            )}

            {/* Spin again (before confirming) */}
            {/* {spinResult && spinFinished && !isAssigning && (
              <button
                onClick={handleSpin}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <RotateCw size={17} />
                Spin Again
              </button>
            )} */}

            {/* Footer */}
            <p className="mt-4 text-center text-xs text-slate-400">
              Each student and topic can only be assigned once.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}