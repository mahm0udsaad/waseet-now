import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronRight, FileText, Image as ImageIcon, Calendar } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation, getRTLStartAlign } from "@/utils/i18n/store";
import { supabase } from "@/utils/supabase/client";
import FadeInView from "@/components/ui/FadeInView";
import * as WebBrowser from "expo-web-browser";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MEDIA_CELL_SIZE = (SCREEN_WIDTH - 4) / 3;

export default function ChatInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isRTL, rowDirection } = useTranslation();
  const params = useLocalSearchParams();

  const { conversationId, otherUserId, otherUserName, otherUserAvatar } = params;

  const [profile, setProfile] = useState(null);
  const [media, setMedia] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  // Fetch other user profile details
  useEffect(() => {
    if (!otherUserId) {
      setLoadingProfile(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, created_at, phone_number")
        .eq("user_id", otherUserId)
        .maybeSingle();
      setProfile(data);
      setLoadingProfile(false);
    })();
  }, [otherUserId]);

  // Fetch images from chat messages
  useEffect(() => {
    if (!conversationId) {
      setLoadingMedia(false);
      return;
    }
    (async () => {
      const { data: messages } = await supabase
        .from("messages")
        .select("attachments")
        .eq("conversation_id", conversationId)
        .not("attachments", "is", null);

      const imageAttachments = [];
      for (const msg of messages || []) {
        for (const att of msg.attachments || []) {
          if (att.type === "image" && att.path) {
            try {
              const { data: signed } = await supabase.storage
                .from("chat")
                .createSignedUrl(att.path, 60 * 60);
              if (signed?.signedUrl) {
                imageAttachments.push({ path: att.path, url: signed.signedUrl });
              }
            } catch (_) {}
          }
        }
      }
      setMedia(imageAttachments);
      setLoadingMedia(false);
    })();
  }, [conversationId]);

  // Fetch receipts for this conversation
  useEffect(() => {
    if (!conversationId) {
      setLoadingReceipts(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("receipts")
        .select("id, description, amount, currency, status, created_at, pdf_path")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false });
      setReceipts(data || []);
      setLoadingReceipts(false);
    })();
  }, [conversationId]);

  const openReceiptPdf = useCallback(async (pdfPath) => {
    if (!pdfPath) return;
    const { data } = await supabase.storage
      .from("chat")
      .createSignedUrl(pdfPath, 60 * 60);
    if (data?.signedUrl) {
      await WebBrowser.openBrowserAsync(data.signedUrl);
    }
  }, []);

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const receiptStatusLabel = (status) => {
    if (isRTL) {
      switch (status) {
        case "seller_signed": return "بانتظار القبول";
        case "final": return "مكتملة";
        default: return status;
      }
    }
    switch (status) {
      case "seller_signed": return "Pending Acceptance";
      case "final": return "Completed";
      default: return status;
    }
  };

  const receiptStatusColor = (status) => {
    switch (status) {
      case "final": return colors.success;
      case "seller_signed": return colors.warning;
      default: return colors.textMuted;
    }
  };

  const displayName = profile?.display_name || otherUserName || "User";
  const avatarUrl = profile?.avatar_url || otherUserAvatar;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.backButton} />
        <Text style={[styles.headerTitle, { color: colors.text, textAlign: "center" }]}>
          {isRTL ? "معلومات المحادثة" : "Chat Info"}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
        >
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <FadeInView style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase() || "U"}</Text>
            </View>
          )}
          <Text style={[styles.profileName, { color: colors.text }]}>{displayName}</Text>

          {loadingProfile ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
          ) : profile?.created_at ? (
            <View style={[styles.profileMeta, { flexDirection: rowDirection }]}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={[styles.profileMetaText, { color: colors.textMuted }]}>
                {isRTL ? `عضو منذ ${formatDate(profile.created_at)}` : `Member since ${formatDate(profile.created_at)}`}
              </Text>
            </View>
          ) : null}
        </FadeInView>

        {/* Media Section */}
        <FadeInView delay={80} style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: rowDirection }]}>
            <ImageIcon size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isRTL ? "الصور المشتركة" : "Shared Media"}
            </Text>
          </View>

          {loadingMedia ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : media.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isRTL ? "لا توجد صور مشتركة" : "No shared media"}
            </Text>
          ) : (
            <View style={styles.mediaGrid}>
              {media.map((item, index) => (
                <Pressable key={item.path || index} style={styles.mediaCell}>
                  <Image
                    source={{ uri: item.url }}
                    style={styles.mediaImage}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          )}
        </FadeInView>

        {/* Receipts Section */}
        <FadeInView delay={160} style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: rowDirection }]}>
            <FileText size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isRTL ? "الفواتير" : "Receipts"}
            </Text>
          </View>

          {loadingReceipts ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : receipts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isRTL ? "لا توجد فواتير" : "No receipts"}
            </Text>
          ) : (
            receipts.map((receipt, index) => (
              <Pressable
                key={receipt.id}
                onPress={() => openReceiptPdf(receipt.pdf_path)}
                style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: rowDirection }]}
              >
                <View style={[styles.receiptIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <FileText size={20} color={colors.primary} />
                </View>
                <View style={[styles.receiptInfo, { alignItems: getRTLStartAlign(isRTL) }]}>
                  <Text style={[styles.receiptDesc, { color: colors.text }]} numberOfLines={1}>
                    {receipt.description}
                  </Text>
                  <Text style={[styles.receiptAmount, { color: colors.primary }]}>
                    {receipt.amount} {receipt.currency}
                  </Text>
                  <View style={[styles.receiptMeta, { flexDirection: rowDirection }]}>
                    <View style={[styles.statusBadge, { backgroundColor: receiptStatusColor(receipt.status) + "20" }]}>
                      <Text style={[styles.statusText, { color: receiptStatusColor(receipt.status) }]}>
                        {receiptStatusLabel(receipt.status)}
                      </Text>
                    </View>
                    <Text style={[styles.receiptDate, { color: colors.textMuted }]}>
                      {formatDate(receipt.created_at)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </FadeInView>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },

  // Profile card
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileMeta: {
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  profileMetaText: {
    fontSize: 13,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },

  // Media grid
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaCell: {
    width: MEDIA_CELL_SIZE,
    height: MEDIA_CELL_SIZE,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },

  // Receipt cards
  receiptCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  receiptIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptInfo: {
    flex: 1,
    gap: 2,
  },
  receiptDesc: {
    fontSize: 15,
    fontWeight: "600",
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  receiptMeta: {
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  receiptDate: {
    fontSize: 12,
  },
});
