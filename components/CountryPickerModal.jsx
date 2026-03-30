import { getCountryName, searchCountries } from "@/utils/countries";
import { useTheme } from "@/utils/theme/store";
import { useTranslation, getRTLRowDirection, getRTLTextAlign } from "@/utils/i18n/store";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function CountryItem({ country, isSelected, onSelect, isRTL, colors }) {
  const name = getCountryName(country, isRTL);
  return (
    <Pressable
      onPress={() => onSelect(country)}
      style={({ pressed }) => [
        styles.countryItem,
        {
          backgroundColor: isSelected
            ? colors.primaryLight
            : pressed
            ? colors.surfaceSecondary
            : "transparent",
          flexDirection: getRTLRowDirection(isRTL),
        },
      ]}
    >
      <Text style={styles.flag}>{country.flag}</Text>
      <Text
        style={[
          styles.countryName,
          { color: colors.text, textAlign: getRTLTextAlign(isRTL) },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text style={[styles.dialCode, { color: colors.textSecondary }]}>
        {country.dialCode}
      </Text>
    </Pressable>
  );
}

export default function CountryPickerModal({ visible, onClose, onSelect, selectedCode }) {
  const { colors } = useTheme();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => searchCountries(query, isRTL), [query, isRTL]);

  const handleSelect = useCallback(
    (country) => {
      onSelect(country);
      setQuery("");
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  const keyExtractor = useCallback((item) => item.code, []);

  const renderItem = useCallback(
    ({ item }) => (
      <CountryItem
        country={item}
        isSelected={item.code === selectedCode}
        onSelect={handleSelect}
        isRTL={isRTL}
        colors={colors}
      />
    ),
    [selectedCode, handleSelect, isRTL, colors]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              flexDirection: getRTLRowDirection(isRTL),
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {isRTL ? "اختر الدولة" : "Select Country"}
          </Text>
          <Pressable
            onPress={handleClose}
            style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            hitSlop={8}
          >
            <X size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchWrapper,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              flexDirection: getRTLRowDirection(isRTL),
            },
          ]}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.text, textAlign: getRTLTextAlign(isRTL), writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
            placeholder={isRTL ? "ابحث عن دولة..." : "Search country..."}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          getItemLayout={(_, index) => ({
            length: 56,
            offset: 56 * index,
            index,
          })}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    height: 56,
  },
  flag: {
    fontSize: 22,
    width: 32,
    textAlign: "center",
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  dialCode: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 48,
    textAlign: "end",
  },
});
