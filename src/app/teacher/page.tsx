import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";

export default async function TeacherPage() {
  const session = await getSession();
  if (!session || session.role !== "teacher") redirect("/");

  return (
    <TeacherDashboard
      userName={session.name}
      role={session.role}
    />
  );
}
