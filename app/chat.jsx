import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Paperclip,
  Image as ImageIcon,
  MapPin,
  Receipt,
  FolderOpen,
  X,
  Camera,
  FileText,
  File,
  Plus,
  Check,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

// Mock messages for demo
const mockMessages = [
  { id: "1", text: "مرحباً، كيف يمكنني مساعدتك؟", sender: "other", timestamp: new Date() },
  { id: "2", text: "أريد الاستفسار عن خدمة الضمان", sender: "me", timestamp: new Date() },
];

// Mock media library
const mockMedia = [
  { id: "m1", type: "image", uri: "https://picsum.photos/200/200?random=1" },
  { id: "m2", type: "image", uri: "https://picsum.photos/200/200?random=2" },
  { id: "m3", type: "image", uri: "https://picsum.photos/200/200?random=3" },
  { id: "m4", type: "image", uri: "https://picsum.photos/200/200?random=4" },
  { id: "m5", type: "file", name: "document.pdf" },
  { id: "m6", type: "image", uri: "https://picsum.photos/200/200?random=5" },
];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  const [messages, setMessages] = useState(mockMessages);
  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState([]);

  const receiptBottomSheetRef = useRef(null);
  const libraryBottomSheetRef = useRef(null);
  const attachmentBottomSheetRef = useRef(null);
  const flatListRef = useRef(null);

  const sendButtonScale = useSharedValue(1);

  // Receipt form state
  const [receiptData, setReceiptData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Bottom sheet callbacks
  const openReceiptSheet = useCallback(() => {
    Keyboard.dismiss();
    receiptBottomSheetRef.current?.expand();
  }, []);

  const openLibrarySheet = useCallback(() => {
    Keyboard.dismiss();
    libraryBottomSheetRef.current?.expand();
  }, []);

  const openAttachmentSheet = useCallback(() => {
    Keyboard.dismiss();
    attachmentBottomSheetRef.current?.expand();
  }, []);

  const closeAllSheets = useCallback(() => {
    receiptBottomSheetRef.current?.close();
    libraryBottomSheetRef.current?.close();
    attachmentBottomSheetRef.current?.close();
  }, []);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.common.error, "Permission to access gallery was denied");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newAttachments = result.assets.map((asset, index) => ({
        id: `img-${Date.now()}-${index}`,
        type: "image",
        uri: asset.uri,
      }));
      setAttachments([...attachments, ...newAttachments]);
    }
    attachmentBottomSheetRef.current?.close();
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.common.error, "Permission to access camera was denied");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachments([
        ...attachments,
        { id: `img-${Date.now()}`, type: "image", uri: result.assets[0].uri },
      ]);
    }
    attachmentBottomSheetRef.current?.close();
  };

  // Pick document
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
      });

      if (!result.canceled) {
        const newAttachments = result.assets.map((asset, index) => ({
          id: `file-${Date.now()}-${index}`,
          type: "file",
          uri: asset.uri,
          name: asset.name,
        }));
        setAttachments([...attachments, ...newAttachments]);
      }
    } catch (error) {
      console.log("Document picker error:", error);
    }
    attachmentBottomSheetRef.current?.close();
  };

  // Share location
  const shareLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.common.error, "Permission to access location was denied");
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      setAttachments([
        ...attachments,
        {
          id: `loc-${Date.now()}`,
          type: "location",
          latitude,
          longitude,
        },
      ]);
    } catch (error) {
      Alert.alert(t.common.error, "Could not get location");
    }
    attachmentBottomSheetRef.current?.close();
  };

  // Add media from library
  const addMediaFromLibrary = (media) => {
    setAttachments([...attachments, { ...media, id: `lib-${Date.now()}` }]);
    libraryBottomSheetRef.current?.close();
  };

  // Remove attachment
  const removeAttachment = (id) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  // Send message
  const sendMessage = () => {
    if (!inputText.trim() && attachments.length === 0) return;

    sendButtonScale.value = withSpring(0.9, {}, () => {
      sendButtonScale.value = withSpring(1);
    });

    const newMessage = {
      id: `msg-${Date.now()}`,
      text: inputText.trim(),
      sender: "me",
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages([...messages, newMessage]);
    setInputText("");
    setAttachments([]);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Create receipt
  const createReceipt = () => {
    if (!receiptData.description || !receiptData.amount) {
      Alert.alert(t.common.error, "Please fill in all fields");
      return;
    }

    const receiptMessage = {
      id: `msg-${Date.now()}`,
      text: `📄 ${t.chat.receipt}\n${receiptData.description}\n${receiptData.amount} ${t.common.sar}\n${receiptData.date}`,
      sender: "me",
      timestamp: new Date(),
      isReceipt: true,
    };

    setMessages([...messages, receiptMessage]);
    setReceiptData({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
    receiptBottomSheetRef.current?.close();
  };

  // Animated styles
  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  // Render message
  const renderMessage = ({ item, index }) => {
    const isMe = item.sender === "me";
    
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={[
          styles.messageBubble,
          {
            alignSelf: isMe ? (isRTL ? "flex-start" : "flex-end") : (isRTL ? "flex-end" : "flex-start"),
            backgroundColor: isMe ? colors.primary : colors.surface,
            borderBottomRightRadius: isMe && !isRTL ? 4 : 18,
            borderBottomLeftRadius: isMe && isRTL ? 4 : (!isMe && !isRTL ? 4 : 18),
          },
        ]}
      >
        {item.attachments?.map((attachment) => (
          <View key={attachment.id} style={styles.attachmentInMessage}>
            {attachment.type === "image" && (
              <Image
                source={{ uri: attachment.uri }}
                style={styles.messageImage}
                contentFit="cover"
              />
            )}
            {attachment.type === "location" && (
              <View style={[styles.locationBadge, { backgroundColor: colors.primaryLight }]}>
                <MapPin size={16} color={colors.primary} />
                <Text style={[styles.locationText, { color: colors.primary }]}>
                  📍 {attachment.latitude.toFixed(4)}, {attachment.longitude.toFixed(4)}
                </Text>
              </View>
            )}
            {attachment.type === "file" && (
              <View style={[styles.fileBadge, { backgroundColor: colors.surfaceSecondary }]}>
                <FileText size={16} color={colors.text} />
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                  {attachment.name}
                </Text>
              </View>
            )}
          </View>
        ))}
        {item.text ? (
          <Text
            style={[
              styles.messageText,
              {
                color: isMe ? "#fff" : colors.text,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          >
            {item.text}
          </Text>
        ) : null}
      </Animated.View>
    );
  };

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        {/* Header */}
        <Animated.View
          entering={FadeIn}
          style={[
            styles.header,
            {
              paddingTop: insets.top + 10,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
          >
            {isRTL ? (
              <ArrowRight size={22} color={colors.text} />
            ) : (
              <ArrowLeft size={22} color={colors.text} />
            )}
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.chat.title}</Text>

          <View style={styles.headerActions}>
            {/* Receipt Button */}
            <Pressable
              onPress={openReceiptSheet}
              style={[styles.headerActionButton, { backgroundColor: colors.primaryLight }]}
            >
              <Receipt size={18} color={colors.primary} />
              <Text style={[styles.headerActionText, { color: colors.primary }]}>
                {t.chat.receipt}
              </Text>
            </Pressable>

            {/* Library Button */}
            <Pressable
              onPress={openLibrarySheet}
              style={[styles.headerActionButton, { backgroundColor: colors.surface }]}
            >
              <FolderOpen size={18} color={colors.text} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesList, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <Animated.View
            entering={FadeInUp}
            style={[styles.attachmentsPreview, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
          >
            <FlatList
              data={attachments}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.attachmentPreviewItem}>
                  {item.type === "image" && (
                    <Image source={{ uri: item.uri }} style={styles.attachmentPreviewImage} />
                  )}
                  {item.type === "location" && (
                    <View style={[styles.attachmentPreviewIcon, { backgroundColor: colors.primaryLight }]}>
                      <MapPin size={20} color={colors.primary} />
                    </View>
                  )}
                  {item.type === "file" && (
                    <View style={[styles.attachmentPreviewIcon, { backgroundColor: colors.surfaceSecondary }]}>
                      <File size={20} color={colors.text} />
                    </View>
                  )}
                  <Pressable
                    onPress={() => removeAttachment(item.id)}
                    style={[styles.removeAttachment, { backgroundColor: colors.error }]}
                  >
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              )}
            />
          </Animated.View>
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: insets.bottom + 10,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          {/* Attachment Button */}
          <Pressable
            onPress={openAttachmentSheet}
            style={[styles.attachButton, { backgroundColor: colors.surface }]}
          >
            <Plus size={22} color={colors.primary} />
          </Pressable>

          {/* Text Input */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface }]}>
            <TextInput
              style={[
                styles.textInput,
                { color: colors.text, textAlign: isRTL ? "right" : "left" },
              ]}
              placeholder={t.chat.typeMessage}
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
          </View>

          {/* Send Button */}
          <Animated.View style={sendButtonStyle}>
            <Pressable
              onPress={sendMessage}
              disabled={!inputText.trim() && attachments.length === 0}
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    inputText.trim() || attachments.length > 0
                      ? colors.primary
                      : colors.textMuted,
                },
              ]}
            >
              <Send size={20} color="#fff" />
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingAnimatedView>

      {/* Receipt Bottom Sheet */}
      <BottomSheet
        ref={receiptBottomSheetRef}
        index={-1}
        snapPoints={["55%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {t.chat.createReceipt}
          </Text>

          <View style={styles.receiptForm}>
            <View style={[styles.receiptInput, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.receiptTextInput, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}
                placeholder={isRTL ? "الوصف" : "Description"}
                placeholderTextColor={colors.textMuted}
                value={receiptData.description}
                onChangeText={(text) => setReceiptData({ ...receiptData, description: text })}
              />
            </View>

            <View style={[styles.receiptInput, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.receiptTextInput, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}
                placeholder={isRTL ? "المبلغ" : "Amount"}
                placeholderTextColor={colors.textMuted}
                value={receiptData.amount}
                onChangeText={(text) => setReceiptData({ ...receiptData, amount: text })}
                keyboardType="numeric"
              />
              <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>{t.common.sar}</Text>
            </View>

            <Pressable
              onPress={createReceipt}
              style={[styles.createReceiptButton, { backgroundColor: colors.primary }]}
            >
              <Check size={20} color="#fff" />
              <Text style={styles.createReceiptText}>{t.chat.createReceipt}</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>

      {/* Library Bottom Sheet */}
      <BottomSheet
        ref={libraryBottomSheetRef}
        index={-1}
        snapPoints={["50%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {t.chat.previousMedia}
          </Text>

          {mockMedia.length > 0 ? (
            <View style={styles.mediaGrid}>
              {mockMedia.map((media) => (
                <Pressable
                  key={media.id}
                  onPress={() => addMediaFromLibrary(media)}
                  style={[styles.mediaItem, { backgroundColor: colors.surface }]}
                >
                  {media.type === "image" ? (
                    <Image source={{ uri: media.uri }} style={styles.mediaImage} />
                  ) : (
                    <View style={styles.fileMediaItem}>
                      <FileText size={24} color={colors.textSecondary} />
                      <Text style={[styles.mediaFileName, { color: colors.text }]} numberOfLines={1}>
                        {media.name}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.noMediaText, { color: colors.textMuted }]}>{t.chat.noMedia}</Text>
          )}
        </BottomSheetView>
      </BottomSheet>

      {/* Attachment Options Bottom Sheet */}
      <BottomSheet
        ref={attachmentBottomSheetRef}
        index={-1}
        snapPoints={["35%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.attachmentOptions}>
            <Pressable onPress={pickImage} style={styles.attachmentOption}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.primaryLight }]}>
                <ImageIcon size={24} color={colors.primary} />
              </View>
              <Text style={[styles.attachmentOptionText, { color: colors.text }]}>
                {t.chat.attachImage}
              </Text>
            </Pressable>

            <Pressable onPress={takePhoto} style={styles.attachmentOption}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Camera size={24} color={colors.text} />
              </View>
              <Text style={[styles.attachmentOptionText, { color: colors.text }]}>
                {isRTL ? "التقاط صورة" : "Take Photo"}
              </Text>
            </Pressable>

            <Pressable onPress={pickDocument} style={styles.attachmentOption}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <FileText size={24} color={colors.text} />
              </View>
              <Text style={[styles.attachmentOptionText, { color: colors.text }]}>
                {t.chat.attachFile}
              </Text>
            </Pressable>

            <Pressable onPress={shareLocation} style={styles.attachmentOption}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.primaryLight }]}>
                <MapPin size={24} color={colors.primary} />
              </View>
              <Text style={[styles.attachmentOptionText, { color: colors.text }]}>
                {t.chat.shareLocation}
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  attachmentInMessage: {
    marginBottom: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  locationText: {
    fontSize: 12,
  },
  fileBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  fileName: {
    fontSize: 13,
    maxWidth: 150,
  },

  // Attachments Preview
  attachmentsPreview: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  attachmentPreviewItem: {
    position: "relative",
    marginRight: 10,
  },
  attachmentPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  attachmentPreviewIcon: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  removeAttachment: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Input Area
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  attachButton: {
    padding: 10,
    borderRadius: 12,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    maxHeight: 80,
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
  },

  // Bottom Sheet
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },

  // Receipt Form
  receiptForm: {
    gap: 16,
  },
  receiptInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  receiptTextInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  createReceiptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  createReceiptText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Media Grid
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  fileMediaItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  mediaFileName: {
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
  noMediaText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },

  // Attachment Options
  attachmentOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingTop: 10,
  },
  attachmentOption: {
    alignItems: "center",
    width: "25%",
    marginBottom: 20,
  },
  attachmentOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  attachmentOptionText: {
    fontSize: 12,
    textAlign: "center",
  },
});

