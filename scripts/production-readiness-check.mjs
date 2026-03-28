#!/usr/bin/env node

/**
 * Production Readiness Check for Kafel (waseet-alan)
 * Validates the app is ready for 300-user deployment.
 *
 * Usage:  node scripts/production-readiness-check.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// ── Helpers ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TARGET_USERS = 300;

const PASS = "\x1b[32mPASS\x1b[0m";
const WARN = "\x1b[33mWARN\x1b[0m";
const FAIL = "\x1b[31mFAIL\x1b[0m";

const results = [];

function record(label, status, detail) {
  results.push({ label, status, detail });
  const badge =
    status === "PASS" ? PASS : status === "WARN" ? WARN : FAIL;
  console.log(`  [${badge}] ${label}`);
  if (detail) console.log(`         ${detail}`);
}

/** Load .env file into a plain object (no side-effects on process.env). */
function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const text = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
  return env;
}

// ── Load env ─────────────────────────────────────────────────────────────────

const env = loadEnv();
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SECRET;
const supabaseAccessToken = env.SUPABASE_ACCESS_TOKEN;
const projectId = env.PROJECT_ID || env.SUPABASE_ID;

// ── Dynamic import of Supabase client ────────────────────────────────────────

let createClient;
try {
  const mod = await import("@supabase/supabase-js");
  createClient = mod.createClient;
} catch {
  console.error(
    "\n  Could not import @supabase/supabase-js.  Run `npm install` first.\n"
  );
  process.exit(1);
}

// Use the service-role key so we can query admin-level data.
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// ── Checks ───────────────────────────────────────────────────────────────────

console.log("\n========================================");
console.log("  Production Readiness Check");
console.log(`  Target: ${TARGET_USERS} concurrent users`);
console.log("========================================\n");

