/**
 * Pure helpers for normalizing raw DB rows into the unified receipt-list shape.
 * Extracted from getMyReceipts() so they can be unit-tested without Supabase.
 */

/**
 * "buyer" if userId is the buyer, otherwise "seller".
 * @param {{ buyer_id: string }} order
 * @param {string} userId
 */
export function assignOrderRole(order, userId) {
  return order.buyer_id === userId ? "buyer" : "seller";
}

/**
 * "payer" if userId is the creator or explicit payer, otherwise "beneficiary".
 * creator_id is always the order initiator who pays; payer_user_id may override.
 * @param {{ creator_id: string, payer_user_id: string }} daminOrder
 * @param {string} userId
 */
export function assignDaminRole(daminOrder, userId) {
  const isPayerSide =
    daminOrder.payer_user_id === userId || daminOrder.creator_id === userId;
  return isPayerSide ? "payer" : "beneficiary";
}

/**
 * "seller" if userId is the seller, otherwise "buyer".
 * @param {{ seller_id: string }} receipt
 * @param {string} userId
 */
export function assignReceiptRole(receipt, userId) {
  return receipt.seller_id === userId ? "seller" : "buyer";
}

/**
 * Resolves the display amount for a damin order.
 * Prefers total_amount (base + commission); falls back to service_value (base only).
 * Returns 0 if both are missing or non-numeric.
 * @param {{ total_amount?: number|null, service_value?: number|null }} daminOrder
 */
export function normalizeDaminAmount(daminOrder) {
  return Number(daminOrder.total_amount ?? daminOrder.service_value) || 0;
}
