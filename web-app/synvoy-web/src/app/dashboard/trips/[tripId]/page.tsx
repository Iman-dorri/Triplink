'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { tripAPI, connectionAPI, expenseAPI, settlementAPI } from '@/lib/api';
import { formatBudget, getCurrencySymbol } from '@/lib/currency';
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
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expensePayer, setExpensePayer] = useState('');
  const [expenseParticipants, setExpenseParticipants] = useState<string[]>([]);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseDescription, setEditExpenseDescription] = useState('');
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editBudgetCurrency, setEditBudgetCurrency] = useState('USD');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [selectedExpensesForSettlement, setSelectedExpensesForSettlement] = useState<string[]>([]);
  const [creatingSettlement, setCreatingSettlement] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustingExpenseId, setAdjustingExpenseId] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [adjustmentPayer, setAdjustmentPayer] = useState('');
  const [adjustmentParticipants, setAdjustmentParticipants] = useState<string[]>([]);
  const [creatingAdjustment, setCreatingAdjustment] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && tripId) {
      fetchTrip();
      fetchExpenses();
      fetchSettlements();
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
        // Get the other user ID from the connection
        // Use connected_user object if available, otherwise use IDs
        const otherUser = conn.user_id === user?.id 
          ? (conn.connected_user || { id: conn.connected_user_id })
          : (conn.user || { id: conn.user_id });
        const otherUserId = otherUser.id || (conn.user_id === user?.id ? conn.connected_user_id : conn.user_id);
        // Filter out deleted users, users scheduled for deletion, and users already in the trip
        // Check if user is deleted or scheduled for deletion
        const isDeleted = otherUser.deleted_at != null;
        const isScheduledForDeletion = otherUser.deletion_requested_at != null || otherUser.status === 'pending_deletion';
        // Also filter out users with missing name/username (incomplete data)
        const hasValidName = otherUser.first_name || otherUser.last_name || otherUser.username;
        return otherUserId && !isDeleted && !isScheduledForDeletion && hasValidName && !participantIds.includes(otherUserId);
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

  const handleDeleteTrip = async () => {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return;
    
    try {
      await tripAPI.deleteTrip(tripId);
      router.push('/dashboard/trips');
    } catch (err: any) {
      setError(err.message || 'Failed to delete trip');
    }
  };

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to remove ${participantName} from this trip?`)) return;
    
    try {
      await tripAPI.removeParticipant(tripId, participantId);
      await fetchTrip();
    } catch (err: any) {
      setError(err.message || 'Failed to remove participant');
    }
  };

  const fetchExpenses = async () => {
    if (!tripId) return;
    setLoadingExpenses(true);
    try {
      const fetchedExpenses = await expenseAPI.getTripExpenses(tripId);
      setExpenses(fetchedExpenses);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expenses');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchSettlements = async () => {
    if (!tripId) return;
    setLoadingSettlements(true);
    try {
      const fetchedSettlements = await settlementAPI.getTripSettlements(tripId);
      setSettlements(fetchedSettlements);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settlements');
    } finally {
      setLoadingSettlements(false);
    }
  };

  const handleOpenAddExpenseModal = () => {
    if (!trip) return;
    const acceptedParticipants = trip.participants?.filter((p: any) => p.status === 'accepted') || [];
    if (!acceptedParticipants.length) return;
    // Set default payer to current user if they're a participant
    const currentUserParticipant = acceptedParticipants.find((p: any) => p.user_id === user?.id);
    if (currentUserParticipant) {
      setExpensePayer(currentUserParticipant.user_id);
    } else if (acceptedParticipants.length > 0) {
      setExpensePayer(acceptedParticipants[0].user_id);
    }
    // Select all participants by default
    setExpenseParticipants(acceptedParticipants.map((p: any) => p.user_id));
    setShowAddExpenseModal(true);
  };

  const handleCreateExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!expensePayer) {
      setError('Please select a payer');
      return;
    }
    if (expenseParticipants.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    setCreatingExpense(true);
    setError('');
    try {
      // Normalize amount string: ensure exactly 2 decimal places if decimal exists
      let normalizedAmount = expenseAmount.trim();
      if (normalizedAmount.includes('.')) {
        const [intPart, decPart] = normalizedAmount.split('.');
        normalizedAmount = `${intPart}.${decPart.padEnd(2, '0').slice(0, 2)}`;
      }
      
      await expenseAPI.createExpense(tripId, {
        amount: normalizedAmount, // Send as string, not number
        description: expenseDescription || undefined,
        payer_user_id: expensePayer,
        participant_user_ids: expenseParticipants,
      });
      await fetchExpenses();
      setShowAddExpenseModal(false);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpensePayer('');
      setExpenseParticipants([]);
    } catch (err: any) {
      setError(err.message || 'Failed to create expense');
    } finally {
      setCreatingExpense(false);
    }
  };

  const handleOpenEditExpenseModal = (expense: any) => {
    setEditingExpenseId(expense.id);
    setEditExpenseAmount(expense.amount || '');
    setEditExpenseDescription(expense.description || '');
    setShowEditExpenseModal(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpenseId || !editExpenseAmount) {
      setError('Please enter a valid amount');
      return;
    }

    setEditingExpense(true);
    setError('');
    try {
      // Normalize amount string: ensure exactly 2 decimal places if decimal exists
      let normalizedAmount = editExpenseAmount.trim();
      if (normalizedAmount.includes('.')) {
        const [intPart, decPart] = normalizedAmount.split('.');
        normalizedAmount = `${intPart}.${decPart.padEnd(2, '0').slice(0, 2)}`;
      }
      
      await expenseAPI.updateExpense(editingExpenseId, {
        amount: normalizedAmount,
        description: editExpenseDescription || undefined,
      });
      await fetchExpenses();
      setShowEditExpenseModal(false);
      setEditingExpenseId(null);
      setEditExpenseAmount('');
      setEditExpenseDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to update expense');
    } finally {
      setEditingExpense(false);
    }
  };

  const handleToggleExpenseSelection = (expenseId: string) => {
    setSelectedExpensesForSettlement(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleCreateSettlement = async () => {
    if (selectedExpensesForSettlement.length === 0) {
      setError('Please select at least one expense');
      return;
    }

    // Filter to only active, unlocked expenses
    const validExpenses = expenses.filter((exp: any) => 
      selectedExpensesForSettlement.includes(exp.id) &&
      exp.status === 'ACTIVE' &&
      !exp.is_locked
    );

    if (validExpenses.length === 0) {
      setError('Selected expenses must be active and unlocked');
      return;
    }

    if (!confirm(`Create settlement with ${validExpenses.length} expense(s)?`)) {
      return;
    }

    setCreatingSettlement(true);
    setError('');
    try {
      await settlementAPI.createSettlement({
        expense_ids: validExpenses.map((exp: any) => exp.id),
      });
      await fetchExpenses();
      await fetchSettlements();
      setSelectedExpensesForSettlement([]);
    } catch (err: any) {
      setError(err.message || 'Failed to create settlement');
    } finally {
      setCreatingSettlement(false);
    }
  };

  const handleOpenAdjustmentModal = (expense: any) => {
    if (!trip) return;
    const acceptedParticipants = trip.participants?.filter((p: any) => p.status === 'accepted') || [];
    if (!acceptedParticipants.length) return;
    
    setAdjustingExpenseId(expense.id);
    setAdjustmentAmount('');
    setAdjustmentDescription('');
    // Set default payer to current user if they're a participant
    const currentUserParticipant = acceptedParticipants.find((p: any) => p.user_id === user?.id);
    if (currentUserParticipant) {
      setAdjustmentPayer(currentUserParticipant.user_id);
    } else if (acceptedParticipants.length > 0) {
      setAdjustmentPayer(acceptedParticipants[0].user_id);
    }
    // Select all participants by default
    setAdjustmentParticipants(acceptedParticipants.map((p: any) => p.user_id));
    setShowAdjustmentModal(true);
  };

  const handleCreateAdjustment = async () => {
    if (!adjustingExpenseId || !adjustmentAmount || parseFloat(adjustmentAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!adjustmentPayer) {
      setError('Please select a payer');
      return;
    }
    if (adjustmentParticipants.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    setCreatingAdjustment(true);
    setError('');
    try {
      // Normalize amount string: ensure exactly 2 decimal places if decimal exists
      let normalizedAmount = adjustmentAmount.trim();
      if (normalizedAmount.includes('.')) {
        const [intPart, decPart] = normalizedAmount.split('.');
        normalizedAmount = `${intPart}.${decPart.padEnd(2, '0').slice(0, 2)}`;
      }
      
      await expenseAPI.createExpense(tripId, {
        amount: normalizedAmount,
        description: adjustmentDescription || undefined,
        payer_user_id: adjustmentPayer,
        participant_user_ids: adjustmentParticipants,
        type: 'ADJUSTMENT',
        adjusts_expense_id: adjustingExpenseId,
      });
      await fetchExpenses();
      setShowAdjustmentModal(false);
      setAdjustingExpenseId(null);
      setAdjustmentAmount('');
      setAdjustmentDescription('');
      setAdjustmentPayer('');
      setAdjustmentParticipants([]);
    } catch (err: any) {
      setError(err.message || 'Failed to create adjustment');
    } finally {
      setCreatingAdjustment(false);
    }
  };

  const handleVoidExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to void this expense?')) return;
    try {
      await expenseAPI.voidExpense(expenseId);
      await fetchExpenses();
    } catch (err: any) {
      setError(err.message || 'Failed to void expense');
    }
  };

  const handleOpenEditTripModal = () => {
    if (!trip) return;
    setEditTitle(trip.title || '');
    setEditDescription(trip.description || '');
    setEditBudget(trip.budget ? trip.budget.toString() : '');
    setEditBudgetCurrency(trip.budget_currency || 'USD');
    setEditStartDate(trip.start_date ? new Date(trip.start_date).toISOString().split('T')[0] : '');
    setEditEndDate(trip.end_date ? new Date(trip.end_date).toISOString().split('T')[0] : '');
    setShowEditTripModal(true);
  };

  const handleUpdateTrip = async () => {
    if (!trip) return;
    
    setEditingTrip(true);
    setError('');
    
    try {
      // Validate dates
      if (editStartDate && editEndDate && new Date(editStartDate) > new Date(editEndDate)) {
        setError('End date cannot be before start date');
        setEditingTrip(false);
        return;
      }
      
      const tripData: any = {
        title: editTitle,
        description: editDescription || undefined,
        budget: editBudget ? parseFloat(editBudget) : undefined,
        budget_currency: editBudget ? editBudgetCurrency : undefined,
        start_date: editStartDate || undefined,
        end_date: editEndDate || undefined,
      };
      
      await tripAPI.updateTrip(tripId, tripData);
      await fetchTrip(); // Refresh trip data
      setShowEditTripModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update trip');
    } finally {
      setEditingTrip(false);
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

  const canEditExpense = (expense: any) => {
    if (expense.is_locked || expense.status !== 'ACTIVE') return false;
    if (expense.created_by_user_id === user?.id) return true;
    if (isCreator) return true;
    return false;
  };

  const canVoidExpense = (expense: any) => {
    if (expense.is_locked || expense.status !== 'ACTIVE') return false;
    const createdAt = new Date(expense.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    if (minutesSinceCreation <= 15 && expense.created_by_user_id === user?.id) return true;
    if (isCreator) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-blue-900/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20 gap-2">
            <Link href="/dashboard/trips" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
              </div>
            </Link>
            <Link
              href="/dashboard/trips"
              className="group px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Trips</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 sm:mb-6">
            {error}
          </div>
        )}

        {/* Trip Info */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 flex-1">{trip.title}</h1>
            {currentParticipant?.status === 'pending' && (
              <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-100 text-yellow-800 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                ⏳ Pending Invitation
              </span>
            )}
          </div>
          {trip.description && (
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{trip.description}</p>
          )}
          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-4">
            {trip.start_date && (
              <span>📅 Start: {new Date(trip.start_date).toLocaleDateString()}</span>
            )}
            {trip.end_date && (
              <span>📅 End: {new Date(trip.end_date).toLocaleDateString()}</span>
            )}
            {trip.budget && (
              <span>💰 Budget: {formatBudget(trip.budget, trip.budget_currency)}</span>
            )}
            <span className={`px-2 sm:px-3 py-1 rounded-full font-medium ${
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
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {currentParticipant?.status === 'accepted' && (
            <Link
              href={`/dashboard/trips/${tripId}/chat`}
                className="inline-block w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-blue-600 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-blue-700 transition-all text-center"
            >
              💬 Open Group Chat
            </Link>
          )}
            {isCreator && (
              <>
                <button
                  onClick={handleOpenEditTripModal}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg sm:rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Trip
                </button>
                <button
                  onClick={handleDeleteTrip}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-red-600 to-pink-600 rounded-lg sm:rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Trip
                </button>
              </>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Participants</h2>
            {isCreator && (
              <button
                onClick={handleOpenInviteModal}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite Users
              </button>
            )}
          </div>

          {/* Accepted Participants */}
          {acceptedParticipants.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Accepted ({acceptedParticipants.length})</h3>
              <div className="space-y-2 sm:space-y-3">
                {acceptedParticipants.map((participant: any) => (
                  <div key={participant.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {participant.user?.first_name} {participant.user?.last_name}
                        {participant.role === 'creator' && ' (Creator)'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">@{participant.user?.username}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {participant.user_id !== user.id && (
                      <Link
                          href={`/dashboard/chat/${participant.user_id}`}
                          className="w-full sm:w-auto px-3 sm:px-4 md:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat
                      </Link>
                    )}
                      {isCreator && participant.role !== 'creator' && (
                        <button
                          onClick={() => handleRemoveParticipant(participant.id, `${participant.user?.first_name} ${participant.user?.last_name}`)}
                          className="w-full sm:w-auto px-3 sm:px-4 md:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-pink-600 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Invitations */}
          {pendingParticipants.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Pending Invitations ({pendingParticipants.length})</h3>
              <div className="space-y-2 sm:space-y-3">
                {pendingParticipants.map((participant: any) => (
                  <div key={participant.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {participant.user?.first_name} {participant.user?.last_name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">@{participant.user?.username}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                    {participant.user_id === user.id && participant.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptInvitation(participant.id)}
                          className="w-full sm:w-auto px-3 sm:px-4 md:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept
                      </button>
                    )}
                      {isCreator && participant.role !== 'creator' && (
                        <button
                          onClick={() => handleRemoveParticipant(participant.id, `${participant.user?.first_name} ${participant.user?.last_name}`)}
                          className="w-full sm:w-auto px-3 sm:px-4 md:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-pink-600 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expenses Section */}
        {currentParticipant?.status === 'accepted' && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Expenses</h2>
              <button
                onClick={handleOpenAddExpenseModal}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Expense
              </button>
            </div>

            {loadingExpenses ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <p className="text-sm sm:text-base text-gray-600 text-center py-6 sm:py-8">No expenses yet. Add your first expense!</p>
            ) : (
              <div>
                {selectedExpensesForSettlement.length > 0 && (
                  <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm sm:text-base text-gray-700">
                      {selectedExpensesForSettlement.length} expense(s) selected
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedExpensesForSettlement([])}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleCreateSettlement}
                        disabled={creatingSettlement}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {creatingSettlement ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Create Settlement
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-3 sm:space-y-4">
                {expenses.map((expense: any) => {
                  const currency = trip.budget_currency || 'USD';
                  // amount is now a string from API, convert to number for calculations
                  const amountNum = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount;
                  const equalShare = amountNum / (expense.splits?.length || 1);
                  const isSelected = selectedExpensesForSettlement.includes(expense.id);
                  const canSelectForSettlement = expense.status === 'ACTIVE' && !expense.is_locked;
                  
                  return (
                    <div
                      key={expense.id}
                      className={`p-3 sm:p-4 rounded-lg border-2 ${
                        isSelected
                          ? 'bg-green-50 border-green-400'
                          : expense.type === 'ADJUSTMENT'
                          ? 'bg-purple-50 border-purple-200'
                          : expense.status === 'VOID'
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : expense.is_locked
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          {expense.type === 'ADJUSTMENT' && (
                            <div className="mb-2">
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                Adjustment
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-1">
                            {canSelectForSettlement && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleExpenseSelection(expense.id)}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                            )}
                            <span className="text-lg sm:text-xl font-bold text-gray-900">
                              {formatBudget(expense.amount, currency)}
                            </span>
                            {expense.is_locked && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                🔒 Locked
                              </span>
                            )}
                            {expense.status === 'VOID' && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                                Voided
                              </span>
                            )}
                          </div>
                          {expense.description && (
                            <p className="text-sm sm:text-base text-gray-700 mb-2">{expense.description}</p>
                          )}
                          <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                            <p>
                              Paid by: <span className="font-medium">{expense.payer?.first_name} {expense.payer?.last_name}</span>
                            </p>
                            {expense.splits && expense.splits.length > 0 ? (
                              <div>
                                <p className="mb-1">Split:</p>
                                <ul className="list-none space-y-0.5 ml-2">
                                  {expense.splits.map((split: any) => (
                                    <li key={split.id} className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {split.user?.first_name} {split.user?.last_name}:
                                      </span>
                                      <span>{formatBudget(split.share, currency)}</span>
                                    </li>
                                  ))}
                                </ul>
                                {(() => {
                                  // Check if there's a remainder (one split is larger than others)
                                  const shareCents = expense.splits.map((s: any) => s.share_cents || 0);
                                  const minShare = Math.min(...shareCents);
                                  const maxShare = Math.max(...shareCents);
                                  const hasRemainder = maxShare > minShare && shareCents.length > 1;
                                  if (hasRemainder) {
                                    const remainderCents = maxShare - minShare;
                                    const remainderAmount = (remainderCents / 100).toFixed(2);
                                    return (
                                      <p className="text-xs text-gray-500 mt-1 italic">
                                        Rounding remainder of {formatBudget(remainderAmount, currency)} assigned to payer.
                                      </p>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : (
                              <p>
                                Split equally: {formatBudget(equalShare, currency)} per person ({expense.splits?.length || 0} people)
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Created by {expense.creator?.first_name} {expense.creator?.last_name} • {new Date(expense.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {canEditExpense(expense) && (
                            <button
                              onClick={() => handleOpenEditExpenseModal(expense)}
                              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          {canVoidExpense(expense) && (
                            <button
                              onClick={() => handleVoidExpense(expense.id)}
                              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Void
                            </button>
                          )}
                          {expense.status === 'ACTIVE' && expense.type !== 'ADJUSTMENT' && (
                            <button
                              onClick={() => handleOpenAdjustmentModal(expense)}
                              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                            >
                              Adjust
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settlements Section */}
        {currentParticipant?.status === 'accepted' && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Settlements</h2>

            {loadingSettlements ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Loading settlements...</p>
              </div>
            ) : settlements.length === 0 ? (
              <p className="text-sm sm:text-base text-gray-600 text-center py-6 sm:py-8">No settlements yet. Create a settlement by selecting expenses above.</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {settlements.map((settlement: any) => {
                  const settlementExpenses = expenses.filter((exp: any) => 
                    settlement.expense_ids?.includes(exp.id)
                  );
                  const totalAmount = settlementExpenses.reduce((sum: number, exp: any) => {
                    const amount = typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount;
                    return sum + (amount || 0);
                  }, 0);
                  const currency = trip.budget_currency || 'USD';
                  
                  return (
                    <div
                      key={settlement.id}
                      className={`p-3 sm:p-4 rounded-lg border-2 ${
                        settlement.status === 'PAID'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              settlement.status === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {settlement.status === 'PAID' ? '✓ Paid' : 'Pending'}
                            </span>
                            <span className="text-lg sm:text-xl font-bold text-gray-900">
                              {formatBudget(totalAmount, currency)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-2">
                            {settlementExpenses.length} expense(s) • Created {new Date(settlement.created_at).toLocaleDateString()}
                            {settlement.status === 'PAID' && settlement.paid_at && (
                              <span> • Paid {new Date(settlement.paid_at).toLocaleDateString()}</span>
                            )}
                          </p>
                          <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                            <p className="font-medium">Expenses included:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {settlementExpenses.map((exp: any) => (
                                <li key={exp.id}>
                                  {formatBudget(exp.amount, currency)} - {exp.description || 'No description'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {settlement.status === 'PENDING' && isCreator && (
                          <button
                            onClick={async () => {
                              if (!confirm('Mark this settlement as paid? This will lock all included expenses.')) return;
                              try {
                                await settlementAPI.markSettlementPaid(settlement.id);
                                await fetchSettlements();
                                await fetchExpenses();
                              } catch (err: any) {
                                setError(err.message || 'Failed to mark settlement as paid');
                              }
                            }}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Mark as Paid
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Add Expense</h2>
            
            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Amount ({trip?.budget_currency || 'USD'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  placeholder="What was this expense for?"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Paid by
                </label>
                <select
                  value={expensePayer}
                  onChange={(e) => setExpensePayer(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                >
                  <option value="">Select payer...</option>
                  {acceptedParticipants.map((participant: any) => (
                    <option key={participant.id} value={participant.user_id}>
                      {participant.user?.first_name} {participant.user?.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Split among
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-3">
                  {acceptedParticipants.map((participant: any) => {
                    const isSelected = expenseParticipants.includes(participant.user_id);
                    return (
                      <label
                        key={participant.id}
                        className={`flex items-center p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExpenseParticipants([...expenseParticipants, participant.user_id]);
                            } else {
                              setExpenseParticipants(expenseParticipants.filter((id) => id !== participant.user_id));
                            }
                          }}
                          className="mr-2 sm:mr-3"
                        />
                        <span className="text-sm sm:text-base text-gray-900">
                          {participant.user?.first_name} {participant.user?.last_name}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {expenseAmount && expenseParticipants.length > 0 && (
                  <p className="mt-2 text-xs sm:text-sm text-gray-600">
                    Each person pays: {(parseFloat(expenseAmount) / expenseParticipants.length).toFixed(2)} {trip?.budget_currency || 'USD'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8">
              <button
                onClick={() => {
                  setShowAddExpenseModal(false);
                  setExpenseAmount('');
                  setExpenseDescription('');
                  setExpensePayer('');
                  setExpenseParticipants([]);
                }}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExpense}
                disabled={creatingExpense || !expenseAmount || !expensePayer || expenseParticipants.length === 0}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {creatingExpense ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Expense'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Invite Users to Trip</h2>
            {loadingConnections ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Loading connections...</p>
              </div>
            ) : availableConnections.length > 0 ? (
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                {availableConnections.map((conn: any) => {
                  // Get the other user from the connection
                  // Connection has connected_user object or we need to use IDs
                  const otherUser = conn.user_id === user.id 
                    ? (conn.connected_user || { 
                        id: conn.connected_user_id, 
                        first_name: '', 
                        last_name: '', 
                        username: '' 
                      })
                    : (conn.user || { 
                        id: conn.user_id, 
                        first_name: '', 
                        last_name: '', 
                        username: '' 
                      });
                  const otherUserId = otherUser.id || (conn.user_id === user.id ? conn.connected_user_id : conn.user_id);
                  // Skip if user is deleted, scheduled for deletion, or has no valid name
                  const isDeleted = otherUser.deleted_at != null;
                  const isScheduledForDeletion = otherUser.deletion_requested_at != null || otherUser.status === 'pending_deletion';
                  const hasValidName = otherUser.first_name || otherUser.last_name || otherUser.username;
                  if (!otherUserId || isDeleted || isScheduledForDeletion || !hasValidName) {
                    return null;
                  }
                  const isSelected = selectedUsers.includes(otherUserId);
                  return (
                    <label
                      key={conn.id}
                      className={`flex items-center p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, otherUserId]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== otherUserId));
                          }
                        }}
                        className="mr-2 sm:mr-3"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                          {otherUser.first_name} {otherUser.last_name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">@{otherUser.username}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">No available connections to invite.</p>
            )}
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedUsers([]);
                }}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUsers}
                disabled={selectedUsers.length === 0 || inviting}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {inviting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Inviting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Invite ({selectedUsers.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Edit Expense</h2>
            
            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Amount ({trip?.budget_currency || 'USD'}) *
                </label>
                <input
                  type="text"
                  value={editExpenseAmount}
                  onChange={(e) => setEditExpenseAmount(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={editExpenseDescription}
                  onChange={(e) => setEditExpenseDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What was this expense for?"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8">
              <button
                type="button"
                onClick={() => {
                  setShowEditExpenseModal(false);
                  setEditingExpenseId(null);
                  setEditExpenseAmount('');
                  setEditExpenseDescription('');
                  setError('');
                }}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateExpense}
                disabled={editingExpense || !editExpenseAmount}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {editingExpense ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Expense'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {showEditTripModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Edit Trip</h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Summer Vacation 2024"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Tell us about your trip..."
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Budget
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <select
                    value={editBudgetCurrency}
                    onChange={(e) => setEditBudgetCurrency(e.target.value)}
                    className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                    <option value="CHF">CHF</option>
                    <option value="CNY">CNY</option>
                    <option value="INR">INR</option>
                    <option value="MXN">MXN</option>
                    <option value="BRL">BRL</option>
                    <option value="SEK">SEK</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => {
                      setEditStartDate(e.target.value);
                      // If end date is before new start date, clear it
                      if (editEndDate && e.target.value && new Date(e.target.value) > new Date(editEndDate)) {
                        setEditEndDate('');
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    min={editStartDate || new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      editEndDate && editStartDate && new Date(editEndDate) < new Date(editStartDate)
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                  {editEndDate && editStartDate && new Date(editEndDate) < new Date(editStartDate) && (
                    <p className="text-xs text-red-600 mt-1">End date cannot be before start date</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4 mt-4 sm:mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEditTripModal(false);
                  setError('');
                }}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateTrip}
                disabled={editingTrip || !editTitle}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {editingTrip ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Trip'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Create Adjustment</h2>
            
            <div className="space-y-4 sm:space-y-5">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Note:</strong> Adjustments can be created even if the original expense is locked. This creates a new expense entry to correct or modify the original.
                </p>
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Adjustment Amount ({trip?.budget_currency || 'USD'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={adjustmentDescription}
                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base"
                  placeholder="Reason for adjustment"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Paid by
                </label>
                <select
                  value={adjustmentPayer}
                  onChange={(e) => setAdjustmentPayer(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base"
                >
                  <option value="">Select payer...</option>
                  {acceptedParticipants.map((participant: any) => (
                    <option key={participant.id} value={participant.user_id}>
                      {participant.user?.first_name} {participant.user?.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Split among
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-3">
                  {acceptedParticipants.map((participant: any) => {
                    const isSelected = adjustmentParticipants.includes(participant.user_id);
                    return (
                      <label
                        key={participant.id}
                        className={`flex items-center p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAdjustmentParticipants([...adjustmentParticipants, participant.user_id]);
                            } else {
                              setAdjustmentParticipants(adjustmentParticipants.filter((id) => id !== participant.user_id));
                            }
                          }}
                          className="mr-2 sm:mr-3"
                        />
                        <span className="text-sm sm:text-base text-gray-900">
                          {participant.user?.first_name} {participant.user?.last_name}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {adjustmentAmount && adjustmentParticipants.length > 0 && (
                  <p className="mt-2 text-xs sm:text-sm text-gray-600">
                    Each person pays: {(parseFloat(adjustmentAmount) / adjustmentParticipants.length).toFixed(2)} {trip?.budget_currency || 'USD'}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    setShowAdjustmentModal(false);
                    setAdjustingExpenseId(null);
                    setAdjustmentAmount('');
                    setAdjustmentDescription('');
                    setAdjustmentPayer('');
                    setAdjustmentParticipants([]);
                    setError('');
                  }}
                  className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAdjustment}
                  disabled={creatingAdjustment || !adjustmentAmount || !adjustmentPayer || adjustmentParticipants.length === 0}
                  className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {creatingAdjustment ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Adjustment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

