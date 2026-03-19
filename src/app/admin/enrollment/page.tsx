import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminEnrollmentPage } from "@/components/enrollment/AdminEnrollmentPage";

export default async function Page() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");
  return <AdminEnrollmentPage userName={session.name} role={session.role} />;
}
