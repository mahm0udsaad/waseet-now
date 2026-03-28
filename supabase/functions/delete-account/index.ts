// @ts-ignore - Deno npm import works at runtime
import { createClient } from "npm:@supabase/supabase-js@2";

/// <reference lib="deno.ns" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

async function removeFolderObjects(
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
) {
  const paths: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      console.warn(`[delete-account] Failed to list ${bucket}/${prefix}:`, error.message);
      return;
    }

    if (!data?.length) break;

    for (const item of data) {
      if (!item?.name) continue;
      paths.push(`${prefix}/${item.name}`);
    }

    if (data.length < limit) break;
    offset += data.length;
  }

  if (!paths.length) return;

  const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
  if (error) {
    console.warn(`[delete-account] Failed to remove objects from ${bucket}:`, error.message);
  }
}

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-ignore - Deno.env is available in Deno runtime
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    // @ts-ignore - Deno.env is available in Deno runtime
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = user.id;

    await Promise.all([
      removeFolderObjects(supabaseAdmin, "ads", userId),
      removeFolderObjects(supabaseAdmin, "chat", userId),
      removeFolderObjects(supabaseAdmin, "avatars", userId),
    ]);

    const cleanupTasks = [
      supabaseAdmin.from("profiles").delete().eq("user_id", userId),
      supabaseAdmin.from("user_push_tokens").delete().eq("user_id", userId),
    ];

    const cleanupResults = await Promise.allSettled(cleanupTasks);
    for (const result of cleanupResults) {
      if (result.status === "rejected") {
        console.warn("[delete-account] Cleanup task rejected:", result.reason);
      } else if (result.value.error) {
        console.warn("[delete-account] Cleanup task failed:", result.value.error.message);
      }
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      return new Response(
        JSON.stringify({ error: "Failed to delete account", details: deleteUserError.message }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[delete-account] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});
