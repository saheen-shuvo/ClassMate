import "./globals.css";
import Navbar from "../components/shared/Navbar.jsx";
import Footer from "@/components/shared/Footer";

export const metadata = {
  title: "ClassMate - Your University, Connected",
  description:
    "ClassMate is a shared space for students to exchange study materials, discover presentation topics, stay informed, and find the right teammates for academic projects.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body className={`flex min-h-screen flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
