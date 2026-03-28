import { ensureSupabaseSession, supabase } from "./client";
import { getCommissionConfig } from "@/constants/commissionConfig";

/**
 * Create a Damin order
 * @param {Object} data
 * @param {string} data.serviceTypeOrDetails - Service type or details
 * @param {string} data.servicePeriodStart - Service period start date
 * @param {number} data.completionDays - Completion days
 * @param {string} data.payerPhone - Payer phone number
 * @param {string} data.beneficiaryPhone - Beneficiary phone number
 * @param {number} data.serviceValue - Service value
 * @param {number} data.commission - Commission amount (10% of service value)
 * @param {number} data.totalAmount - Total amount (service value + commission)
 * @param {Object} data.metadata - Additional metadata
 * @returns {Promise<Object>} Created damin order record
 */
export async function createDaminOrder(data) {
  const session = await ensureSupabaseSession();
  
  if (!data?.serviceTypeOrDetails) throw new Error("Missing serviceTypeOrDetails");
  if (!data?.payerPhone) throw new Error("Missing payerPhone");
  if (!data?.beneficiaryPhone) throw new Error("Missing beneficiaryPhone");
  if (!data?.serviceValue) throw new Error("Missing serviceValue");
  if (!data?.commission) throw new Error("Missing commission");
  if (!data?.totalAmount) throw new Error("Missing totalAmount");

  // Look up users by phone numbers to link them immediately if they exist
  let payerUserId = null;
  let beneficiaryUserId = null;

  try {
    // Try to find payer by phone
    const { data: payerProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("phone", data.payerPhone)
      .maybeSingle();

    if (payerProfile) {
      payerUserId = payerProfile.user_id;
    }

    // Try to find beneficiary by phone
    const { data: beneficiaryProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("phone", data.beneficiaryPhone)
      .maybeSingle();

    if (beneficiaryProfile) {
      beneficiaryUserId = beneficiaryProfile.user_id;
    }
  } catch (lookupError) {
    console.warn('Failed to lookup users by phone:', lookupError);
    // Continue with order creation even if lookup fails
  }

  const { data: order, error } = await supabase
    .from("damin_orders")
    .insert({
      creator_id: session.user.id,
      service_type_or_details: data.serviceTypeOrDetails,
      service_period_start: data.servicePeriodStart || null,
      completion_days: data.completionDays || null,
      payer_phone: data.payerPhone,
      beneficiary_phone: data.beneficiaryPhone,
      payer_user_id: payerUserId, // Set if user exists
      beneficiary_user_id: beneficiaryUserId, // Set if user exists
      service_value: data.serviceValue,
      commission: data.commission,
      tax: 0, // No tax, only commission
      total_amount: data.totalAmount,
      commission_rate: getCommissionConfig().damin?.value ?? 10,
      status: 'created',
      terms_accepted_at: new Date().toISOString(),
      terms_version: '1.0',
      metadata: data.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  
  // Send notifications to both parties
  try {
    await supabase.rpc('notify_damin_order_created', {
      order_id: order.id,
      payer_phone_param: data.payerPhone,
      beneficiary_phone_param: data.beneficiaryPhone,
      service_details: data.serviceTypeOrDetails,
      amount: data.totalAmount,
    });
  } catch (notifError) {
    console.warn('Failed to send notifications:', notifError);
    // Don't fail the order creation if notifications fail
  }

  return order;
}

/**
 * Find pending damin orders for the current user's phone
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<Array>} List of pending orders
 */
export async function findPendingDaminOrders(phoneNumber) {
  await ensureSupabaseSession();
  
  if (!phoneNumber) throw new Error("Missing phoneNumber");

  const { data, error } = await supabase.rpc('find_pending_damin_orders_by_phone', {
    phone_number: phoneNumber
  });

  if (error) throw error;
  return data || [];
}

/**
 * Link current user to a damin order by phone
 * @param {string} orderId - Order ID
 * @param {string} userPhone - User's phone number
 * @returns {Promise<boolean>} Success status
 */
export async function linkUserToDaminOrder(orderId, userPhone) {
  await ensureSupabaseSession();
  
  if (!orderId) throw new Error("Missing orderId");
  if (!userPhone) throw new Error("Missing userPhone");

  const { data, error } = await supabase.rpc('link_user_to_damin_order', {
    order_id: orderId,
    user_phone: userPhone
  });

  if (error) throw error;
  return data;
}

/**
 * Confirm participation in a damin order
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Confirmation result
 */
export async function confirmDaminOrderParticipation(orderId) {
  await ensureSupabaseSession();
  
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase.rpc('confirm_damin_order_participation', {
    order_id: orderId
  });

  if (error) throw error;
  return data;
}

/**
 * Reject participation in a damin order
 * @param {string} orderId - Order ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Rejection result
 */
export async function rejectDaminOrderParticipation(orderId, reason = '') {
  await ensureSupabaseSession();
  
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase.rpc('reject_damin_order_participation', {
    order_id: orderId,
    rejection_reason: reason
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch a single damin order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order with related data
 */
export async function fetchDaminOrderById(orderId) {
  await ensureSupabaseSession();
  
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase
    .from("damin_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all damin orders for the current user
 * Matches by user ID (creator, payer, beneficiary) AND by phone number
 * so orders show even before the user is linked via beneficiary_user_id.
 * @returns {Promise<Array>} List of orders
 */
export async function fetchUserDaminOrders() {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;
  const userPhone = session.user.phone;

  // Build OR filter: always match by user ID fields
  let orFilter = `creator_id.eq.${userId},payer_user_id.eq.${userId},beneficiary_user_id.eq.${userId}`;

  // Also match by phone number so beneficiary can see orders before linking.
  // Phone formats vary: auth stores "201279119364", orders may store "+201279119364"
  if (userPhone) {
    const digitsOnly = userPhone.replace(/[^0-9]/g, '');
    const withPlus = '+' + digitsOnly;
    orFilter += `,payer_phone.eq.${digitsOnly},beneficiary_phone.eq.${digitsOnly}`;
    orFilter += `,payer_phone.eq.${withPlus},beneficiary_phone.eq.${withPlus}`;
  }

  const { data, error } = await supabase
    .from("damin_orders")
    .select("*")
    .or(orFilter)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update damin order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated order
 */
export async function updateDaminOrderStatus(orderId, status) {
  await ensureSupabaseSession();
  
  if (!orderId) throw new Error("Missing orderId");
  if (!status) throw new Error("Missing status");

  const validStatuses = [
    'created',
    'pending_confirmations',
    'both_confirmed',
    'escrow_deposit',
    'awaiting_completion',
    'awaiting_payment',
    'payment_submitted',
    'completion_requested',
    'completed',
    'disputed',
    'cancelled'
  ];
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("damin_orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Confirm service completion (creator/beneficiary confirms they received the service)
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Confirmation result
 */
export async function confirmDaminServiceCompletion(orderId) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase.rpc('confirm_damin_service_completion', {
    order_id: orderId
  });

  if (error) throw error;
  return data;
}

/**
 * Submit payment (payer confirms they transferred the commission)
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Payment submission result
 */
export async function submitDaminPayment(orderId) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase.rpc('submit_damin_payment', {
    order_id: orderId
  });

  if (error) throw error;
  return data;
}

/**
 * Notify payer that service has been completed and commission payment is needed
 * @param {string} orderId - Order ID
 * @param {string} payerUserId - Payer's user ID
 * @param {string} serviceDetails - Service description
 * @param {number} commissionAmount - Commission amount in SAR
 * @returns {Promise<Object>} Notification result
 */
export async function notifyDaminServiceCompleted(orderId, payerUserId, serviceDetails, commissionAmount) {
  await ensureSupabaseSession();

  const { data, error } = await supabase.rpc('notify_damin_service_completed', {
    order_id: orderId,
    payer_user_id_param: payerUserId,
    service_details: serviceDetails,
    commission_amount: commissionAmount,
  });

  if (error) throw error;
  return data;
}

/**
 * Auto-confirm a card/Apple Pay payment (skips admin review)
 * Sets status to 'awaiting_completion' and marks escrow deposit timestamp.
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Updated order
 */
export async function confirmDaminCardPayment(orderId) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase.rpc("confirm_damin_card_payment", {
    order_id: orderId,
  });
  if (error) throw error;
  return data;
}

/**
 * Upload a bank transfer receipt image for a damin order
 * @param {string} orderId - Order ID
 * @param {string} imageUri - Local image URI from image picker
 * @returns {Promise<string>} Public URL of the uploaded receipt
 */
export async function uploadTransferReceipt(orderId, imageUri) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");
  if (!imageUri) throw new Error("Missing imageUri");

  const ext = imageUri.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "jpg";
  const storagePath = `receipts/${orderId}/transfer-${Date.now()}.${ext}`;

  const response = await fetch(imageUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from("damin-orders")
    .upload(storagePath, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("damin-orders").getPublicUrl(storagePath);
  return data?.publicUrl ?? null;
}

/**
 * Update metadata for a damin order (merges into existing metadata)
 * @param {string} orderId - Order ID
 * @param {Object} metadataUpdate - Object to merge into existing metadata
 * @returns {Promise<Object>} Updated order
 */
export async function updateDaminOrderMetadata(orderId, metadataUpdate) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");
  if (!metadataUpdate) throw new Error("Missing metadataUpdate");

  const { data: current, error: fetchErr } = await supabase
    .from("damin_orders")
    .select("metadata")
    .eq("id", orderId)
    .single();

  if (fetchErr) throw fetchErr;

  const merged = { ...(current?.metadata || {}), ...metadataUpdate };

  const { data, error } = await supabase
    .from("damin_orders")
    .update({ metadata: merged })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete damin service and release funds to the service provider's wallet.
 * Either party can call this when status is 'awaiting_completion'.
 * Payment must already be verified (card auto-confirmed or bank transfer admin-verified).
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Result with success, order_id, new_status, completed_by
 */
export async function completeDaminService(orderId) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase.rpc("complete_damin_service", {
    p_order_id: orderId,
  });

  if (error) throw error;
  return data;
}

/**
 * @deprecated Use completeDaminService instead. Kept for backward compatibility.
 * Request service completion / release money (requires admin approval).
 * Creates a completion request and sets order status to 'completion_requested'.
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} The created completion request
 */
export async function requestDaminCompletion(orderId) {
  const session = await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");

  // Create the completion request
  const { data: request, error: reqError } = await supabase
    .from("damin_completion_requests")
    .insert({
      order_id: orderId,
      requested_by: session.user.id,
    })
    .select()
    .single();

  if (reqError) throw reqError;

  // Update order status to completion_requested
  await supabase
    .from("damin_orders")
    .update({ status: "completion_requested" })
    .eq("id", orderId);

  // Merge completion request info into metadata
  const { data: current } = await supabase
    .from("damin_orders")
    .select("metadata")
    .eq("id", orderId)
    .single();

  const merged = {
    ...(current?.metadata || {}),
    completion_requested_at: new Date().toISOString(),
    completion_requested_by: session.user.id,
    completion_request_id: request.id,
  };

  await supabase
    .from("damin_orders")
    .update({ metadata: merged })
    .eq("id", orderId);

  return request;
}

/**
 * Get the latest completion request for a damin order
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} The latest completion request or null
 */
export async function getDaminCompletionRequest(orderId) {
  await ensureSupabaseSession();
  if (!orderId) return null;

  const { data, error } = await supabase
    .from("damin_completion_requests")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Failed to get completion request:", error);
    return null;
  }
  return data;
}

/**
 * Submit a dispute on a damin order.
 * Updates order status to 'disputed', records the reason, and sends a message to the chat.
 * @param {string} orderId - Damin order ID
 * @param {string} reason - Dispute reason text
 * @returns {Promise<Object>} Result with success, order_id, new_status
 */
export async function submitDaminDispute(orderId, reason) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");
  if (!reason || !reason.trim()) throw new Error("Dispute reason is required");

  const { data, error } = await supabase.rpc("submit_damin_dispute", {
    p_order_id: orderId,
    p_reason: reason.trim(),
  });

  if (error) throw error;
  return data;
}
