'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { connectionAPI } from '@/lib/api';
import Link from 'next/link';

export default function UserSearchPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const results = await connectionAPI.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || 'Failed to search users');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setSendingRequest(userId);
    setError('');
    try {
      await connectionAPI.sendConnectionRequest(userId);
      // Refresh search results to update connection status
      if (searchQuery.trim()) {
        await handleSearch();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send connection request');
    } finally {
      setSendingRequest(null);
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Find Users</h1>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name or email..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-4">
          {searchResults.length > 0 ? (
            searchResults.map((result) => (
              <div
                key={result.id}
                className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-between"
              >
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {result.first_name} {result.last_name}
                  </h3>
                  <p className="text-gray-600">{result.email}</p>
                  {result.phone && <p className="text-gray-500 text-sm">{result.phone}</p>}
                  {result.connection_status && (
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                      result.connection_status === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : result.connection_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {result.connection_status}
                    </span>
                  )}
                </div>
                <div>
                  {!result.connection_status ? (
                    <button
                      onClick={() => handleSendRequest(result.id)}
                      disabled={sendingRequest === result.id}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {sendingRequest === result.id ? 'Sending...' : 'Connect'}
                    </button>
                  ) : (
                    <span className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold">
                      {result.connection_status === 'accepted' ? 'Connected' : 'Request Sent'}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : searchQuery && !loading ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
              <p className="text-gray-600">No users found. Try a different search term.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

