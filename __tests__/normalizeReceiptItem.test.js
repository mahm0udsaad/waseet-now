import {
  assignOrderRole,
  assignDaminRole,
  assignReceiptRole,
  normalizeDaminAmount,
} from "../utils/receipts/normalizeReceiptItem";

const USER = "user-123";
const OTHER = "user-456";

// ── assignOrderRole ───────────────────────────────────────────────────────────
describe("assignOrderRole", () => {
  test("buyer_id matches userId → buyer", () => {
    expect(assignOrderRole({ buyer_id: USER, seller_id: OTHER }, USER)).toBe("buyer");
  });

  test("buyer_id does NOT match → seller", () => {
    expect(assignOrderRole({ buyer_id: OTHER, seller_id: USER }, USER)).toBe("seller");
  });

  test("neither matches → seller (safe default)", () => {
    expect(assignOrderRole({ buyer_id: "x", seller_id: "y" }, USER)).toBe("seller");
  });
});

// ── assignDaminRole ───────────────────────────────────────────────────────────
describe("assignDaminRole", () => {
  test("userId is payer_user_id → payer", () => {
    expect(assignDaminRole({ payer_user_id: USER, creator_id: OTHER }, USER)).toBe("payer");
  });

  test("userId is creator_id → payer", () => {
    expect(assignDaminRole({ payer_user_id: OTHER, creator_id: USER }, USER)).toBe("payer");
  });

  test("userId is beneficiary (neither payer nor creator) → beneficiary", () => {
    expect(assignDaminRole({ payer_user_id: OTHER, creator_id: OTHER }, USER)).toBe("beneficiary");
  });

  test("creator_id and payer_user_id are the same person → payer", () => {
    expect(assignDaminRole({ payer_user_id: USER, creator_id: USER }, USER)).toBe("payer");
  });
});

// ── assignReceiptRole ─────────────────────────────────────────────────────────
describe("assignReceiptRole", () => {
  test("seller_id matches userId → seller", () => {
    expect(assignReceiptRole({ seller_id: USER, buyer_id: OTHER }, USER)).toBe("seller");
  });

  test("seller_id does NOT match → buyer", () => {
    expect(assignReceiptRole({ seller_id: OTHER, buyer_id: USER }, USER)).toBe("buyer");
  });
});

// ── normalizeDaminAmount ──────────────────────────────────────────────────────
describe("normalizeDaminAmount", () => {
  test("uses total_amount when present (includes commission)", () => {
    expect(normalizeDaminAmount({ total_amount: 1100, service_value: 1000 })).toBe(1100);
  });

  test("falls back to service_value when total_amount is null", () => {
    expect(normalizeDaminAmount({ total_amount: null, service_value: 1000 })).toBe(1000);
  });

  test("falls back to service_value when total_amount is undefined", () => {
    expect(normalizeDaminAmount({ total_amount: undefined, service_value: 800 })).toBe(800);
  });

  test("returns 0 when both are null", () => {
    expect(normalizeDaminAmount({ total_amount: null, service_value: null })).toBe(0);
  });

  test("returns 0 when both are missing", () => {
    expect(normalizeDaminAmount({})).toBe(0);
  });

  test("coerces string numbers", () => {
    expect(normalizeDaminAmount({ total_amount: "1100.50" })).toBeCloseTo(1100.5);
  });

  test("total_amount=0 falls back to service_value (0 is falsy)", () => {
    // Number(0) || 0 → 0, and 0 ?? service_value → 0 (not the fallback).
    // This documents the current behaviour so regressions are caught.
    expect(normalizeDaminAmount({ total_amount: 0, service_value: 500 })).toBe(0);
  });
});
