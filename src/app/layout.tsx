import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "SchoolHub — פורטל לימוד בית-ספרי",
  description:
    "נקודת כניסה אחת לשיעורים מקוונים — עבור תלמידים, מורים, הורים ומנהלים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="font-sans antialiased min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
