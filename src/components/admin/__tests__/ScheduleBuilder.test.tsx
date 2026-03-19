import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleBuilder } from "../ScheduleBuilder";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_CLASSES = [
  { id: "class-1", name: "ז׳1", grade: 7 },
  { id: "class-2", name: "ז׳2", grade: 7 },
];

const MOCK_TEACHERS = [
  { id: "teacher-1", name: "גב׳ כהן" },
  { id: "teacher-2", name: "מר לוי" },
];

const MOCK_TEMPLATES = [
  {
    id: "tmpl-1",
    class_id: "class-1",
    teacher_id: "teacher-1",
    subject: "מתמטיקה",
    day_of_week: 0,
    start_time: "08:00:00",
    duration_minutes: 45,
    meeting_url: null,
    is_recurring_link: false,
  },
  {
    id: "tmpl-2",
    class_id: "class-1",
    teacher_id: "teacher-2",
    subject: "אנגלית",
    day_of_week: 1,
    start_time: "09:00:00",
    duration_minutes: 45,
    meeting_url: null,
    is_recurring_link: false,
  },
];

function setupMocks() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/admin/classes")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ classes: MOCK_CLASSES }),
      });
    }
    if (url.includes("/api/admin/users")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ users: MOCK_TEACHERS }),
      });
    }
    if (url.includes("/api/schedule/templates/")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  setupMocks();
});

function setup() {
  const user = userEvent.setup();
  render(<ScheduleBuilder />);
  return { user };
}

describe("ScheduleBuilder", () => {
  describe("initial loading", () => {
    it("shows loading state initially", () => {
      setup();
      expect(screen.getByText("טוען...")).toBeInTheDocument();
    });

    it("fetches classes and teachers on mount", async () => {
      setup();
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/admin/classes");
        expect(mockFetch).toHaveBeenCalledWith("/api/admin/users?role=teacher");
      });
    });

    it("renders class selector after loading", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByLabelText("בחר כיתה")).toBeInTheDocument();
      });
    });

    it("renders weekly grid with all days", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("יום ראשון")).toBeInTheDocument();
        expect(screen.getByText("יום שני")).toBeInTheDocument();
        expect(screen.getByText("יום שלישי")).toBeInTheDocument();
        expect(screen.getByText("יום רביעי")).toBeInTheDocument();
        expect(screen.getByText("יום חמישי")).toBeInTheDocument();
        expect(screen.getByText("יום שישי")).toBeInTheDocument();
      });
    });
  });

  describe("template display", () => {
    it("shows existing templates in the grid", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("מתמטיקה")).toBeInTheDocument();
        expect(screen.getByText("אנגלית")).toBeInTheDocument();
      });
    });

    it("shows teacher name and time for templates", async () => {
      setup();
      await waitFor(() => {
        expect(
          screen.getByText(/08:00.*45 דק׳.*גב׳ כהן/)
        ).toBeInTheDocument();
      });
    });

    it("shows 'no lessons' for empty days", async () => {
      setup();
      await waitFor(() => {
        // At least some days should have no templates
        const emptyDays = screen.getAllByText("אין שיעורים");
        expect(emptyDays.length).toBeGreaterThan(0);
      });
    });
  });

  describe("add template", () => {
    it("shows add button for each day", async () => {
      setup();
      await waitFor(() => {
        const addButtons = screen.getAllByText("+ שיעור");
        expect(addButtons).toHaveLength(6); // 6 days
      });
    });

    it("opens create form when clicking add button", async () => {
      const { user } = setup();
      await waitFor(() => {
        expect(screen.getAllByText("+ שיעור").length).toBeGreaterThan(0);
      });

      const addButton = screen.getByLabelText("הוסף שיעור ליום ראשון");
      await user.click(addButton);

      expect(screen.getByText(/שיעור חדש/)).toBeInTheDocument();
      expect(screen.getByLabelText("מקצוע")).toBeInTheDocument();
      expect(screen.getByLabelText("מורה")).toBeInTheDocument();
      expect(screen.getByLabelText("שעת התחלה")).toBeInTheDocument();
      expect(screen.getByLabelText("משך (דקות)")).toBeInTheDocument();
    });

    it("can cancel the form", async () => {
      const { user } = setup();
      await waitFor(() => {
        expect(screen.getAllByText("+ שיעור").length).toBeGreaterThan(0);
      });

      const addButton = screen.getByLabelText("הוסף שיעור ליום ראשון");
      await user.click(addButton);

      expect(screen.getByText(/שיעור חדש/)).toBeInTheDocument();

      await user.click(screen.getByText("ביטול"));

      expect(screen.queryByText(/שיעור חדש/)).not.toBeInTheDocument();
    });
  });

  describe("edit template", () => {
    it("opens edit form with pre-filled data", async () => {
      const { user } = setup();
      await waitFor(() => {
        expect(screen.getByText("מתמטיקה")).toBeInTheDocument();
      });

      const editButton = screen.getByLabelText("ערוך מתמטיקה");
      await user.click(editButton);

      expect(screen.getByText(/עריכת שיעור/)).toBeInTheDocument();
      expect(screen.getByLabelText("מקצוע")).toHaveValue("מתמטיקה");
    });
  });

  describe("class switching", () => {
    it("reloads templates when class changes", async () => {
      const { user } = setup();
      await waitFor(() => {
        expect(screen.getByLabelText("בחר כיתה")).toBeInTheDocument();
      });

      const select = screen.getByLabelText("בחר כיתה");
      await user.selectOptions(select, "class-2");

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/schedule/templates/class-2"
        );
      });
    });
  });

  describe("error handling", () => {
    it("shows error when API fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      setup();

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });

  describe("page title", () => {
    it("displays the schedule title", async () => {
      setup();
      await waitFor(() => {
        expect(screen.getByText("מערכת שעות שבועית")).toBeInTheDocument();
      });
    });
  });
});
