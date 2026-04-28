import { normalizeDaminStatus } from "../utils/orders/normalizeDaminStatus";

describe("normalizeDaminStatus", () => {
  // ── Statuses that mean "not confirmed yet" ────────────────────────────────
  test("created → pending_payment", () => {
    expect(normalizeDaminStatus("created")).toBe("pending_payment");
  });

  test("pending_confirmations → pending_payment", () => {
    expect(normalizeDaminStatus("pending_confirmations")).toBe("pending_payment");
  });

  // ── The bug we fixed: both parties confirmed ≠ paid ──────────────────────
  test("both_confirmed → awaiting_payment (NOT paid)", () => {
    expect(normalizeDaminStatus("both_confirmed")).toBe("awaiting_payment");
    expect(normalizeDaminStatus("both_confirmed")).not.toBe("paid");
  });

  // ── Payment statuses pass through correctly ───────────────────────────────
  test("awaiting_payment → awaiting_payment", () => {
    expect(normalizeDaminStatus("awaiting_payment")).toBe("awaiting_payment");
  });

  test("payment_submitted → payment_submitted", () => {
    expect(normalizeDaminStatus("payment_submitted")).toBe("payment_submitted");
  });

  // ── Terminal statuses pass through unchanged ──────────────────────────────
  test.each(["completed", "disputed", "cancelled", "refunded", "escrow_deposit"])(
    "%s passes through unchanged",
    (status) => {
      expect(normalizeDaminStatus(status)).toBe(status);
    }
  );
});
