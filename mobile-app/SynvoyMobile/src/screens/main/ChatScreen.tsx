import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { formatBudget } from '../../utils/currency';
import { theme, colors } from '../../theme';
import apiService from '../../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Helper function to format date for separators
const formatDateSeparator = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (messageDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    // Format as "Month Day, Year" (e.g., "December 29, 2024")
    return messageDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

// Helper function to check if two messages are on different dates
const isDifferentDate = (date1: string | Date, date2: string | Date): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  return d1.getTime() !== d2.getTime();
};

const ChatScreen = ({ route, navigation }: any) => {
  const { userId, tripId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && (userId || tripId)) {
      if (tripId) {
        fetchTrip();
      }
      fetchMessages(true);
      
      // Poll for new messages every 5 seconds
      intervalRef.current = setInterval(() => fetchMessages(false), 5000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [userId, tripId, user]);

  useEffect(() => {
    // Set header right button for menu
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowMenu(!showMenu)}
          style={{ padding: 8, marginRight: 8 }}
        >
          <Icon name="more-vert" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, showMenu, tripId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const fetchTrip = async () => {
    if (!tripId) return;
    try {
      const fetchedTrip = await apiService.getTrip(tripId);
      setTrip(fetchedTrip);
      // Set navigation title for trip chat
      navigation.setOptions({ title: fetchedTrip.title || 'Trip Chat' });
    } catch (err: any) {
      console.error('Failed to fetch trip:', err);
    }
  };

  const fetchMessages = async (isInitial = false) => {
    if (!userId && !tripId) return;
    
    if (isInitial) {
      setLoading(true);
    }
    setError('');
    
    try {
      let fetchedMessages;
      if (tripId) {
        fetchedMessages = await apiService.getTripMessages(tripId);
      } else {
        fetchedMessages = await apiService.getConversation(userId!);
      }
      
      // Keep messages in chronological order (oldest first, newest last)
      // This matches the web app behavior - messages from top to bottom
      setMessages(fetchedMessages);
      
      // Extract other user info from messages (only for 1-on-1 chat)
      if (userId && fetchedMessages.length > 0 && !otherUser) {
        const firstMessage = fetchedMessages[0];
        const other = firstMessage.sender?.id === user?.id ? firstMessage.receiver : firstMessage.sender;
        if (other) {
          setOtherUser(other);
          // Set navigation title
          const displayName = `${other.first_name || ''} ${other.last_name || ''}`.trim() || other.username || 'Chat';
          navigation.setOptions({ title: displayName });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    if (!userId && !tripId) return;
    
    setSending(true);
    setError('');
    
    try {
      await apiService.sendMessage(newMessage.trim(), userId, tripId);
      setNewMessage('');
      // Refresh messages
      await fetchMessages(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!userId && !tripId) return;
    
    // Use Alert for confirmation
    const { Alert } = require('react-native');
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear this chat? This will hide all messages from your view, but they will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.clearChat(userId, tripId);
              setShowMenu(false);
              // Refresh messages to show cleared state
              await fetchMessages(true);
            } catch (err: any) {
              setError(err.message || 'Failed to clear chat');
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = async () => {
    if (!tripId) return;
    
    const { Alert } = require('react-native');
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will no longer be able to send or receive messages in this chat.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.leaveGroup(tripId);
              setShowMenu(false);
              // Navigate back
              navigation.goBack();
            } catch (err: any) {
              setError(err.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleToggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;
    
    try {
      // Delete all selected messages
      await Promise.all(
        selectedMessages.map(messageId => 
          apiService.deleteMessageForEveryone(messageId)
        )
      );
      setSelectedMessages([]);
      setSelectionMode(false);
      setShowDeleteConfirm(false);
      setShowMenu(false);
      // Force refresh messages by clearing and refetching
      setMessages([]);
      await fetchMessages(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete messages');
      setShowDeleteConfirm(false);
    }
  };

  const handleDeselectAll = () => {
    setSelectedMessages([]);
  };

  const handleExitSelectionMode = () => {
    setSelectedMessages([]);
    setSelectionMode(false);
    setShowMenu(false);
  };

  const renderMessage = ({ item, index }: any) => {
    // For trip chat, check if sender_id matches current user
    // For 1-on-1 chat, same logic applies
    const isMyMessage = item.sender_id === user?.id;
    // Check if we need to show a date separator
    // Messages are in chronological order: index 0 is oldest, last index is newest
    const showDateSeparator = index === 0 || (index > 0 && messages[index - 1] && isDifferentDate(
      messages[index - 1].created_at,
      item.created_at
    ));
    
    // For group chats (tripId exists), show sender name for messages from other users
    const showSenderName = tripId && !isMyMessage && item.sender;
    const senderName = showSenderName 
      ? `${item.sender.first_name || ''} ${item.sender.last_name || ''}`.trim() || item.sender.username || 'Unknown'
      : null;
    
    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {formatDateSeparator(new Date(item.created_at))}
              </Text>
            </View>
          </View>
        )}
        <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.otherMessageRow]}>
          {selectionMode && isMyMessage && !item.deleted_for_everyone_at && (
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleToggleMessageSelection(item.id)}
              activeOpacity={0.7}
            >
              {selectedMessages.includes(item.id) ? (
                <Icon name="check-box" size={20} color={colors.primary[600]} />
              ) : (
                <Icon name="check-box-outline-blank" size={20} color={colors.gray[400]} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}
            activeOpacity={0.7}
            onLongPress={() => {
              if (isMyMessage && !item.deleted_for_everyone_at && !selectionMode) {
                setSelectionMode(true);
                handleToggleMessageSelection(item.id);
              }
            }}
          >
            <View style={[
              styles.messageBubble, 
              item.deleted_for_everyone_at 
                ? styles.deletedMessageBubble 
                : (isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble),
              selectedMessages.includes(item.id) && { borderWidth: 2, borderColor: colors.primary[400] }
            ]}>
            {showSenderName && (
              <Text style={styles.senderName}>
                {senderName}
              </Text>
            )}
            {item.deleted_for_everyone_at ? (
              <Text style={styles.deletedMessageText}>
                <Text style={styles.deletedMessageItalic}>Message deleted</Text>
              </Text>
            ) : (
              <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                {item.content}
              </Text>
            )}
            <View style={[styles.messageTimeContainer, isMyMessage ? styles.myMessageTimeContainer : styles.otherMessageTimeContainer]}>
              <Text style={[
                styles.messageTime, 
                item.deleted_for_everyone_at 
                  ? styles.deletedMessageTime 
                  : (isMyMessage ? styles.myMessageTime : styles.otherMessageTime)
              ]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isMyMessage && (
                <View style={styles.tickContainer}>
                  {item.is_read ? (
                    // Two colored ticks (read) - White/light cyan for visibility on blue background
                    <View style={styles.doubleTickContainer}>
                      <Icon name="check" size={14} color="#ffffff" style={styles.tickIcon} />
                      <Icon name="check" size={14} color="#a5f3fc" style={[styles.tickIcon, styles.secondTick]} />
                    </View>
                  ) : item.is_delivered ? (
                    // Two white/light gray ticks (delivered) - visible on blue background
                    <View style={styles.doubleTickContainer}>
                      <Icon name="check" size={14} color="#e0e7ff" style={styles.tickIcon} />
                      <Icon name="check" size={14} color="#e0e7ff" style={[styles.tickIcon, styles.secondTick]} />
                    </View>
                  ) : (
                    // One white/light gray tick (sent) - visible on blue background
                    <Icon name="check" size={14} color="#e0e7ff" />
                  )}
                </View>
              )}
            </View>
          </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.secondary}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.text.white} />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Menu Dropdown */}
      {showMenu && (
        <Modal
          visible={showMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
            <View style={styles.dropdownOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.dropdownMenu, { top: Platform.OS === 'ios' ? 100 : 60, right: 16 }]}>
                  {selectionMode ? (
                    <>
                      {selectedMessages.length > 0 && (
                        <TouchableOpacity
                          style={[styles.dropdownMenuItem, { borderBottomColor: colors.red[100] }]}
                          onPress={() => {
                            setShowMenu(false);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Icon name="delete" size={20} color={colors.error} />
                          <Text style={[styles.dropdownMenuItemText, { color: colors.error }]}>
                            Delete Selected ({selectedMessages.length})
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.dropdownMenuItem}
                        onPress={handleDeselectAll}
                      >
                        <Icon name="close" size={20} color={colors.text.primary} />
                        <Text style={styles.dropdownMenuItemText}>Deselect All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownMenuItem}
                        onPress={handleExitSelectionMode}
                      >
                        <Icon name="close" size={20} color={colors.text.primary} />
                        <Text style={styles.dropdownMenuItemText}>Cancel Selection</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {tripId && (
                        <TouchableOpacity
                          style={styles.dropdownMenuItem}
                          onPress={() => {
                            console.log('Group Info clicked, tripId:', tripId);
                            setShowMenu(false);
                            setShowGroupInfo(true);
                            console.log('showGroupInfo set to:', true);
                          }}
                        >
                          <Icon name="info" size={20} color={colors.text.primary} />
                          <Text style={styles.dropdownMenuItemText}>Group Info</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.dropdownMenuItem}
                        onPress={handleClearChat}
                      >
                        <Icon name="delete-sweep" size={20} color={colors.text.primary} />
                        <Text style={styles.dropdownMenuItemText}>Clear Chat</Text>
                      </TouchableOpacity>
                      {tripId && trip && trip.user_id !== user?.id && (
                        <TouchableOpacity
                          style={[styles.dropdownMenuItem, { borderTopColor: colors.red[100] }]}
                          onPress={handleLeaveGroup}
                        >
                          <Icon name="exit-to-app" size={20} color={colors.error} />
                          <Text style={[styles.dropdownMenuItemText, { color: colors.error }]}>Leave Group</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

    </KeyboardAvoidingView>
    
    {/* Group Info Modal - Outside KeyboardAvoidingView */}
    {showGroupInfo && (
      <Modal
        visible={true}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.groupInfoModal}>
            {/* Header */}
            <View style={styles.groupInfoHeader}>
              <View style={styles.groupInfoHeaderContent}>
                <Text style={styles.groupInfoTitle}>Group Info</Text>
                <TouchableOpacity
                  onPress={() => setShowGroupInfo(false)}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {tripId && trip ? (
              <ScrollView 
                style={styles.groupInfoContent}
                contentContainerStyle={styles.groupInfoContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Trip Info Card */}
                <View style={styles.tripInfoCard}>
                  <View style={styles.tripIconContainer}>
                    <Icon name="flight" size={28} color={colors.primary[600]} />
                  </View>
                  <View style={styles.tripInfoContent}>
                    <Text style={styles.tripTitle}>{trip.title}</Text>
                    {trip.description && (
                      <Text style={styles.tripDescription} numberOfLines={3}>
                        {trip.description}
                      </Text>
                    )}
                    <View style={styles.tripMetaContainer}>
                      {trip.start_date && (
                        <View style={styles.tripMetaItem}>
                          <Icon name="calendar-today" size={16} color={colors.text.secondary} />
                          <Text style={styles.tripMetaText}>
                            {new Date(trip.start_date).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      {trip.budget && (
                        <View style={styles.tripMetaItem}>
                          <Icon name="attach-money" size={16} color={colors.text.secondary} />
                          <Text style={styles.tripMetaText}>{formatBudget(trip.budget, trip.budget_currency)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Participants Section */}
                <View style={styles.participantsSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Participants
                    </Text>
                    <View style={styles.participantCountBadge}>
                      <Text style={styles.participantCountText}>
                        {trip.participants?.filter((p: any) => p.status === 'accepted').length || 0}
                      </Text>
                    </View>
                  </View>
                  {trip.participants?.filter((p: any) => p.status === 'accepted').length > 0 ? (
                    <View style={styles.participantsList}>
                      {trip.participants?.filter((p: any) => p.status === 'accepted').map((participant: any) => (
                        <View key={participant.id} style={styles.participantCard}>
                          <View style={styles.participantAvatar}>
                            <Icon name="person" size={24} color={colors.primary[600]} />
                          </View>
                          <View style={styles.participantInfo}>
                            <View style={styles.participantNameRow}>
                              <Text style={styles.participantName} numberOfLines={1}>
                                {participant.user?.first_name} {participant.user?.last_name}
                              </Text>
                              {participant.role === 'creator' && (
                                <View style={styles.creatorBadge}>
                                  <Text style={styles.creatorBadgeText}>Creator</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.participantUsername} numberOfLines={1}>
                              @{participant.user?.username}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyParticipants}>
                      <Icon name="people-outline" size={48} color={colors.gray[400]} />
                      <Text style={styles.emptyParticipantsText}>No participants yet</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : tripId ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>Loading trip info...</Text>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>No trip information available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    )}

    {/* Delete Messages Confirmation Modal */}
    {showDeleteConfirm && selectedMessages.length > 0 && (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteConfirm(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteConfirmModal}>
            <Text style={styles.deleteConfirmTitle}>Delete Messages</Text>
            <Text style={styles.deleteConfirmText}>
              Are you sure you want to delete {selectedMessages.length} {selectedMessages.length === 1 ? 'message' : 'messages'} for everyone? This action cannot be undone.
            </Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.deleteConfirmButtonCancel]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                }}
              >
                <Text style={styles.deleteConfirmButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.deleteConfirmButtonDelete]}
                onPress={handleDeleteSelectedMessages}
              >
                <Text style={styles.deleteConfirmButtonDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )}
    </>
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
  errorContainer: {
    padding: theme.spacing.md,
    backgroundColor: colors.error + '20',
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
  },
  messagesList: {
    padding: theme.spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  checkbox: {
    padding: theme.spacing.xs,
  },
  messageContainer: {
    flex: 1,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
  },
  myMessageBubble: {
    backgroundColor: colors.primary[600],
    borderBottomRightRadius: theme.borderRadius.sm,
  },
  otherMessageBubble: {
    backgroundColor: colors.background.default,
    borderBottomLeftRadius: theme.borderRadius.sm,
    ...theme.shadows.sm,
  },
  deletedMessageBubble: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderBottomLeftRadius: theme.borderRadius.sm,
    borderBottomRightRadius: theme.borderRadius.sm,
  },
  messageText: {
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  myMessageText: {
    color: colors.text.white,
  },
  otherMessageText: {
    color: colors.text.primary,
  },
  deletedMessageText: {
    fontSize: theme.fontSize.sm, // Match web app: text-sm (14px)
    color: colors.gray[500], // Match web app: text-gray-500 (#6b7280)
  },
  deletedMessageItalic: {
    // Use custom Inter italic font - the font file itself is italic, so no need for fontStyle
    fontFamily: 'Inter-Italic',
  },
  deletedMessageTime: {
    color: colors.gray[500], // Gray color for deleted message timestamps
  },
  senderName: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
    opacity: 0.75,
    color: colors.text.primary,
  },
  messageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  myMessageTimeContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageTimeContainer: {
    justifyContent: 'flex-start',
  },
  messageTime: {
    fontSize: theme.fontSize.xs,
  },
  myMessageTime: {
    color: colors.text.white + 'CC',
  },
  otherMessageTime: {
    color: colors.text.secondary,
  },
  tickContainer: {
    marginLeft: 4,
  },
  doubleTickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickIcon: {
    marginLeft: -6,
  },
  secondTick: {
    marginLeft: -8,
  },
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  dateSeparator: {
    backgroundColor: colors.gray[200],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  dateSeparatorText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: colors.background.default,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    backgroundColor: colors.background.default,
    minHeight: 44,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
    minHeight: 44,
    ...theme.shadows.button,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray[400],
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    minWidth: 180,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  dropdownMenuItemText: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    fontWeight: theme.fontWeight.medium,
  },
  deleteConfirmModal: {
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  deleteConfirmTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  deleteConfirmText: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'flex-end',
  },
  deleteConfirmButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  deleteConfirmButtonCancel: {
    backgroundColor: colors.gray[100],
  },
  deleteConfirmButtonCancelText: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    fontWeight: theme.fontWeight.medium,
  },
  deleteConfirmButtonDelete: {
    backgroundColor: colors.error,
  },
  deleteConfirmButtonDeleteText: {
    fontSize: theme.fontSize.md,
    color: colors.text.white,
    fontWeight: theme.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  groupInfoModal: {
    flex: 1,
    backgroundColor: colors.background.default,
    width: '100%',
    height: '100%',
  },
  groupInfoHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    backgroundColor: colors.background.default,
  },
  groupInfoHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupInfoTitle: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  groupInfoContent: {
    flex: 1,
  },
  groupInfoContentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  tripInfoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  tripIconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  tripInfoContent: {
    flex: 1,
  },
  tripTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  tripDescription: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  tripMetaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  tripMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  tripMetaText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: theme.fontWeight.medium,
  },
  participantsSection: {
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  participantCountBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  participantCountText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.primary[700],
  },
  participantsList: {
    gap: theme.spacing.sm,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...theme.shadows.sm,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  participantInfo: {
    flex: 1,
    minWidth: 0,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  participantName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  creatorBadge: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  creatorBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.white,
  },
  participantUsername: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  emptyParticipants: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyParticipantsText: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    marginTop: theme.spacing.md,
  },
});

export default ChatScreen;

