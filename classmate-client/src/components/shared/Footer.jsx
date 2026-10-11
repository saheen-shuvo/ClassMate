
import Link from "next/link";
import {
  FiBookOpen,
  FiFileText,
  FiUsers,
  FiBell,
  FiMail,
  FiArrowUpRight,
  FiHeart,
} from "react-icons/fi";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const exploreLinks = [
    { label: "Home", href: "/" },
    { label: "Courses", href: "/courses" },
    { label: "Study Notes", href: "/notes" },
    { label: "Presentation Topics", href: "/presentation-topics" },
    { label: "Announcements", href: "/announcements" },
  ];

  const featureLinks = [
    {
      label: "Team Matcher",
      href: "/team-matcher",
      icon: FiUsers,
    },
    {
      label: "Study Resources",
      href: "/notes",
      icon: FiFileText,
    },
    {
      label: "Course Materials",
      href: "/courses",
      icon: FiBookOpen,
    },
    {
      label: "Updates & Notices",
      href: "/announcements",
      icon: FiBell,
    },
  ];

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600">
      <div className="mx-auto max-w-7xl px-5 pt-14 pb-6 sm:px-8 lg:px-10">
        {/* Main footer */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              aria-label="ClassMate home"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-sm">
                C
              </span>

              <span className="text-2xl font-bold tracking-tight text-slate-900">
                Class<span className="text-indigo-600">Mate</span>
              </span>
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-500">
              Learn together, share knowledge, and find the right
              teammates. ClassMate brings your university learning
              community into one place.
            </p>

            <Link
              href="/register"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
            >
              Join the community
              <FiArrowUpRight size={16} />
            </Link>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Explore
            </h3>

            <ul className="mt-5 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-indigo-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Features
            </h3>

            <ul className="mt-5 space-y-3">
              {featureLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-sm transition-colors hover:text-indigo-600"
                    >
                      <Icon
                        size={16}
                        className="text-slate-400 transition-colors group-hover:text-indigo-600"
                      />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Get in touch
            </h3>

            <p className="mt-5 text-sm leading-7 text-slate-500">
              Have a suggestion, found an issue, or want to improve
              the ClassMate community? We would love to hear from you.
            </p>

            <a
              href="mailto:support@classmate.com"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-indigo-600"
            >
              <FiMail size={17} />
              support@classmate.com
            </a>

            <p className="mt-3 text-xs text-slate-400">
              Replace this example email with your official contact.
            </p>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-slate-500 sm:text-left">
            © {currentYear} ClassMate. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 text-sm">
            <Link
              href="/privacy"
              className="transition-colors hover:text-indigo-600"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-indigo-600"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
