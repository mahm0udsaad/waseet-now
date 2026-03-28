import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { ensureSupabaseSession, supabase } from "./client";

export const ORDER_STATUSES = {
  AWAITING_PAYMENT: "awaiting_payment",
  PAYMENT_SUBMITTED: "payment_submitted",
  AWAITING_ADMIN_TRANSFER_APPROVAL: "awaiting_admin_transfer_approval",
  PAYMENT_VERIFIED: "payment_verified",
  IN_PROGRESS: "in_progress",
  COMPLETION_REQUESTED: "completion_requested",
  COMPLETED: "completed",
  DISPUTED: "disputed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  // Legacy statuses kept for backward compatibility during migration
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
};

/**
 * Create an order from an accepted receipt
 * @param {Object} data
 * @param {string} data.receipt_id - Receipt ID
 * @param {string} data.conversation_id - Conversation ID
 * @param {string} data.ad_id - Ad ID
 * @param {string} data.buyer_id - Buyer user ID
 * @param {string} data.seller_id - Seller user ID
 * @param {number} data.amount - Order amount
 * @param {string} data.currency - Currency (default: SAR)
 * @param {string} data.payment_link - Payment link (optional)
 * @returns {Promise<Object>} Created order record
 */
export async function createOrder(data) {
  await ensureSupabaseSession();

  if (!data?.receipt_id) throw new Error("Missing receipt_id");
  if (!data?.conversation_id) throw new Error("Missing conversation_id");
  if (!data?.ad_id) throw new Error("Missing ad_id");
  if (!data?.buyer_id) throw new Error("Missing buyer_id");
  if (!data?.seller_id) throw new Error("Missing seller_id");
  if (!data?.amount) throw new Error("Missing amount");

  // Check if order already exists for this receipt
  const { data: existingOrder, error: checkError } = await supabase
    .from("orders")
    .select("id")
    .eq("receipt_id", data.receipt_id)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existingOrder) {
    // Order already exists, return it
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", existingOrder.id)
      .single();
    if (error) throw error;
    return order;
  }

  // Create new order
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      receipt_id: data.receipt_id,
      conversation_id: data.conversation_id,
      ad_id: data.ad_id,
      buyer_id: data.buyer_id,
      seller_id: data.seller_id,
      amount: data.amount,
      currency: data.currency || "SAR",
      status: ORDER_STATUSES.AWAITING_PAYMENT,
      payment_link: data.payment_link || null,
      metadata: data.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return order;
}

/**
 * Fetch orders for the current user (as buyer or seller)
 * @returns {Promise<Array>} List of orders with ad and profile details
 */
export async function fetchUserOrders() {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      ad:ads(id, title, type, owner_id)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Fetch profiles for buyer and seller
  const ordersWithProfiles = await Promise.all(
    (data || []).map(async (order) => {
      const [buyerProfile, sellerProfile] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .eq("user_id", order.buyer_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .eq("user_id", order.seller_id)
          .maybeSingle(),
      ]);

      return {
        ...order,
        buyer: buyerProfile.data,
        seller: sellerProfile.data,
        userRole: order.buyer_id === userId ? "buyer" : "seller",
      };
    })
  );

  return ordersWithProfiles;
}

/**
 * Fetch a single order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order with related data
 */
