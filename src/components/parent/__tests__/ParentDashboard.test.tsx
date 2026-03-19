import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParentDashboard } from "../ParentDashboard";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;
window.open = vi.fn();

const MOCK_CHILDREN = [
  {
    student_id: "s1",
    class_id: "c1",
    name: "דני כהן",
    class_name: "ז׳1",
    grade: 7,
  },
  {
    student_id: "s2",
    class_id: "c2",
    name: "מיכל כהן",
    class_name: "ה׳2",
    grade: 5,
  },
];

const MOCK_LESSONS = [
  {
    id: "inst-1",
    template_id: "t1",
    date: "2026-03-19",
    subject: "מתמטיקה",
    teacher_name: "גב׳ כהן",
    start_time: "08:00",
    duration_minutes: 45,
    meeting_url: null,
    status: "scheduled",
    cancelled_reason: null,
  },
];

function setupMocks(childrenData = MOCK_CHILDREN) {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url === "/api/parent/children" && (!opts || opts.method !== "PUT")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            children: childrenData,
            last_viewed_id: childrenData[0]?.student_id || null,
          }),
      });
    }
    if (url === "/api/parent/children" && opts?.method === "PUT") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }
    if (url.includes("/api/schedule/today")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ lessons: MOCK_LESSONS, date: "2026-03-19" }),
      });
    }
    if (url.includes("/api/attendance")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 2, 19, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(children = MOCK_CHILDREN) {
  setupMocks(children);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<ParentDashboard userName="יעל כהן" role="parent" />);
  return { user };
}

describe("ParentDashboard", () => {
  describe("loading", () => {
    it("shows loading initially", () => {
      mockFetch.mockReturnValue(new Promise(() => {}));
      render(<ParentDashboard userName="יעל כהן" role="parent" />);
      expect(screen.getByText("טוען...")).toBeInTheDocument();
    });

    it("fetches children on mount", async () => {
      setup();
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/parent/children");
      });
    });
  });

  describe("multi-child picker", () => {
    it("shows child buttons when multiple children", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText(/דני כהן/)).toBeInTheDocument();
        expect(screen.getByText(/מיכל כהן/)).toBeInTheDocument();
      });
    });

    it("first child is selected by default (last_viewed)", async () => {
      setup();
      await waitFor(() => {
        const daniButton = screen.getByRole("button", { name: /דני כהן/ });
        expect(daniButton).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("switches child without page reload", async () => {
      const { user } = setup();
      await waitFor(() => {
        expect(screen.getByText(/דני כהן/)).toBeInTheDocument();
      });

      const michalButton = screen.getByRole("button", { name: /מיכל כהן/ });
      await user.click(michalButton);

      // Should fetch schedule for the other class
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("class_id=c2")
        );
      });
    });

    it("persists last_viewed when switching", async () => {
      const { user } = setup();
      await waitFor(() => {
        expect(screen.getByText(/מיכל כהן/)).toBeInTheDocument();
      });

      const michalButton = screen.getByRole("button", { name: /מיכל כהן/ });
      await user.click(michalButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/parent/children", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: "s2" }),
        });
      });
    });
  });

  describe("single child — skip picker", () => {
    it("does not show picker buttons for single child", async () => {
      setup([MOCK_CHILDREN[0]]);
      await waitFor(() => {
        // Should show child name in header, not as a button
        expect(screen.getByText(/דני כהן/)).toBeInTheDocument();
      });

      // There should be no role=group for the picker
      expect(screen.queryByRole("group", { name: /בחירת ילד/ })).not.toBeInTheDocument();
    });
  });

  describe("no children", () => {
    it("shows empty state when no children linked", async () => {
      setup([]);
      await waitFor(() => {
        expect(
          screen.getByText(/לא נמצאו ילדים מקושרים/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("schedule display", () => {
    it("shows schedule for selected child", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("מתמטיקה")).toBeInTheDocument();
      });
    });

    it("has child picker group with correct aria-label", async () => {
      setup();
      await waitFor(() => {
        expect(
          screen.getByRole("group", { name: "בחירת ילד/ה" })
        ).toBeInTheDocument();
      });
    });
  });
});
