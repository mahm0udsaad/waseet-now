import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { getCommissionConfig } from "@/constants/commissionConfig";
import { getCountryName } from "@/utils/countries";

const INITIAL_FORM_DATA = {
  serviceOwnerMobile: "",
  serviceProviderMobile: "",
  serviceTypeOrDetails: "",
  servicePeriodStart: "",
  completionDays: "",
  value: "",
};

export const useDhamenForm = (isRTL, userPhone, serviceProviderCountry, serviceProviderLocalNumber) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ...INITIAL_FORM_DATA,
    serviceOwnerMobile: userPhone || "",
  });

  // Update if userPhone arrives asynchronously
  useEffect(() => {
    if (userPhone && !formData.serviceOwnerMobile) {
      setFormData(prev => ({ ...prev, serviceOwnerMobile: userPhone }));
    }
  }, [formData.serviceOwnerMobile, userPhone]);

  const updateFormData = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setLoading(false);
    setFormData(INITIAL_FORM_DATA);
  }, []);

  // Calculations
  const calculations = useMemo(() => {
    const daminConfig = getCommissionConfig().damin;
    const rate = daminConfig?.value ?? 10;
    const valueAmount = parseFloat(formData.value) || 0;
    const commission = valueAmount * (rate / 100);
    const total = valueAmount + commission;

    return {
      value: valueAmount,
      commission,
      tax: 0,
      total,
      commissionRate: rate,
    };
  }, [formData.value]);

  const validateForm = useCallback(() => {
    if (!formData.serviceOwnerMobile || !formData.serviceProviderMobile) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        isRTL ? "يرجى إدخال أرقام الجوال" : "Please enter mobile numbers"
      );
      return false;
    }

    if (serviceProviderCountry) {
      const isValidLength =
        serviceProviderLocalNumber.length >= serviceProviderCountry.minLength &&
        serviceProviderLocalNumber.length <= serviceProviderCountry.maxLength;

      if (!isValidLength) {
        Alert.alert(
          isRTL ? "خطأ" : "Error",
          isRTL
            ? `يرجى إدخال رقم جوال صحيح ل${getCountryName(serviceProviderCountry, isRTL)}`
            : `Please enter a valid phone number for ${getCountryName(serviceProviderCountry, isRTL)}`
        );
        return false;
      }
    }

    if (!formData.value) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        isRTL ? "يرجى إدخال القيمة" : "Please enter the value"
      );
      return false;
    }

    return true;
  }, [formData, isRTL, serviceProviderCountry, serviceProviderLocalNumber]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    // Additional validation before proceeding
    const valueAmount = parseFloat(formData.value);
    if (isNaN(valueAmount) || valueAmount <= 0) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        isRTL ? "يرجى إدخال قيمة صحيحة للخدمة" : "Please enter a valid service value"
      );
      return;
    }

    if (!formData.serviceTypeOrDetails || formData.serviceTypeOrDetails.trim().length < 10) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        isRTL ? "يرجى إدخال وصف تفصيلي للخدمة (10 أحرف على الأقل)" : "Please enter a detailed service description (at least 10 characters)"
      );
      return;
    }

    setLoading(true);

    try {
      // Prepare order data for Terms & Conditions screen with correct field names
      const orderData = {
        serviceOwnerMobile: formData.serviceOwnerMobile,
        serviceProviderMobile: formData.serviceProviderMobile,
        serviceTypeOrDetails: formData.serviceTypeOrDetails,
        servicePeriodStart: formData.servicePeriodStart,
        completionDays: formData.completionDays,
        serviceValue: valueAmount, // Use serviceValue instead of value
        value: valueAmount, // Keep for display
        commission: calculations.commission,
        tax: 0, // No tax
        total: calculations.total,
      };

      // Don't reset form yet - only after successful order creation
      // Navigate to Terms & Conditions screen (replace so back doesn't return to the form)
      router.replace({
        pathname: "/damin-terms",
        params: {
          orderData: JSON.stringify(orderData),
        },
      });
    } catch (error) {
      const message = error?.message || (isRTL ? "حدث خطأ أثناء المتابعة" : "Failed to proceed");
      Alert.alert(isRTL ? "خطأ" : "Error", message);
    } finally {
      setLoading(false);
    }
  }, [validateForm, formData, calculations, isRTL, router]);

  const isProviderPhoneValid = serviceProviderCountry
    ? serviceProviderLocalNumber.length >= serviceProviderCountry.minLength &&
      serviceProviderLocalNumber.length <= serviceProviderCountry.maxLength
    : Boolean(formData.serviceProviderMobile);

  const isFormValid =
    formData.serviceOwnerMobile &&
    formData.serviceProviderMobile &&
    formData.value &&
    isProviderPhoneValid;

  return {
    loading,
    formData,
    calculations,
    updateFormData,
    handleSubmit,
    resetForm,
    isFormValid,
  };
};
