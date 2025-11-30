import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";
import {
  Phone,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Send,
  Calculator,
  Percent,
  Wallet,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function CreateDhamenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  
  const [loading, setLoading] = useState(false);

  // Form state - only the required fields
  const [formData, setFormData] = useState({
    serviceOwnerMobile: "",
    serviceProviderMobile: "",
    serviceTypeOrDetails: "",
    servicePeriodStart: "",
    completionDays: "",
    value: "",
  });

  // Constants for calculations
  const commissionRate = 2.5; // 2.5%
  const vatRate = 15; // 15%

  // Animation values
  const buttonScale = useSharedValue(1);
  const paddingAnimation = useSharedValue(insets.bottom + 16);

  // Calculations
  const calculations = useMemo(() => {
    const valueAmount = parseFloat(formData.value) || 0;
    const commission = valueAmount * (commissionRate / 100);
    const tax = commission * (vatRate / 100);
    const total = valueAmount + commission + tax;
    
    return {
      value: valueAmount,
      commission,
      tax,
      total,
    };
  }, [formData.value]);

  const animateTo = (value) => {
    paddingAnimation.value = withTiming(value, { duration: 200 });
  };

  const handleInputFocus = () => {
    if (Platform.OS === "web") return;
    animateTo(16);
  };

  const handleInputBlur = () => {
    if (Platform.OS === "web") return;
    animateTo(insets.bottom + 16);
  };

  const handleSendRequest = async () => {
    // Validate required fields
    if (!formData.serviceOwnerMobile || !formData.serviceProviderMobile) {
      Alert.alert(
        t.common.error,
        isRTL ? "يرجى إدخال أرقام الجوال" : "Please enter mobile numbers"
      );
      return;
    }

    if (!formData.value) {
      Alert.alert(
        t.common.error,
        isRTL ? "يرجى إدخال القيمة" : "Please enter the value"
      );
      return;
    }

    setLoading(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    // Simulate request
    setTimeout(() => {
      setLoading(false);
      Alert.alert(t.dhamen.requestSent, t.dhamen.requestSentMessage, [
        { text: t.dhamen.ok, onPress: () => router.back() },
      ]);
    }, 1500);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: paddingAnimation.value,
  }));

  const updateFormData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const formatNumber = (num) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Input field component
  const InputField = ({ icon: Icon, label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }) => (
    <Animated.View entering={FadeInDown} style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
        {label}
      </Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.inputContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Icon size={18} color={colors.primary} />
          </View>
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
                minHeight: multiline ? 80 : undefined,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </View>
      </View>
    </Animated.View>
  );

  // Calculator card component
  const CalculatorCard = () => (
    <Animated.View
      entering={FadeInDown.delay(200)}
      style={[styles.calculatorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.calculatorHeader, { borderBottomColor: colors.border }]}>
        <Calculator size={20} color={colors.primary} />
        <Text style={[styles.calculatorTitle, { color: colors.text }]}>
          {isRTL ? "ملخص التكلفة" : "Cost Summary"}
        </Text>
      </View>

      <View style={styles.calculatorBody}>
        {/* Value */}
        <View style={[styles.calculatorRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.calculatorLabel, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Wallet size={16} color={colors.textSecondary} />
            <Text style={[styles.calculatorLabelText, { color: colors.textSecondary }]}>
              {t.dhamen.value}
            </Text>
          </View>
          <Text style={[styles.calculatorValue, { color: colors.text }]}>
            {formatNumber(calculations.value)} {t.common.sar}
          </Text>
        </View>

        {/* Commission */}
        <View style={[styles.calculatorRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.calculatorLabel, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Percent size={16} color={colors.textSecondary} />
            <Text style={[styles.calculatorLabelText, { color: colors.textSecondary }]}>
              {t.dhamen.commission} ({commissionRate}%)
            </Text>
          </View>
          <Text style={[styles.calculatorValue, { color: colors.textSecondary }]}>
            {formatNumber(calculations.commission)} {t.common.sar}
          </Text>
        </View>

        {/* Tax */}
        <View style={[styles.calculatorRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.calculatorLabel, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <DollarSign size={16} color={colors.textSecondary} />
            <Text style={[styles.calculatorLabelText, { color: colors.textSecondary }]}>
              {t.dhamen.tax} ({vatRate}%)
            </Text>
          </View>
          <Text style={[styles.calculatorValue, { color: colors.textSecondary }]}>
            {formatNumber(calculations.tax)} {t.common.sar}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Total */}
        <View style={[styles.calculatorRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={[styles.totalLabel, { color: colors.primary }]}>
            {t.dhamen.total}
          </Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            {formatNumber(calculations.total)} {t.common.sar}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <Animated.View style={[containerAnimatedStyle, styles.mainContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(50)}
            style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
            >
              {isRTL ? (
                <ArrowRight size={22} color={colors.text} />
              ) : (
                <ArrowLeft size={22} color={colors.text} />
              )}
            </Pressable>

            <Text style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
              {t.dhamen.title}
            </Text>

            <View style={styles.headerSpacer} />
          </Animated.View>

          {/* Form */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Service Owner Mobile */}
            <InputField
              icon={Phone}
              label={t.dhamen.serviceOwnerMobile}
              value={formData.serviceOwnerMobile}
              onChangeText={(text) => updateFormData("serviceOwnerMobile", text)}
              placeholder={t.dhamen.enterMobile}
              keyboardType="phone-pad"
            />

            {/* Service Provider Mobile */}
            <InputField
              icon={Phone}
              label={t.dhamen.serviceProviderMobile}
              value={formData.serviceProviderMobile}
              onChangeText={(text) => updateFormData("serviceProviderMobile", text)}
              placeholder={t.dhamen.enterMobile}
              keyboardType="phone-pad"
            />

            {/* Service Type or Details */}
            <InputField
              icon={FileText}
              label={t.dhamen.serviceTypeOrDetails}
              value={formData.serviceTypeOrDetails}
              onChangeText={(text) => updateFormData("serviceTypeOrDetails", text)}
              placeholder={t.dhamen.enterDetails}
              multiline
            />

            {/* Service Period Start */}
            <InputField
              icon={Calendar}
              label={t.dhamen.servicePeriodStart}
              value={formData.servicePeriodStart}
              onChangeText={(text) => updateFormData("servicePeriodStart", text)}
              placeholder={t.dhamen.selectDate}
            />

            {/* Completion Days */}
            <InputField
              icon={Clock}
              label={t.dhamen.completionDays}
              value={formData.completionDays}
              onChangeText={(text) => updateFormData("completionDays", text)}
              placeholder={t.dhamen.enterDays}
              keyboardType="numeric"
            />

            {/* Value */}
            <InputField
              icon={DollarSign}
              label={t.dhamen.value}
              value={formData.value}
              onChangeText={(text) => updateFormData("value", text)}
              placeholder={t.dhamen.enterAmount}
              keyboardType="numeric"
            />

            {/* Calculator Card - Only show when value is entered */}
            {formData.value ? <CalculatorCard /> : null}

            {/* Spacer for button */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Send Button */}
          <Animated.View style={[buttonAnimatedStyle, styles.buttonContainer]}>
            <Pressable
              onPress={handleSendRequest}
              disabled={loading}
              style={[
                styles.sendButton,
                {
                  backgroundColor: loading ? colors.textMuted : colors.primary,
                },
              ]}
            >
              <Send size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                {loading ? t.dhamen.sending : t.dhamen.sendRequest}
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingAnimatedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    paddingHorizontal: 16,
  },
  headerSpacer: {
    width: 44,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Input
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  inputContent: {
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  // Calculator
  calculatorCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  calculatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  calculatorBody: {
    padding: 16,
    gap: 14,
  },
  calculatorRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  calculatorLabel: {
    alignItems: "center",
    gap: 8,
  },
  calculatorLabelText: {
    fontSize: 14,
  },
  calculatorValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
  },

  // Button
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#D83A3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});
