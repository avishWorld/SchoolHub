"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
}

interface DashboardShellProps {
  title: string;
  userName: string;
  role: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  student: "תלמיד/ה",
  parent: "הורה",
  teacher: "מורה",
  admin: "מנהל/ת",
};

export function DashboardShell({
  title,
  userName,
  role,
  navItems,
  children,
}: DashboardShellProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo + title */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-blue-600">SchoolHub</h1>
              <span className="hidden text-sm text-gray-400 sm:inline">|</span>
              <span className="hidden text-sm font-medium text-gray-600 sm:inline">
                {title}
              </span>
            </div>

            {/* User info + logout */}
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">
                  {ROLE_LABELS[role] || role}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                יציאה
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      {navItems.length > 1 && (
        <nav className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-2">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(item.href)}
                  className="whitespace-nowrap"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