// 1. Supabase Connection
console.log("1. Supabase Connection");
if (supabaseUrl && supabaseAnonKey) {
  try {
    // Health probe – query a real table with limit 0 (avoids 401 on bare /rest/v1/)
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=user_id&limit=0`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (res.ok || res.status === 200) {
      record("SUPABASE_URL reachable", "PASS", `${supabaseUrl}`);
    } else {
      record("SUPABASE_URL reachable", "WARN", `HTTP ${res.status} – endpoint reachable but query returned non-200`);
    }
  } catch (e) {
    record("SUPABASE_URL reachable", "FAIL", e.message);
  }
  record("EXPO_PUBLIC_SUPABASE_URL set", "PASS");
  record("EXPO_PUBLIC_SUPABASE_ANON_KEY set", "PASS");
} else {
  if (!supabaseUrl) record("EXPO_PUBLIC_SUPABASE_URL set", "FAIL", "Missing in .env");
  if (!supabaseAnonKey) record("EXPO_PUBLIC_SUPABASE_ANON_KEY set", "FAIL", "Missing in .env");
}

if (supabaseServiceKey) {
  record("SUPABASE_SECRET (service role) set", "PASS");
} else {
  record("SUPABASE_SECRET (service role) set", "WARN", "Needed for admin queries in this script");
}

// 2. Realtime Limits
console.log("\n2. Realtime Limits");
{
  // The app opens up to 5 channels per user:
  //   - notifications, chat-list-messages, chat-messages-<conv>,
  //     order-status-<id>, damin-order-status-<id>
  const AVG_CHANNELS_PER_USER = 5;
  const estimated = TARGET_USERS * AVG_CHANNELS_PER_USER;
  const FREE_LIMIT = 200;
  const PRO_LIMIT = 500;

  record(
    `Estimated realtime channels: ${estimated}`,
    estimated <= PRO_LIMIT ? "PASS" : "WARN",
    `Free tier limit = ${FREE_LIMIT}, Pro = ${PRO_LIMIT}. ` +
      (estimated > PRO_LIMIT
        ? `Exceeds Pro limit by ${estimated - PRO_LIMIT}. Consider connection pooling or upgrading.`
        : estimated > FREE_LIMIT
          ? `Exceeds Free tier. Ensure you are on Supabase Pro plan.`
          : "Within Free tier limits.")
  );

  // NOTE: Supabase counts *concurrent connections*, not channels.
  // A single browser/device opens 1 WebSocket which can multiplex channels.
  // So the real bottleneck is concurrent WS connections = ~TARGET_USERS.
  record(
    `Estimated concurrent WS connections: ~${TARGET_USERS}`,
    TARGET_USERS <= PRO_LIMIT ? "PASS" : "WARN",
    TARGET_USERS > PRO_LIMIT
      ? `${TARGET_USERS} exceeds Pro limit (${PRO_LIMIT}). Upgrade plan or add load shedding.`
      : TARGET_USERS > FREE_LIMIT
        ? `${TARGET_USERS} exceeds Free tier (${FREE_LIMIT}). Ensure Pro plan is active.`
        : `Within Free tier (${FREE_LIMIT}).`
  );
}

// 3. Push Token Validation
console.log("\n3. Push Token Validation");
if (supabase) {
  try {
    const { count, error } = await supabase
      .from("user_push_tokens")
      .select("*", { count: "exact", head: true });

    if (error) {
      record("Push tokens query", "FAIL", error.message);
    } else {
      const coverage = ((count / TARGET_USERS) * 100).toFixed(1);
      const status = count >= TARGET_USERS * 0.7 ? "PASS" : count > 0 ? "WARN" : "FAIL";
      record(
        `Push tokens registered: ${count}`,
        status,
        `${coverage}% coverage of ${TARGET_USERS} target users. ` +
          (status === "WARN" ? "Low token coverage – some users won't receive push notifications." : "")
      );
    }
  } catch (e) {
    record("Push tokens query", "FAIL", e.message);
  }
} else {
  record("Push tokens query", "WARN", "Skipped – SUPABASE_SECRET not available");
}

// 4. Edge Function Deployment
console.log("\n4. Edge Function Deployment");
const EXPECTED_FUNCTIONS = [
  "send-message-push",
  "delete-account",
  "damin-landing",
  "send-damin-whatsapp",
];

if (supabaseUrl && supabaseServiceKey && projectId && supabaseAccessToken) {
  for (const fn of EXPECTED_FUNCTIONS) {
    try {
      // Invoke the function with a dry-run-like HEAD/OPTIONS to see if it's deployed
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${fn}`,
        {
          method: "OPTIONS",
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      );
      // A deployed function returns 200 or 204 for OPTIONS; a missing one returns 404
      if (res.status === 404) {
        record(`Edge function: ${fn}`, "FAIL", "Not deployed (404)");
      } else {
        record(`Edge function: ${fn}`, "PASS", `HTTP ${res.status}`);
      }
    } catch (e) {
      record(`Edge function: ${fn}`, "WARN", `Could not reach: ${e.message}`);
    }
  }
} else {
  // Fallback: check if the function directories exist locally
  for (const fn of EXPECTED_FUNCTIONS) {
    const fnDir = resolve(ROOT, "supabase", "functions", fn, "index.ts");
    if (existsSync(fnDir)) {
      record(`Edge function source: ${fn}`, "WARN", "Source exists locally but deployment not verified (missing credentials)");
    } else {
      record(`Edge function source: ${fn}`, "FAIL", "Source not found locally");
    }
  }
}

// 5. Storage Buckets
console.log("\n5. Storage Buckets");
const EXPECTED_BUCKETS = ["chat", "damin-orders", "avatars"];

if (supabase) {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      record("Storage buckets query", "FAIL", error.message);
    } else {
      const bucketNames = new Set(buckets.map((b) => b.name));
      for (const name of EXPECTED_BUCKETS) {
        if (bucketNames.has(name)) {
          record(`Bucket: ${name}`, "PASS");
        } else {
          record(`Bucket: ${name}`, "FAIL", "Not found in Supabase storage");
        }
      }
      // Report any extra buckets for awareness
      const extras = buckets
        .map((b) => b.name)
        .filter((n) => !EXPECTED_BUCKETS.includes(n));
      if (extras.length) {
        record(`Additional buckets found`, "PASS", extras.join(", "));
      }
    }
  } catch (e) {
    record("Storage buckets query", "FAIL", e.message);
  }
} else {
  record("Storage buckets", "WARN", "Skipped – SUPABASE_SECRET not available");
}

