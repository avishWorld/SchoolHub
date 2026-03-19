import { PinLoginForm } from "@/components/auth/PinLoginForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo / Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-blue-600">SchoolHub</h1>
          <p className="text-lg text-gray-600">
            פורטל לימוד בית-ספרי מרכזי
          </p>
        </div>

        {/* PIN Login Form */}
        <PinLoginForm />

        <p className="text-sm text-gray-500">
          קיבלת קוד PIN מבית הספר? הכנס אותו כאן כדי להיכנס.
        </p>
      </div>
    </main>
  );
}
