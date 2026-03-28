/**
 * Commission Configuration (Zustand store with backend fetching)
 *
 * Fetches commission rates from Supabase `commission_settings` table.
 * Falls back to hardcoded defaults if the fetch fails.
 *
 * Usage:
 *   import { calculateCommission, getCommissionLabel, getCommissionDisplayText, getCommissionConfig } from "@/constants/commissionConfig";
 *   // Hook (reactive):
 *   import { useCommissionConfig } from "@/constants/commissionConfig";
 */

import { create } from "zustand";
import { fetchCommissionSettings } from "@/utils/supabase/commissionSettings";

// ─── Hardcoded defaults (used as fallback) ─────────────────────────────────

const DEFAULT_CONFIG = {
  tanazul: {
    type: "fixed",
    value: 500,
    label: { ar: "رسوم المنصة", en: "Platform Fee" },
  },
  taqib: {
    type: "percentage",
    value: 10,
    label: { ar: "عمولة المنصة", en: "Platform Commission" },
  },
  damin: {
    type: "percentage",
    value: 10,
    label: { ar: "عمولة المنصة", en: "Platform Commission" },
  },
};

// ─── Zustand store ──────────────────────────────────────────────────────────

const useCommissionStore = create((set) => ({
  config: { ...DEFAULT_CONFIG },
  loaded: false,

  setConfig: (config) => set({ config, loaded: true }),
}));

/**
 * Fetch commission settings from the backend and update the store.
 * Safe to call multiple times — subsequent calls are no-ops if already loaded.
 */
export async function loadCommissionSettings() {
  if (useCommissionStore.getState().loaded) return;

  try {
    const rows = await fetchCommissionSettings();
    if (!rows || rows.length === 0) return;

    const config = { ...DEFAULT_CONFIG };

    for (const row of rows) {
      // Map DB service_type to local key (DB uses "damin", local also uses "damin" + legacy "dhamen")
      const key = row.service_type;
      if (!key) continue;

      const entry = {
        type: row.commission_type, // "percentage" | "fixed"
        value: row.rate,
        label: {
          ar: row.label_ar,
          en: row.label_en,
        },
      };

      config[key] = entry;

      // Keep legacy "dhamen" alias in sync with "damin"
      if (key === "damin") {
        config.dhamen = entry;
      }
    }

    useCommissionStore.getState().setConfig(config);
  } catch (err) {
    console.warn("[CommissionConfig] Using defaults:", err.message);
  }
}

// ─── Public getters (non-reactive, for use outside components) ──────────────

/**
 * Get the full commission config object (snapshot).
 */
export function getCommissionConfig() {
  return useCommissionStore.getState().config;
}

/**
 * Kept for backward compatibility.
 */
export const COMMISSION_CONFIG = new Proxy(
  {},
  {
    get(_target, prop) {
      return useCommissionStore.getState().config[prop];
    },
    ownKeys() {
      return Object.keys(useCommissionStore.getState().config);
    },
    getOwnPropertyDescriptor(_target, prop) {
      const cfg = useCommissionStore.getState().config;
      if (prop in cfg) {
        return { configurable: true, enumerable: true, value: cfg[prop] };
      }
      return undefined;
    },
  }
);

/**
 * Calculate commission based on ad type and price.
 */
export const calculateCommission = (adType, price = 0) => {
  const config = useCommissionStore.getState().config[adType];

  if (!config) {
    return { commission: 0, total: price, config: null };
  }

  let commission = 0;

  if (config.type === "fixed") {
    commission = config.value;
  } else if (config.type === "percentage") {
    commission = (price * config.value) / 100;
  }

  return { commission, total: price + commission, config };
};

/**
 * Get commission label text.
 */
export const getCommissionLabel = (adType, language = "en") => {
  const config = useCommissionStore.getState().config[adType];
  return config?.label?.[language] || "Commission";
};

/**
 * Get commission display text (e.g., "500 ر.س" or "10%").
 */
export const getCommissionDisplayText = (adType, isRTL = false) => {
  const config = useCommissionStore.getState().config[adType];

  if (!config) return "";

  if (config.type === "fixed") {
    return isRTL ? `${config.value} ر.س` : `${config.value} SAR`;
  }

  return `${config.value}%`;
};

// ─── React hook (reactive) ──────────────────────────────────────────────────

/**
 * Hook that returns the live commission config and loaded state.
 * Re-renders when config changes.
 */
export function useCommissionConfig() {
  const config = useCommissionStore((s) => s.config);
  const loaded = useCommissionStore((s) => s.loaded);
  return { config, loaded };
}
