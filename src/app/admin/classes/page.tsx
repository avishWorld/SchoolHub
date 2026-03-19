import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminClassesPage } from "@/components/admin/AdminClassesPage";

export default async function ClassesPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");
  return <AdminClassesPage userName={session.name} role={session.role} />;
}
