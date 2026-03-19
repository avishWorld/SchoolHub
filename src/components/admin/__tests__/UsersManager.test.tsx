import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersManager } from "../UsersManager";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_USERS = [
  { id: "u1", name: "גב׳ כהן", role: "teacher", email: "cohen@demo.school", phone: null, is_active: true },
  { id: "u2", name: "יואב", role: "student", email: null, phone: null, is_active: true },
];

const MOCK_CLASSES = [{ id: "c1", name: "ז׳1", grade: 7 }];

function setupMocks() {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes("/api/admin/users") && (!opts || !opts.method || opts.method === "GET")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ users: MOCK_USERS }) });
    }
    if (url.includes("/api/admin/classes")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ classes: MOCK_CLASSES }) });
    }
    if (url.includes("/reset-pin")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ pin: "654321" }) });
    }
    if (url.includes("/api/admin/users") && opts?.method === "POST") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { id: "u3", name: "New" }, pin: "123456" }) });
    }
    if (url.includes("/api/admin/users") && opts?.method === "PUT") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { id: "u1" } }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => { mockFetch.mockReset(); setupMocks(); });

function setup() {
  const user = userEvent.setup();
  render(<UsersManager />);
  return { user };
}

describe("UsersManager", () => {
  it("shows loading initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<UsersManager />);
    expect(screen.getByText("טוען...")).toBeInTheDocument();
  });

  it("renders title", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("ניהול משתמשים")).toBeInTheDocument());
  });

  it("shows users from API", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText("גב׳ כהן")).toBeInTheDocument();
      expect(screen.getByText("יואב")).toBeInTheDocument();
    });
  });

  it("shows role filter dropdown", async () => {
    setup();
    await waitFor(() => expect(screen.getByLabelText("סנן לפי תפקיד")).toBeInTheDocument());
  });

  it("shows add user button", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("+ משתמש חדש")).toBeInTheDocument());
  });

  it("shows CSV export button", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("ייצוא CSV")).toBeInTheDocument());
  });

  it("opens create form when clicking add", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("+ משתמש חדש")).toBeInTheDocument());
    await user.click(screen.getByText("+ משתמש חדש"));
    expect(screen.getByText("משתמש חדש")).toBeInTheDocument();
    expect(screen.getByLabelText("שם")).toBeInTheDocument();
    expect(screen.getByLabelText("תפקיד")).toBeInTheDocument();
  });

  it("shows class selector when role is student", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("+ משתמש חדש")).toBeInTheDocument());
    await user.click(screen.getByText("+ משתמש חדש"));
    // Default role is student, so class selector should show
    expect(screen.getByLabelText("כיתה")).toBeInTheDocument();
  });

  it("shows PIN reset button for each user", async () => {
    setup();
    await waitFor(() => {
      const resetButtons = screen.getAllByText(/איפוס PIN/);
      expect(resetButtons.length).toBe(2);
    });
  });

  it("shows PIN display after reset", async () => {
    const { user } = setup();
    await waitFor(() => expect(screen.getByText("גב׳ כהן")).toBeInTheDocument());
    const resetBtn = screen.getByLabelText("אפס PIN לגב׳ כהן");
    await user.click(resetBtn);
    await waitFor(() => expect(screen.getByText("654321")).toBeInTheDocument());
  });

  it("shows empty state when no users", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/admin/users")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ users: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ classes: [] }) });
    });
    render(<UsersManager />);
    await waitFor(() => expect(screen.getByText("אין משתמשים")).toBeInTheDocument());
  });
});
