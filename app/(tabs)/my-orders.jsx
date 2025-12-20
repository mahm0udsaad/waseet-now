import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Briefcase,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/utils/theme/store';
import { useTranslation } from '@/utils/i18n/store';
import Animated, { FadeInDown } from 'react-native-reanimated';

const StatusBadge = ({ status, colors, isRTL }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return '#10B981'; // Emerald
      case 'in_progress': return '#3B82F6'; // Blue
      case 'pending': return '#F59E0B'; // Amber
      case 'cancelled': return '#EF4444'; // Red
      default: return colors.textMuted;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'completed': return isRTL ? 'مكتمل' : 'Completed';
      case 'in_progress': return isRTL ? 'جاري التنفيذ' : 'In Progress';
      case 'pending': return isRTL ? 'قيد الانتظار' : 'Pending';
      case 'cancelled': return isRTL ? 'ملغي' : 'Cancelled';
      default: return status;
    }
  };

  const color = getStatusColor();

  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color: color }]}>{getStatusLabel()}</Text>
    </View>
  );
};

const OrderIcon = ({ type, colors }) => {
    let Icon = FileText;
    let color = colors.primary;

    if (type === 'taqib') {
        Icon = Briefcase;
        color = '#4F46E5';
    } else if (type === 'tanazul') {
        Icon = FileText;
        color = '#059669';
    } else if (type === 'dhamen') {
        Icon = Shield;
        color = '#D97706';
    }

    return (
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Icon size={24} color={color} />
        </View>
    );
};

export default function MyOrdersScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('all');

  // Mock Data with bilingual support
  const mockOrders = [
    {
      id: 'ORD-7829',
      title: isRTL ? 'تجديد جواز سفر' : 'Passport Renewal Service',
      type: 'taqib',
      status: 'in_progress',
      date: '2023-11-15',
      amount: '350 SAR',
      provider: isRTL ? 'مكتب الريادة' : 'Al-Riyada Office',
    },
    {
      id: 'ORD-7750',
      title: isRTL ? 'تحديث السجل التجاري' : 'Commercial Registration Update',
      type: 'taqib',
      status: 'completed',
      date: '2023-11-10',
      amount: '500 SAR',
      provider: isRTL ? 'مكتب الإنجاز السريع' : 'Quick Fix Office',
    },
    {
      id: 'ORD-7611',
      title: isRTL ? 'نقل كفالة (تنازل)' : 'Worker Transfer (Tanazul)',
      type: 'tanazul',
      status: 'pending',
      date: '2023-11-05',
      amount: '2500 SAR',
      provider: isRTL ? 'قيد التعيين' : 'Pending Assignment',
    },
    {
      id: 'ORD-7540',
      title: isRTL ? 'اعتراض على مخالفة مرورية' : 'Traffic Violation Objection',
      type: 'dhamen',
      status: 'cancelled',
      date: '2023-10-28',
      amount: '150 SAR',
      provider: isRTL ? 'خدمات أحمد' : 'Ahmed Services',
    },
  ];

  const filters = [
    { id: 'all', label: isRTL ? 'الكل' : 'All' },
    { id: 'in_progress', label: isRTL ? 'جاري التنفيذ' : 'In Progress' },
    { id: 'completed', label: isRTL ? 'مكتمل' : 'Completed' },
    { id: 'cancelled', label: isRTL ? 'ملغي' : 'Cancelled' },
  ];

  const filteredOrders = activeFilter === 'all' 
    ? mockOrders 
    : mockOrders.filter(o => o.status === activeFilter);

  const renderOrder = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <Pressable
        style={({ pressed }) => [
          styles.orderCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.orderId, { color: colors.textMuted }]}>{item.id}</Text>
                <View style={[styles.dot, { backgroundColor: colors.border }]} />
                <Text style={[styles.orderDate, { color: colors.textMuted }]}>{item.date}</Text>
            </View>
            <StatusBadge status={item.status} colors={colors} isRTL={isRTL} />
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        <View style={[styles.cardBody, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <OrderIcon type={item.type} colors={colors} />
            <View style={[styles.cardContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
                <Text style={[styles.providerName, { color: colors.textSecondary }]}>{item.provider}</Text>
                <Text style={[styles.amount, { color: colors.primary }]}>{item.amount}</Text>
            </View>
             <View style={styles.arrowContainer}>
                {isRTL ? (
                   <ChevronLeft size={20} color={colors.textMuted} />
                ) : (
                   <ChevronRight size={20} color={colors.textMuted} />
                )}
            </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {isRTL ? 'طلباتي' : 'My Orders'}
        </Text>
        
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filtersContainer, { paddingLeft: 20, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
            {filters.map((filter) => (
                <Pressable
                    key={filter.id}
                    onPress={() => setActiveFilter(filter.id)}
                    style={[
                        styles.filterChip,
                        { 
                            backgroundColor: activeFilter === filter.id ? colors.primary : colors.surface,
                            borderColor: colors.border,
                            marginRight: isRTL ? 0 : 10,
                            marginLeft: isRTL ? 10 : 0,
                        }
                    ]}
                >
                    <Text style={[
                        styles.filterText,
                        { color: activeFilter === filter.id ? '#fff' : colors.text }
                    ]}>
                        {filter.label}
                    </Text>
                </Pressable>
            ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filtersContainer: {
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Courier', // Monospace look
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  orderDate: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  cardBody: {
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  providerName: {
    fontSize: 13,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  arrowContainer: {
    padding: 4,
  }
});
