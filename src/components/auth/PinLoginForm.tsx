"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface LoginResponse {
  user: { id: string; name: string; role: string };
  redirect: string;
}

interface LoginError {
  error: string;
  remaining_attempts?: number;
  locked_until?: string;
}

const ROLE_REDIRECTS: Record<string, string> = {
  student: "/student",
  parent: "/parent",
  teacher: "/teacher",
  admin: "/admin",
};

export function PinLoginForm() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockEndTime, setLockEndTime] = useState<number | null>(null);
  const [lockRemaining, setLockRemaining] = useState<string>("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isLocked = lockEndTime !== null && Date.now() < lockEndTime;

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockEndTime) return;

    const tick = () => {
      const remaining = lockEndTime - Date.now();
      if (remaining <= 0) {
        setLockEndTime(null);
        setAttempts(0);
        setLockRemaining("");
        setError("");
        return;
      }
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.ceil((remaining % 60000) / 1000);
      setLockRemaining(
        `${minutes}:${seconds.toString().padStart(2, "0")}`
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockEndTime]);

  const handleSubmit = useCallback(async (pin: string) => {
    if (pin.length !== PIN_LENGTH) return;
    if (isLocked) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        const data: LoginResponse = await res.json();
        const redirect = ROLE_REDIRECTS[data.user.role] || "/";
        router.push(redirect);
        return;
      }

      const errorData: LoginError = await res.json();

      if (res.status === 429) {
        // Rate limited by server
        const lockedUntil = errorData.locked_until
          ? new Date(errorData.locked_until).getTime()
          : Date.now() + LOCKOUT_DURATION_MS;
        setLockEndTime(lockedUntil);
        setError("יותר מדי ניסיונות כושלים. נסה שוב בעוד מספר דקות.");
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockEndTime(Date.now() + LOCKOUT_DURATION_MS);
          setError("יותר מדי ניסיונות כושלים. נסה שוב בעוד 5 דקות.");
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(
            `קוד PIN שגוי. נותרו ${remaining} ניסיונות.`
          );
        }
      }

      setDigits(Array(PIN_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setError("שגיאת תקשורת. בדוק את החיבור לאינטרנט ונסה שוב.");
      setDigits(Array(PIN_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setIsLoading(false);
    }
  }, [attempts, isLocked]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      // Only accept digits
      const digit = value.replace(/\D/g, "").slice(-1);

      setDigits((prev) => {
        const next = [...prev];
        next[index] = digit;

        // Auto-advance to next input
        if (digit && index < PIN_LENGTH - 1) {
          setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
        }

        // Auto-submit when all digits filled
        if (digit && index === PIN_LENGTH - 1) {
          const pin = next.join("");
          if (pin.length === PIN_LENGTH) {
            setTimeout(() => handleSubmit(pin), 50);
          }
        }

        return next;
      });

      setError("");
    },
    [handleSubmit]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index] === "" && index > 0) {
          // Move to previous input on backspace of empty field
          inputRefs.current[index - 1]?.focus();
          setDigits((prev) => {
            const next = [...prev];
            next[index - 1] = "";
            return next;
          });
        } else {
          setDigits((prev) => {
            const next = [...prev];
            next[index] = "";
            return next;
          });
        }
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        // RTL: ArrowLeft goes forward (next index)
        if (index < PIN_LENGTH - 1) {
          inputRefs.current[index + 1]?.focus();
        }
      } else if (e.key === "ArrowRight") {
        // RTL: ArrowRight goes backward (previous index)
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      } else if (e.key === "Enter") {
        const pin = digits.join("");
        if (pin.length === PIN_LENGTH) {
          handleSubmit(pin);
        }
      }
    },
    [digits, handleSubmit]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
      if (pasted.length === 0) return;

      const newDigits = Array(PIN_LENGTH).fill("");
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      setError("");

      // Focus appropriate input
      const focusIndex = Math.min(pasted.length, PIN_LENGTH - 1);
      setTimeout(() => inputRefs.current[focusIndex]?.focus(), 0);

      // Auto-submit if full PIN pasted
      if (pasted.length === PIN_LENGTH) {
        setTimeout(() => handleSubmit(pasted), 50);
      }
    },
    [handleSubmit]
  );

  const pin = digits.join("");
  const canSubmit = pin.length === PIN_LENGTH && !isLoading && !isLocked;

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            הכנס קוד PIN
          </h2>
          <p className="text-sm text-muted-foreground">
            קוד בן 6 ספרות שקיבלת מבית הספר
          </p>
        </div>

        {/* PIN digit inputs */}
        <div
          className="flex justify-center gap-1.5 sm:gap-2"
          dir="ltr"
          role="group"
          aria-label="הזנת קוד PIN בן 6 ספרות"
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={isLoading || isLocked}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              data-pin-digit="true"
              className={`
                w-11 h-13 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold rounded-xl border-2
                transition-all duration-200 shadow-sm
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : digit
                    ? "border-blue-500 bg-blue-50 focus:border-blue-600 focus:ring-blue-200"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                }
              `}
              aria-label={`ספרה ${i + 1} מתוך ${PIN_LENGTH}`}
              autoComplete="off"
              autoFocus={i === 0}
            />
          ))}
        </div>

        {/* Error / Lock message */}
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 p-3 text-center"
          >
            <p className="text-sm font-medium text-red-700">{error}</p>
            {isLocked && lockRemaining && (
              <p className="text-xs text-red-500 mt-1">
                ניתן לנסות שוב בעוד{" "}
                <span className="font-mono font-semibold">{lockRemaining}</span>
              </p>
            )}
          </div>
        )}

        {/* Submit button */}
        <Button
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          onClick={() => handleSubmit(pin)}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              מתחבר...
            </span>
          ) : (
            "כניסה"
          )}
        </Button>

        {/* Attempt counter (visible when > 0 and not locked) */}
        {attempts > 0 && !isLocked && (
          <p className="text-xs text-center text-muted-foreground">
            ניסיון {attempts} מתוך {MAX_ATTEMPTS}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
