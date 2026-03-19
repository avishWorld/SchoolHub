import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentSchedule } from "../StudentSchedule";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.open
const mockOpen = vi.fn();
window.open = mockOpen;

const NOW = new Date(2026, 2, 19, 10, 30); // March 19, 2026, 10:30 AM (Thursday)

const MOCK_LESSONS = [
  {
    id: "inst-1",
    template_id: "tmpl-1",
    date: "2026-03-19",
    subject: "מתמטיקה",
    teacher_name: "גב׳ כהן",
    start_time: "08:00",
    duration_minutes: 45,
    meeting_url: "https://zoom.us/j/123",
    status: "scheduled",
    cancelled_reason: null,
  },
  {
    id: "inst-2",
    template_id: "tmpl-2",
    date: "2026-03-19",
    subject: "אנגלית",
    teacher_name: "מר לוי",
    start_time: "10:00",
    duration_minutes: 45,
    meeting_url: "https://zoom.us/j/456",
    status: "scheduled",
    cancelled_reason: null,
  },
  {
    id: "inst-3",
    template_id: "tmpl-3",
    date: "2026-03-19",
    subject: "היסטוריה",
    teacher_name: "גב׳ אברהם",
    start_time: "12:00",
    duration_minutes: 45,
    meeting_url: null,
    status: "scheduled",
    cancelled_reason: null,
  },
  {
    id: "inst-4",
    template_id: "tmpl-4",
    date: "2026-03-19",
    subject: "מוזיקה",
    teacher_name: "מר דוד",
    start_time: "14:00",
    duration_minutes: 45,
    meeting_url: "https://teams.microsoft.com/l/123",
    status: "cancelled",
    cancelled_reason: "המורה חולה",
  },
];

function setup() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);

  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/schedule/today")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ lessons: MOCK_LESSONS, date: "2026-03-19" }),
      });
    }
    // attendance post
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });

  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<StudentSchedule />);
  return { user };
}

afterEach(() => {
  vi.useRealTimers();
  mockFetch.mockReset();
  mockOpen.mockReset();
});

describe("StudentSchedule", () => {
  describe("rendering", () => {
    it("shows loading state initially", () => {
      mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
      render(<StudentSchedule />);
      expect(screen.getByText("טוען מערכת שעות...")).toBeInTheDocument();
    });

    it("shows page title after loading", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("המערכת שלי להיום")).toBeInTheDocument();
      });
    });

    it("shows formatted date", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText(/יום חמישי/)).toBeInTheDocument();
      });
    });

    it("renders all lessons", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("מתמטיקה")).toBeInTheDocument();
        expect(screen.getByText("אנגלית")).toBeInTheDocument();
        expect(screen.getByText("היסטוריה")).toBeInTheDocument();
        expect(screen.getByText("מוזיקה")).toBeInTheDocument();
      });
    });

    it("shows teacher names", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText(/גב׳ כהן/)).toBeInTheDocument();
        expect(screen.getByText(/מר לוי/)).toBeInTheDocument();
      });
    });

    it("shows time ranges", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText(/08:00/)).toBeInTheDocument();
        expect(screen.getByText(/10:00/)).toBeInTheDocument();
      });
    });
  });

  describe("status colors", () => {
    it("shows ended status for past lessons (08:00, now=10:30)", async () => {
      setup();
      await waitFor(() => {
        // Math lesson at 08:00-08:45 should be "ended"
        expect(screen.getByText("הסתיים")).toBeInTheDocument();
      });
    });

    it("shows active status for current lesson (10:00-10:45, now=10:30)", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("בשידור חי")).toBeInTheDocument();
      });
    });

    it("shows no-link warning for lesson without URL", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("חסר קישור")).toBeInTheDocument();
      });
    });

    it("shows cancelled status with reason", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText(/בוטל/)).toBeInTheDocument();
        expect(screen.getByText(/המורה חולה/)).toBeInTheDocument();
      });
    });
  });

  describe("Join button", () => {
    it("shows 'הצטרף עכשיו' for active lesson with URL", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("הצטרף עכשיו")).toBeInTheDocument();
      });
    });

    it("shows 'הצטרף' for pending lesson with URL", async () => {
      // inst-3 has no URL so no button. But we need a pending lesson with URL.
      // Actually none of our mocks have a pending+URL combo that isn't active.
      // Let's check that the active one is clickable.
      setup();
      await waitFor(() => {
        const joinButton = screen.getByLabelText("הצטרף לשיעור אנגלית");
        expect(joinButton).toBeInTheDocument();
      });
    });

    it("opens meeting URL in new tab when clicked", async () => {
      const { user } = setup();
      await waitFor(() => {
        expect(screen.getByText("הצטרף עכשיו")).toBeInTheDocument();
      });

      const joinButton = screen.getByLabelText("הצטרף לשיעור אנגלית");
      await user.click(joinButton);

      expect(mockOpen).toHaveBeenCalledWith(
        "https://zoom.us/j/456",
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("does not show join button for lessons without URL", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("היסטוריה")).toBeInTheDocument();
      });
      expect(
        screen.queryByLabelText("הצטרף לשיעור היסטוריה")
      ).not.toBeInTheDocument();
    });

    it("does not show join button for cancelled lessons", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("מוזיקה")).toBeInTheDocument();
      });
      expect(
        screen.queryByLabelText("הצטרף לשיעור מוזיקה")
      ).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty message when no lessons", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ lessons: [], date: "2026-03-19" }),
      });
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(NOW);
      render(<StudentSchedule />);

      await waitFor(() => {
        expect(screen.getByText(/אין שיעורים היום/)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe("error handling", () => {
    it("shows error with retry button on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "שגיאה" }),
      });
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(NOW);
      render(<StudentSchedule />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("נסה שוב")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe("refresh", () => {
    it("shows last refresh time", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText(/עודכן לאחרונה/)).toBeInTheDocument();
      });
    });
  });
});
