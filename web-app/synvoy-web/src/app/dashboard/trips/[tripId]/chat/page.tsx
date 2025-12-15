'use client'

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { messageAPI, tripAPI } from '@/lib/api';
import Link from 'next/link';

export default function TripChatPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params?.tripId as string;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [trip, setTrip] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);
  const previousMessagesCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && tripId) {
      fetchTrip();
      fetchMessages(true);
      // Poll for new messages every 5 seconds
      const interval = setInterval(() => fetchMessages(false), 5000);
      return () => clearInterval(interval);
    }
  }, [tripId, user]);

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

  const fetchTrip = async () => {
    try {
      const fetchedTrip = await tripAPI.getTrip(tripId);
      setTrip(fetchedTrip);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trip');
    }
  };

  const fetchMessages = async (isInitial = false) => {
    if (!tripId) return;
    
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
      const fetchedMessages = await messageAPI.getTripMessages(tripId);
      
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
        // Deep comparison: check if any message content changed
        const hasChanges = fetchedMessages.some((msg, idx) => {
          const prevMsg = prevMessages[idx];
          if (!prevMsg) return true;
          // Compare IDs and content
          if (prevMsg.id !== msg.id || prevMsg.content !== msg.content) {
            return true;
          }
          return false;
        });
        return hasChanges ? fetchedMessages : prevMessages;
      });
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
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    setError('');
    try {
      await messageAPI.sendMessage(newMessage, undefined, tripId);
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

  if (!user || !trip) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-blue-900/5 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href={`/dashboard/trips/${tripId}`} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">{trip.title}</h2>
              <Link
                href={`/dashboard/trips/${tripId}`}
                className="group relative px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-300 shadow-sm hover:shadow-lg flex items-center gap-2 sm:gap-3 overflow-hidden"
              >
                {/* Subtle background animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-cyan-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Icon with smooth animation */}
                <svg 
                  className="relative z-10 w-5 h-5 sm:w-6 sm:h-6 text-blue-600 transform group-hover:-translate-x-1 transition-transform duration-300" 
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
                
                {/* Text */}
                <span className="relative z-10">Back to Trip</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-md'
                  }`}>
                    {!isOwnMessage && message.sender && (
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {message.sender.first_name} {message.sender.last_name}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
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
      </div>
    </div>
  );
}


