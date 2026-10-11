import Link from "next/link";
import { FiArrowUpRight, FiUsers, FiBookOpen, FiBell } from "react-icons/fi";

export default function Banner() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-6 text-sm font-medium tracking-wide text-blue-700">
            YOUR UNIVERSITY, CONNECTED
          </p>

          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            University life works better{" "}
            <span className="text-slate-500">together.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            A shared space for students to exchange study materials, discover
            presentation topics, stay informed, and find the right teammates
            for academic projects.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-800"
            >
              Join ClassMate
              <FiArrowUpRight size={17} />
            </Link>

            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Explore resources
            </Link>
          </div>
        </div>

        <div className="mt-16 border-t border-slate-200 pt-8 sm:mt-20">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Everything you need to collaborate
          </p>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <FiBookOpen size={20} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Study Resources
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Share notes and access course materials in one place.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <FiUsers size={20} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Team Collaboration
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Find compatible teammates for your next project.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <FiBell size={20} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Campus Updates
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Keep track of announcements and presentation topics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}