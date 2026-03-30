import { usePaymentFlowStore } from "@/utils/payments/paymentFlowStore";
import { useTranslation, getRTLRowDirection, getRTLTextAlign } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { KeyboardDoneButton } from "@/components/forms/KeyboardAwareInput";
import { Building2, Camera, CheckCircle2, ChevronDown, ChevronUp, Copy, CreditCard, ImageIcon, Trash2, X } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    UIManager,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PHONE_INPUT_ACCESSORY_ID = "payment-phone-input-accessory";

export default function PaymentModal({ onClose }) {
  const { isRTL } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rowDirection = getRTLRowDirection(isRTL);
  const amount = usePaymentFlowStore((state) => state.amount);
  const initialPhone = usePaymentFlowStore((state) => state.initialPhone);
  const onPaymentSubmitted = usePaymentFlowStore((state) => state.onPaymentSubmitted);
  const onCardPayment = usePaymentFlowStore((state) => state.onCardPayment);
  const resetPaymentFlow = usePaymentFlowStore((state) => state.resetPaymentFlow);
  const [expandedBankTransfer, setExpandedBankTransfer] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || '');
  const [phoneError, setPhoneError] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [bankTransferSubmitting, setBankTransferSubmitting] = useState(false);
  const scrollViewRef = useRef(null);
  const isBusy = bankTransferSubmitting;

  useEffect(() => {
    setPhoneNumber(initialPhone || '');
    setPhoneError(false);
    setReceiptImage(null);
    setExpandedBankTransfer(false);
    setBankTransferSubmitting(false);
  }, [initialPhone]);

  useEffect(() => {
    if (!expandedBankTransfer) {
      return;
    }

    const scrollIntoView = () => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    };

    // Wait for LayoutAnimation to finish before scrolling
    const timer = setTimeout(scrollIntoView, 350);

    return () => clearTimeout(timer);
  }, [expandedBankTransfer]);

  const handleClose = () => {
    if (isBusy) return; // Don't allow close during payment creation/submission
    setExpandedBankTransfer(false);
    setPhoneError(false);
    setReceiptImage(null);
    setBankTransferSubmitting(false);
    resetPaymentFlow();
    onClose();
  };

  const handleCardAction = async (paymentMethod) => {
    if (!onCardPayment || isBusy) return;
    const cardPaymentFn = onCardPayment;
    // Close modal without resetting store — the callback needs store state intact
    onClose();
    setTimeout(() => {
      cardPaymentFn(paymentMethod);
    }, 300);
  };

  const pickReceiptImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(isRTL ? "خطأ" : "Error", isRTL ? "لم يتم منح صلاحية الوصول للمعرض" : "Gallery permission denied");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptImage(result.assets[0]);
    }
  };

  const takeReceiptPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(isRTL ? "خطأ" : "Error", isRTL ? "لم يتم منح صلاحية الكاميرا" : "Camera permission denied");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setReceiptImage(result.assets[0]);
    }
  };

  const toggleBankTransfer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedBankTransfer(!expandedBankTransfer);
  };

  const submitBankTransfer = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setPhoneError(true);
      return;
    }

    if (!onPaymentSubmitted || bankTransferSubmitting) {
      return;
    }

    setBankTransferSubmitting(true);
    try {
      const result = await onPaymentSubmitted({
        phoneNumber: cleanPhone,
        paymentMethod: 'bank_transfer',
        receiptUri: receiptImage?.uri || null,
      });

      if (result !== false) {
        handleClose();
      }
    } finally {
      setBankTransferSubmitting(false);
    }
  };

  const handleCopy = (text, fieldName) => {
    Clipboard.setStringAsync(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, fieldName, small = false }) => {
    const isCopied = copiedField === fieldName;
    
    return (
      <Pressable
        onPress={() => handleCopy(text, fieldName)}
        style={[
          styles.copyButton,
          small && styles.copyButtonSmall,
          { backgroundColor: isCopied ? colors.success + '20' : colors.surfaceSecondary }
        ]}
      >
        {isCopied ? (
          <CheckCircle2 size={small ? 16 : 18} color={colors.success} />
        ) : (
          <Copy size={small ? 16 : 18} color={colors.textSecondary} />
        )}
      </Pressable>
    );
  };

  return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: insets.bottom + 24 }}
          contentInsetAdjustmentBehavior="always"
          automaticallyAdjustKeyboardInsets
          bounces
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {/* Amount Card */}
          <View style={[styles.amountCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? "المبلغ الإجمالي" : "Total Amount"}
            </Text>
            <Text style={[styles.amountValue, { color: colors.primary, textAlign: getRTLTextAlign(isRTL) }]}>
              {amount.toLocaleString()} {isRTL ? "ر.س" : "SAR"}
            </Text>
          </View>

          {/*
          Apple Pay is intentionally hidden for now.
          <Pressable
            onPress={() => {
              if (isBusy) return;
              if (onCardPayment) {
                handleCardAction('apple_pay');
              } else {
                Alert.alert(
                  "Apple Pay",
                  isRTL ? "ميزة Apple Pay غير متاحة حالياً" : "Apple Pay is not available"
                );
              }
            }}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.paymentOption,
              {
                backgroundColor: colors.surface,
                borderColor: onCardPayment ? '#000' : colors.border,
                opacity: pressed ? 0.7 : 1,
                flexDirection: rowDirection,
              }
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#000', marginRight: 0, marginLeft: 0 }]}>
              <Smartphone size={24} color="#fff" />
            </View>
            <View style={[styles.optionContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.optionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                Apple Pay
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? "دفع فوري وآمن بلمسة واحدة" : "Instant & secure payment"}
              </Text>
            </View>
          </Pressable>
          */}

          {/* Credit/Debit Card */}
          <Pressable
            testID="payment-card"
            onPress={() => {
              if (isBusy) return;
              if (onCardPayment) {
                handleCardAction('card');
              } else {
                Alert.alert(
                  isRTL ? "بطاقة ائتمان/خصم" : "Credit/Debit Card",
                  isRTL ? "ميزة بطاقة الائتمان قيد التطوير" : "Card payment integration coming soon"
                );
              }
            }}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.paymentOption,
              {
                backgroundColor: colors.surface,
                borderColor: onCardPayment ? colors.primary : colors.border,
                opacity: pressed ? 0.7 : 1,
                flexDirection: rowDirection,
              }
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20', marginRight: 0, marginLeft: 0 }]}>
              <CreditCard size={24} color={colors.primary} />
            </View>
            <View style={[styles.optionContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.optionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? "بطاقة ائتمان/خصم" : "Credit/Debit Card"}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                Visa • Mastercard • Mada
              </Text>
            </View>
            {onCardPayment ? (
              <View style={[styles.availableBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.availableText, { color: colors.success }]}>
                  {isRTL ? "متاح" : "Available"}
                </Text>
              </View>
            ) : (
              <View style={[styles.comingSoonBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.comingSoonText, { color: colors.warning }]}>
                  {isRTL ? "قريباً" : "Soon"}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Bank Transfer - Expandable */}
          <View>
            <Pressable
              testID="payment-bank-transfer"
              onPress={() => {
                if (isBusy) return;
                toggleBankTransfer();
              }}
              style={[
                styles.paymentOption,
                expandedBankTransfer && styles.activePaymentOption,
                {
                  backgroundColor: colors.surface,
                  borderColor: expandedBankTransfer ? colors.primary : colors.border,
                  flexDirection: rowDirection,
                }
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary, marginRight: 0, marginLeft: 0 }]}>
                <Building2 size={24} color="#fff" />
              </View>
              <View style={[styles.optionContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.optionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                  {isRTL ? "تحويل بنكي" : "Bank Transfer"}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                  {isRTL ? "يتم القبول خلال يوم عمل" : "Processed within 1 day"}
                </Text>
              </View>
              <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8 }}>
                <View style={[styles.availableBadge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.availableText, { color: colors.success }]}>
                    {isRTL ? "متاح" : "Available"}
                  </Text>
                </View>
                {expandedBankTransfer ? (
                  <ChevronUp size={20} color={colors.primary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </View>
            </Pressable>

            {/* Expanded Bank Transfer Details */}
            {expandedBankTransfer && (
              <View style={[styles.expandedContent, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                {/* Amount to Transfer */}
                <View style={[styles.amountTransferCard, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.amountTransferLabel, { color: 'rgba(255,255,255,0.8)', textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "المبلغ المطلوب تحويله" : "Amount to Transfer"}
                  </Text>
                  <View style={[styles.amountTransferRow, { flexDirection: rowDirection }]}>
                    <Text style={[styles.amountTransferValue, { color: '#fff', textAlign: getRTLTextAlign(isRTL) }]}>
                      {amount.toLocaleString()} {isRTL ? "ر.س" : "SAR"}
                    </Text>
                    <View style={[styles.copyButtonWhite, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Pressable onPress={() => handleCopy(amount.toString(), 'amount')}>
                        {copiedField === 'amount' ? (
                          <CheckCircle2 size={18} color="#fff" />
                        ) : (
                          <Copy size={18} color="#fff" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>

                <Text style={[styles.bankSectionTitle, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                  {isRTL ? "معلومات الحساب البنكي" : "Bank Account Information"}
                </Text>

                {/* Bank Details Cards */}
                <View style={[styles.detailCard, { backgroundColor: colors.surfaceSecondary }]}>
                  <View style={[styles.detailRow, { flexDirection: rowDirection }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "اسم البنك" : "Bank Name"}
                    </Text>
                    <CopyButton text="alrajhi bank" fieldName="bank" small />
                  </View>
                  <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "مصرف الراجحي" : "alrajhi bank"}
                  </Text>
                </View>

                <View style={[styles.detailCard, { backgroundColor: colors.surfaceSecondary }]}>
                  <View style={[styles.detailRow, { flexDirection: rowDirection }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "اسم الحساب" : "Account Name"}
                    </Text>
                    <CopyButton text="Waseet Alan Est." fieldName="account" small />
                  </View>
                  <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "مؤسسة وسيط الان" : "Waseet Alan Est."}
                  </Text>
                </View>

                <View style={[styles.detailCard, { backgroundColor: colors.surfaceSecondary }]}>
                  <View style={[styles.detailRow, { flexDirection: rowDirection }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "رقم الحساب الجاري" : "Account Number"}
                    </Text>
                    <CopyButton text="64600-001-0006087777004" fieldName="accountNumber" small />
                  </View>
                  <Text style={[styles.detailValue, { color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: getRTLTextAlign(isRTL) }]}>
                    64600-001-0006087777004
                  </Text>
                </View>

                <View style={[styles.detailCard, { backgroundColor: colors.surfaceSecondary }]}>
                  <View style={[styles.detailRow, { flexDirection: rowDirection }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      IBAN
                    </Text>
                    <CopyButton text="SA2380000646608017777004" fieldName="iban" small />
                  </View>
                  <Text style={[styles.detailValue, { color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: getRTLTextAlign(isRTL) }]}>
                    SA23 8000 0646 6080 1777 7004
                  </Text>
                </View>

                {/* Instructions */}
                <View style={[styles.instructionsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.instructionsTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "📋 التعليمات" : "📋 Instructions"}
                  </Text>
                  <View style={[styles.instructionItem, { flexDirection: rowDirection }]}>
                    <View style={[styles.instructionBullet, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.instructionText, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "قم بتحويل المبلغ المذكور أعلاه بالضبط" : "Transfer the exact amount shown above"}
                    </Text>
                  </View>
                  <View style={[styles.instructionItem, { flexDirection: rowDirection }]}>
                    <View style={[styles.instructionBullet, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.instructionText, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "اكتب رقم جوالك في خانة البيان عند التحويل" : "Write your phone number in the transfer narrative"}
                    </Text>
                  </View>
                  <View style={[styles.instructionItem, { flexDirection: rowDirection }]}>
                    <View style={[styles.instructionBullet, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.instructionText, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "قم بإرفاق إيصال التحويل البنكي" : "Attach your bank transfer receipt"}
                    </Text>
                  </View>
                  <View style={[styles.instructionItem, { flexDirection: rowDirection }]}>
                    <View style={[styles.instructionBullet, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.instructionText, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "سيتم تأكيد الدفع خلال يوم عمل واحد" : "Payment confirmed within 1 working day"}
                    </Text>
                  </View>
                </View>

                {/* Phone Number Input for Transfer Narrative */}
                {onPaymentSubmitted && (
                  <View style={styles.phoneInputSection}>
                    <Text style={[styles.phoneInputLabel, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "رقم الجوال المستخدم في التحويل" : "Phone Number Used in Transfer"}
                    </Text>
                    <Text style={[styles.phoneInputHint, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL
                        ? "أدخل رقم جوالك الذي استخدمته في خانة البيان عند التحويل لتسريع المعالجة"
                        : "Enter the phone number you wrote in the transfer narrative for faster processing"}
                    </Text>
                    <View style={[styles.phoneInputContainer, {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: phoneError ? (colors.error || '#EF4444') : colors.border,
                    }]}>
                      <TextInput
                        testID="payment-phone-input"
                        style={[styles.phoneInput, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}
                        placeholder={isRTL ? "05xxxxxxxx" : "05xxxxxxxx"}
                        placeholderTextColor={colors.textMuted}
                        value={phoneNumber}
                        onChangeText={(text) => { setPhoneNumber(text); setPhoneError(false); }}
                        keyboardType="phone-pad"
                        maxLength={15}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        inputAccessoryViewID={Platform.OS === "ios" ? PHONE_INPUT_ACCESSORY_ID : undefined}
                      />
                    </View>
                    {phoneError && (
                      <Text style={[styles.phoneErrorText, { color: colors.error || '#EF4444', textAlign: getRTLTextAlign(isRTL) }]}>
                        {isRTL ? "يرجى إدخال رقم الجوال" : "Please enter your phone number"}
                      </Text>
                    )}
                  </View>
                )}

                {/* Receipt Image Upload */}
                {onPaymentSubmitted && (
                  <View style={styles.receiptSection}>
                    <Text style={[styles.phoneInputLabel, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "إرفاق إيصال التحويل" : "Attach Transfer Receipt"}
                    </Text>
                    <Text style={[styles.phoneInputHint, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL
                        ? "قم بتصوير أو اختيار صورة إيصال التحويل البنكي لتسريع التحقق"
                        : "Take a photo or choose your bank transfer receipt for faster verification"}
                    </Text>

                    {receiptImage ? (
                      <View style={[styles.receiptPreview, { borderColor: colors.border }]}>
                        <Image source={{ uri: receiptImage.uri }} style={styles.receiptImage} resizeMode="cover" />
                          <Pressable
                            onPress={() => setReceiptImage(null)}
                            disabled={bankTransferSubmitting}
                            style={[styles.receiptRemoveButton, { backgroundColor: colors.error + 'E0' }]}
                          >
                          <Trash2 size={16} color="#fff" />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={[styles.receiptButtons, { flexDirection: getRTLRowDirection(isRTL) }]}>
                        <Pressable
                          onPress={takeReceiptPhoto}
                          disabled={bankTransferSubmitting}
                          style={[styles.receiptPickButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                        >
                          <Camera size={20} color={colors.primary} />
                          <Text style={[styles.receiptPickText, { color: colors.text }]}>
                            {isRTL ? "تصوير" : "Camera"}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={pickReceiptImage}
                          disabled={bankTransferSubmitting}
                          style={[styles.receiptPickButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                        >
                          <ImageIcon size={20} color={colors.primary} />
                          <Text style={[styles.receiptPickText, { color: colors.text }]}>
                            {isRTL ? "المعرض" : "Gallery"}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}

                {/* Submit Payment Order Button - only shown when callback provided */}
                {onPaymentSubmitted && (
                  <Pressable
                    testID="payment-submit-btn"
                    disabled={bankTransferSubmitting}
                    onPress={submitBankTransfer}
                    style={[
                      styles.transferButton,
                      { backgroundColor: colors.success, opacity: bankTransferSubmitting ? 0.8 : 1 }
                    ]}
                  >
                    {bankTransferSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CheckCircle2 size={20} color="#fff" />
                    )}
                    <Text style={styles.transferButtonText}>
                      {bankTransferSubmitting
                        ? (isRTL ? 'جاري إرسال الدفع...' : 'Submitting payment...')
                        : (isRTL ? 'إرسال طلب الدفع' : "Submit Payment Order")}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
        <KeyboardDoneButton
          inputAccessoryViewID={PHONE_INPUT_ACCESSORY_ID}
          colors={colors}
          isRTL={isRTL}
        />
      </View>
      </KeyboardAvoidingView>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Payment Method Screen
  amountCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  activePaymentOption: {
    borderWidth: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 14,
    fontWeight: "500",
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  availableBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  availableText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Expanded Bank Transfer Content
  expandedContent: {
    marginTop: -12,
    padding: 20,
    paddingTop: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 2,
    borderTopWidth: 0,
    marginBottom: 12,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  amountTransferCard: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  amountTransferLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountTransferRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountTransferValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  copyButtonWhite: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  bankSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  copyButtonSmall: {
    width: 28,
    height: 28,
  },
  mainCopyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 16,
    gap: 10,
  },
  mainCopyButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  instructionsCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  instructionBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    marginEnd: 10,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 16,
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  phoneInputSection: {
    marginTop: 16,
    marginBottom: 4,
  },
  phoneInputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  phoneInputHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  phoneInputContainer: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  phoneInput: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  phoneErrorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  receiptSection: {
    marginTop: 16,
  },
  receiptButtons: {
    gap: 10,
    marginTop: 8,
  },
  receiptPickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  receiptPickText: {
    fontSize: 14,
    fontWeight: '600',
  },
  receiptPreview: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 200,
  },
  receiptRemoveButton: {
    position: 'absolute',
    top: 8,
    end: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
