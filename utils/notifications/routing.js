function asScalar(value) {
  return Array.isArray(value) ? value[0] : value;
}

function asLowerString(value) {
  return String(asScalar(value) || "").trim().toLowerCase();
}

function asId(value) {
  const normalized = asScalar(value);
  return normalized == null || normalized === "" ? null : normalized;
}

function getNotificationType(input = {}) {
  return asLowerString(
    input.type ||
      input.notification_type ||
      input.kind ||
      input.data?.type ||
      input.data?.notification_type ||
      input.data?.kind
  );
}

function getConversationId(input = {}) {
  return asId(
    input.conversation_id ||
      input.conversationId ||
      input.data?.conversation_id ||
      input.data?.conversationId
  );
}

function getOrderId(input = {}) {
  return asId(
    input.order_id ||
      input.orderId ||
      input.damin_order_id ||
      input.daminOrderId ||
      input.data?.order_id ||
      input.data?.orderId ||
      input.data?.damin_order_id ||
      input.data?.daminOrderId
  );
}

function getRole(input = {}) {
  return asLowerString(input.role || input.data?.role);
}

const DAMIN_NOTIFICATION_TYPES = new Set([
  "damin_order_created",
  "damin_service_completed",
]);

const ORDER_NOTIFICATION_TYPES = new Set([
  "new_order",
  "order_update",
  "payment_received",
  "transfer_approved",
  "order_completion_requested",
  "order_completed",
  "transfer_rejected",
]);

export function getNotificationRoute(input, { fallbackToNotifications = false } = {}) {
  const notificationType = getNotificationType(input);
  const conversationId = getConversationId(input);
  const orderId = getOrderId(input);
  const role = getRole(input);

  if (conversationId) {
    return {
      pathname: "/chat",
      params: { conversationId },
    };
  }

  if (orderId && (role || DAMIN_NOTIFICATION_TYPES.has(notificationType))) {
    return {
      pathname: "/damin-order-details",
      params: { id: orderId },
    };
  }

  if (orderId && ORDER_NOTIFICATION_TYPES.has(notificationType)) {
    return {
      pathname: "/order-details",
      params: { id: orderId },
    };
  }

  if (fallbackToNotifications) {
    return { pathname: "/notifications" };
  }

  return null;
}

