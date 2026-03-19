import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassesManager } from "../ClassesManager";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_CLASSES = [
  { id: "c1", name: "ז׳1", grade: 7 },
  { id: "c2", name: "ד׳2", grade: 4 },
];

function setupMocks() {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url === "/api/admin/classes" && (!opts || !opts.method || opts.method === "GET")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ classes: MOCK_CLASSES }) });
    }
    if (opts?.method === "POST") return Promise.resolve({ ok: true, json: () => Promise.resolve({ class: { id: "c3", name: "test", grade: 1 } }) });
    if (opts?.method === "PUT") return Promise.resolve({ ok: true, json: () => Promise.resolve({ class: { id: "c1", name: "updated", grade: 7 } }) });
    if (opts?.method === "DELETE") return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => { mockFetch.mockReset(); setupMocks(); });

function setup() {
  const user = userEvent.setup();
  render(<ClassesManager />);
  return { user };
}

describe("ClassesManager", () => {
  it("shows loading initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<ClassesManager />);
    expect(screen.getByText("טוען...")).toBeInTheDocument();
  });

  it("renders title", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("ניהול כיתות")).toBeInTheDocument());
  });

  it("shows classes from API", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText("ז׳1")).toBeInTheDocument();
      expect(screen.getByText("ד׳2")).toBeInTheDocument();
    });
  });

  it("shows grade for each class", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText("שכבה 7")).toBeInTheDocument();
      expect(screen.getByText("שכבה 4")).toBeInTheDocument();
    });
  });

  it("shows add button", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("+ כיתה חדשה")).toBeInTheDocument());
  });

  it("opens create form when clicking add", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("+ כיתה חדשה")).toBeInTheDocument());
    await user.click(screen.getByText("+ כיתה חדשה"));
    expect(screen.getByLabelText("שם")).toBeInTheDocument();
    expect(screen.getByLabelText("שכבה")).toBeInTheDocument();
  });

  it("can cancel create form", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("+ כיתה חדשה")).toBeInTheDocument());
    await user.click(screen.getByText("+ כיתה חדשה"));
    await user.click(screen.getByText("ביטול"));
    expect(screen.queryByText("כיתה חדשה")).not.toBeInTheDocument();
  });

  it("shows edit buttons for each class", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByLabelText("ערוך ז׳1")).toBeInTheDocument();
      expect(screen.getByLabelText("ערוך ד׳2")).toBeInTheDocument();
    });
  });

  it("opens edit form with pre-filled data", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByLabelText("ערוך ז׳1")).toBeInTheDocument());
    await user.click(screen.getByLabelText("ערוך ז׳1"));
    expect(screen.getByLabelText("שם")).toHaveValue("ז׳1");
  });

  it("shows delete buttons for each class", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByLabelText("מחק ז׳1")).toBeInTheDocument();
      expect(screen.getByLabelText("מחק ד׳2")).toBeInTheDocument();
    });
  });

  it("shows empty state when no classes", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ classes: [] }) });
    render(<ClassesManager />);
    await waitFor(() => expect(screen.getByText("אין כיתות")).toBeInTheDocument());
  });
});
