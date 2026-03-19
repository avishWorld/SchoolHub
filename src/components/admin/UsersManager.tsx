"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface UserItem {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

interface ClassOption {
  id: string;
  name: string;
  grade: number;
}

const ROLE_LABELS: Record<string, string> = {
  student: "תלמיד/ה",
  parent: "הורה",
  teacher: "מורה",
  admin: "מנהל/ת",
};

export function UsersManager() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [filterRole, setFilterRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("student");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // PIN display
  const [shownPin, setShownPin] = useState<{ userId: string; pin: string } | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const params = filterRole ? `?role=${filterRole}` : "";
      const res = await fetch(`/api/admin/users${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      setError("שגיאה בטעינת משתמשים.");
    } finally {
      setIsLoading(false);
    }
  }, [filterRole]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    fetch("/api/admin/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) {
      setError("יש להזין שם.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          role: formRole,
          email: formEmail || undefined,
          phone: formPhone || undefined,
          class_id: formRole === "student" ? formClassId : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה.");
        return;
      }
      const data = await res.json();
      setShownPin({ userId: data.user.id, pin: data.pin });
      setShowCreate(false);
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      await loadUsers();
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPin = async (userId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-pin`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setShownPin({ userId, pin: data.pin });
      } else {
        setError("שגיאה באיפוס PIN.");
      }
    } catch {
      setError("שגיאת תקשורת.");
    }
  };

  const handleDeactivate = async (userId: string) => {
    setError("");
    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, is_active: false }),
      });
      await loadUsers();
    } catch {
      setError("שגיאה בהשבתה.");
    }
  };

  const handleExportCSV = () => {
    const header = "שם,תפקיד,אימייל,טלפון";
    const rows = users.map(
      (u) => `${u.name},${ROLE_LABELS[u.role] || u.role},${u.email || ""},${u.phone || ""}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const rows = users
      .map(
        (u) =>
          `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${u.name}</td>` +
          `<td style="padding:6px 12px;border:1px solid #ddd;">${ROLE_LABELS[u.role] || u.role}</td>` +
          `<td style="padding:6px 12px;border:1px solid #ddd;" dir="ltr">${u.email || "—"}</td>` +
          `<td style="padding:6px 12px;border:1px solid #ddd;" dir="ltr">${u.phone || "—"}</td></tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>רשימת משתמשים — SchoolHub</title>
<style>body{font-family:Arial,sans-serif;padding:30px;} table{border-collapse:collapse;width:100%;} th{background:#2563eb;color:white;padding:8px 12px;text-align:right;} @media print{button{display:none;}}</style></head>
<body>
<h1 style="color:#2563eb;">SchoolHub — רשימת משתמשים</h1>
<p>תאריך: ${new Date().toLocaleDateString("he-IL")}</p>
<table>
<tr><th>שם</th><th>תפקיד</th><th>אימייל</th><th>טלפון</th></tr>
${rows}
</table>
<br><button onclick="window.print()">🖨️ הדפס</button>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      // Auto-trigger print after render
      win.onload = () => win.print();
    }
  };

  if (isLoading) {
    return <p className="text-center text-gray-500 py-12">טוען...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">ניהול משתמשים</h2>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="סנן לפי תפקיד"
        >
          <option value="">כל התפקידים</option>
          <option value="student">תלמידים</option>
          <option value="teacher">מורים</option>
          <option value="parent">הורים</option>
          <option value="admin">מנהלים</option>
        </select>
        <Button onClick={() => setShowCreate(true)}>+ משתמש חדש</Button>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          ייצוא CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          ייצוא PDF
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* PIN display modal */}
      {shownPin && (
        <Card className="border-2 border-green-400 bg-green-50">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-sm font-medium text-green-800">
              קוד PIN חדש נוצר:
            </p>
            <p className="text-4xl font-mono font-bold text-green-900 tracking-widest" dir="ltr">
              {shownPin.pin}
            </p>
            <p className="text-xs text-green-700">
              שמור את הקוד! הוא לא יוצג שוב.
            </p>
            <Button size="sm" variant="outline" onClick={() => setShownPin(null)}>
              הבנתי
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>משתמש חדש</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="user-name" className="text-sm font-medium text-gray-700">שם</label>
                <Input id="user-name" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1">
                <label htmlFor="user-role" className="text-sm font-medium text-gray-700">תפקיד</label>
                <select
                  id="user-role"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
                >
                  <option value="student">תלמיד/ה</option>
                  <option value="teacher">מורה</option>
                  <option value="parent">הורה</option>
                  <option value="admin">מנהל/ת</option>
                </select>
              </div>
            </div>
            {formRole === "student" && (
              <div className="space-y-1">
                <label htmlFor="user-class" className="text-sm font-medium text-gray-700">כיתה</label>
                <select
                  id="user-class"
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
                >
                  <option value="">בחר כיתה...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="user-email" className="text-sm font-medium text-gray-700">אימייל</label>
                <Input id="user-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1">
                <label htmlFor="user-phone" className="text-sm font-medium text-gray-700">טלפון</label>
                <Input id="user-phone" type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? "יוצר..." : "צור משתמש + PIN"}
              </Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setError(""); }}>
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User list */}
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{u.name}</p>
                <p className="text-sm text-gray-500">
                  {ROLE_LABELS[u.role] || u.role}
                  {u.email && ` · ${u.email}`}
                  {u.phone && ` · ${u.phone}`}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResetPin(u.id)}
                  aria-label={`אפס PIN ל${u.name}`}
                >
                  🔑 איפוס PIN
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeactivate(u.id)}
                  aria-label={`השבת ${u.name}`}
                >
                  ❌
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && (
          <p className="text-center text-gray-400 py-8">אין משתמשים</p>
        )}
      </div>
    </div>
  );
}
