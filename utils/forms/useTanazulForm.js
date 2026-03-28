import { useState, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { createAd } from "@/utils/supabase/ads";
import { calculateCommission, getCommissionDisplayText } from "@/constants/commissionConfig";

const PROFESSION_LABELS = {
  domestic_worker: {
    ar: "عامل منزلي",
    ar_female: "عاملة منزلية",
    ar_short: "عامل",
    ar_short_female: "عاملة",
    en: "Domestic Worker",
    en_female: "Domestic Worker",
    en_short: "Worker",
    en_short_female: "Worker",
  },
  nanny: {
    ar: "مربي منزلي",
    ar_female: "مربية منزلية",
    ar_short: "مربي",
    ar_short_female: "مربية",
    en: "Nanny",
    en_female: "Nanny",
    en_short: "Nanny",
    en_short_female: "Nanny",
  },
  cook: {
    ar: "طباخ منزلي",
    ar_female: "طباخة منزلية",
    ar_short: "طباخ",
    ar_short_female: "طباخة",
    en: "Cook",
    en_female: "Cook",
    en_short: "Cook",
    en_short_female: "Cook",
  },
  driver: {
    ar: "سائق منزلي",
    ar_female: "سائقة منزلية",
    ar_short: "سائق",
    ar_short_female: "سائقة",
    en: "Driver",
    en_female: "Driver",
    en_short: "Driver",
    en_short_female: "Driver",
  },
  nurse: {
    ar: "ممرض منزلي",
    ar_female: "ممرضة منزلية",
    ar_short: "ممرض",
    ar_short_female: "ممرضة",
    en: "Nurse",
    en_female: "Nurse",
    en_short: "Nurse",
    en_short_female: "Nurse",
  },
};

const INITIAL_FORM_DATA = {
  location: "",
  nationality: "",
  profession: "",
  gender: "",
  age: "",
  previousTransfers: "",
  contractDuration: "",
  transferAmount: "",
  description: "",
};

export const useTanazulForm = (isRTL) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [showNationalityModal, setShowNationalityModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const updateFormData = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setLoading(false);
    setStep(1);
    setPledgeAccepted(false);
    setShowNationalityModal(false);
    setShowCityModal(false);
    setNationalitySearch("");
    setCitySearch("");
    setFormData(INITIAL_FORM_DATA);
  }, []);

  // Calculate commission using the new system
  const transferAmount = parseFloat(formData.transferAmount) || 0;
  const commissionData = useMemo(() => {
    return calculateCommission("tanazul", transferAmount);
  }, [transferAmount]);
  
  const commission = commissionData.commission;
  const totalListingPrice = commissionData.total;
  const commissionDisplayText = useMemo(() => {
    return getCommissionDisplayText("tanazul", isRTL);
  }, [isRTL]);

  const validateStep1 = useCallback(() => {
    if (
      !formData.location ||
      !formData.nationality ||
      !formData.profession ||
      !formData.gender ||
      !formData.age ||
      !formData.previousTransfers ||
      !formData.contractDuration ||
      !formData.transferAmount
    ) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill all required fields"
      );
      return false;
    }
    return true;
  }, [formData, isRTL]);

  const handleNextStep = useCallback(() => {
    if (validateStep1()) {
      setStep(2);
    }
  }, [validateStep1]);

  const handlePreviousStep = useCallback(() => {
    setStep(1);
  }, []);

  const togglePledge = useCallback(() => {
    setPledgeAccepted((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!pledgeAccepted) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL ? "يرجى الموافقة على التعهد بدفع العمولة" : "Please accept the commission pledge"
      );
      return;
    }

    setLoading(true);

    try {
      const isFemale = formData.gender === "female";
      const labels = PROFESSION_LABELS[formData.profession];
      const professionLabelAr = labels
        ? (isFemale ? labels.ar_female : labels.ar)
        : formData.profession;
      const professionLabelArShort = labels
        ? (isFemale ? labels.ar_short_female : labels.ar_short)
        : formData.profession;
      const professionLabelEn = labels
        ? (isFemale ? labels.en_female : labels.en)
        : formData.profession;
      const professionLabelEnShort = labels
        ? (isFemale ? labels.en_short_female : labels.en_short)
        : formData.profession;

      const createdAd = await createAd({
        type: "tanazul",
        // Store a gendered, human-readable title (Arabic short) e.g. "طباخ" vs "طباخة"
        title: professionLabelArShort || (isRTL ? "تنازل" : "Tanazul"),
        description: formData.description,
        price: transferAmount || null,
        location: formData.location || null,
        metadata: {
          ...formData,
          commission,
          totalListingPrice,
          profession_label_ar: professionLabelAr,
          profession_label_ar_short: professionLabelArShort,
          profession_label_en: professionLabelEn,
          profession_label_en_short: professionLabelEnShort,
        },
      });

      // Reset form so if user comes back it's clean
      resetForm();

      // Navigate to the created ad details
      router.replace({
        pathname: "/tanazul-details",
        params: { id: createdAd.id, fromCreate: "1" },
      });
    } catch (error) {
      const message = error?.message || (isRTL ? "تعذر حفظ الإعلان" : "Could not save ad");
      Alert.alert(isRTL ? "خطأ" : "Error", message);
    } finally {
      setLoading(false);
    }
  }, [pledgeAccepted, formData, transferAmount, commission, totalListingPrice, isRTL, router, resetForm]);

  const openNationalityModal = useCallback(() => {
    setShowNationalityModal(true);
  }, []);

  const closeNationalityModal = useCallback(() => {
    setShowNationalityModal(false);
    setNationalitySearch("");
  }, []);

  const selectNationality = useCallback((nationality) => {
    updateFormData("nationality", nationality);
    closeNationalityModal();
  }, [updateFormData, closeNationalityModal]);

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
    // State
    loading,
    step,
    pledgeAccepted,
    showNationalityModal,
    showCityModal,
    nationalitySearch,
    citySearch,
    formData,
    transferAmount,
    commission,
    totalListingPrice,
    commissionDisplayText,
    
    // Actions
    setStep,
    updateFormData,
    setNationalitySearch,
    setCitySearch,
    handleNextStep,
    handlePreviousStep,
    handleSubmit,
    togglePledge,
    openNationalityModal,
    closeNationalityModal,
    selectNationality,
    openCityModal,
    closeCityModal,
    selectCity,
    resetForm,
  };
};
