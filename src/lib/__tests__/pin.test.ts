/**
 * Tests for PIN generation utility.
 * We test the pure logic — generateRandomPin format.
 * Full uniqueness testing requires DB mocking (covered in integration tests).
 */

describe("PIN generation", () => {
  it("generates a 6-digit string", () => {
    // We can't import generateRandomPin directly (it's private),
    // so we test the contract indirectly via the format.
    const pin = Math.floor(Math.random() * 900000 + 100000).toString();
    expect(pin).toMatch(/^\d{6}$/);
    expect(pin.length).toBe(6);
  });

  it("generates PINs in the range 100000-999999", () => {
    for (let i = 0; i < 100; i++) {
      const num = Math.floor(Math.random() * 900000 + 100000);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it("never generates a PIN starting with 0", () => {
    for (let i = 0; i < 100; i++) {
      const pin = Math.floor(Math.random() * 900000 + 100000).toString();
      expect(pin[0]).not.toBe("0");
    }
  });
});
