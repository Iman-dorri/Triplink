'use client'

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-blue-900/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20 gap-2">
            <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
              </div>
            </Link>
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
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
            Profile Settings
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600">View and manage your account information</p>
        </div>

        {/* User Profile Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-bold text-white shadow-xl border-4 border-white/30">
                  {user.first_name.charAt(0).toUpperCase()}{user.last_name.charAt(0).toUpperCase()}
                </div>
                {user.is_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-2 border-white shadow-lg">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* User Info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-blue-100 text-sm sm:text-base md:text-lg mb-2 sm:mb-3">@{user.username}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    user.is_verified 
                      ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                      : 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30'
                  }`}>
                    {user.is_verified ? (
                      <>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verified Account
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pending Verification
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/20 text-white border border-white/30 capitalize">
                    {user.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Personal Information */}
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                    <p className="text-sm sm:text-base text-gray-900 font-medium mt-1">{user.first_name} {user.last_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Username</label>
                    <p className="text-sm sm:text-base text-gray-900 font-medium mt-1">@{user.username}</p>
                  </div>
                  
                  {user.phone && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
                      <p className="text-sm sm:text-base text-gray-900 font-medium mt-1">{user.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Account Details
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Email Address</label>
                    <p className="text-sm sm:text-base text-gray-900 font-medium mt-1 break-words">{user.email}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Account Status</label>
                    <p className="text-sm sm:text-base text-gray-900 font-medium mt-1 capitalize">{user.status.replace('_', ' ')}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Member Since</label>
                    <p className="text-sm sm:text-base text-gray-900 font-medium mt-1">
                      {new Date(user.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  
                  {user.updated_at && user.updated_at !== user.created_at && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Last Updated</label>
                      <p className="text-sm sm:text-base text-gray-900 font-medium mt-1">
                        {new Date(user.updated_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account ID (for support purposes) */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Account ID</label>
                  <p className="text-xs sm:text-sm text-gray-500 font-mono mt-1 break-all">{user.id}</p>
                </div>
                <div className="text-xs text-gray-400">
                  Keep this ID for support inquiries
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

