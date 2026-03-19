import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AdminDashboard
      userName={session.name}
      role={session.role}
    />
  );
}
