import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../services/api';

const MessagesScreen = ({ navigation }: any) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const fetchedConversations = await apiService.getConversations();
      setConversations(fetchedConversations);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Poll every 5 seconds
      intervalRef.current = setInterval(fetchConversations, 5000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [user, fetchConversations]);

  const getOtherUser = (conversation: any) => {
    if (conversation.trip_id) {
      return null; // Trip group chat
    }
    // Backend returns user_name (string) and user_id, not an object
    if (conversation.user_name || conversation.user_id) {
      return {
        id: conversation.user_id,
        username: conversation.user_name?.split(' ')[0] || 'user', // Use first name as fallback
        first_name: conversation.user_name?.split(' ')[0] || '',
        last_name: conversation.user_name?.split(' ').slice(1).join(' ') || '',
        avatar_url: conversation.user_avatar,
      };
    }
    return conversation.other_user || conversation.user;
  };

  const renderConversation = ({ item }: any) => {
    if (item.trip_id) {
      // Trip group chat
      return (
        <TouchableOpacity
          style={styles.conversationCard}
          onPress={() => navigation.navigate('Trips', { 
            screen: 'TripDetail', 
            params: { tripId: item.trip_id } 
          })}
        >
          <View style={styles.conversationContent}>
            <View style={styles.avatar}>
              <Icon name="public" size={28} color={colors.primary[600]} />
            </View>
            <View style={styles.conversationInfo}>
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationName}>{item.trip_title || 'Trip Chat'}</Text>
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>Group</Text>
                </View>
              </View>
              {item.last_message && (
                <>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.last_message.content}
                  </Text>
                  <Text style={styles.timestamp}>
                    {new Date(item.last_message.created_at).toLocaleString()}
                  </Text>
                </>
              )}
            </View>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    } else {
      // 1-on-1 chat
      // Backend returns user_name (string) and user_id, not an object
      const displayName = item.user_name || 'Unknown User';
      const userId = item.user_id;
      
      return (
        <TouchableOpacity
          style={styles.conversationCard}
          onPress={() => navigation.navigate('Chat', { userId: userId })}
        >
          <View style={styles.conversationContent}>
            <View style={styles.avatar}>
              <Icon name="person" size={28} color={colors.primary[600]} />
            </View>
            <View style={styles.conversationInfo}>
              <Text style={styles.conversationName}>{displayName}</Text>
              {item.last_message && (
                <>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.last_message.content}
                  </Text>
                  <Text style={styles.timestamp}>
                    {new Date(item.last_message.created_at).toLocaleString()}
                  </Text>
                </>
              )}
            </View>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="message" size={64} color={colors.gray[400]} />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start chatting with your connections</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.trip_id || item.user_id || item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchConversations}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.light,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    minHeight: 60,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  errorContainer: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: colors.error + '20',
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  list: {
    padding: theme.spacing.md,
  },
  conversationCard: {
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  conversationName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  conversationUsername: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  groupBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  groupBadgeText: {
    fontSize: theme.fontSize.xs,
    color: colors.primary[700],
    fontWeight: theme.fontWeight.medium,
  },
  lastMessage: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  timestamp: {
    fontSize: theme.fontSize.xs,
    color: colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  unreadBadge: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: colors.text.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
});

export default MessagesScreen;

