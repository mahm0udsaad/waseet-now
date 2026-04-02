import React, { memo } from "react";
import { Text, StyleSheet } from "react-native";
import { NativePressable } from "@/components/native/NativePressable";
import { NativeIcon } from "@/components/native/NativeIcon";

const ProfessionCard = memo(({ 
  profession, 
  isSelected, 
  onPress, 
  colors, 
  isRTL 
}) => {
  // Support both icon component (legacy) and iconName (new)
  const iconName = profession.iconName || 'user';
  
  return (
    <NativePressable
      onPress={onPress}
      haptic="tap"
      scaleOnPress={0.95}
      style={[
        styles.professionCard,
        {
          backgroundColor: isSelected ? colors.primary : colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
    >
      <NativeIcon
        name={iconName}
        size={26}
        color={isSelected ? "#fff" : colors.textSecondary}
      />
      <Text
        style={[
          styles.professionText,
          { color: isSelected ? "#fff" : colors.text },
        ]}
      >
        {isRTL ? profession.ar : profession.en}
      </Text>
    </NativePressable>
  );
});

ProfessionCard.displayName = "ProfessionCard";

const NationalityItem = memo(({ 
  item, 
  onPress, 
  colors, 
  isRTL 
}) => (
  <NativePressable
    onPress={onPress}
    haptic="tap"
    scaleOnPress={1}
    opacityOnPress={0.5}
    style={[styles.modalItem, { borderBottomColor: colors.border }]}
  >
    <Text style={[styles.modalItemText, { color: colors.text, writingDirection: 'rtl' }]}>
      {isRTL ? item.ar : item.en}
    </Text>
  </NativePressable>
));

NationalityItem.displayName = "NationalityItem";

const styles = StyleSheet.create({
  professionCard: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 90,
  },
  professionText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 15,
  },
});

export { ProfessionCard, NationalityItem };