// 6. RPC Functions
console.log("\n6. RPC Functions");
const EXPECTED_RPCS = [
  "notify_damin_order_created",
  "find_pending_damin_orders_by_phone",
  "link_user_to_damin_order",
  "confirm_damin_order_participation",
  "reject_damin_order_participation",
  "confirm_damin_service_completion",
  "submit_damin_payment",
  "notify_damin_service_completed",
  "confirm_damin_card_payment",
  "complete_damin_service",
  "submit_damin_dispute",
  "create_dm_conversation",
  "create_ad_dm_conversation",
  "get_commission_settings",
  "get_wallet_summary",
  "get_wallet_transactions",
  "get_damin_order_for_chat",
  "submit_withdrawal_request",
  "submit_service_bank_transfer",
  "confirm_order_completion",
];

if (supabaseUrl && supabaseServiceKey) {
  // Use PostgREST OpenAPI spec to reliably list all RPC functions
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        Accept: "application/openapi+json",
      },
    });

    if (!res.ok) {
      record("RPC check", "FAIL", `OpenAPI spec fetch failed: HTTP ${res.status}`);
    } else {
      const spec = await res.json();
      const rpcPaths = Object.keys(spec.paths || {}).filter((p) => p.startsWith("/rpc/"));
      const rpcNames = new Set(rpcPaths.map((p) => p.replace("/rpc/", "")));

      const missing = EXPECTED_RPCS.filter((r) => !rpcNames.has(r));
      const found = EXPECTED_RPCS.length - missing.length;

      if (missing.length === 0) {
        record(`All ${EXPECTED_RPCS.length} RPCs exist`, "PASS", `${rpcNames.size} total RPCs in schema`);
      } else {
        record(
          `RPCs: ${found} found, ${missing.length} missing`,
          "FAIL",
          `Missing: ${missing.join(", ")}`
        );
      }
    }
  } catch (e) {
    record("RPC check", "FAIL", e.message);
  }
} else {
  record("RPC check", "WARN", "Skipped – SUPABASE_SECRET not available");
}

// 7. EAS Build Status
console.log("\n7. EAS Build Status");
{
  let easAvailable = false;
  try {
    execSync("npx eas-cli --version", { cwd: ROOT, stdio: "pipe" });
    easAvailable = true;
  } catch {
    // eas-cli not installed
  }

  if (easAvailable) {
    try {
      const output = execSync(
        "npx eas-cli build:list --limit 3 --status finished --json --non-interactive 2>/dev/null",
        { cwd: ROOT, stdio: "pipe", timeout: 30000 }
      ).toString();

      const builds = JSON.parse(output);
      if (builds.length > 0) {
        const latest = builds[0];
        const platform = latest.platform || "unknown";
        const profile = latest.buildProfile || "unknown";
        const createdAt = latest.createdAt
          ? new Date(latest.createdAt).toLocaleDateString()
          : "unknown";
        record(
          `Latest build: ${platform} (${profile})`,
          "PASS",
          `Created ${createdAt}`
        );
      } else {
        record("EAS builds", "WARN", "No finished builds found");
      }
    } catch (e) {
      // JSON parse might fail or eas might need auth
      try {
        const output = execSync(
          "npx eas-cli build:list --limit 1 --non-interactive 2>&1",
          { cwd: ROOT, stdio: "pipe", timeout: 30000 }
        ).toString();
        if (output.includes("not logged in") || output.includes("Log in")) {
          record("EAS build status", "WARN", "Not logged in to EAS. Run `eas login` first.");
        } else {
          record("EAS build status", "WARN", `Could not parse build list: ${output.slice(0, 120)}`);
        }
      } catch {
        record("EAS build status", "WARN", "Could not retrieve build list. Ensure eas-cli is authenticated.");
      }
    }
  } else {
    record("EAS build status", "WARN", "eas-cli not found. Install with `npm i -g eas-cli`.");
  }
}

