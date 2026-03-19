"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassOption {
  id: string;
  name: string;
  grade: number;
}

interface InvitationInfo {
  id: string;
  class_id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function InviteLinkManager() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [invitations, setInvitations] = useState<InvitationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingForClass, setCreatingForClass] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [classesRes, invRes] = await Promise.all([
        fetch("/api/admin/classes"),
        fetch("/api/enrollment/invite"),
      ]);
      if (classesRes.ok) {
        const d = await classesRes.json();
        setClasses(d.classes || []);
      }
      if (invRes.ok) {
        const d = await invRes.json();
        setInvitations(d.invitations || []);
      }
    } catch {
      setError("שגיאה בטעינה.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (classId: string) => {
    setCreatingForClass(classId);
    setError("");
    try {
      const res = await fetch("/api/enrollment/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, expires_days: 7 }),
      });
      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        setError(data.error || "שגיאה.");
      }
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setCreatingForClass(null);
    }
  };

  const handleRevoke = async (token: string) => {
    setError("");
    try {
      await fetch(`/api/enrollment/invite/${token}`, { method: "DELETE" });
      await loadData();
    } catch {
      setError("שגיאה בביטול.");
    }
  };

  const getInviteForClass = (classId: string) =>
    invitations.find((i) => i.class_id === classId);

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

  if (isLoading) {
    return <p className="text-center text-gray-500 py-12">טוען...</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">ניהול קישורי הזמנה</h2>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {classes.map((cls) => {
          const inv = getInviteForClass(cls.id);
          const joinUrl = inv ? `${appUrl}/join/${inv.token}` : null;

          return (
            <Card key={cls.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {cls.name} (שכבה {cls.grade})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inv ? (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={joinUrl || ""}
                        className="flex-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                        dir="ltr"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        aria-label={`קישור הזמנה ל${cls.name}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (joinUrl) navigator.clipboard.writeText(joinUrl);
                        }}
                      >
                        העתק
                      </Button>
                    </div>
                    {inv.expires_at && (
                      <p className="text-xs text-gray-500">
                        תפוגה: {new Date(inv.expires_at).toLocaleDateString("he-IL")}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevoke(inv.token)}
                      >
                        בטל קישור
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreate(cls.id)}
                        disabled={creatingForClass === cls.id}
                      >
                        חדש קישור
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleCreate(cls.id)}
                    disabled={creatingForClass === cls.id}
                  >
                    {creatingForClass === cls.id ? "יוצר..." : "צור קישור הזמנה"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {classes.length === 0 && (
          <p className="text-gray-400 text-center py-8">אין כיתות. צור כיתות קודם.</p>
        )}
      </div>
    </div>
  );
}
