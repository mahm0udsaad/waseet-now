import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const DEFAULT_TEMPLATE = "https://www.wasitalan.com/damin/request?order_id={{order_id}}";

function buildRedirectUrl(orderId: string) {
  const template =
    Deno.env.get("DAMIN_LANDING_URL_TEMPLATE") ||
    Deno.env.get("WEBSITE_DAMIN_LANDING_URL_TEMPLATE") ||
    DEFAULT_TEMPLATE;

  if (!template.includes("{{order_id}}")) {
    throw new Error("DAMIN_LANDING_URL_TEMPLATE must include {{order_id}}");
  }

  const redirectUrl = template.replaceAll("{{order_id}}", encodeURIComponent(orderId));
  return new URL(redirectUrl).toString();
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id")?.trim();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing required query param: order_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const redirectUrl = buildRedirectUrl(orderId);

    return Response.redirect(redirectUrl, 302);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in damin-landing:", error);

    return new Response(JSON.stringify({ error: "Internal server error", details: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
