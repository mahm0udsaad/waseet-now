import React from "react";
import { View, Text, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { MapPin, FileText, Receipt } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation, getRTLRowDirection, getRTLTextAlign } from "@/utils/i18n/store";
import { BorderRadius } from "@/constants/theme";
import PaymentReceiptCard from "./PaymentReceiptCard";

const locationLabelCache = new Map();

function formatLocationLabel(placemark, isRTL) {
  if (!placemark) return null;

  const parts = [
    placemark.name,
    placemark.street,
    placemark.district,
    placemark.city || placemark.subregion,
    placemark.region,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  const uniqueParts = [...new Set(parts)];
  if (uniqueParts.length === 0) {
    return isRTL ? "الموقع الحالي" : "Current Location";
  }

  return uniqueParts.slice(0, 3).join("، ");
}

function formatCoordinateFallback(latitude, longitude) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return "";
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function LocationAttachment({ attachment, isMe, colors, textColor, isRTL }) {
  const cacheKey =
    typeof attachment?.latitude === "number" && typeof attachment?.longitude === "number"
      ? `${attachment.latitude.toFixed(6)},${attachment.longitude.toFixed(6)}`
      : null;
  const [resolvedLabel, setResolvedLabel] = React.useState(
    () => attachment?.label || attachment?.formattedAddress || (cacheKey ? locationLabelCache.get(cacheKey) : null) || null
  );

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (resolvedLabel || !cacheKey) return;
      if (typeof attachment?.latitude !== "number" || typeof attachment?.longitude !== "number") return;

      try {
        const [placemark] = await Location.reverseGeocodeAsync({
          latitude: attachment.latitude,
          longitude: attachment.longitude,
        });
        const label = formatLocationLabel(placemark, isRTL);
        if (!label) return;
        locationLabelCache.set(cacheKey, label);
        if (!cancelled) {
          setResolvedLabel(label);
        }
      } catch (error) {
        console.warn("Failed to resolve chat location label:", error);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [attachment?.latitude, attachment?.longitude, cacheKey, isRTL, resolvedLabel]);

  const locationLabel =
    resolvedLabel ||
    attachment?.label ||
    attachment?.formattedAddress ||
    formatCoordinateFallback(attachment?.latitude, attachment?.longitude);
  const coordinateText = formatCoordinateFallback(attachment?.latitude, attachment?.longitude);

  const openInMaps = React.useCallback(async () => {
    if (typeof attachment?.latitude !== "number" || typeof attachment?.longitude !== "number") {
      return;
    }

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${attachment.latitude},${attachment.longitude}`;

    try {
      const supported = await Linking.canOpenURL(mapsUrl);
      if (!supported) {
        Alert.alert(
          isRTL ? "تعذر فتح الخريطة" : "Unable to Open Map",
          isRTL ? "لا يمكن فتح Google Maps لهذا الموقع." : "Google Maps could not be opened for this location."
        );
        return;
      }

      await Linking.openURL(mapsUrl);
    } catch (_error) {
      Alert.alert(
        isRTL ? "تعذر فتح الخريطة" : "Unable to Open Map",
        isRTL ? "حدث خطأ أثناء فتح الموقع." : "An error occurred while opening the location."
      );
    }
  }, [attachment?.latitude, attachment?.longitude, isRTL]);

  return (
    <Pressable
      onPress={openInMaps}
      style={({ pressed }) => [
        styles.locationContainer,
        {
          backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.background,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.locationIconWrap, { backgroundColor: isMe ? 'rgba(255,255,255,0.18)' : colors.primaryLight }]}>
        <MapPin size={18} color={isMe ? "#FFF" : colors.primary} />
      </View>
      <View style={styles.locationContent}>
        <Text style={[styles.locationTitle, { color: textColor }]} numberOfLines={2}>
          {locationLabel}
        </Text>
        {!!coordinateText && (
          <Text style={[styles.locationCoords, { color: isMe ? "rgba(255,255,255,0.72)" : colors.textMuted }]} numberOfLines={1}>
            {coordinateText}
          </Text>
        )}
        <Text style={[styles.locationAction, { color: isMe ? "#FFFFFF" : colors.primary }]}>
          {isRTL ? "فتح في Google Maps" : "Open in Google Maps"}
        </Text>
      </View>
    </Pressable>
  );
}

function MessageBubble({
  item,
  isMe,
  isFirstInGroup,
  isLastInGroup,
  onImagePress,
  onFilePress,
  onReceiptPress,
  onAcceptReceipt,
  isAcceptingReceipt,
  onPaymentPress,
  onSubmitDispute,
  paidOrderIds,
  currentUserId,
  daminPayerUserId,
  acceptedReceiptIds,
  orderPaidOverride,
}) {
  const { colors } = useTheme();
  const { isRTL } = useTranslation();

  const bubbleStyle = {
    backgroundColor: isMe ? colors.primary : colors.surface,
    borderTopLeftRadius: BorderRadius.l,
    borderTopRightRadius: BorderRadius.l,
    borderBottomLeftRadius: isMe ? BorderRadius.l : (isLastInGroup ? 4 : BorderRadius.l),
    borderBottomRightRadius: isMe ? (isLastInGroup ? 4 : BorderRadius.l) : BorderRadius.l,
    // Add margin for separation if it's the first in a group
    marginTop: isFirstInGroup ? 2 : 1,
  };

  const textColor = isMe ? "#FFFFFF" : colors.text;
  const timeColor = isMe ? "rgba(255,255,255,0.7)" : colors.textMuted;
  const subTextColor = isMe ? "rgba(255,255,255,0.9)" : colors.textSecondary;

  // Render attachments
  const renderAttachment = (attachment, index) => {
    const key = attachment.id || index;
    
    if (attachment.type === "payment_receipt") {
      // Override status from order if available (admin may not have updated the message)
      const paidByOrderId = paidOrderIds && attachment.order_id && paidOrderIds.has(String(attachment.order_id));
      const effectiveData = (attachment.status === "pending" && (paidByOrderId || orderPaidOverride))
        ? { ...attachment, status: "succeeded" }
        : attachment;
      return (
        <View key={key} style={{ marginBottom: 4 }}>
          <PaymentReceiptCard data={effectiveData} isMe={isMe} />
        </View>
      );
    }

    if (attachment.type === "image") {
      return (
        <Pressable key={key} onPress={() => onImagePress(attachment.signedUrl || attachment.uri)} style={styles.imageContainer}>
          <Image source={{ uri: attachment.signedUrl || attachment.uri }} style={styles.image} contentFit="cover" />
        </Pressable>
      );
    }

    if (attachment.type === "location") {
      return (
        <LocationAttachment
          key={key}
          attachment={attachment}
          isMe={isMe}
          colors={colors}
          textColor={textColor}
          isRTL={isRTL}
        />
      );
    }

    if (attachment.type === "file") {
      return (
        <Pressable 
          key={key} 
          onPress={() => onFilePress(attachment)}
          style={[styles.fileContainer, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.background }]}
        >
          <FileText size={20} color={isMe ? "#FFF" : colors.text} />
          <View style={styles.fileInfo}>
             <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{attachment.name}</Text>
             <Text style={[styles.fileType, { color: timeColor }]}>{attachment.mimeType?.split('/')[1] || 'FILE'}</Text>
          </View>
        </Pressable>
      );
    }
    
    if (attachment.type === "receipt") {
      return (
        <View key={key} style={[styles.receiptCard, { backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : colors.background, borderColor: isMe ? 'rgba(255,255,255,0.3)' : colors.border }]}>
          <View style={[styles.receiptHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <Receipt size={18} color={isMe ? "#FFF" : colors.primary} />
            <Text style={[styles.receiptTitle, { color: textColor }]}>
              {isRTL ? "إيصال" : "Receipt"}
            </Text>
          </View>
          <View style={styles.receiptBody}>
            {attachment.description && (
              <Text style={[styles.receiptDescription, { color: subTextColor }]}>
                {attachment.description}
              </Text>
            )}
            <Text style={[styles.receiptAmount, { color: textColor }]}>
              {Number(attachment.amount || 0).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
            </Text>
            <Text style={[styles.receiptStatus, { color: timeColor }]}>
              {attachment.status === "seller_signed" && (isRTL ? "موقع من البائع" : "Signed by Seller")}
              {attachment.status === "final" && (isRTL ? "نهائي" : "Final")}
            </Text>
          </View>
          <View style={[styles.receiptActions, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <Pressable
              onPress={() => onReceiptPress && onReceiptPress(attachment)}
              style={[styles.receiptButton, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.primaryLight }]}
            >
              <Text style={[styles.receiptButtonText, { color: isMe ? "#FFF" : colors.primary }]}>
                {isRTL ? "عرض PDF" : "View PDF"}
              </Text>
            </Pressable>
            {attachment.status === "seller_signed" && !isMe && !(acceptedReceiptIds && acceptedReceiptIds.has(attachment.receipt_id)) && (
              <Pressable
                testID="receipt-accept-btn"
                onPress={() => onAcceptReceipt && onAcceptReceipt(attachment.receipt_id)}
                disabled={isAcceptingReceipt}
                style={[styles.receiptButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.receiptButtonText, { color: "#fff" }]}>
                  {isAcceptingReceipt ? (isRTL ? "جاري..." : "Loading...") : (isRTL ? "قبول وتوقيع" : "Accept & Sign")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    }

    if (attachment.type === "payment_link") {
      const alreadyPaid = paidOrderIds && attachment.order_id && paidOrderIds.has(String(attachment.order_id));
      const expectedPayerId = attachment.payer_user_id || daminPayerUserId;
      const expectedBuyerId = attachment.buyer_user_id;
      const canPayRegular =
        !!attachment.isDamin ||
        !expectedBuyerId ||
        (currentUserId && String(currentUserId) === String(expectedBuyerId));
      const canPayDamin =
        !attachment.isDamin ||
        !expectedPayerId ||
        (currentUserId && String(currentUserId) === String(expectedPayerId));
      const canPay = canPayDamin && canPayRegular;
      return (
        <View key={key} style={[styles.paymentCard, { backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : colors.background, borderColor: isMe ? 'rgba(255,255,255,0.3)' : colors.border }]}>
          <View style={[styles.paymentHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <Text style={[styles.paymentTitle, { color: textColor }]}>
              {alreadyPaid ? "✅" : "💳"} {isRTL ? (alreadyPaid ? "تم الدفع" : "رابط الدفع") : (alreadyPaid ? "Payment Complete" : "Payment Link")}
            </Text>
          </View>
          {attachment.amount && (
            <Text style={[styles.paymentAmount, { color: textColor }]}>
              {Number(attachment.amount).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
            </Text>
          )}
          {!alreadyPaid && canPay && (
            <Pressable
              testID="payment-pay-btn"
              onPress={() => onPaymentPress && onPaymentPress({ amount: attachment.amount, orderId: attachment.order_id, isDamin: attachment.isDamin })}
              style={[styles.paymentButton, { backgroundColor: isMe ? '#FFF' : colors.primary }]}
            >
              <Text style={[styles.paymentButtonText, { color: isMe ? colors.primary : "#fff" }]}>
                {isRTL ? "ادفع الآن" : "Pay Now"}
              </Text>
            </Pressable>
          )}
          {alreadyPaid && !attachment.isDamin && canPayRegular && (
            <Pressable
              testID="payment-dispute-btn"
              onPress={() => onSubmitDispute && onSubmitDispute(attachment.order_id)}
              style={[styles.paymentDisputeButton, { borderColor: colors.error }]}
            >
              <Text style={[styles.paymentDisputeButtonText, { color: colors.error }]}>
                {isRTL ? "رفع نزاع" : "Submit Dispute"}
              </Text>
            </Pressable>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[
      styles.container, 
      { 
        alignSelf: isMe ? (isRTL ? "flex-start" : "flex-end") : (isRTL ? "flex-end" : "flex-start"),
        flexDirection: getRTLRowDirection(isRTL),
      }
    ]}>
      <View style={[styles.bubble, bubbleStyle]}>
        {item.attachments?.map((att, idx) => renderAttachment(att, idx))}
        
        {!!item.content && (
          <Text style={[styles.text, { color: textColor, textAlign: getRTLTextAlign(isRTL) }]}>
            {item.content}
          </Text>
        )}
        
        {/* Timestamp */}
        <View style={styles.footer}>
           <Text style={[styles.time, { color: timeColor }]}>
             {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </Text>
        </View>
      </View>
    </View>
  );
}

export default React.memo(MessageBubble, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.isMe === next.isMe &&
    prev.isFirstInGroup === next.isFirstInGroup &&
    prev.isLastInGroup === next.isLastInGroup &&
    prev.isAcceptingReceipt === next.isAcceptingReceipt &&
    prev.paidOrderIds === next.paidOrderIds &&
    prev.currentUserId === next.currentUserId &&
    prev.daminPayerUserId === next.daminPayerUserId &&
    prev.acceptedReceiptIds === next.acceptedReceiptIds
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
    maxWidth: "80%",
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 10,
  },
  imageContainer: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: 200,
    height: 150,
    backgroundColor: '#eee',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 4,
    gap: 10,
    width: 200,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileType: {
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 12,
    marginBottom: 4,
    gap: 10,
    minWidth: 220,
  },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  locationCoords: {
    fontSize: 11,
    marginTop: 3,
  },
  locationAction: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  
  // Receipt
  receiptCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minWidth: 200,
    marginBottom: 4,
  },
  receiptHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  receiptBody: {
    marginBottom: 10,
  },
  receiptDescription: {
    fontSize: 12,
    marginBottom: 4,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  receiptStatus: {
    fontSize: 11,
    fontStyle: "italic",
  },
  receiptActions: {
    gap: 6,
  },
  receiptButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  receiptButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  
  // Payment Link
  paymentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
    alignItems: "center",
    marginBottom: 4,
  },
  paymentHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  paymentButton: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  paymentButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  paymentDisputeButton: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  paymentDisputeButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
