'use client'

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedConversations = await messageAPI.getConversations();
      setConversations(fetchedConversations);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const getOtherUser = (conversation: any) => {
    if (conversation.sender?.id === user?.id) {
      return conversation.receiver;
    }
    return conversation.sender;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-blue-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
              </div>
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Messages</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading conversations...</p>
          </div>
        ) : conversations.length > 0 ? (
          <div className="space-y-4">
            {conversations.map((conversation) => {
              // Check if it's a trip chat or 1-on-1 chat
              if (conversation.trip_id) {
                return (
                  <Link
                    key={conversation.trip_id}
                    href={`/dashboard/trips/${conversation.trip_id}/chat`}
                    className="block bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🌍</span>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {conversation.trip_title}
                          </h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Group</span>
                        </div>
                        {conversation.last_message && (
                          <>
                            <p className="text-gray-600 mt-1">{conversation.last_message.content}</p>
                            <p className="text-gray-500 text-sm mt-2">
                              {new Date(conversation.last_message.created_at).toLocaleString()}
                            </p>
                          </>
                        )}
                      </div>
                      {conversation.unread_count > 0 && (
                        <div className="flex items-center gap-2">
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
                    className="block bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {conversation.user_name}
                        </h3>
                        {conversation.last_message && (
                          <>
                            <p className="text-gray-600 mt-1">{conversation.last_message.content}</p>
                            <p className="text-gray-500 text-sm mt-2">
                              {new Date(conversation.last_message.created_at).toLocaleString()}
                            </p>
                          </>
                        )}
                      </div>
                      {conversation.unread_count > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                            {conversation.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              }
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <p className="text-gray-600">No conversations yet. Start chatting with your connections!</p>
          </div>
        )}
      </div>
    </div>
  );
}


