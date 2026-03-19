"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface JoinFormProps {
  token: string;
}

export function JoinForm({ token }: JoinFormProps) {
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [classInfo, setClassInfo] = useState<{ class_name: string | null; grade: number | null; school_name: string | null; homeroom_teacher: string | null }>({ class_name: null, grade: null, school_name: null, homeroom_teacher: null });
  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState<"parent" | "student">("parent");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [childrenNames, setChildrenNames] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/enrollment/invite/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setTokenError(data.error || "קישור לא תקין.");
          return;
        }
        const data = await res.json();
        setInvitationId(data.invitation_id);
        setClassInfo({
          class_name: data.class_name,
          grade: data.grade,
          school_name: data.school_name,
          homeroom_teacher: data.homeroom_teacher,
        });
      } catch {
        setTokenError("שגיאת תקשורת.");
      } finally {
        setIsValidating(false);
      }
    }
    validate();
  }, [token]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("יש להזין שם.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("יש להזין טלפון או אימייל.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/enrollment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitation_id: invitationId,
          name: name.trim(),
          role,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          children_names:
            role === "parent" && childrenNames.trim()
              ? childrenNames.split(",").map((n) => n.trim()).filter(Boolean)
              : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה בשליחה.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">בודק קישור הזמנה...</p>
        </CardContent>
      </Card>
    );
  }

  // Invalid/expired token
  if (tokenError) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <p className="text-lg font-semibold text-red-600">⚠️ קישור לא תקין</p>
          <p className="text-sm text-gray-500">{tokenError}</p>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (submitted) {
    return (
      <Card className="border-2 border-green-400">
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-2xl">✅</p>
          <p className="text-lg font-semibold text-green-800">
            הבקשה נשלחה בהצלחה!
          </p>
          <p className="text-sm text-gray-600">
            המורה יבדוק את הבקשה ויאשר. לאחר האישור תקבל קוד PIN לכניסה.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Registration form
  return (
    <Card>
      <CardHeader>
        <CardTitle>טופס הרשמה</CardTitle>
        {/* Class info */}
        {(classInfo.class_name || classInfo.school_name) && (
          <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm space-y-1">
            {classInfo.school_name && (
              <p className="font-medium text-blue-800">🏫 {classInfo.school_name}</p>
            )}
            {classInfo.class_name && (
              <p className="text-blue-700">
                📚 כיתה {classInfo.class_name}
                {classInfo.grade ? ` (שכבה ${classInfo.grade})` : ""}
              </p>
            )}
            {classInfo.homeroom_teacher && (
              <p className="text-blue-600">👩‍🏫 מחנך/ת: {classInfo.homeroom_teacher}</p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role */}
        <div className="space-y-1">
          <label htmlFor="join-role" className="text-sm font-medium text-gray-700">
            אני נרשם/ת בתור
          </label>
          <select
            id="join-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "parent" | "student")}
            className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
          >
            <option value="parent">הורה</option>
            <option value="student">תלמיד/ה</option>
          </select>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label htmlFor="join-name" className="text-sm font-medium text-gray-700">
            שם מלא
          </label>
          <Input
            id="join-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ישראל ישראלי"
            autoFocus
          />
        </div>

        {/* Children names (for parents) */}
        {role === "parent" && (
          <div className="space-y-1">
            <label htmlFor="join-children" className="text-sm font-medium text-gray-700">
              שמות הילדים (מופרדים בפסיק)
            </label>
            <Input
              id="join-children"
              value={childrenNames}
              onChange={(e) => setChildrenNames(e.target.value)}
              placeholder="דני, מיכל"
            />
          </div>
        )}

        {/* Phone */}
        <div className="space-y-1">
          <label htmlFor="join-phone" className="text-sm font-medium text-gray-700">
            טלפון
          </label>
          <Input
            id="join-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="054-1234567"
            dir="ltr"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label htmlFor="join-email" className="text-sm font-medium text-gray-700">
            אימייל (אופציונלי)
          </label>
          <Input
            id="join-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            dir="ltr"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "שולח..." : "שלח בקשת הרשמה"}
        </Button>
      </CardContent>
    </Card>
  );
}
