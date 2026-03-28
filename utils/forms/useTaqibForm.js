import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { createAd } from "@/utils/supabase/ads";

const INITIAL_FORM_DATA = {
  location: "",
  requestTitle: "",
  description: "",
};

export const useTaqibForm = (isRTL) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearch, setCitySearch] = useState("");

  const updateFormData = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setLoading(false);
    setFormData(INITIAL_FORM_DATA);
    setShowCityModal(false);
    setCitySearch("");
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.location || !formData.requestTitle || !formData.description) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill all required fields"
      );
      return false;
    }
    return true;
  }, [formData, isRTL]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const createdAd = await createAd({
        type: "taqib",
        title: formData.requestTitle || (isRTL ? "خدمات تعقيب" : "Taqib Services"),
        description: formData.description,
        location: formData.location || null,
        metadata: {},
      });

      // Reset form so if user comes back it's clean
      resetForm();

      // Navigate to the created ad details (replace so back doesn't return to the form)
      router.replace({
        pathname: "/taqib-ad-details",
        params: { id: createdAd.id },
      });
    } catch (error) {
      const message = error?.message || (isRTL ? "تعذر نشر الإعلان" : "Failed to publish post");
      Alert.alert(isRTL ? "خطأ" : "Error", message);
    } finally {
      setLoading(false);
    }
  }, [validateForm, formData, isRTL, router, resetForm]);

  const isFormValid = formData.location && formData.requestTitle && formData.description;

  const openCityModal = useCallback(() => {
    setShowCityModal(true);
  }, []);

  const closeCityModal = useCallback(() => {
    setShowCityModal(false);
    setCitySearch("");
  }, []);

  const selectCity = useCallback((city) => {
    updateFormData("location", city);
    closeCityModal();
  }, [updateFormData, closeCityModal]);

  return {
    loading,
    formData,
    showCityModal,
    citySearch,
    updateFormData,
    setCitySearch,
    handleSubmit,
    resetForm,
    isFormValid,
    openCityModal,
    closeCityModal,
    selectCity,
  };
};

