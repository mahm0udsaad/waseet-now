function isAttachmentPlaceholder(text = "") {
  const normalized = String(text).trim().toLowerCase();
  return (
    normalized === "[attachment]" ||
    normalized === "attachment" ||
    normalized === "📎 attachment"
  );
}

export function getLocalizedNotificationContent(notification, isRTL) {
  const type = notification?.type?.toLowerCase();
  const data = notification?.data || {};
  const rawTitle = notification?.title || "";
  const rawBody = notification?.body || "";

  if (type === "message" || type === "new_message") {
    const title = isRTL ? "رسالة جديدة" : "New message";
    const body = isAttachmentPlaceholder(rawBody)
      ? (isRTL ? "[مرفق]" : "[Attachment]")
      : rawBody;
    return { title, body };
  }

  if (type === "damin_order_created") {
    // Don't return a title — the type label already shows "طلب ضامن جديد"
    const role = data.role;
    const serviceDetails = data.service_details || "";

    if (isRTL) {
      const roleText = role === "payer" ? "الدافع" : role === "beneficiary" ? "مقدم الخدمة" : "أحد الأطراف";
      const body = serviceDetails
        ? `تمت إضافتك كـ ${roleText} في خدمة ضامن جديدة: ${serviceDetails}`
        : `تمت إضافتك كـ ${roleText} في خدمة ضامن جديدة`;
      return { title: "", body };
    }

    const roleText = role === "payer" ? "payer" : role === "beneficiary" ? "service provider" : "participant";
    const body = serviceDetails
      ? `You have been added as the ${roleText} for a new Damin service: ${serviceDetails}`
      : `You have been added as the ${roleText} for a new Damin service`;
    return { title: "", body };
  }

  if (type === "new_order") {
    return {
      title: isRTL ? "تم إنشاء طلب جديد" : "New Order Created",
      body: rawBody,
    };
  }

  if (type === "order_update") {
    return {
      title: isRTL ? "تحديث الطلب" : "Order Update",
      body: rawBody,
    };
  }

  if (type === "payment_received") {
    return {
      title: isRTL ? "تم استلام الدفع" : "Payment Received",
      body: rawBody,
    };
  }

  if (type === "transfer_approved") {
    const adTitle = data.ad_title || "";
    return {
      title: isRTL ? "تم تأكيد الدفع" : "Payment Verified",
      body: adTitle
        ? (isRTL ? `تم تأكيد التحويل البنكي لـ "${adTitle}"` : `Bank transfer for "${adTitle}" has been verified`)
        : (isRTL ? "تم تأكيد التحويل البنكي بنجاح" : "Bank transfer has been verified"),
    };
  }

  if (type === "order_completion_requested") {
    const adTitle = data.ad_title || "";
    return {
      title: isRTL ? "تأكيد اكتمال الخدمة مطلوب" : "Completion Confirmation Needed",
      body: adTitle
        ? (isRTL ? `الطرف الآخر أكد اكتمال الخدمة لـ "${adTitle}". يرجى التأكيد لإطلاق الأموال.` : `The other party confirmed completion for "${adTitle}". Please confirm to release funds.`)
        : (isRTL ? "الطرف الآخر أكد اكتمال الخدمة. يرجى التأكيد لإطلاق الأموال." : "The other party confirmed service completion. Please confirm to release funds."),
    };
  }

  if (type === "order_completed") {
    const adTitle = data.ad_title || "";
    return {
      title: isRTL ? "تم اكتمال الطلب" : "Order Completed",
      body: adTitle
        ? (isRTL ? `تم اكتمال طلب "${adTitle}" بنجاح وإطلاق الأموال` : `Order for "${adTitle}" has been completed and funds released`)
        : (isRTL ? "تم اكتمال الطلب بنجاح وإطلاق الأموال" : "Order has been completed and funds released"),
    };
  }

  if (type === "transfer_rejected") {
    const adTitle = data.ad_title || "";
    const reason = rawBody || "";
    return {
      title: isRTL ? "تم رفض التحويل" : "Transfer Rejected",
      body: adTitle
        ? (isRTL ? `تم رفض التحويل البنكي لـ "${adTitle}"${reason ? `: ${reason}` : ""}` : `Bank transfer for "${adTitle}" was rejected${reason ? `: ${reason}` : ""}`)
        : (isRTL ? `تم رفض التحويل البنكي${reason ? `: ${reason}` : ""}` : `Bank transfer was rejected${reason ? `: ${reason}` : ""}`),
    };
  }

  return { title: rawTitle, body: rawBody };
}

