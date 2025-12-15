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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
                <p className="text-[10px] sm:text-xs text-gray-500 -mt-0.5 sm:-mt-1 hidden sm:block">Smart Travel Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-sm sm:text-base text-gray-700 hidden sm:inline font-medium">Welcome, {user.first_name}!</span>
              <button
                onClick={handleLogout}
                className="group px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:border-red-200 hover:text-red-600 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="text-center mb-6 sm:mb-8 lg:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
            Welcome back, {user.first_name}! 🎉
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600">Your travel journey continues here</p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
          <Link href="/dashboard/search" className="h-full">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 h-full flex flex-col">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔍</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Find Users</h3>
              <p className="text-sm sm:text-base text-gray-600 flex-grow">Search and connect with other travelers</p>
            </div>
          </Link>

          <Link href="/dashboard/connections" className="h-full">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 h-full flex flex-col">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">👥</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Connections</h3>
              <p className="text-sm sm:text-base text-gray-600 flex-grow">Manage your travel connections</p>
            </div>
          </Link>

          <Link href="/dashboard/trips" className="h-full">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 h-full flex flex-col">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">✈️</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Trips</h3>
              <p className="text-sm sm:text-base text-gray-600 flex-grow">Create and manage your trips</p>
            </div>
          </Link>

          <Link href="/dashboard/messages" className="h-full">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 relative h-full flex flex-col">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 relative inline-block">
                💬
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-red-600 text-[10px] sm:text-xs font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Messages</h3>
              <p className="text-sm sm:text-base text-gray-600 flex-grow">Chat with your connections</p>
            </div>
          </Link>
        </div>

        {/* User Info Card */}
        <div className="mt-6 sm:mt-8 lg:mt-12 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Account Information</h2>
          <div className="space-y-2 sm:space-y-3">
            <div>
              <span className="text-xs sm:text-sm font-medium text-gray-500">Email:</span>
              <p className="text-sm sm:text-base text-gray-900 break-words">{user.email}</p>
            </div>
            <div>
              <span className="text-xs sm:text-sm font-medium text-gray-500">Status:</span>
              <p className="text-sm sm:text-base text-gray-900 capitalize">{user.status}</p>
            </div>
            {user.phone && (
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-500">Phone:</span>
                <p className="text-sm sm:text-base text-gray-900">{user.phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


