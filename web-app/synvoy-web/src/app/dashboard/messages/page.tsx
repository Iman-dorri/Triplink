'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { messageAPI } from '@/lib/api';
import Link from 'next/link';

export default function MessagesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const fetchConversations = useCallback(async (isInitial = false) => {
    // NEVER set loading to true if we've already initialized - absolute guard
    const shouldShowLoading = isInitial && !hasInitializedRef.current;
    
    if (shouldShowLoading) {
      setLoading(true);
    }
    
    // Only clear error on initial load
    if (shouldShowLoading) {
      setError('');
    }
    
    try {
      const fetchedConversations = await messageAPI.getConversations();
      
      // If this is initial load, always update
      if (shouldShowLoading) {
        setConversations(fetchedConversations);
        hasInitializedRef.current = true;
        setLoading(false);
        return;
      }
      
      // For subsequent updates, check if data actually changed BEFORE calling setState
      // This completely prevents any re-renders when data hasn't changed
      setConversations(prev => {
        // Quick length check first
        if (prev.length !== fetchedConversations.length) {
          return fetchedConversations;
        }
        
        // Deep comparison - check if anything actually changed
        let hasChanges = false;
        for (let i = 0; i < prev.length; i++) {
          const prevConv = prev[i];
          const newConv = fetchedConversations[i];
          
          const prevId = prevConv.trip_id || prevConv.user_id;
          const newId = newConv.trip_id || newConv.user_id;
          
          if (prevId !== newId) {
            hasChanges = true;
            break;
          }
          
          // Check if last message changed
          const prevLastMsg = prevConv.last_message?.created_at;
          const newLastMsg = newConv.last_message?.created_at;
          const prevUnread = prevConv.unread_count || 0;
          const newUnread = newConv.unread_count || 0;
          
          if (prevLastMsg !== newLastMsg || prevUnread !== newUnread) {
            hasChanges = true;
            break;
          }
        }
        
        // Only update if there are actual changes - return prev to prevent re-render
        return hasChanges ? fetchedConversations : prev;
      });
    } catch (err: any) {
      // Only show error on initial load, not on refresh
      if (shouldShowLoading) {
        setError(err.message || 'Failed to fetch conversations');
        hasInitializedRef.current = true; // Mark as initialized even on error
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let mounted = true;
    
    // Initial load - only once
    if (!hasInitializedRef.current) {
      fetchConversations(true).then(() => {
        // Start polling only after initial load completes
        if (mounted && !intervalRef.current) {
          intervalRef.current = setInterval(() => {
            fetchConversations(false);
          }, 5000);
        }
      });
    } else {
      // If already initialized, just set up polling
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          fetchConversations(false);
        }, 5000);
      }
    }
    
    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only depend on user, fetchConversations is stable

  const getOtherUser = (conversation: any) => {
    if (conversation.sender?.id === user?.id) {
      return conversation.receiver;
    }
    return conversation.sender;
  };

  // Calculate total unread count
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((total, conv) => {
      return total + (conv.unread_count || 0);
    }, 0);
  }, [conversations]);

  // Memoize the conversations list to prevent unnecessary re-renders
  const conversationsList = useMemo(() => {
    if (conversations.length === 0) return null;
    
    return conversations.map((conversation) => {
      // Check if it's a trip chat or 1-on-1 chat
      if (conversation.trip_id) {
            return (
          <Link
            key={conversation.trip_id}
            href={`/dashboard/trips/${conversation.trip_id}/chat`}
            className="block bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl sm:text-2xl">🌍</span>
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
                    {conversation.trip_title}
                  </h3>
                  <span className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 text-[10px] sm:text-xs rounded-full whitespace-nowrap">Group</span>
                </div>
                {conversation.last_message && (
                  <>
                    <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">{conversation.last_message.content}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                      {new Date(conversation.last_message.created_at).toLocaleString()}
                    </p>
                  </>
                )}
              </div>
              {conversation.unread_count > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    {conversation.unread_count}
                  </span>
                </div>
              )}
            </div>
          </Link>
        );
      } else {
        // 1-on-1 chat
        const otherUser = getOtherUser(conversation);
        return (
          <Link
            key={conversation.user_id}
            href={`/dashboard/chat/${conversation.user_id}`}
            className="block bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
                  {conversation.user_name}
                </h3>
                {conversation.last_message && (
                  <>
                    <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">{conversation.last_message.content}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                      {new Date(conversation.last_message.created_at).toLocaleString()}
                    </p>
                  </>
                )}
              </div>
              {conversation.unread_count > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    {conversation.unread_count}
                  </span>
                </div>
              )}
            </div>
          </Link>
        );
      }
    });
  }, [conversations, user]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-blue-900/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              {totalUnreadCount > 0 && (
                <div className="relative inline-flex items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2 bg-red-600 text-white rounded-lg font-semibold">
                  <span className="text-base sm:text-lg mr-1 sm:mr-2">💬</span>
                  <span className="text-xs sm:text-sm hidden sm:inline">
                    {totalUnreadCount} {totalUnreadCount === 1 ? 'unread' : 'unread'}
                  </span>
                  <span className="text-xs sm:hidden">{totalUnreadCount}</span>
                </div>
              )}
              <Link
                href="/dashboard"
                className="group px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">Messages</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Loading conversations...</p>
          </div>
        ) : conversationsList ? (
          <div className="space-y-3 sm:space-y-4">
            {conversationsList}
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center shadow-lg">
            <p className="text-sm sm:text-base text-gray-600">No conversations yet. Start chatting with your connections!</p>
          </div>
        )}
      </div>
    </div>
  );
}


