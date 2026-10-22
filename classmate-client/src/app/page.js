import Banner from "@/components/Banner";
import Link from "next/link";
import {
  FiUsers,
  FiBookOpen,
  FiFileText,
  FiLayers,
  FiBell,
  FiCpu,
  FiShield,
  FiZap,
  FiArrowRight,
  FiCheckCircle,
} from "react-icons/fi";

const features = [
  {
    title: "AI Team Matcher",
    description:
      "Find compatible teammates based on skills, interests, and project requirements.",
    icon: FiUsers,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Course & Notes Hub",
    description:
      "Access course materials, lecture notes, and useful academic resources in one place.",
    icon: FiBookOpen,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Community Quiz Bank",
    description:
      "Practice course-related questions and prepare for exams with a shared question bank.",
    icon: FiCpu,
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Presentation Topics",
    description:
      "Explore presentation topics and organize ideas for academic discussions.",
    icon: FiLayers,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Announcements",
    description:
      "Stay informed about important course updates and academic announcements.",
    icon: FiBell,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Role-Based Access",
    description:
      "Dedicated experiences for students, CRs, faculty, and administrators.",
    icon: FiShield,
    color: "bg-rose-50 text-rose-600",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white">
      {/* Hero section - your existing component */}
      <Banner />

      {/* Platform highlights */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to{" "}
            <span className="text-blue-600">learn together</span>
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Discover a smarter way to manage courses, share resources, prepare
            for exams, and collaborate with your university community.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FiUsers size={22} />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">
              Collaborate smarter
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Connect with classmates and organize your group projects more
              effectively.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <FiCheckCircle />
              Teamwork made easier
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-blue-50 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <FiCpu size={22} />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Learn with AI</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Get support with complex concepts, revision, and academic
              preparation.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-indigo-700">
              <FiZap />
              AI-powered learning
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <FiFileText size={22} />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">
              Keep resources organized
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Find notes, course materials, announcements, and presentation
              topics in one academic space.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-700">
              <FiCheckCircle />
              One organized workspace
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Designed for modern academic collaboration
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Useful tools to support coursework, group projects, academic
            resources, and exam preparation.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.color} transition group-hover:scale-105`}
                >
                  <Icon size={22} />
                </div>

                <h3 className="mt-5 text-base font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-linear-to-r from-blue-700 to-indigo-700 px-6 py-12 text-center sm:px-12 sm:py-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to make university life easier?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
            Join your academic community and bring your learning resources,
            collaboration, and course preparation together.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              Get Started
              <FiArrowRight size={17} />
            </Link>

            <Link
              href="/courses"
              className="rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Explore Courses
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
