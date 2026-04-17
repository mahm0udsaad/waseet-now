import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { ensureSupabaseSession, supabase } from "./client";

const AIRPORT_BUCKET = "airport-requests";
const DEFAULT_PRICE = 500;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Upload an airport service document (image) to private storage.
 *
 * - Resizes to max 1920px width and recompresses to JPEG @ 0.7. The admin
 *   doesn't need 4K camera originals, and this keeps payloads in the
 *   ~300–800 KB range.
 * - Streams the file through `FileSystem.uploadAsync` (native HTTP layer), so
 *   the payload never lives in JS memory as base64 + ArrayBuffer. This fixes
 *   the `StorageUnknownError: Network request failed` thrown by supabase-js on
 *   RN when the in-memory buffer path fails for larger photos.
 *
 * @param {string} userId
 * @param {{ uri: string, name?: string, mimeType?: string }} asset
 * @param {"exit_visa"|"ticket"|"receipt"} kind
 * @returns {Promise<string>} storage path
 */
export async function uploadAirportDoc(userId, asset, kind) {
  if (!asset?.uri) throw new Error("Missing image asset");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase env vars missing for storage upload");
  }

  // 1. Resize + recompress. Output is always JPEG (stable extension / mime).
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 1920 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 2. Stream upload via the native HTTP layer — no JS-side base64/ArrayBuffer.
  const session = await ensureSupabaseSession();
  const token = session.access_token;
  const objectPath = `${userId}/${kind}-${Date.now()}.jpg`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${AIRPORT_BUCKET}/${objectPath}`;

  const res = await FileSystem.uploadAsync(uploadUrl, manipulated.uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "image/jpeg",
      "x-upsert": "false",
    },
  });

  if (res.status < 200 || res.status >= 300) {
    let message = `Upload failed (${res.status})`;
    try {
      const body = JSON.parse(res.body);
      if (body?.message) message = body.message;
    } catch {}
    const err = new Error(message);
    err.status = res.status;
    err.body = res.body;
    throw err;
  }

  return objectPath;
}

/**
 * Read the configured airport service price (defaults to 500 SAR).
 */
export async function fetchAirportServicePrice() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "airport_service_price")
    .maybeSingle();
  if (error) {
    console.warn("airport_service_price fetch error", error.message);
    return DEFAULT_PRICE;
  }
  const amount = Number(data?.value?.amount);
  return Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_PRICE;
}

/**
 * Create an airport inspection request row in `pending_payment` state.
 * Pass already-uploaded storage paths for exit_visa_path / ticket_path (or null).
 */
export async function createAirportRequest({
  sponsor_name,
  sponsor_phone,
  sponsor_alt_phone,
  worker_name,
  worker_nationality,
  flight_date,
  flight_time,
  exit_visa_path,
  ticket_path,
  price,
}) {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const { data, error } = await supabase
    .from("airport_inspection_requests")
    .insert({
      user_id: userId,
      sponsor_name,
      sponsor_phone,
      sponsor_alt_phone: sponsor_alt_phone || null,
      worker_name,
      worker_nationality,
      flight_date,
      flight_time,
      exit_visa_path: exit_visa_path || null,
      ticket_path: ticket_path || null,
      price,
      status: "pending_payment",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark a request as paid (card flow) or awaiting transfer approval (bank transfer flow).
 * @param {string} id
 * @param {{ method: 'card'|'bank_transfer', ref?: string }} payload
 */
export async function updateAirportRequestPayment(id, { method, ref }) {
  await ensureSupabaseSession();
  const status = method === "bank_transfer" ? "awaiting_admin_transfer_approval" : "paid";

  const { data, error } = await supabase
    .from("airport_inspection_requests")
    .update({
      status,
      payment_method: method,
      payment_ref: ref || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * List the current user's airport requests, latest first.
 */
export async function fetchMyAirportRequests() {
  await ensureSupabaseSession();
  const { data, error } = await supabase
    .from("airport_inspection_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Ensure a DM conversation exists between the airport-request owner and an admin.
 * Safe to call multiple times — returns the same conversation_id if already linked.
 *
 * Backed by the `public.user_create_airport_chat` SECURITY DEFINER RPC which:
 *   - Verifies the caller owns the request
 *   - Picks an admin (app_settings override → admin → support_agent → super_admin)
 *   - Creates the conversation + both memberships
 *   - Stamps `airport_inspection_requests.conversation_id`
 *
 * @param {string} requestId
 * @returns {Promise<{ conversation_id: string, admin_user_id: string }>}
 */
export async function ensureAirportChat(requestId) {
  if (!requestId) throw new Error("Missing airport request id");
  await ensureSupabaseSession();

  const { data, error } = await supabase.rpc("user_create_airport_chat", {
    p_request_id: requestId,
  });

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    const hint =
      msg.includes("function") || msg.includes("rpc")
        ? "Missing Supabase RPC `user_create_airport_chat` (see supabase/USER_AIRPORT_CHAT_RPC.sql)."
        : null;
    const e = new Error(hint ? `${error.message} — ${hint}` : error.message);
    e.cause = error;
    throw e;
  }

  const row = Array.isArray(data) ? data[0] : data;
  // RPC returns `out_conversation_id` / `out_admin_user_id` (prefixed to avoid
  // column-name ambiguity inside the function body).
  const conversation_id =
    row?.out_conversation_id || row?.conversation_id || null;
  const admin_user_id =
    row?.out_admin_user_id || row?.admin_user_id || null;
  if (!conversation_id) {
    throw new Error("Failed to create airport chat — unexpected RPC response");
  }
  return { conversation_id, admin_user_id };
}
