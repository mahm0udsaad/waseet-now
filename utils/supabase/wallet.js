import { ensureSupabaseSession, supabase } from "./client";

/**
 * Get wallet summary for the current user.
 * Returns available_balance, escrow_held, total_earned, this_month_income, etc.
 * @returns {Promise<Object>}
 */
export async function getWalletSummary() {
  await ensureSupabaseSession();

  const { data, error } = await supabase.rpc("get_wallet_summary");
  if (error) throw error;

  return data || {
    available_balance: 0,
    escrow_held: 0,
    total_earned: 0,
    total_withdrawn: 0,
    pending_withdrawals: 0,
    this_month_income: 0,
    this_month_withdrawn: 0,
  };
}

/**
 * Get wallet transactions for the current user.
 * @param {Object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {Promise<Array>}
 */
export async function getWalletTransactions({ limit = 50, offset = 0 } = {}) {
  await ensureSupabaseSession();

  const { data, error } = await supabase.rpc("get_wallet_transactions", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  return data || [];
}

/**
 * Get damin order context for a chat conversation.
 * Returns order info + available actions, or null if no active order between chat participants.
 * @param {string} conversationId
 * @returns {Promise<Object|null>}
 */
export async function getDaminOrderForChat(conversationId) {
  await ensureSupabaseSession();
  if (!conversationId) return null;

  const { data, error } = await supabase.rpc("get_damin_order_for_chat", {
    p_conversation_id: conversationId,
  });
  if (error) {
    console.warn("Failed to get damin order for chat:", error);
    return null;
  }

  return data || null;
}

/**
 * Submit a withdrawal request.
 * @param {Object} params
 * @param {number} params.amount - Amount in SAR
 * @param {string} params.iban - Bank IBAN
 * @param {string} params.bankName - Bank name
 * @param {string} params.accountHolderName - Account holder full name
 * @returns {Promise<Object>} Result with success, request_id, remaining_balance
 */
export async function submitWithdrawalRequest({ amount, iban, bankName, accountHolderName }) {
  await ensureSupabaseSession();

  const { data, error } = await supabase.rpc("submit_withdrawal_request", {
    p_amount: amount,
    p_iban: iban,
    p_bank_name: bankName,
    p_account_holder_name: accountHolderName,
  });

  if (error) throw error;
  return data;
}
