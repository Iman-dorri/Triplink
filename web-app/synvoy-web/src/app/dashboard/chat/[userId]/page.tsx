'use client'

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { messageAPI } from '@/lib/api';
import Link from 'next/link';

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

export default function ChatPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);
  const previousMessagesCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const isLoadingRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (user && userId) {
      fetchMessages(true);
      // Poll for new messages every 5 seconds
      const interval = setInterval(() => fetchMessages(false), 5000);
      return () => clearInterval(interval);
    }
  }, [userId, user]);

  useEffect(() => {
    // Only auto-scroll if:
    // 1. It's the initial load, OR
    // 2. New messages were added (count increased) AND user is near bottom
    const currentCount = messages.length;
    const previousCount = previousMessagesCountRef.current;
    const hasNewMessages = currentCount > previousCount;
    
    // Only scroll on initial load (once) or if new messages AND user is at bottom
    if (initialLoad && messages.length > 0 && isInitialLoadRef.current === false) {
      // Small delay to ensure DOM is ready, but only once
      const timeoutId = setTimeout(() => {
        if (shouldScrollRef.current) {
          scrollToBottom();
        }
        setInitialLoad(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    } else if (hasNewMessages && shouldScrollRef.current && !initialLoad) {
      // Only scroll if user is near bottom and it's not initial load
      scrollToBottom();
    }
    
    previousMessagesCountRef.current = currentCount;
  }, [messages.length, initialLoad]); // Only depend on length, not the whole array

  // Track scroll position to determine if user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // More generous threshold for mobile (200px) to account for touch scrolling
      const threshold = window.innerWidth < 768 ? 200 : 150;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold;
      shouldScrollRef.current = isNearBottom;
    };

    // Check initial position with a small delay to ensure layout is complete
    const timeoutId = setTimeout(() => {
      handleScroll();
    }, 100);
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    // Also check on resize for mobile orientation changes
    window.addEventListener('resize', handleScroll, { passive: true });
    
    return () => {
      clearTimeout(timeoutId);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [messages.length]); // Re-run when messages change to update initial position

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (isInitial = false) => {
    if (!userId) return;
    
    // Prevent multiple simultaneous fetches
    if (isLoadingRef.current && !isInitial) {
      return;
    }
    
    // Only set loading on true initial load (when we have no messages)
    if (isInitial && isInitialLoadRef.current && messages.length === 0) {
      isLoadingRef.current = true;
      setLoading(true);
      setInitialLoad(true);
      isInitialLoadRef.current = false;
    }
    setError('');
    try {
      const fetchedMessages = await messageAPI.getConversation(userId);
      
      // Debug: Log message data to check if is_delivered and is_read are present
      if (fetchedMessages.length > 0) {
        console.log('Sample message data:', fetchedMessages[0]);
        console.log('is_delivered:', fetchedMessages[0].is_delivered);
        console.log('is_read:', fetchedMessages[0].is_read);
        console.log('deleted_for_everyone_at:', fetchedMessages[0].deleted_for_everyone_at);
      }
      
      // Only update if messages actually changed to prevent unnecessary re-renders
      setMessages(prevMessages => {
        // If we have no previous messages, always update
        if (prevMessages.length === 0) {
          return fetchedMessages;
        }
        // Check if messages are different
        if (prevMessages.length !== fetchedMessages.length) {
          return fetchedMessages;
        }
        // Deep comparison: check if any message content or deletion status changed
        const hasChanges = fetchedMessages.some((msg: any, idx: number) => {
          const prevMsg = prevMessages[idx];
          if (!prevMsg) return true;
          // Compare IDs, content, and deletion status
          if (prevMsg.id !== msg.id || 
              prevMsg.content !== msg.content ||
              prevMsg.deleted_for_everyone_at !== msg.deleted_for_everyone_at) {
            return true;
          }
          return false;
        });
        return hasChanges ? fetchedMessages : prevMessages;
      });
      
      // Extract other user info from messages (only if we don't have it)
      if (fetchedMessages.length > 0 && !otherUser) {
        const firstMessage = fetchedMessages[0];
        const other = firstMessage.sender?.id === user?.id ? firstMessage.receiver : firstMessage.sender;
        setOtherUser(other);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      if (isInitial) {
        isLoadingRef.current = false;
        setLoading(false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    setSending(true);
    setError('');
    try {
      await messageAPI.sendMessage(newMessage, userId);
      setNewMessage('');
      // After sending, fetch messages and scroll to bottom
      await fetchMessages(false);
      // Force scroll to bottom after sending
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!userId) return;
    
    if (!confirm('Are you sure you want to clear this chat? This will hide all messages from your view, but they will not be deleted.')) {
      return;
    }
    
    try {
      await messageAPI.clearChat(userId);
      setShowMenu(false);
      // Refresh messages to show cleared state
      await fetchMessages(true);
    } catch (err: any) {
      setError(err.message || 'Failed to clear chat');
    }
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
          messageAPI.deleteMessageForEveryone(messageId)
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

  const handleSelectAll = () => {
    const myMessages = messages.filter(msg => 
      msg.sender_id === user?.id && !msg.deleted_for_everyone_at
    );
    setSelectedMessages(myMessages.map(msg => msg.id));
  };

  const handleDeselectAll = () => {
    setSelectedMessages([]);
  };

  const handleExitSelectionMode = () => {
    setSelectedMessages([]);
    setSelectionMode(false);
    setShowMenu(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-blue-900/5 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20 gap-2">
            <Link 
              href="/dashboard/messages" 
              className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <svg 
                  className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white transform group-hover:-translate-x-1 transition-transform duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                  />
                </svg>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
              </div>
            </Link>
            {otherUser && (
              <div className="text-right min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {otherUser.first_name} {otherUser.last_name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {otherUser.username ? `@${otherUser.username}` : (otherUser.email || 'User')}
                </p>
              </div>
            )}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Menu"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {selectionMode ? (
                    <>
                      {selectedMessages.length > 0 && (
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Selected ({selectedMessages.length})
                        </button>
                      )}
                      <button
                        onClick={handleDeselectAll}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Deselect All
                      </button>
                      <button
                        onClick={handleExitSelectionMode}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Selection
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectionMode(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Select Messages
                      </button>
                      <button
                        onClick={handleClearChat}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear Chat
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-3 sm:mb-4 text-sm sm:text-base">
            {error}
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {messages.map((message, index) => {
              const isMyMessage = message.sender_id === user.id;
              const showDateSeparator = index === 0 || isDifferentDate(
                messages[index - 1].created_at,
                message.created_at
              );
              
              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4 sm:my-6">
                      <div className="bg-gray-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">
                          {formatDateSeparator(new Date(message.created_at))}
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} items-center gap-2`}
                  >
                    {selectionMode && isMyMessage && !message.deleted_for_everyone_at && (
                      <button
                        onClick={() => handleToggleMessageSelection(message.id)}
                        className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50 transition-colors flex-shrink-0"
                      >
                        {selectedMessages.includes(message.id) && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    )}
                    <div
                    className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl ${
                      message.deleted_for_everyone_at
                        ? 'bg-gray-100 text-gray-500 border border-gray-200'
                        : isMyMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 shadow-lg'
                    } ${
                      selectedMessages.includes(message.id) ? 'ring-2 ring-blue-400' : ''
                    }`}
                    >
                    {message.deleted_for_everyone_at ? (
                      <p className="break-words text-sm sm:text-base italic text-gray-500 dark:text-gray-400">
                        Message deleted
                      </p>
                    ) : (
                      <p className="break-words text-sm sm:text-base">{message.content}</p>
                    )}
                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                      isMyMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <p className={`text-[10px] sm:text-xs`}>
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {isMyMessage && !message.deleted_for_everyone_at && (
                        <div className="flex items-center ml-1">
                          {message.is_read ? (
                            // Two colored ticks (read) - Rounded checkmark style
                            <div className="flex items-center -space-x-0.5">
                              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 16 16" fill="none">
                                <defs>
                                  <linearGradient id={`readTick1-${message.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#ffffff" />
                                    <stop offset="100%" stopColor="#a5f3fc" />
                                  </linearGradient>
                                </defs>
                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill={`url(#readTick1-${message.id})`} />
                              </svg>
                              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 16 16" fill="none">
                                <defs>
                                  <linearGradient id={`readTick2-${message.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#ffffff" />
                                    <stop offset="100%" stopColor="#a5f3fc" />
                                  </linearGradient>
                                </defs>
                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill={`url(#readTick2-${message.id})`} />
                              </svg>
                            </div>
                          ) : message.is_delivered ? (
                            // Two white/light gray ticks (delivered) - Rounded checkmark style
                            <div className="flex items-center -space-x-0.5">
                              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 16 16" fill="#e0e7ff">
                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                              </svg>
                              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 16 16" fill="#e0e7ff">
                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                              </svg>
                            </div>
                          ) : (
                            // One white/light gray tick (sent) - Rounded checkmark style
                            <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 16 16" fill="#e0e7ff">
                              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm sm:text-base text-gray-600">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 max-w-4xl mx-auto w-full px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-5 sm:px-7 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </>
            )}
          </button>
        </form>
      </div>

      {/* Delete Messages Confirmation Modal */}
      {showDeleteConfirm && selectedMessages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Messages</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedMessages.length} {selectedMessages.length === 1 ? 'message' : 'messages'} for everyone? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelectedMessages}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