export async function fetchOrderById(orderId) {
  await ensureSupabaseSession();

  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      ad:ads(id, title, type, description, owner_id),
      receipt:receipts(id, description, pdf_path, status)
    `)
    .eq("id", orderId)
    .single();

  if (error) throw error;

  // Fetch profiles for buyer and seller
  const [buyerProfile, sellerProfile] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .eq("user_id", data.buyer_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .eq("user_id", data.seller_id)
      .maybeSingle(),
  ]);

  return {
    ...data,
    buyer: buyerProfile.data,
    seller: sellerProfile.data,
  };
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated order
 */
export async function updateOrderStatus(orderId, status) {
  await ensureSupabaseSession();

  if (!orderId) throw new Error("Missing orderId");
  if (!status) throw new Error("Missing status");

  const validStatuses = Object.values(ORDER_STATUSES);
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data;
}

/**
 * Submit bank transfer details for a regular order.
 * Uses SECURITY DEFINER RPC that validates buyer ownership and sets
 * payment_method, transfer_phone, transfer_receipt_url, transfer_submitted_at,
 * status → AWAITING_ADMIN_TRANSFER_APPROVAL.
 * @param {string} orderId
 * @param {Object} opts
 * @param {string} [opts.phoneNumber]
 * @param {string|null} [opts.receiptUrl]
 * @returns {Promise<Object>} Updated order
 */
export async function submitOrderBankTransfer(orderId, { phoneNumber, receiptUrl } = {}) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase.rpc("submit_service_bank_transfer", {
    p_order_id: orderId,
    p_transfer_receipt_url: receiptUrl || null,
    p_transfer_phone: phoneNumber || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Upload a bank transfer receipt image for a regular order
 * @param {string} orderId
 * @param {string} imageUri - Local image URI from image picker
 * @returns {Promise<string|null>} Public URL of the uploaded receipt
 */
export async function uploadOrderTransferReceipt(orderId, imageUri) {
  await ensureSupabaseSession();
  if (!orderId || !imageUri) return null;

  const ext = imageUri.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "jpg";
  const storagePath = `receipts/${orderId}/transfer-${Date.now()}.${ext}`;

  // Read as base64 via expo-file-system (reliable on iOS, handles HEIC/local URIs)
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);

  const mimeTypes = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    heic: "image/heic", heif: "image/heif", webp: "image/webp",
  };
  const contentType = mimeTypes[ext] || "image/jpeg";

  const { error: uploadError } = await supabase.storage
    .from("damin-orders")
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("damin-orders").getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

/**
 * Get the latest order for a conversation (used for chat header status badge).
 * @param {string} conversationId
 * @returns {Promise<Object|null>} Order with ad info, or null
 */
export async function getOrderForConversation(conversationId) {
  await ensureSupabaseSession();
  if (!conversationId) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("*, ad:ads(id, title, type)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Failed to get order for conversation:", error);
    return null;
  }
  return data || null;
}

/**
 * Get ALL orders for a conversation (supports multiple receipts/payments per chat).
 * @param {string} conversationId
 * @returns {Promise<Array>} Orders sorted by created_at descending, or []
 */
export async function getOrdersForConversation(conversationId) {
  await ensureSupabaseSession();
  if (!conversationId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*, ad:ads(id, title, type)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to get orders for conversation:", error);
    return [];
  }
  return data || [];
}

/**
 * Subscribe to realtime changes on ALL orders for a conversation.
 * @param {string} conversationId
 * @param {(orders: Array) => void} onChange - Called with refreshed orders list
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToConversationOrders(conversationId, onChange) {
  if (!conversationId) return () => {};

  const channelName = `conv-orders-${conversationId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async () => {
        // Re-fetch all orders on any change
        try {
          const orders = await getOrdersForConversation(conversationId);
          onChange?.(orders);
        } catch (err) {
          console.warn("Failed to refresh orders on realtime:", err);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to realtime changes on a specific order.
 * @param {string} orderId
 * @param {(order: Object) => void} onChange - Called with the updated order row
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToOrderChanges(orderId, onChange) {
  if (!orderId) return () => {};

  const channelName = `order-${orderId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        onChange?.(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Confirm service completion for a regular order (tanazul/taqib).
 * Both buyer and seller must confirm. When both confirm, the order
 * is marked completed and funds are released to the seller's wallet.
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Result with success, role, buyer_confirmed, seller_confirmed, completed
 */
export async function confirmOrderCompletion(orderId) {
  await ensureSupabaseSession();
  if (!orderId) throw new Error("Missing orderId");

  const { data, error } = await supabase.rpc("confirm_order_completion", {
    p_order_id: orderId,
  });

  if (error) throw error;
  return data;
}

/**
 * Create a notification for order creation
 * Uses SECURITY DEFINER function to bypass RLS
 * @param {Object} data
 * @param {string} data.recipient_id - User to notify
 * @param {string} data.actor_id - User who triggered the action
 * @param {string} data.order_id - Order ID
 * @param {string} data.ad_title - Ad title for notification body
 * @param {number} data.amount - Order amount
 * @param {string} data.currency - Currency
 * @returns {Promise<string>} Created notification ID
 */
export async function createOrderNotification(data) {
  await ensureSupabaseSession();

  const { data: notificationId, error } = await supabase.rpc(
    "create_order_notification",
    {
      p_recipient_id: data.recipient_id,
      p_actor_id: data.actor_id,
      p_order_id: data.order_id,
      p_ad_title: data.ad_title,
      p_amount: data.amount,
      p_currency: data.currency,
    }
  );

  if (error) throw error;
  return notificationId;
}
