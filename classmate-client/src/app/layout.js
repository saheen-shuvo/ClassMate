import "./globals.css";
import Navbar from "../components/shared/Navbar.jsx";
import Footer from "@/components/shared/Footer";

export const metadata = {
  title: "Barakah | Islamic Wall Clock & Canvas",
  description:
    "Shop premium Islamic wall clocks and canvas art. Elegant designs for your home. Developed by Saheen Alam Shuvo.",
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
