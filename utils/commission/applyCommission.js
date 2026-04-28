/**
 * Pure commission math — no Zustand, no Supabase.
 * Takes a config object and a price, returns { commission, total }.
 *
 * @param {{ type: 'percentage' | 'fixed', value: number } | null} config
 * @param {number} price
 */
export function applyCommission(config, price = 0) {
  if (!config) return { commission: 0, total: price };
  const commission =
    config.type === "fixed"
      ? config.value
      : (price * config.value) / 100;
  return { commission, total: price + commission };
}
