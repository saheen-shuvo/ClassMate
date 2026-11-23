
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  ClipboardList,
  Presentation,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseLocalDate(value) {
  if (!value) return null;

  // Handle date-only values without UTC timezone shifting.
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );

      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date, options = {}) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getCalendarEvents(assignments, presentations) {
  const events = [];

  assignments.forEach((item) => {
    const date = parseLocalDate(item.dueDate);

    if (!date) return;

    events.push({
      id: `assignment-${item._id}`,
      title: item.title || "Assignment",
      course: item.course || "",
      date,
      type: "assignment",
      label: "Assignment Deadline",
    });
  });

  presentations.forEach((item) => {
    const date = parseLocalDate(item.presentationDate);

    if (!date) return;

    events.push({
      id: `presentation-${item._id}`,
      title: item.courseName || item.title || "Presentation",
      course: item.courseName || "",
      date,
      type: "presentation",
      label: "Presentation",
    });
  });

  return events.sort((a, b) => a.date - b.date);
}

export default function MiniAcademicCalendar() {
  const [assignments, setAssignments] = useState([]);
  const [presentations, setPresentations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const results = await Promise.allSettled([
      fetch(`${API_URL}/api/assignments`).then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load assignments."
          );
        }

        return getArray(data, "assignments");
      }),

      fetch(`${API_URL}/api/presentations`).then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load presentations."
          );
        }

        return getArray(data, "presentations");
      }),
    ]);

    const errors = [];

    if (results[0].status === "fulfilled") {
      setAssignments(results[0].value);
    } else {
      setAssignments([]);
      errors.push("Assignments could not be loaded.");
      console.error("Calendar assignment error:", results[0].reason);
    }

    if (results[1].status === "fulfilled") {
      setPresentations(results[1].value);
    } else {
      setPresentations([]);
      errors.push("Presentations could not be loaded.");
      console.error("Calendar presentation error:", results[1].reason);
    }

    if (errors.length) {
      setLoadError(errors.join(" "));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const events = useMemo(
    () => getCalendarEvents(assignments, presentations),
    [assignments, presentations]
  );

  const eventsByDate = useMemo(() => {
    const grouped = {};

    events.forEach((event) => {
      const key = dateKey(event.date);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(event);
    });

    return grouped;
  }, [events]);

  const today = new Date();
  const todayKey = dateKey(today);
  const selectedKey = dateKey(selectedDate);

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;

    const gridStart = new Date(year, month, 1 - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      return date;
    });
  }, [currentMonth]);

  const selectedEvents = eventsByDate[selectedKey] || [];

  const upcomingEvents = useMemo(() => {
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return events
      .filter((event) => event.date >= todayStart)
      .slice(0, 8);
  }, [events]);

  const changeMonth = (amount) => {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + amount,
      1
    );

    setCurrentMonth(nextMonth);
    setSelectedDate(nextMonth);
  };

  const goToToday = () => {
    const now = new Date();

    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );

    setSelectedDate(now);
  };

  const getEventStyle = (type) => {
    if (type === "assignment") {
      return {
        dot: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 border-blue-100",
        icon: ClipboardList,
      };
    }

    return {
      dot: "bg-violet-500",
      badge: "bg-violet-50 text-violet-700 border-violet-100",
      icon: Presentation,
    };
  };

  const totalAssignmentEvents = events.filter(
    (event) => event.type === "assignment"
  ).length;

  const totalPresentationEvents = events.filter(
    (event) => event.type === "presentation"
  ).length;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="text-blue-600" size={22} />
            <h2 className="text-lg font-bold text-slate-900">
              Mini Academic Calendar
            </h2>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Keep track of assignment deadlines and presentation schedules.
          </p>
        </div>

        <button
          onClick={fetchCalendarData}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
          />
          Refresh Calendar
        </button>
      </div>

      {/* Error Notice */}
      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <div>
            <p className="text-xs font-bold text-amber-800">
              Some calendar data could not be loaded
            </p>
            <p className="mt-1 text-xs text-amber-700">
              {loadError}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Total Events
            </p>
            <CalendarCheck size={20} className="text-blue-600" />
          </div>

          <h3 className="mt-3 text-3xl font-extrabold text-slate-900">
            {events.length}
          </h3>

          <p className="mt-1 text-[11px] text-slate-400">
            Loaded academic events
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Assignment Deadlines
            </p>
            <ClipboardList size={20} className="text-blue-600" />
          </div>

          <h3 className="mt-3 text-3xl font-extrabold text-slate-900">
            {totalAssignmentEvents}
          </h3>

          <p className="mt-1 text-[11px] text-slate-400">
            From published assignments
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Presentations
            </p>
            <Presentation size={20} className="text-violet-600" />
          </div>

          <h3 className="mt-3 text-3xl font-extrabold text-slate-900">
            {totalPresentationEvents}
          </h3>

          <p className="mt-1 text-[11px] text-slate-400">
            Scheduled presentations
          </p>
        </div>
      </div>

      {/* Calendar and Event Details */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Calendar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 xl:col-span-2">
          {/* Month Navigation */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {monthLabel}
              </h3>

              <p className="mt-1 text-[11px] text-slate-400">
                Select a date to view scheduled events.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              >
                Today
              </button>

              <button
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft size={17} />
              </button>

              <button
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="mb-5 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-[11px] font-medium text-slate-500">
                Assignment Deadline
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <span className="text-[11px] font-medium text-slate-500">
                Presentation
              </span>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 border-b border-slate-100 pb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date) => {
              const key = dateKey(date);
              const isCurrentMonth =
                date.getMonth() === currentMonth.getMonth();

              const isToday = key === todayKey;
              const isSelected = key === selectedKey;

              const dayEvents = eventsByDate[key] || [];

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(date)}
                  className={`relative flex min-h-[68px] flex-col items-center border-b border-r border-slate-100 px-1 py-2 transition sm:min-h-[88px] sm:py-3 ${
                    isSelected
                      ? "bg-blue-50 ring-1 ring-inset ring-blue-300"
                      : "hover:bg-slate-50"
                  } ${!isCurrentMonth ? "opacity-35" : ""}`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm ${
                      isToday
                        ? "bg-blue-600 text-white"
                        : isSelected
                        ? "bg-blue-100 text-blue-700"
                        : "text-slate-700"
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  <div className="mt-2 flex max-w-full flex-wrap justify-center gap-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          getEventStyle(event.type).dot
                        }`}
                      />
                    ))}

                    {dayEvents.length > 3 && (
                      <span className="text-[8px] font-bold text-slate-500">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <RefreshCw size={14} className="animate-spin" />
              Updating calendar...
            </div>
          )}
        </div>

        {/* Selected Date Events */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Selected Date
            </p>

            <h3 className="mt-2 text-base font-bold text-slate-900">
              {formatDate(selectedDate, {
                weekday: "long",
              })}
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              {selectedEvents.length} scheduled event
              {selectedEvents.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {selectedEvents.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarDays
                  size={30}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-xs font-semibold text-slate-600">
                  No events scheduled
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  There are no recorded academic events for this date.
                </p>
              </div>
            ) : (
              selectedEvents.map((event) => {
                const style = getEventStyle(event.type);
                const EventIcon = style.icon;

                return (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          event.type === "assignment"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-violet-50 text-violet-600"
                        }`}
                      >
                        <EventIcon size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-bold ${style.badge}`}
                        >
                          {event.label}
                        </span>

                        <h4 className="mt-2 break-words text-xs font-bold text-slate-800">
                          {event.title}
                        </h4>

                        {event.course && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            {event.course}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock size={12} />
                          {formatTime(event.date)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Upcoming Events
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Your next scheduled academic activities.
            </p>
          </div>

          <CalendarDays size={20} className="text-blue-600" />
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
            <CalendarCheck
              size={28}
              className="mx-auto text-slate-300"
            />

            <p className="mt-2 text-xs font-semibold text-slate-600">
              No upcoming events
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              New assignment deadlines and presentation dates will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const style = getEventStyle(event.type);
              const EventIcon = style.icon;

              return (
                <button
                  key={event.id}
                  onClick={() => {
                    setSelectedDate(event.date);
                    setCurrentMonth(
                      new Date(
                        event.date.getFullYear(),
                        event.date.getMonth(),
                        1
                      )
                    );
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-blue-200 hover:bg-slate-50"
                >
                  <div
                    className={`rounded-xl p-3 ${
                      event.type === "assignment"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-violet-50 text-violet-600"
                    }`}
                  >
                    <EventIcon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold text-slate-800">
                      {event.title}
                    </h4>

                    <p className="mt-1 text-[10px] text-slate-500">
                      {event.label}
                      {event.course ? ` · ${event.course}` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-bold text-slate-700">
                      {formatDate(event.date, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatTime(event.date)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
