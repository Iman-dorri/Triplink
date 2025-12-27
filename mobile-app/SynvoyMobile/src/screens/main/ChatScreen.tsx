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
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { theme, colors } from '../../theme';
import apiService from '../../services/api';

const ChatScreen = ({ route, navigation }: any) => {
  const { userId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && userId) {
      fetchMessages(true);
      
      // Poll for new messages every 5 seconds
      intervalRef.current = setInterval(() => fetchMessages(false), 5000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [userId, user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const fetchMessages = async (isInitial = false) => {
    if (!userId) return;
    
    if (isInitial) {
      setLoading(true);
    }
    setError('');
    
    try {
      const fetchedMessages = await apiService.getConversation(userId);
      
      // Reverse to show oldest first (for FlatList)
      const reversedMessages = [...fetchedMessages].reverse();
      setMessages(reversedMessages);
      
      // Extract other user info from messages
      if (fetchedMessages.length > 0 && !otherUser) {
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
    if (!newMessage.trim() || !userId || sending) return;
    
    setSending(true);
    setError('');
    
    try {
      await apiService.sendMessage(newMessage.trim(), userId);
      setNewMessage('');
      // Refresh messages
      await fetchMessages(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: any) => {
    const isMyMessage = item.sender_id === user?.id;
    
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
    </KeyboardAvoidingView>
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
  messageContainer: {
    marginBottom: theme.spacing.sm,
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
  messageTime: {
    fontSize: theme.fontSize.xs,
  },
  myMessageTime: {
    color: colors.text.white + 'CC',
  },
  otherMessageTime: {
    color: colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: colors.background.default,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    alignItems: 'flex-end',
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
    maxHeight: 100,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
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
});

export default ChatScreen;

