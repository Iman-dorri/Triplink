'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { connectionAPI } from '@/lib/api';
import Link from 'next/link';

type ConnectionStatus = 'all' | 'pending' | 'accepted' | 'blocked';

export default function ConnectionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ConnectionStatus>('all');
  const [updatingConnection, setUpdatingConnection] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [activeTab, user]);

  const fetchConnections = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedConnections = await connectionAPI.getConnections(
        activeTab === 'all' ? undefined : activeTab
      );
      setConnections(fetchedConnections);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConnection = async (connectionId: string, status: 'accepted' | 'blocked') => {
    setUpdatingConnection(connectionId);
    setError('');
    try {
      await connectionAPI.updateConnection(connectionId, status);
      fetchConnections();
    } catch (err: any) {
      setError(err.message || 'Failed to update connection');
    } finally {
      setUpdatingConnection(null);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    
    setUpdatingConnection(connectionId);
    setError('');
    try {
      await connectionAPI.deleteConnection(connectionId);
      fetchConnections();
    } catch (err: any) {
      setError(err.message || 'Failed to delete connection');
    } finally {
      setUpdatingConnection(null);
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

  const getOtherUser = (connection: any) => {
    return connection.connected_user || connection.user;
  };

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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Connections</h1>

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-lg mb-6 flex gap-2">
          {(['all', 'pending', 'accepted', 'blocked'] as ConnectionStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Connections List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading connections...</p>
          </div>
        ) : connections.length > 0 ? (
          <div className="space-y-4">
            {connections.map((connection) => {
              const otherUser = getOtherUser(connection);
              return (
                <div
                  key={connection.id}
                  className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {otherUser?.first_name} {otherUser?.last_name}
                    </h3>
                    <p className="text-gray-600">{otherUser?.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                      connection.status === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : connection.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {connection.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {connection.status === 'pending' && connection.connected_user_id === user.id && (
                      <>
                        <button
                          onClick={() => handleUpdateConnection(connection.id, 'accepted')}
                          disabled={updatingConnection === connection.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateConnection(connection.id, 'blocked')}
                          disabled={updatingConnection === connection.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                        >
                          Block
                        </button>
                      </>
                    )}
                    {connection.status === 'pending' && connection.user_id === user.id && (
                      <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold">
                        Request Sent
                      </span>
                    )}
                    {connection.status === 'accepted' && (
                      <Link
                        href={`/dashboard/chat/${otherUser?.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                      >
                        Message
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteConnection(connection.id)}
                      disabled={updatingConnection === connection.id}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <p className="text-gray-600">No connections found.</p>
          </div>
        )}
      </div>
    </div>
  );
}


