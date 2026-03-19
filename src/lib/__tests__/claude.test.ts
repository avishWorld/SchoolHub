import { parseTextForMeetingLink, resetClaudeState } from "../claude";

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
});

beforeEach(() => {
  resetClaudeState();
  mockCreate.mockReset();
});

describe("parseTextForMeetingLink", () => {
  it("extracts Zoom URL from text", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: '{"url":"https://zoom.us/j/123","platform":"zoom","date":null,"time":"08:00","confidence":0.95}',
      }],
    });

    const result = await parseTextForMeetingLink("שיעור מתמטיקה בשעה 8 בזום https://zoom.us/j/123");
    expect(result).not.toBeNull();
    expect(result!.url).toBe("https://zoom.us/j/123");
    expect(result!.platform).toBe("zoom");
    expect(result!.confidence).toBe(0.95);
  });

  it("returns null when no URL found", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: '{"url":null,"platform":null,"date":null,"time":null,"confidence":0}',
      }],
    });

    const result = await parseTextForMeetingLink("שלום, אין קישור כאן");
    expect(result).not.toBeNull();
    expect(result!.url).toBeNull();
    expect(result!.confidence).toBe(0);
  });

  it("returns null for empty input", async () => {
    const result = await parseTextForMeetingLink("");
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("truncates input to 2000 chars", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"url":null,"platform":null,"date":null,"time":null,"confidence":0}' }],
    });

    const longText = "a".repeat(3000);
    await parseTextForMeetingLink(longText);

    const calledWith = mockCreate.mock.calls[0][0];
    expect(calledWith.messages[0].content.length).toBeLessThanOrEqual(2000);
  });

  it("uses cache for duplicate text", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"url":"https://zoom.us/j/1","platform":"zoom","date":null,"time":null,"confidence":0.9}' }],
    });

    const text = "שיעור עם קישור zoom";
    await parseTextForMeetingLink(text);
    await parseTextForMeetingLink(text); // second call

    expect(mockCreate).toHaveBeenCalledTimes(1); // only 1 API call
  });

  it("handles API error gracefully", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API down"));

    const result = await parseTextForMeetingLink("test text");
    expect(result).toBeNull(); // graceful degradation
  });

  it("returns null when API key is missing", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = await parseTextForMeetingLink("test");
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();

    process.env.ANTHROPIC_API_KEY = saved;
  });

  it("uses Haiku model", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"url":null,"platform":null,"date":null,"time":null,"confidence":0}' }],
    });

    await parseTextForMeetingLink("test");
    expect(mockCreate.mock.calls[0][0].model).toContain("haiku");
  });
});
