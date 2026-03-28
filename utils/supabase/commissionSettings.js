import { supabase } from "./client";

/**
 * Fetch active commission settings from the database via RPC.
 * Returns an array of { service_type, commission_type, rate, label_en, label_ar, tax_enabled, tax_rate }.
 */
export async function fetchCommissionSettings() {
  const { data, error } = await supabase.rpc("get_commission_settings");

  if (error) {
    console.error("[CommissionSettings] Failed to fetch:", error.message);
    throw error;
  }

  return data || [];
}
