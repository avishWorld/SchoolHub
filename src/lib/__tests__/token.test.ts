import { generateToken } from "../token";

describe("token generation", () => {
  it("generates a 12-character token by default", () => {
    const token = generateToken();
    expect(token).toHaveLength(12);
  });

  it("generates URL-safe characters only", () => {
    for (let i = 0; i < 20; i++) {
      const token = generateToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("generates unique tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(50);
  });

  it("accepts custom length", () => {
    const token = generateToken(20);
    expect(token).toHaveLength(20);
  });
});
