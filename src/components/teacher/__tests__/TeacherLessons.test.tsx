import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeacherLessons } from "../TeacherLessons";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_CLASSES = [{ id: "c1", name: "ז׳1", grade: 7 }];
const MOCK_LESSONS = [
  { id: "i1", template_id: "t1", date: "2026-03-19", subject: "מתמטיקה", teacher_name: "גב׳ כהן", start_time: "08:00", duration_minutes: 45, meeting_url: "https://zoom.us/j/123", status: "scheduled" },
  { id: "i2", template_id: "t2", date: "2026-03-19", subject: "אנגלית", teacher_name: "מר לוי", start_time: "09:00", duration_minutes: 45, meeting_url: null, status: "scheduled" },
];

function setupMocks() {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes("/api/admin/classes")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ classes: MOCK_CLASSES }) });
    if (url.includes("/api/schedule/week")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ lessons: MOCK_LESSONS }) });
    if (url.includes("/api/lessons/") && opts?.method === "POST") return Promise.resolve({ ok: true, json: () => Promise.resolve({ instance: {} }) });
    if (url.includes("/api/lessons/copy-week")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ copied: 2 }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => { mockFetch.mockReset(); setupMocks(); });

function setup() {
  const user = userEvent.setup();
  render(<TeacherLessons />);
  return { user };
}

describe("TeacherLessons", () => {
  it("renders loading state", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<TeacherLessons />);
    expect(screen.getByText("טוען...")).toBeInTheDocument();
  });

  it("renders title after loading", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("ניהול שיעורים")).toBeInTheDocument());
  });

  it("renders class selector", async () => {
    setup();
    await waitFor(() => expect(screen.getByLabelText("בחר כיתה")).toBeInTheDocument());
  });

  it("shows lessons from API", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText("מתמטיקה")).toBeInTheDocument();
      expect(screen.getByText("אנגלית")).toBeInTheDocument();
    });
  });

  it("shows existing meeting URL for lessons that have one", async () => {
    setup();
    await waitFor(() => expect(screen.getByText(/zoom\.us/)).toBeInTheDocument());
  });

  it("shows 'חסר קישור' for lessons without URL", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("חסר קישור")).toBeInTheDocument());
  });

  it("shows copy-from-last-week button", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("העתק מהשבוע שעבר")).toBeInTheDocument());
  });

  it("opens link edit form when clicking edit button", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("מתמטיקה")).toBeInTheDocument());
    const editBtn = screen.getByLabelText("ערוך קישור למתמטיקה");
    await user.click(editBtn);
    expect(screen.getByLabelText("קישור למפגש")).toBeInTheDocument();
  });

  it("shows recurring checkbox in edit form", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("מתמטיקה")).toBeInTheDocument());
    await user.click(screen.getByLabelText("ערוך קישור למתמטיקה"));
    expect(screen.getByText(/קישור קבוע/)).toBeInTheDocument();
  });

  it("shows error on invalid URL", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("אנגלית")).toBeInTheDocument());
    // Click add for lesson without URL
    const addButtons = screen.getAllByText("➕");
    await user.click(addButtons[0]);
    const input = screen.getByLabelText("קישור למפגש");
    await user.type(input, "not-a-url");
    await user.click(screen.getByText("שמור"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("can cancel edit form", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("מתמטיקה")).toBeInTheDocument());
    await user.click(screen.getByLabelText("ערוך קישור למתמטיקה"));
    expect(screen.getByText("ביטול")).toBeInTheDocument();
    await user.click(screen.getByText("ביטול"));
    expect(screen.queryByLabelText("קישור למפגש")).not.toBeInTheDocument();
  });
});
