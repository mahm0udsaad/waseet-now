import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Stack, useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, CheckCheck, ChevronRight, Search } from 'lucide-react-native';
import { useTheme } from '@/utils/theme/store';
import { useTranslation } from '@/utils/i18n/store';
import { fetchConversations, subscribeToConversationMembership } from '@/utils/supabase/chat';
import { supabase, getSupabaseUser } from '@/utils/supabase/client';
import { useChatUnreadStore } from '@/utils/chat/unreadStore';
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";

export default function ChatsListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const searchInputRef = useRef(null);
  const membershipUnsubRef = useRef(null);
  const messageChannelRef = useRef(null);
  const setTotalUnread = useChatUnreadStore((s) => s.setTotalUnread);
  const incrementChatUnread = useChatUnreadStore((s) => s.incrementUnread);
  const decrementChatUnread = useChatUnreadStore((s) => s.decrementUnread);

  // Reload conversations on focus, but skip if loaded recently (within 2s)
  const lastLoadRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current < 2000) return;
      lastLoadRef.current = now;
      loadConversations();
    }, [])
  );

  useEffect(() => {
    getSupabaseUser().then((user) => setCurrentUserId(user?.id || null));
  }, []);

  useEffect(() => {
    if (!isSearchActive) return;
    const timeoutId = setTimeout(() => {
      searchInputRef.current?.focus?.();
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [isSearchActive]);

  const loadConversations = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (conversations.length === 0) {
      // Only show skeleton on first load — subsequent focus reloads are silent
      setLoading(true);
    }
    try {
      const data = await fetchConversations();
      setConversations(data);
      setTotalUnread(data.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Live updates:
  // - subscribe to new messages for each conversation so the list updates instantly
  // - subscribe to new memberships for this user so newly created chats appear without reloads/manual refresh
  useEffect(() => {
    if (!currentUserId) return;

    // membership subscription (reload list when a new conversation is added for this user)
    membershipUnsubRef.current?.();
    membershipUnsubRef.current = subscribeToConversationMembership(currentUserId, () => {
      loadConversations();
    });

    return () => {
      membershipUnsubRef.current?.();
      membershipUnsubRef.current = null;
    };
  }, [currentUserId]);

  // A5: Single realtime channel for all new messages, filtered client-side
  const conversationIdsSet = React.useMemo(
    () => new Set((conversations || []).map((c) => c.id).filter(Boolean)),
    [conversations]
  );

  useEffect(() => {
    if (!currentUserId || conversationIdsSet.size === 0) return;

    // Remove previous channel if exists
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }

    const channel = supabase
      .channel('chat-list-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const message = payload.new;
          const convId = message?.conversation_id;
          // Client-side filter: only our conversations
          if (!convId || !conversationIdsSet.has(convId)) return;

          setConversations((prev) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            const idx = list.findIndex((c) => c.id === convId);
            if (idx === -1) {
              loadConversations();
              return prev;
            }

            const existing = list[idx];
            if (existing.lastMessage?.id === message.id) return prev;

            const isFromMe = message?.sender_id && currentUserId && message.sender_id === currentUserId;
            const unreadCount = Math.max(0, (existing.unreadCount || 0) + (isFromMe ? 0 : 1));
            if (!isFromMe) incrementChatUnread();

            const updated = {
              ...existing,
              lastMessage: message,
              unreadCount,
            };

            list.splice(idx, 1);
            return [updated, ...list];
          });
        }
      )
      .subscribe();

    messageChannelRef.current = channel;

    return () => {
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIdsSet.size, currentUserId]);

  const getLastMessagePreview = useCallback((msg) => {
    if (!msg) return '';
    if (msg.content) return msg.content;
    const att = msg.attachments?.[0];
    if (!att) return '';
    const previews = {
      image: isRTL ? '📷 صورة' : '📷 Photo',
      file: isRTL ? '📎 ملف' : '📎 File',
      location: isRTL ? '📍 موقع' : '📍 Location',
      receipt: isRTL ? '🧾 إيصال' : '🧾 Receipt',
      payment_link: isRTL ? '💳 رابط دفع' : '💳 Payment Link',
      payment_receipt: isRTL ? '✅ تم الدفع' : '✅ Payment Received',
    };
    return previews[att.type] || (isRTL ? '📩 مرفق' : '📩 Attachment');
  }, [isRTL]);

  const filteredChats = useMemo(
    () => conversations.filter((chat) =>
      (chat.name || chat.id).toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [conversations, searchQuery]
  );

  const skeletonChats = React.useMemo(
    () => Array.from({ length: 8 }).map((_, idx) => ({ id: `sk-${idx}` })),
    []
  );

  const handleChatPress = useCallback((chat) => {
    const unreadToReset = chat.unreadCount || 0;
    if (unreadToReset > 0) decrementChatUnread(unreadToReset);
    setConversations((prev) =>
      (prev || []).map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
    );
    router.push({
      pathname: "/chat",
      params: {
        id: chat.id,
        name: chat.name || `${t.chat.title} ${chat.id.slice(0, 5)}`,
        avatar: chat.avatar || "",
        isOnline: chat.isOnline ? "true" : "false"
      }
    });
  }, [router, t]);

  const renderItem = useCallback(({ item }) => {
    const unread = item.unreadCount || 0;
    return (
    <View>
      <Pressable
        onPress={() => handleChatPress(item)}
        style={({ pressed }) => [
          styles.chatItem,
          {
            backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
            flexDirection: 'row',
          },
        ]}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar || 'https://picsum.photos/seed/chat/200' }} style={styles.avatar} />
          {item.isOnline && (
            <View style={[styles.onlineBadge, { borderColor: colors.background }]} />
          )}
        </View>

        <View style={[styles.chatContent, { alignItems: 'flex-start' }]}>
          <View style={[styles.chatHeader, { flexDirection: 'row' }]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>{item.name || `${t.chat.title} ${item.id.slice(0, 5)}`}</Text>
              {item.orderStatus && (() => {
                const s = item.orderStatus;
                const isPaid = ['payment_verified', 'paid', 'in_progress', 'completion_requested', 'completed'].includes(s);
                const isPending = ['awaiting_admin_transfer_approval', 'payment_submitted'].includes(s);
                if (!isPaid && !isPending) return null;
                const badgeColor = isPaid ? '#10B981' : '#F59E0B';
                const label = isPaid
                  ? (isRTL ? 'مدفوع' : 'Paid')
                  : (isRTL ? 'بانتظار' : 'Pending');
                return (
                  <View style={{ backgroundColor: badgeColor + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: badgeColor, fontSize: 10, fontWeight: '700' }}>{label}</Text>
                  </View>
                );
              })()}
            </View>
            <Text style={[styles.chatTime, { color: colors.textMuted }]}>
              {item.lastMessage?.created_at ? new Date(item.lastMessage.created_at).toLocaleTimeString(isRTL ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          
          <View style={[styles.lastMessageContainer, { flexDirection: 'row' }]}>
             {unread === 0 && (
                <View style={{ marginEnd: 4 }}>
                    {item.readStatus === 'read' && <CheckCheck size={16} color={colors.primary} />}
                    {item.readStatus === 'received' && <CheckCheck size={16} color={colors.textMuted} />}
                    {item.readStatus === 'sent' && <Check size={16} color={colors.textMuted} />}
                </View>
             )}
            <Text
              numberOfLines={1}
              style={[
                styles.lastMessage,
                { 
                    color: unread > 0 ? colors.text : colors.textSecondary,
                    fontWeight: unread > 0 ? '600' : '400',
                    writingDirection: 'rtl'
                },
              ]}
            >
              {getLastMessagePreview(item.lastMessage) || (isRTL ? 'لا توجد رسائل بعد' : 'No messages yet')}
            </Text>
          </View>
        </View>

        {unread > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadText}>{unread}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
  }, [colors, isRTL, t, handleChatPress, getLastMessagePreview]);

  const Separator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors.border]
  );

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          headerTitleAlign: 'center',
          title: isRTL ? 'المحادثات' : 'Chats',
          headerLeftContainerStyle: styles.headerSideContainer,
          headerRightContainerStyle: styles.headerSideContainer,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
              >
                <ChevronRight size={24} color={colors.text} />
              </Pressable>
            ) : null,
          headerRight: () => (
            <Pressable
              onPress={() => {
                if (isSearchActive) {
                  setIsSearchActive(false);
                  setSearchQuery('');
                  return;
                }
                setIsSearchActive(true);
              }}
              style={({ pressed }) => [styles.headerBackButton, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Search size={16} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <StatusBar style={colors.statusBar} />

      {isSearchActive ? (
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: 'row',
              },
            ]}
          >
            <Search size={18} color={colors.textMuted} style={{ marginHorizontal: 10 }} />
            <TextInput
              ref={searchInputRef}
              placeholder={isRTL ? 'بحث في المحادثات...' : 'Search chats...'}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, writingDirection: 'rtl' }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable
            onPress={() => loadConversations()}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{isRTL ? 'إعادة المحاولة' : 'Retry'}</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <SkeletonGroup style={{ flex: 1 }}>
          <FlatList
            style={{ flex: 1 }}
            data={skeletonChats}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={{ paddingHorizontal: 20 }} pointerEvents="none">
                <View
                  style={[
                    styles.chatItem,
                    {
                      flexDirection: 'row',
                    },
                  ]}
                >
                  <View style={styles.avatarContainer}>
                    <Skeleton width={56} height={56} radius={28} />
                  </View>
                  <View style={[styles.chatContent, { alignItems: 'flex-start' }]}>
                    <View style={[styles.chatHeader, { flexDirection: 'row' }]}>
                      <Skeleton height={14} radius={8} width="60%" />
                      <Skeleton height={10} radius={6} width={52} />
                    </View>
                    <View style={[styles.lastMessageContainer, { flexDirection: 'row' }]}>
                      <Skeleton height={12} radius={7} width="85%" />
                    </View>
                  </View>
                </View>
                {index < skeletonChats.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                )}
              </View>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </SkeletonGroup>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={96}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadConversations(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyStateContainer}>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  {isRTL ? 'لا توجد محادثات بعد' : 'No messages'}
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                  {isRTL ? 'ابدأ محادثة جديدة من الإعلانات' : 'Start a new chat from ads'}
                </Text>
              </View>
            ) : (
              <View style={{ paddingVertical: 20 }} />
            )
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100, // Space for bottom tab bar
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  headerSideContainer: {
    paddingHorizontal: 8,
  },
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginHorizontal: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    end: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981', // Emerald 500
    borderWidth: 2,
  },
  chatContent: {
    flex: 1,
    marginHorizontal: 10,
  },
  chatHeader: {
    justifyContent: 'space-between',
    marginBottom: 4,
    width: '100%',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatTime: {
    fontSize: 12,
  },
  lastMessageContainer: {
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginStart: 10,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    marginStart: 86, // Offset for avatar
  },
  emptyStateContainer: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
