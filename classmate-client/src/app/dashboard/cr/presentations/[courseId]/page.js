/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useCallback, useEffect, useState } from "react";
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

import { getPresentationCourseById } from "@/lib/presentationStorage";

export default function PresentationDetailsPage() {
  const params = useParams();
  const courseId = decodeURIComponent(params.courseId);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

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

  const handleRefresh = () => {
    loadCourse();
  };

  const topics = course?.topics || [];

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

  if (loading) {
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
    </div>
  );
}
