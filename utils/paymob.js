import { ensureSupabaseSession } from "@/utils/supabase/client";

const DEFAULT_API_URL = "https://www.wasitalan.com";
const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_BASE_URL ||
  DEFAULT_API_URL
).replace(/\/+$/, "");
const PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || "";

/**
 * Normalize various Paymob status strings to our standard terminal states.
 * Returns "succeeded", "failed", "canceled", or null if still pending.
 */
function normalizePaymobStatus(raw) {
  const s = (raw || "").toLowerCase().trim();

  // Success variants
  if (["succeeded", "successful", "paid", "captured", "approved", "success"].includes(s)) {
    return "succeeded";
  }
  // Failure variants
  if (["failed", "declined", "rejected", "error", "voided", "void", "failure"].includes(s)) {
    return "failed";
  }
  // Cancellation variants
  if (["canceled", "cancelled", "refunded"].includes(s)) {
    return "canceled";
  }
  return null; // Still pending
}

class PaymobError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = "PaymobError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Create a Paymob payment intention via the backend.
 *
 * @param {Object} params
 * @param {number} params.amountSar - Amount in SAR
 * @param {{ firstName: string, lastName: string, email: string, phone: string }} params.customer
 * @param {Object} [params.metadata] - Optional metadata (orderId, serviceId, etc.)
 * @param {'apple_pay'|'card'} [params.paymentMethod='card'] - Payment method type
 * @returns {Promise<{ paymentId: string, clientSecret: string, publicKey: string, checkoutUrl: string }>}
 */
export async function createPaymobIntention({ amountSar, customer, metadata, paymentMethod = 'card' }) {
  if (!API_URL) throw new PaymobError("API URL is not configured", "CONFIG_ERROR");

  const session = await ensureSupabaseSession();
  const token = session.access_token;

  const res = await fetch(`${API_URL}/api/paymob/create-intention`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amountSar, customer, metadata, paymentMethod }),
  });

  if (!res.ok) {
    let errorMessage = `Payment initiation failed (${res.status})`;
    try {
      const body = await res.json();
      errorMessage = body?.error || body?.message || errorMessage;
    } catch {}
    throw new PaymobError(errorMessage, "CREATE_INTENTION_FAILED", res.status);
  }

  const data = await res.json();

  if (!data.clientSecret) {
    throw new PaymobError("Invalid response from payment server", "INVALID_RESPONSE");
  }

  const publicKey = data.publicKey || PUBLIC_KEY;
  const checkoutUrl = `https://ksa.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(data.clientSecret)}`;

  return {
    paymentId: data.paymentId,
    clientSecret: data.clientSecret,
    publicKey,
    checkoutUrl,
  };
}

/**
 * Poll the backend for a payment's final status.
 *
 * @param {string} paymentId
 * @param {Object} [options]
 * @param {number} [options.intervalMs=2000]
 * @param {number} [options.timeoutMs=60000]
 * @returns {Promise<{ status: "succeeded"|"failed"|"canceled"|"pending_timeout", raw?: Object }>}
 */
export async function pollPaymobStatus(paymentId, options = {}) {
  const { intervalMs = 2000, timeoutMs = 60000 } = options;

  if (!API_URL) throw new PaymobError("API URL is not configured", "CONFIG_ERROR");

  const session = await ensureSupabaseSession();
  const token = session.access_token;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${API_URL}/api/paymob/payment-status?paymentId=${encodeURIComponent(paymentId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawStatus = (data.status || "").toLowerCase();

        // Normalize Paymob status variations
        const status = normalizePaymobStatus(rawStatus);
        if (status) {
          return { status, raw: data };
        }
      }
    } catch {
      // Network error — retry silently
    }

    // Wait before next poll
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return { status: "pending_timeout" };
}

/**
 * One-shot status check (no polling).
 *
 * @param {string} paymentId
 * @returns {Promise<{ status: string, raw?: Object }>}
 */
export async function checkPaymobStatus(paymentId) {
  if (!API_URL) throw new PaymobError("API URL is not configured", "CONFIG_ERROR");

  const session = await ensureSupabaseSession();
  const token = session.access_token;

  const res = await fetch(
    `${API_URL}/api/paymob/payment-status?paymentId=${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new PaymobError(`Status check failed (${res.status})`, "STATUS_CHECK_FAILED", res.status);
  }

  const data = await res.json();
  const normalized = normalizePaymobStatus(data.status);
  return { status: normalized || "pending", raw: data };
}
