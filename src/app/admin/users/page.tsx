import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminUsersPage } from "@/components/admin/AdminUsersPage";

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");
  return <AdminUsersPage userName={session.name} role={session.role} />;
}
