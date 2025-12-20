import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MoreVertical, Check, CheckCheck } from 'lucide-react-native';
import { useTheme } from '@/utils/theme/store';
import { useTranslation } from '@/utils/i18n/store';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { fetchConversations } from '@/utils/supabase/chat';

export default function ChatsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = conversations.filter((chat) =>
    (chat.name || chat.id).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatPress = (chat) => {
    router.push({
      pathname: "/chats/chat",
      params: {
        id: chat.id,
        name: chat.name || `${t.chat.title} ${chat.id.slice(0, 5)}`,
        avatar: chat.avatar || "",
        isOnline: chat.isOnline ? "true" : "false"
      }
    });
  };

  const renderItem = ({ item, index }) => {
    const unread = item.unreadCount || 0;
    return (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <Pressable
        onPress={() => handleChatPress(item)}
        style={({ pressed }) => [
          styles.chatItem,
          {
            backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar || 'https://picsum.photos/seed/chat/200' }} style={styles.avatar} />
          {item.isOnline && (
            <View style={[styles.onlineBadge, { borderColor: colors.background }]} />
          )}
        </View>

        <View style={[styles.chatContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.chatHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.chatName, { color: colors.text }]}>{item.name || `${t.chat.title} ${item.id.slice(0, 5)}`}</Text>
            <Text style={[styles.chatTime, { color: colors.textMuted }]}>
              {item.lastMessage?.created_at ? new Date(item.lastMessage.created_at).toLocaleTimeString() : ''}
            </Text>
          </View>
          
          <View style={[styles.lastMessageContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
             {unread === 0 && (
                <View style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>
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
                    textAlign: isRTL ? 'right' : 'left'
                },
              ]}
            >
              {item.lastMessage?.content || t.chat.typeMessage}
            </Text>
          </View>
        </View>

        {unread > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadText}>{unread}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
  };

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingHorizontal: 20 }]}>
        <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isRTL ? 'المحادثات' : 'Chats'}
          </Text>
          <Pressable style={styles.moreButton}>
            <MoreVertical size={24} color={colors.text} />
          </Pressable>
        </View>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Search size={20} color={colors.textMuted} style={{ marginHorizontal: 10 }} />
            <TextInput
                placeholder={isRTL ? 'بحث في المحادثات...' : 'Search chats...'}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>
      </View>

      {loading && !error && (
        <View style={{ paddingVertical: 20 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
      {error ? (
        <Text style={{ color: colors.error, paddingHorizontal: 20 }}>{error}</Text>
      ) : (
        <FlashList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={96}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          ListEmptyComponent={
            !loading ? (
              <Text style={{ textAlign: isRTL ? 'right' : 'left', color: colors.textMuted, paddingHorizontal: 20 }}>
                {t.chat.noMessages || 'No chats yet'}
              </Text>
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
  header: {
    marginBottom: 10,
  },
  headerTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  moreButton: {
    padding: 4,
  },
  searchContainer: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 100, // Space for bottom tab bar
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
    right: 2,
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
    marginLeft: 10,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    marginLeft: 86, // Offset for avatar
  },
});

