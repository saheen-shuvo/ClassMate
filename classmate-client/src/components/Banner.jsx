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
      </div>
    </section>
  );
}