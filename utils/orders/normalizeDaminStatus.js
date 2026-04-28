/**
 * Maps a raw damin_orders.status to the display status used in the orders list.
 * Extracted as a pure function so it can be unit-tested independently.
 *
 * Damin lifecycle:
 *   created / pending_confirmations → pending_payment  (both sides haven't confirmed yet)
 *   both_confirmed                  → awaiting_payment (confirmed, payment not yet made)
 *   awaiting_payment                → awaiting_payment
 *   payment_submitted               → payment_submitted
 *   everything else passes through  (completed, disputed, cancelled, …)
 */
export function normalizeDaminStatus(status) {
  if (status === "created" || status === "pending_confirmations") {
    return "pending_payment";
  }
  if (status === "both_confirmed") {
    return "awaiting_payment";
  }
  if (status === "awaiting_payment") {
    return "awaiting_payment";
  }
  if (status === "payment_submitted") {
    return "payment_submitted";
  }
  return status;
}
