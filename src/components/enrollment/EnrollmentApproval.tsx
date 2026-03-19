"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface EnrollmentReq {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  children_names: string[] | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  parent: "הורה",
  student: "תלמיד/ה",
};

export function EnrollmentApproval() {
  const [requests, setRequests] = useState<EnrollmentReq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [shownPin, setShownPin] = useState<{ name: string; pin: string } | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [canApprove, setCanApprove] = useState(true);

  // Check if user is homeroom teacher or admin
  useEffect(() => {
    async function checkPermission() {
      try {
        // If the enrollment API returns 403, user can't approve
        const res = await fetch("/api/enrollment/requests");
        if (res.status === 403) {
          setCanApprove(false);
        }
      } catch { /* default to true */ }
    }
    checkPermission();
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/enrollment/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      setError("שגיאה בטעינה.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (id: string, name: string) => {
    setProcessingId(id);
    setError("");
    try {
      const res = await fetch(`/api/enrollment/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        const data = await res.json();
        setShownPin({ name, pin: data.pin });
        await loadRequests();
      } else {
        const data = await res.json();
        setError(data.error || "שגיאה באישור.");
      }
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    setError("");
    try {
      const res = await fetch(`/api/enrollment/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reject_reason: rejectReason }),
      });
      if (res.ok) {
        setRejectId(null);
        setRejectReason("");
        await loadRequests();
      }
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-center text-gray-500 py-12">טוען...</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">אישור הרשמות</h2>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* PIN display */}
      {shownPin && (
        <Card className="border-2 border-green-400 bg-green-50">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-sm font-medium text-green-800">
              קוד PIN עבור {shownPin.name}:
            </p>
            <p className="text-4xl font-mono font-bold text-green-900 tracking-widest" dir="ltr">
              {shownPin.pin}
            </p>
            <p className="text-xs text-green-700">שמור את הקוד! הוא לא יוצג שוב.</p>
            <Button size="sm" variant="outline" onClick={() => setShownPin(null)}>
              הבנתי
            </Button>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">אין בקשות הרשמה ממתינות</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">{req.name}</p>
                    <p className="text-sm text-gray-500">
                      {ROLE_LABELS[req.role] || req.role}
                      {req.phone && ` · ${req.phone}`}
                      {req.email && ` · ${req.email}`}
                    </p>
                    {req.children_names && req.children_names.length > 0 && (
                      <p className="text-sm text-gray-500">
                        ילדים: {req.children_names.join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(req.created_at).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  {canApprove ? (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req.id, req.name)}
                        disabled={processingId === req.id}
                      >
                        {processingId === req.id ? "מאשר..." : "✅ אשר"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectId(rejectId === req.id ? null : req.id)}
                        disabled={processingId === req.id}
                      >
                        ❌ דחה
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">ממתין לאישור מחנך</span>
                  )}
                </div>

                {/* Reject reason input */}
                {rejectId === req.id && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="סיבת הדחייה (אופציונלי)"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(req.id)}
                    >
                      שלח דחייה
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
