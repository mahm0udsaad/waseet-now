import { supabase } from "./client";

export const HOME_SLIDER_GRADIENT_PALETTES = {
  amber_burst: ["rgba(245, 158, 11, 0.95)", "rgba(217, 119, 6, 0.85)"],
  emerald_flow: ["rgba(16, 185, 129, 0.95)", "rgba(5, 150, 105, 0.85)"],
  violet_rush: ["rgba(139, 92, 246, 0.95)", "rgba(124, 58, 237, 0.85)"],
  ocean_wave: ["rgba(59, 130, 246, 0.95)", "rgba(37, 99, 235, 0.85)"],
  rose_glow: ["rgba(244, 63, 94, 0.95)", "rgba(225, 29, 72, 0.85)"],
  slate_night: ["rgba(71, 85, 105, 0.95)", "rgba(30, 41, 59, 0.85)"],
};

export const DEFAULT_HOME_SLIDERS = [
  {
    id: "default-1",
    sort_order: 1,
    badge_en: "Your Partner",
    badge_ar: "شريكك في إنهاء الإجراءات",
    title_en: "Financial Security for Every Deal",
    title_ar: "أمان مالي لكل اتفاق",
    subtitle_en: "Your integrated services platform",
    subtitle_ar: "منصة خدماتك المتكاملة",
    gradient_palette: "ocean_wave",
    icon_name: "trending_up",
    background_image_url: null,
  },
  {
    id: "default-2",
    sort_order: 2,
    badge_en: "Don't Risk It",
    badge_ar: "لا تخاطر… استخدم الضامن",
    title_en: "Get Your Rights Without Worry",
    title_ar: "استلم حقك بدون قلق",
    subtitle_en: "Your money is safe… and your deal is guaranteed 🔒",
    subtitle_ar: "فلوسك بأمان… ومعاملتك مضمونة 🔒",
    gradient_palette: "emerald_flow",
    icon_name: "check_circle",
    background_image_url: null,
  },
  {
    id: "default-3",
    sort_order: 3,
    badge_en: "Smart & Fast",
    badge_ar: "تعقيب ذكي وسريع",
    title_en: "Manage Your Transactions Professionally",
    title_ar: "إدارة معاملاتك باحتراف",
    subtitle_en: "Expertise in completing transactions",
    subtitle_ar: "خبرة في إنجاز المعاملات",
    gradient_palette: "violet_rush",
    icon_name: "zap",
    background_image_url: null,
  },
  {
    id: "default-4",
    sort_order: 4,
    badge_en: "One Tap Away",
    badge_ar: "معاملتك بضغطة زر",
    title_en: "Your Trusted Financial Intermediary",
    title_ar: "وسيطك المالي الموثوق",
    subtitle_en: "Deal with confidence… and pay with peace of mind",
    subtitle_ar: "تعامل بثقة… وادفع باطمئنان",
    gradient_palette: "amber_burst",
    icon_name: "shield",
    background_image_url: null,
  },
];

function normalizeRow(row) {
  return {
    ...row,
    gradient_palette: HOME_SLIDER_GRADIENT_PALETTES[row.gradient_palette]
      ? row.gradient_palette
      : "ocean_wave",
  };
}

export async function getHomeSliders() {
  const { data, error } = await supabase
    .from("home_sliders")
    .select(
      "id, sort_order, badge_en, badge_ar, title_en, title_ar, subtitle_en, subtitle_ar, gradient_palette, icon_name, background_image_url"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to fetch home sliders");
  }

  if (!data?.length) {
    return DEFAULT_HOME_SLIDERS;
  }

  return data.map(normalizeRow);
}
