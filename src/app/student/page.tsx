import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/student/StudentDashboard";

export default async function StudentPage() {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/");

  return (
    <StudentDashboard
      userName={session.name}
      role={session.role}
    />
  );
}
