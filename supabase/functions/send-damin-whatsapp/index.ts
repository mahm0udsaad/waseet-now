import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface DaminWhatsAppPayload {
  recipient_phone: string;
  requester_name: string;
  amount: string;
  order_id: string;
}

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: DaminWhatsAppPayload = await req.json();
    const { recipient_phone, requester_name, amount, order_id } = payload;

    if (!recipient_phone || !order_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipient_phone, order_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Twilio credentials from environment
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const twilioContentSid = Deno.env.get("TWILIO_DAMIN_CONTENT_SID");

    if (!twilioSid || !twilioAuthToken || !twilioMessagingServiceSid || !twilioContentSid) {
      console.error("Missing Twilio configuration");
      return new Response(
        JSON.stringify({ error: "Twilio not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format phone for WhatsApp (ensure it has + prefix)
    let formattedPhone = recipient_phone.replace(/[^0-9]/g, "");
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+" + formattedPhone;
    }

    // Content variables for the template:
    // {{1}} = amount, {{2}} = requester name, {{3}} = order_id (for button URL)
    const contentVariables = JSON.stringify({
      "1": amount || "0",
      "2": requester_name || "مستخدم كافل",
      "3": order_id,
    });

    // Send via Twilio Messages API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const basicAuth = btoa(`${twilioSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:${formattedPhone}`);
    formData.append("MessagingServiceSid", twilioMessagingServiceSid);
    formData.append("ContentSid", twilioContentSid);
    formData.append("ContentVariables", contentVariables);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      return new Response(
        JSON.stringify({
          error: "Failed to send WhatsApp message",
          twilio_error: twilioResult.message || twilioResult.code,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp message sent:", {
      to: formattedPhone,
      sid: twilioResult.sid,
      status: twilioResult.status,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: twilioResult.sid,
        status: twilioResult.status,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-damin-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
