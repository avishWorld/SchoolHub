import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { TeacherEnrollmentPage } from "@/components/enrollment/TeacherEnrollmentPage";

export default async function Page() {
  const session = await getSession();
  if (!session || session.role !== "teacher") redirect("/");
  return <TeacherEnrollmentPage userName={session.name} role={session.role} />;
}