// 8. Bundle Size
console.log("\n8. Bundle Size");
{
  const BUNDLE_WARN_MB = 5;
  const BUNDLE_FAIL_MB = 10;

  try {
    // Export web bundle to a temp directory and measure JS size
    const tmpDir = resolve(ROOT, ".tmp", "bundle-check");
    execSync(`mkdir -p "${tmpDir}"`, { stdio: "pipe" });

    console.log("         Exporting bundle (this may take a moment)...");
    execSync(
      `npx expo export --platform web --output-dir "${tmpDir}" --dump-sourcemap 2>&1`,
      { cwd: ROOT, stdio: "pipe", timeout: 120000 }
    );

    // Measure total JS file sizes
    const duOutput = execSync(
      `find "${tmpDir}" -name "*.js" -exec stat -f%z {} + 2>/dev/null | awk '{s+=$1} END {print s}'`,
      { stdio: "pipe" }
    )
      .toString()
      .trim();

    let totalBytes = parseInt(duOutput, 10);

    // Fallback if stat -f%z didn't work (Linux)
    if (isNaN(totalBytes)) {
      const duFallback = execSync(
        `find "${tmpDir}" -name "*.js" -print0 | xargs -0 stat --format=%s 2>/dev/null | awk '{s+=$1} END {print s}'`,
        { stdio: "pipe" }
      )
        .toString()
        .trim();
      totalBytes = parseInt(duFallback, 10);
    }

    if (!isNaN(totalBytes) && totalBytes > 0) {
      const mb = (totalBytes / 1024 / 1024).toFixed(2);
      const status =
        mb > BUNDLE_FAIL_MB ? "FAIL" : mb > BUNDLE_WARN_MB ? "WARN" : "PASS";
      record(
        `JS bundle size: ${mb} MB`,
        status,
        status === "FAIL"
          ? `Exceeds ${BUNDLE_FAIL_MB} MB – will cause slow startup on low-end devices.`
          : status === "WARN"
            ? `Approaching ${BUNDLE_FAIL_MB} MB limit. Consider code-splitting.`
            : "Bundle size is healthy."
      );
    } else {
      record("Bundle size", "WARN", "Could not measure bundle size from export output.");
    }

    // Clean up
    execSync(`rm -rf "${tmpDir}"`, { stdio: "pipe" });
  } catch (e) {
    const msg = e.stderr?.toString?.() || e.message || "";
    if (msg.includes("not found") || msg.includes("command not found")) {
      record("Bundle size", "WARN", "expo CLI not found. Skipping bundle check.");
    } else {
      record(
        "Bundle size",
        "WARN",
        `Export failed – ${msg.slice(0, 150)}. This is expected if web platform is not configured.`
      );
    }
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log("\n========================================");
console.log("  Summary");
console.log("========================================\n");

const passes = results.filter((r) => r.status === "PASS").length;
const warns = results.filter((r) => r.status === "WARN").length;
const fails = results.filter((r) => r.status === "FAIL").length;
const total = results.length;

console.log(`  Total checks: ${total}`);
console.log(`  ${PASS}: ${passes}   ${WARN}: ${warns}   ${FAIL}: ${fails}`);

if (fails > 0) {
  console.log(`\n  Result: \x1b[31mNOT READY\x1b[0m for production (${fails} failures)\n`);
  process.exit(1);
} else if (warns > 0) {
  console.log(`\n  Result: \x1b[33mREADY WITH WARNINGS\x1b[0m (${warns} warnings)\n`);
  process.exit(0);
} else {
  console.log(`\n  Result: \x1b[32mREADY\x1b[0m for ${TARGET_USERS}-user deployment\n`);
  process.exit(0);
}
