import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { ensureSupabaseSession, supabase, getSupabaseUser } from "./client";
import { generateReceiptPdf } from "../receipts/receiptPdf";
import { createOrder, createOrderNotification } from "./orders";

const CHAT_BUCKET = "chat";

/**
 * Create a receipt record in the database (seller-signed state)
 * @param {Object} data
 * @param {string} data.conversation_id
 * @param {string} data.ad_id
 * @param {number} data.amount
 * @param {string} data.description
 * @param {string} data.currency
 * @param {string} data.adTitle - for PDF generation
 * @param {boolean} isRTL - for PDF generation
 * @returns {Promise<Object>} Created receipt record
 */
export async function createReceipt(data, isRTL = true) {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  if (!data?.ad_id) throw new Error("Missing ad_id");
  if (!data?.conversation_id) throw new Error("Missing conversation_id");
  if (!data?.description) throw new Error("Missing description");

  // Enforce: only the ad owner can create receipts + get ad type
  const { data: adRow, error: adError } = await supabase
    .from("ads")
    .select("owner_id, type")
    .eq("id", data.ad_id)
    .maybeSingle();

  if (adError) throw adError;
  if (!adRow?.owner_id) throw new Error("Ad not found");
  if (adRow.owner_id !== userId) {
    throw new Error("Only the ad owner can create receipts");
  }

  const adType = adRow.type || "";

  // Get user profile for display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  const sellerSignature = {
    user_id: userId,
    display_name: profile?.display_name || "User",
    timestamp: new Date().toISOString(),
    method: "electronic-acceptance",
  };

  // Insert receipt record
  const { data: receipt, error } = await supabase
    .from("receipts")
    .insert({
      conversation_id: data.conversation_id,
      ad_id: data.ad_id,
      amount: data.amount,
      currency: data.currency || "SAR",
      description: data.description,
      status: "seller_signed",
      seller_id: userId,
      seller_signature: sellerSignature,
    })
    .select()
    .single();

  if (error) throw error;

  // Generate PDF
  const pdfUri = await generateReceiptPdf(
    {
      id: receipt.id,
      description: data.description,
      amount: data.amount,
      currency: data.currency || "SAR",
      adTitle: data.adTitle || "",
      adType,
      sellerSignature,
      buyerSignature: null,
    },
    isRTL
  );

  // Upload PDF to storage
  const pdfPath = `${userId}/receipts/${receipt.id}/seller_signed.pdf`;
  await uploadPdfToStorage(pdfUri, pdfPath);

  // Update receipt with PDF path
  const { data: updated, error: updateError } = await supabase
    .from("receipts")
    .update({ pdf_path: pdfPath })
    .eq("id", receipt.id)
    .select()
    .single();

  if (updateError) throw updateError;

  return updated;
}

/**
 * Accept and sign a receipt as buyer (final state)
 * @param {string} receiptId
 * @param {string} adTitle - for PDF generation
 * @param {boolean} isRTL - for PDF generation
 * @returns {Promise<Object>} Updated receipt record
 */
export async function acceptReceipt(receiptId, adTitle = "", isRTL = true) {
  const session = await ensureSupabaseSession();
  const user = await getSupabaseUser();
  const userId = session.user.id;

  // Get user profile for display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  // Fetch current receipt + ad type
  const { data: receipt, error: fetchError } = await supabase
    .from("receipts")
    .select("*, ads:ads(type)")
    .eq("id", receiptId)
    .single();

  if (fetchError) throw fetchError;

  const adType = receipt.ads?.type || "";

  const buyerSignature = {
    user_id: userId,
    display_name: profile?.display_name || "User",
    timestamp: new Date().toISOString(),
    method: "electronic-acceptance",
  };

  // Generate final PDF with both signatures
  const pdfUri = await generateReceiptPdf(
    {
      id: receipt.id,
      description: receipt.description,
      amount: receipt.amount,
      currency: receipt.currency,
      adTitle,
      adType,
      sellerSignature: receipt.seller_signature,
      buyerSignature,
    },
    isRTL
  );

  // Upload final PDF
  const pdfPath = `${userId}/receipts/${receipt.id}/final.pdf`;
  await uploadPdfToStorage(pdfUri, pdfPath);

  // Update receipt
  const { data: updated, error: updateError } = await supabase
    .from("receipts")
    .update({
      buyer_id: userId,
      buyer_signature: buyerSignature,
      status: "final",
      pdf_path: pdfPath,
    })
    .eq("id", receiptId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Create order after receipt is accepted
  try {
    const order = await createOrder({
      receipt_id: receipt.id,
      conversation_id: receipt.conversation_id,
      ad_id: receipt.ad_id,
      buyer_id: userId,
      seller_id: receipt.seller_id,
      amount: receipt.amount,
      currency: receipt.currency,
    });

    // Create notification for seller about new order
    await createOrderNotification({
      recipient_id: receipt.seller_id,
      actor_id: userId,
      order_id: order.id,
      ad_title: adTitle,
      amount: receipt.amount,
      currency: receipt.currency,
    });

    // Attach order info to the updated receipt for return
    updated.order_id = order.id;
  } catch (orderError) {
    console.error("Error creating order:", orderError);
    // Don't fail the receipt acceptance if order creation fails
    // The receipt is still valid, order can be created manually later
  }

  return updated;
}

/**
 * Upload a PDF file to Supabase Storage
 * @param {string} localUri - Local file URI from expo-print
 * @param {string} storagePath - Path in storage bucket
 */
async function uploadPdfToStorage(localUri, storagePath) {
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: "base64",
  });

  // Convert to ArrayBuffer
  const arrayBuffer = decode(base64);

  // Upload to storage
  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw error;
}

/**
 * Get a signed URL for a receipt PDF
 * @param {string} pdfPath - Storage path
 * @returns {Promise<string>} Signed URL
 */
export async function getReceiptSignedUrl(pdfPath) {
  if (!pdfPath) return null;

  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(pdfPath, 60 * 60); // 1 hour

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Fetch a receipt row by id (members-only via RLS).
 * @param {string} receiptId
 */
export async function fetchReceiptById(receiptId) {
  await ensureSupabaseSession();
  if (!receiptId) throw new Error("Missing receiptId");

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", receiptId)
    .single();

  if (error) throw error;
  return data;
}

