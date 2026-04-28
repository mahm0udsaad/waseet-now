import { applyCommission } from "../utils/commission/applyCommission";

describe("applyCommission", () => {
  // ── Percentage type (taqib / damin default = 10%) ─────────────────────────
  describe("percentage commission", () => {
    const config = { type: "percentage", value: 10 };

    test("10% on 1000 → commission 100, total 1100", () => {
      const { commission, total } = applyCommission(config, 1000);
      expect(commission).toBe(100);
      expect(total).toBe(1100);
    });

    test("10% on 4999 → commission 499.9, total 5498.9", () => {
      const { commission, total } = applyCommission(config, 4999);
      expect(commission).toBeCloseTo(499.9);
      expect(total).toBeCloseTo(5498.9);
    });

    test("0% commission returns no fee", () => {
      const { commission, total } = applyCommission({ type: "percentage", value: 0 }, 1000);
      expect(commission).toBe(0);
      expect(total).toBe(1000);
    });

    test("commission is always added ON TOP of the price (buyer pays base + fee)", () => {
      const { total } = applyCommission(config, 500);
      expect(total).toBeGreaterThan(500);
    });
  });

  // ── Fixed type (tanazul default = 500 SAR) ────────────────────────────────
  describe("fixed commission", () => {
    const config = { type: "fixed", value: 500 };

    test("fixed 500 on 2000 → commission 500, total 2500", () => {
      const { commission, total } = applyCommission(config, 2000);
      expect(commission).toBe(500);
      expect(total).toBe(2500);
    });

    test("fixed 500 on 100 → commission 500, total 600 (fixed regardless of price)", () => {
      const { commission, total } = applyCommission(config, 100);
      expect(commission).toBe(500);
      expect(total).toBe(600);
    });
  });

  // ── Null / missing config (no service match) ──────────────────────────────
  describe("null config", () => {
    test("null config → zero commission, total equals price", () => {
      const { commission, total } = applyCommission(null, 1000);
      expect(commission).toBe(0);
      expect(total).toBe(1000);
    });

    test("undefined config → zero commission", () => {
      const { commission, total } = applyCommission(undefined, 500);
      expect(commission).toBe(0);
      expect(total).toBe(500);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────
  describe("edge cases", () => {
    test("price 0 → commission 0 for percentage type", () => {
      const { commission, total } = applyCommission({ type: "percentage", value: 10 }, 0);
      expect(commission).toBe(0);
      expect(total).toBe(0);
    });

    test("no price argument defaults to 0", () => {
      const { commission, total } = applyCommission({ type: "percentage", value: 10 });
      expect(commission).toBe(0);
      expect(total).toBe(0);
    });
  });
});
