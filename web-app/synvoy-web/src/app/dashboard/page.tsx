'use client'

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { messageAPI } from '@/lib/api';

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const conversations = await messageAPI.getConversations();
        const total = conversations.reduce((sum: number, conv: any) => {
          return sum + (conv.unread_count || 0);
        }, 0);
        setUnreadCount(total);
      } catch (err) {
        // Silently fail - don't show errors for unread count
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Poll every 5 seconds
    intervalRef.current = setInterval(fetchUnreadCount, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);

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

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-blue-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
                <p className="text-xs text-gray-500 -mt-1">Smart Travel Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.first_name}!</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {user.first_name}! 🎉
          </h1>
          <p className="text-xl text-gray-600">Your travel journey continues here</p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/search">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Users</h3>
              <p className="text-gray-600">Search and connect with other travelers</p>
            </div>
          </Link>

          <Link href="/dashboard/connections">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connections</h3>
              <p className="text-gray-600">Manage your travel connections</p>
            </div>
          </Link>

          <Link href="/dashboard/trips">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="text-4xl mb-4">✈️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Trips</h3>
              <p className="text-gray-600">Create and manage your trips</p>
            </div>
          </Link>

          <Link href="/dashboard/messages">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 relative">
              <div className="text-4xl mb-4 relative inline-block">
                💬
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Messages</h3>
              <p className="text-gray-600">Chat with your connections</p>
            </div>
          </Link>
        </div>

        {/* User Info Card */}
        <div className="mt-12 bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <p className="text-gray-900 capitalize">{user.status}</p>
            </div>
            {user.phone && (
              <div>
                <span className="text-sm font-medium text-gray-500">Phone:</span>
                <p className="text-gray-900">{user.phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


