import type { Metadata } from "next";
import { JoinForm } from "@/components/enrollment/JoinForm";

// Generic OG tags — no class name exposure
export const metadata: Metadata = {
  title: "הצטרפות ל-SchoolHub",
  description: "הרשמה לפורטל הלימוד של בית הספר",
};

export default function JoinPage({ params }: { params: { token: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-blue-600">SchoolHub</h1>
          <p className="text-gray-600">הרשמה לפורטל הלימוד</p>
        </div>
        <JoinForm token={params.token} />
      </div>
    </main>
  );
}
