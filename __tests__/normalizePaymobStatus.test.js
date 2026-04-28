import { normalizePaymobStatus } from "../utils/paymob";

// paymob.js imports supabase client at module level — mock it out
jest.mock("../utils/supabase/client", () => ({
  ensureSupabaseSession: jest.fn(),
}));

describe("normalizePaymobStatus", () => {
  // ── Success variants ──────────────────────────────────────────────────────
  test.each(["succeeded", "successful", "paid", "captured", "approved", "success"])(
    '"%s" → succeeded',
    (status) => expect(normalizePaymobStatus(status)).toBe("succeeded")
  );

  test("case-insensitive: PAID → succeeded", () => {
    expect(normalizePaymobStatus("PAID")).toBe("succeeded");
    expect(normalizePaymobStatus("Approved")).toBe("succeeded");
  });

  // ── Failure variants ──────────────────────────────────────────────────────
  test.each(["failed", "declined", "rejected", "error", "voided", "void", "failure"])(
    '"%s" → failed',
    (status) => expect(normalizePaymobStatus(status)).toBe("failed")
  );

  test("case-insensitive: DECLINED → failed", () => {
    expect(normalizePaymobStatus("DECLINED")).toBe("failed");
  });

  // ── Cancellation variants ─────────────────────────────────────────────────
  test.each(["canceled", "cancelled", "refunded"])(
    '"%s" → canceled',
    (status) => expect(normalizePaymobStatus(status)).toBe("canceled")
  );

  // ── Pending / unknown → null ──────────────────────────────────────────────
  test("unknown status → null (still pending)", () => {
    expect(normalizePaymobStatus("pending")).toBeNull();
    expect(normalizePaymobStatus("processing")).toBeNull();
    expect(normalizePaymobStatus("unknown_new_status")).toBeNull();
  });

  // ── Edge cases ────────────────────────────────────────────────────────────
  test("null input → null", () => {
    expect(normalizePaymobStatus(null)).toBeNull();
  });

  test("undefined input → null", () => {
    expect(normalizePaymobStatus(undefined)).toBeNull();
  });

  test("empty string → null", () => {
    expect(normalizePaymobStatus("")).toBeNull();
  });

  test("whitespace-padded status is trimmed: ' paid ' → succeeded", () => {
    expect(normalizePaymobStatus(" paid ")).toBe("succeeded");
  });
});
