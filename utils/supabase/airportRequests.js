import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { ensureSupabaseSession, supabase } from "./client";

const AIRPORT_BUCKET = "airport-requests";
const DEFAULT_PRICE = 500;

/**
 * Upload an airport service document image (exit visa or ticket) to private storage.
 * @param {string} userId
 * @param {{ uri: string, name?: string, mimeType?: string }} asset
 * @param {"exit_visa"|"ticket"} kind
 * @returns {Promise<string>} storage path
 */
export async function uploadAirportDoc(userId, asset, kind) {
  if (!asset?.uri) throw new Error("Missing image asset");
  const extension = (asset.name || asset.uri).split(".").pop()?.toLowerCase() || "jpg";
  const objectPath = `${userId}/${kind}-${Date.now()}.${extension}`;

  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" });
  const arrayBuffer = decode(base64);

  const { error } = await supabase.storage
    .from(AIRPORT_BUCKET)
    .upload(objectPath, arrayBuffer, {
      contentType: asset.mimeType || "image/jpeg",
      upsert: false,
    });

  if (error) throw error;
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
