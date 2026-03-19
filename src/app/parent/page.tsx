import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ParentDashboard } from "@/components/parent/ParentDashboard";

export default async function ParentPage() {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/");

  return (
    <ParentDashboard
      userName={session.name}
      role={session.role}
    />
  );
}
