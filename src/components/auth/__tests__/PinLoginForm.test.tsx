import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PinLoginForm } from "../PinLoginForm";

const MAX_ATTEMPTS = 5;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function setup() {
  const user = userEvent.setup();
  render(<PinLoginForm />);
  return { user };
}

function getDigitInputs() {
  return screen.getAllByRole("textbox");
}

beforeEach(() => {
  mockFetch.mockReset();
  mockPush.mockReset();
});

describe("PinLoginForm", () => {
  describe("rendering", () => {
    it("renders 6 digit inputs", () => {
      setup();
      const inputs = getDigitInputs();
      expect(inputs).toHaveLength(6);
    });

    it("renders submit button", () => {
      setup();
      expect(
        screen.getByRole("button", { name: /כניסה/i })
      ).toBeInTheDocument();
    });

    it("renders heading and description", () => {
      setup();
      expect(screen.getByText("הכנס קוד PIN")).toBeInTheDocument();
      expect(
        screen.getByText("קוד בן 6 ספרות שקיבלת מבית הספר")
      ).toBeInTheDocument();
    });

    it("first input is focused on mount", () => {
      setup();
      const inputs = getDigitInputs();
      expect(inputs[0]).toHaveFocus();
    });

    it("submit button is disabled when PIN is incomplete", () => {
      setup();
      expect(screen.getByRole("button", { name: /כניסה/i })).toBeDisabled();
    });
  });

  describe("digit input behavior", () => {
    it("accepts numeric input and auto-advances", async () => {
      const { user } = setup();
      const inputs = getDigitInputs();

      await user.click(inputs[0]);
      await user.keyboard("1");

      expect(inputs[0]).toHaveValue("1");
      expect(inputs[1]).toHaveFocus();
    });

    it("rejects non-numeric input", async () => {
      const { user } = setup();
      const inputs = getDigitInputs();

      await user.click(inputs[0]);
      await user.keyboard("a");

      expect(inputs[0]).toHaveValue("");
    });

    it("handles backspace to previous input", async () => {
      const { user } = setup();
      const inputs = getDigitInputs();

      // Type first digit
      await user.click(inputs[0]);
      await user.keyboard("1");
      // Now on input[1], press backspace on empty
      await user.keyboard("{Backspace}");

      expect(inputs[0]).toHaveFocus();
    });

    it("handles paste of full PIN", async () => {
      const { user } = setup();
      const inputs = getDigitInputs();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "1", name: "Test", role: "student" },
            redirect: "/student",
          }),
      });

      await user.click(inputs[0]);
      await user.paste("123456");

      expect(inputs[0]).toHaveValue("1");
      expect(inputs[1]).toHaveValue("2");
      expect(inputs[2]).toHaveValue("3");
      expect(inputs[3]).toHaveValue("4");
      expect(inputs[4]).toHaveValue("5");
      expect(inputs[5]).toHaveValue("6");
    });

    it("ignores non-numeric characters in paste", async () => {
      const { user } = setup();
      const inputs = getDigitInputs();

      await user.click(inputs[0]);
      await user.paste("12ab56");

      expect(inputs[0]).toHaveValue("1");
      expect(inputs[1]).toHaveValue("2");
      expect(inputs[2]).toHaveValue("5");
      expect(inputs[3]).toHaveValue("6");
    });
  });

  describe("form submission", () => {
    it("submits PIN and redirects student to /student", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "1", name: "תלמיד", role: "student" },
            redirect: "/student",
          }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("123456");

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: "123456" }),
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/student");
      });
    });

    it("redirects teacher to /teacher", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "2", name: "מורה", role: "teacher" },
            redirect: "/teacher",
          }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("654321");

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/teacher");
      });
    });

    it("redirects parent to /parent", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "3", name: "הורה", role: "parent" },
            redirect: "/parent",
          }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("111222");

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/parent");
      });
    });

    it("redirects admin to /admin", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "4", name: "מנהל", role: "admin" },
            redirect: "/admin",
          }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("999888");

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin");
      });
    });
  });

  describe("error handling", () => {
    it("shows error on invalid PIN (401)", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid PIN" }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("000000");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/קוד PIN שגוי/)).toBeInTheDocument();
        expect(screen.getByText(/נותרו 4 ניסיונות/)).toBeInTheDocument();
      });
    });

    it("shows network error on fetch failure", async () => {
      const { user } = setup();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("000000");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/שגיאת תקשורת/)).toBeInTheDocument();
      });
    });

    it("clears error when user starts typing again", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid PIN" }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("000000");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Start typing again — error should clear
      await user.click(inputs[0]);
      await user.keyboard("1");

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("rate limiting UI", () => {
    it("shows lockout message after 5 failed attempts", async () => {
      const { user } = setup();

      // Attempt 1 — use manual typing
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid PIN" }),
      });
      await user.click(getDigitInputs()[0]);
      await user.keyboard("000000");
      await waitFor(() => {
        expect(screen.getByText(/נותרו 4 ניסיונות/)).toBeInTheDocument();
      });

      // Attempts 2–4 — paste for speed, each time wait for the error text
      for (let i = 2; i <= 4; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Invalid PIN" }),
        });
        await user.click(getDigitInputs()[0]);
        await user.paste("000000");
        const remaining = MAX_ATTEMPTS - i;
        await waitFor(() => {
          expect(
            screen.getByText(new RegExp(`נותרו ${remaining} ניסיונות`))
          ).toBeInTheDocument();
        });
      }

      // Attempt 5 — triggers lockout
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid PIN" }),
      });
      await user.click(getDigitInputs()[0]);
      await user.paste("000000");

      await waitFor(() => {
        expect(
          screen.getByText(/יותר מדי ניסיונות כושלים/)
        ).toBeInTheDocument();
      });
    });

    it("disables inputs during lockout", async () => {
      const { user } = setup();

      // Trigger lockout via 429 response from server
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: "Too many attempts",
            locked_until: new Date(Date.now() + 300000).toISOString(),
          }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("000000");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // All inputs should be disabled
      const disabledInputs = getDigitInputs();
      for (const input of disabledInputs) {
        expect(input).toBeDisabled();
      }

      // Submit button should be disabled
      expect(screen.getByRole("button", { name: /כניסה/i })).toBeDisabled();
    });

    it("handles 429 response from server", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: "Too many attempts",
            locked_until: new Date(Date.now() + 300000).toISOString(),
          }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("000000");

      await waitFor(() => {
        expect(
          screen.getByText(/יותר מדי ניסיונות כושלים/)
        ).toBeInTheDocument();
      });
    });

    it("shows countdown timer during lockout", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: "Too many attempts",
            locked_until: new Date(Date.now() + 300000).toISOString(),
          }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("000000");

      await waitFor(() => {
        expect(screen.getByText(/ניתן לנסות שוב בעוד/)).toBeInTheDocument();
      });
    });

    it("shows attempt counter after failed attempt", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid PIN" }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("000000");

      await waitFor(() => {
        expect(screen.getByText(/ניסיון 1 מתוך 5/)).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has proper aria-labels on digit inputs", () => {
      setup();
      const inputs = getDigitInputs();
      expect(inputs[0]).toHaveAttribute("aria-label", "ספרה 1 מתוך 6");
      expect(inputs[5]).toHaveAttribute("aria-label", "ספרה 6 מתוך 6");
    });

    it("has role=group on digit container", () => {
      setup();
      expect(screen.getByRole("group")).toHaveAttribute(
        "aria-label",
        "הזנת קוד PIN בן 6 ספרות"
      );
    });

    it("error message has role=alert", async () => {
      const { user } = setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid PIN" }),
      });

      const inputs = getDigitInputs();
      await user.click(inputs[0]);
      await user.keyboard("000000");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });
});
