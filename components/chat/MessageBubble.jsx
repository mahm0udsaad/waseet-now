import React from "react";
import { View, Text, StyleSheet, Pressable, Linking, Alert, Animated } from "react-native";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { MapPin, FileText, ChevronRight, ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import { BorderRadius } from "@/constants/theme";
import PaymentReceiptCard from "./PaymentReceiptCard";
import ReceiptCard from "./ReceiptCard";
import PaymentLinkCard from "./PaymentLinkCard";

const locationLabelCache = new Map();

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 2 }}>
          <Text style={[styles.locationAction, { color: isMe ? "#FFFFFF" : colors.primary, marginTop: 0 }]}>
            {isRTL ? "فتح في Google Maps" : "Open in Google Maps"}
          </Text>
          {isRTL ? (
            <ChevronLeft size={14} color={isMe ? "#FFFFFF" : colors.primary} />
          ) : (
            <ChevronRight size={14} color={isMe ? "#FFFFFF" : colors.primary} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ReplyPreview({ repliedMessage, isMe, colors, isRTL, onPress }) {
  if (!repliedMessage) return null;

  const isMyReply = repliedMessage.sender_id === repliedMessage._currentUserId;
  const senderName = isMyReply
    ? (isRTL ? "أنت" : "You")
    : (repliedMessage._otherName || (isRTL ? "المستخدم" : "User"));

  const previewText = repliedMessage.content
    ? repliedMessage.content.substring(0, 80) + (repliedMessage.content.length > 80 ? "…" : "")
    : repliedMessage.attachments?.length > 0
      ? (repliedMessage.attachments[0].type === "image" ? "📷" : "📎")
      : "";

  return (
    <Pressable
      onPress={() => onPress?.(repliedMessage.id)}
      style={({ pressed }) => ({
        borderStartWidth: 3,
        borderEndWidth: 0,
        borderColor: isMe ? "rgba(255,255,255,0.5)" : colors.primary,
        backgroundColor: isMe ? "rgba(255,255,255,0.15)" : colors.primaryLight + "40",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginBottom: 4,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: isMe ? "rgba(255,255,255,0.9)" : colors.primary,
          marginBottom: 1,
          writingDirection: 'rtl',
        }}
        numberOfLines={1}
      >
        {senderName}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: isMe ? "rgba(255,255,255,0.7)" : colors.textSecondary,
          writingDirection: 'rtl',
        }}
        numberOfLines={2}
      >
        {previewText}
      </Text>
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
  repliedMessage,
  onReplyPress,
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
      const hasSize = attachment.width > 0 && attachment.height > 0;
      const aspectRatio = hasSize ? attachment.width / attachment.height : 4 / 3;
      return (
        <Pressable key={key} onPress={() => onImagePress(attachment.signedUrl || attachment.uri)} style={styles.imageContainer}>
          <Image
            source={{ uri: attachment.signedUrl || attachment.uri }}
            style={[styles.image, { aspectRatio, width: 220, height: undefined, maxHeight: 280 }]}
            contentFit="cover"
          />
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
      const ext = attachment.mimeType?.split('/')[1]?.toUpperCase() || 'FILE';
      const isPdf = ext === 'PDF';
      const isDoc = ['DOC', 'DOCX', 'MSWORD'].includes(ext);
      const iconBg = isPdf ? '#EF444420' : isDoc ? '#3B82F620' : (isMe ? 'rgba(255,255,255,0.18)' : colors.primaryLight);
      const iconColor = isPdf ? '#EF4444' : isDoc ? '#3B82F6' : (isMe ? '#FFF' : colors.primary);
      const fileSize = attachment.size ? formatFileSize(attachment.size) : null;
      return (
        <Pressable
          key={key}
          onPress={() => onFilePress(attachment)}
          style={[styles.fileContainer, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.background }]}
        >
          <View style={[styles.fileIconWrap, { backgroundColor: iconBg }]}>
            <FileText size={18} color={iconColor} />
          </View>
          <View style={styles.fileInfo}>
             <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{attachment.name}</Text>
             <Text style={[styles.fileType, { color: timeColor }]}>
               {ext}{fileSize ? ` · ${fileSize}` : ''}
             </Text>
          </View>
        </Pressable>
      );
    }
    
    if (attachment.type === "receipt") {
      return (
        <View key={key} style={{ marginBottom: 4 }}>
          <ReceiptCard
            data={attachment}
            isMe={isMe}
            onReceiptPress={onReceiptPress}
            onAcceptReceipt={onAcceptReceipt}
            isAcceptingReceipt={isAcceptingReceipt}
            accepted={acceptedReceiptIds && acceptedReceiptIds.has(attachment.receipt_id)}
          />
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
        <View key={key} style={{ marginBottom: 4 }}>
          <PaymentLinkCard
            data={attachment}
            isMe={isMe}
            alreadyPaid={alreadyPaid}
            canPay={canPay}
            canPayRegular={canPayRegular}
            onPaymentPress={onPaymentPress}
            onSubmitDispute={onSubmitDispute}
          />
        </View>
      );
    }

    return null;
  };

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignSelf: isMe ? "flex-end" : "flex-start",
        }
      ]}
    >
      <View style={[styles.bubble, bubbleStyle]}>
        {repliedMessage && (
          <ReplyPreview repliedMessage={repliedMessage} isMe={isMe} colors={colors} isRTL={isRTL} onPress={onReplyPress} />
        )}
        {item.attachments?.map((att, idx) => renderAttachment(att, idx))}

        {!!item.content && (
          <Text style={[styles.text, { color: textColor }]}>
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
    </Animated.View>
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
    prev.acceptedReceiptIds === next.acceptedReceiptIds &&
    prev.repliedMessage?.id === next.repliedMessage?.id
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
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    minWidth: 240,
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
  
});
