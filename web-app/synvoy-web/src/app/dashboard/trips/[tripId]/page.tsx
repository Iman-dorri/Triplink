'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { tripAPI, connectionAPI } from '@/lib/api';
import Link from 'next/link';

export default function TripDetailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params?.tripId as string;
  
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableConnections, setAvailableConnections] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && tripId) {
      fetchTrip();
    }
  }, [tripId, user]);

  const fetchTrip = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedTrip = await tripAPI.getTrip(tripId);
      setTrip(fetchedTrip);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trip');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInviteModal = async () => {
    setShowInviteModal(true);
    setLoadingConnections(true);
    try {
      const connections = await connectionAPI.getConnections('accepted');
      // Filter out users already in the trip
      const participantIds = trip?.participants?.map((p: any) => p.user_id) || [];
      const available = connections.filter((conn: any) => {
        const otherUserId = conn.user_id === user?.id ? conn.connected_user_id : conn.user_id;
        return !participantIds.includes(otherUserId);
      });
      setAvailableConnections(available);
    } catch (err: any) {
      setError(err.message || 'Failed to load connections');
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) return;
    
    setInviting(true);
    setError('');
    try {
      await tripAPI.inviteUsers(tripId, selectedUsers);
      await fetchTrip(); // Refresh trip data
      setShowInviteModal(false);
      setSelectedUsers([]);
    } catch (err: any) {
      setError(err.message || 'Failed to invite users');
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvitation = async (participantId: string) => {
    try {
      await tripAPI.updateParticipantStatus(tripId, participantId, 'accepted');
      await fetchTrip();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
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

  const isCreator = trip.user_id === user.id;
  const currentParticipant = trip.participants?.find((p: any) => p.user_id === user.id);
  const acceptedParticipants = trip.participants?.filter((p: any) => p.status === 'accepted') || [];
  const pendingParticipants = trip.participants?.filter((p: any) => p.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-blue-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/dashboard/trips" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
              </div>
            </Link>
            <Link
              href="/dashboard/trips"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back to Trips
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Trip Info */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">{trip.title}</h1>
            {currentParticipant?.status === 'pending' && (
              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                ⏳ Pending Invitation
              </span>
            )}
          </div>
          {trip.description && (
            <p className="text-gray-600 mb-4">{trip.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            {trip.start_date && (
              <span>📅 Start: {new Date(trip.start_date).toLocaleDateString()}</span>
            )}
            {trip.end_date && (
              <span>📅 End: {new Date(trip.end_date).toLocaleDateString()}</span>
            )}
            {trip.budget && (
              <span>💰 Budget: ${trip.budget}</span>
            )}
            <span className={`px-3 py-1 rounded-full font-medium ${
              trip.status === 'active'
                ? 'bg-green-100 text-green-800'
                : trip.status === 'completed'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {trip.status}
            </span>
          </div>
          
          {/* Actions */}
          {currentParticipant?.status === 'accepted' && (
            <Link
              href={`/dashboard/trips/${tripId}/chat`}
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              💬 Open Group Chat
            </Link>
          )}
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
            {isCreator && (
              <button
                onClick={handleOpenInviteModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                + Invite Users
              </button>
            )}
          </div>

          {/* Accepted Participants */}
          {acceptedParticipants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Accepted ({acceptedParticipants.length})</h3>
              <div className="space-y-3">
                {acceptedParticipants.map((participant: any) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {participant.user?.first_name} {participant.user?.last_name}
                        {participant.role === 'creator' && ' (Creator)'}
                      </p>
                      <p className="text-sm text-gray-600">{participant.user?.email}</p>
                    </div>
                    {participant.user_id === user.id && (
                      <Link
                        href={`/dashboard/trips/${tripId}/chat`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm"
                      >
                        Chat
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Invitations */}
          {pendingParticipants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Pending Invitations ({pendingParticipants.length})</h3>
              <div className="space-y-3">
                {pendingParticipants.map((participant: any) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {participant.user?.first_name} {participant.user?.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{participant.user?.email}</p>
                    </div>
                    {participant.user_id === user.id && participant.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptInvitation(participant.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all text-sm"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Invite Users to Trip</h2>
            {loadingConnections ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading connections...</p>
              </div>
            ) : availableConnections.length > 0 ? (
              <div className="space-y-3 mb-6">
                {availableConnections.map((conn: any) => {
                  const otherUser = conn.user_id === user.id ? conn.connected_user : conn.user;
                  const isSelected = selectedUsers.includes(otherUser.id);
                  return (
                    <label
                      key={conn.id}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, otherUser.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== otherUser.id));
                          }
                        }}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {otherUser.first_name} {otherUser.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{otherUser.email}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 mb-6">No available connections to invite.</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedUsers([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUsers}
                disabled={selectedUsers.length === 0 || inviting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {inviting ? 'Inviting...' : `Invite (${selectedUsers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

