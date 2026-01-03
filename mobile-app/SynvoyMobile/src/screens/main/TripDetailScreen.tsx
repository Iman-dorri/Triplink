import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../services/api';
import LinearGradient from 'react-native-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { formatBudget, getCurrencySymbol } from '../../utils/currency';

const TripDetailScreen = ({ route, navigation }: any) => {
  const { tripId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
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
  const [showEditCurrencyModal, setShowEditCurrencyModal] = useState(false);
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
  const [showEditStartDatePicker, setShowEditStartDatePicker] = useState(false);
  const [showEditEndDatePicker, setShowEditEndDatePicker] = useState(false);
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  // Format date for display
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Convert YYYY-MM-DD string to Date
  const stringToDate = (dateString: string): Date => {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'SEK', name: 'Swedish Krona' },
  ];

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
      const fetchedTrip = await apiService.getTrip(tripId);
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
      const connections = await apiService.getConnections('accepted');
      // Filter out users already in the trip
      const participantIds = trip?.participants?.map((p: any) => p.user_id) || [];
      const available = connections.filter((conn: any) => {
        // Get the other user from the connection
        // Connection can have user/connected_user or user_id/connected_user_id
        const otherUser = conn.user_id === user?.id ? (conn.connected_user || { id: conn.connected_user_id }) : (conn.user || { id: conn.user_id });
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
      await apiService.inviteUsers(tripId, selectedUsers);
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
      await apiService.updateParticipantStatus(tripId, participantId, 'accepted');
      await fetchTrip();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
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
        Alert.alert('Error', 'End date cannot be before start date');
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
      
      await apiService.updateTrip(tripId, tripData);
      await fetchTrip(); // Refresh trip data
      setShowEditTripModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update trip');
      Alert.alert('Error', err.message || 'Failed to update trip');
    } finally {
      setEditingTrip(false);
    }
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteTrip(tripId);
              navigation.goBack();
            } catch (err: any) {
              setError(err.message || 'Failed to delete trip');
            }
          },
        },
      ]
    );
  };

  const handleRemoveParticipant = (participantId: string, participantName: string) => {
    Alert.alert(
      'Remove Participant',
      `Are you sure you want to remove ${participantName} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.removeParticipant(tripId, participantId);
              await fetchTrip();
            } catch (err: any) {
              setError(err.message || 'Failed to remove participant');
            }
          },
        },
      ]
    );
  };

  const fetchExpenses = async () => {
    if (!tripId) return;
    setLoadingExpenses(true);
    try {
      const fetchedExpenses = await apiService.getTripExpenses(tripId);
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
      const fetchedSettlements = await apiService.getTripSettlements(tripId);
      setSettlements(fetchedSettlements);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settlements');
    } finally {
      setLoadingSettlements(false);
    }
  };

  const handleOpenAddExpenseModal = () => {
    if (!trip || !acceptedParticipants.length) return;
    const currentUserParticipant = acceptedParticipants.find((p: any) => p.user_id === user?.id);
    if (currentUserParticipant) {
      setExpensePayer(currentUserParticipant.user_id);
    } else if (acceptedParticipants.length > 0) {
      setExpensePayer(acceptedParticipants[0].user_id);
    }
    setExpenseParticipants(acceptedParticipants.map((p: any) => p.user_id));
    setShowAddExpenseModal(true);
  };

  const handleCreateExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!expensePayer) {
      Alert.alert('Error', 'Please select a payer');
      return;
    }
    if (expenseParticipants.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
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
      
      await apiService.createExpense(tripId, {
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
      Alert.alert('Error', err.message || 'Failed to create expense');
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
      Alert.alert('Error', 'Please enter a valid amount');
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
      
      await apiService.updateExpense(editingExpenseId, {
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
      Alert.alert('Error', err.message || 'Failed to update expense');
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
      Alert.alert('Error', 'Please select at least one expense');
      return;
    }

    // Filter to only active, unlocked expenses
    const validExpenses = expenses.filter((exp: any) => 
      selectedExpensesForSettlement.includes(exp.id) &&
      exp.status === 'ACTIVE' &&
      !exp.is_locked
    );

    if (validExpenses.length === 0) {
      Alert.alert('Error', 'Selected expenses must be active and unlocked');
      return;
    }

    Alert.alert(
      'Create Settlement',
      `Create settlement with ${validExpenses.length} expense(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setCreatingSettlement(true);
            setError('');
            try {
              await apiService.createSettlement({
                expense_ids: validExpenses.map((exp: any) => exp.id),
              });
              await fetchExpenses();
              await fetchSettlements();
              setSelectedExpensesForSettlement([]);
            } catch (err: any) {
              setError(err.message || 'Failed to create settlement');
              Alert.alert('Error', err.message || 'Failed to create settlement');
            } finally {
              setCreatingSettlement(false);
            }
          },
        },
      ]
    );
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
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!adjustmentPayer) {
      Alert.alert('Error', 'Please select a payer');
      return;
    }
    if (adjustmentParticipants.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
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
      
      await apiService.createExpense(tripId, {
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
      Alert.alert('Error', err.message || 'Failed to create adjustment');
    } finally {
      setCreatingAdjustment(false);
    }
  };

  const handleVoidExpense = (expenseId: string) => {
    Alert.alert(
      'Void Expense',
      'Are you sure you want to void this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.voidExpense(expenseId);
              await fetchExpenses();
            } catch (err: any) {
              setError(err.message || 'Failed to void expense');
              Alert.alert('Error', err.message || 'Failed to void expense');
            }
          },
        },
      ]
    );
  };

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

  if (loading && !trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (!trip) return null;

  const isCreator = trip.user_id === user?.id;
  const currentParticipant = trip.participants?.find((p: any) => p.user_id === user?.id);
  const acceptedParticipants = trip.participants?.filter((p: any) => p.status === 'accepted') || [];
  const pendingParticipants = trip.participants?.filter((p: any) => p.status === 'pending') || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.emerald[500];
      case 'completed':
        return colors.gray[500];
      default:
        return colors.primary[500];
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Trip Info */}
        <View style={styles.card}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            {currentParticipant?.status === 'pending' && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>⏳ Pending Invitation</Text>
              </View>
            )}
          </View>
          {trip.description && (
            <Text style={styles.tripDescription}>{trip.description}</Text>
          )}
          <View style={styles.tripMeta}>
            {trip.start_date && (
              <Text style={styles.metaText}>📅 Start: {new Date(trip.start_date).toLocaleDateString()}</Text>
            )}
            {trip.end_date && (
              <Text style={styles.metaText}>📅 End: {new Date(trip.end_date).toLocaleDateString()}</Text>
            )}
            {trip.budget && (
              <Text style={styles.metaText}>💰 Budget: {formatBudget(trip.budget, trip.budget_currency)}</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
              <Text style={styles.statusText}>{trip.status}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {currentParticipant?.status === 'accepted' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Chat', { tripId })}
              >
                <LinearGradient
                  colors={[colors.primary[600], colors.cyan[500]]}
                  style={styles.chatButtonGradient}
                >
                  <Icon name="message" size={18} color={colors.text.white} />
                  <Text style={styles.chatButtonText}>Open Group Chat</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {isCreator && (
              <>
                <TouchableOpacity
                  onPress={handleOpenEditTripModal}
                >
                  <LinearGradient
                    colors={['#9333ea', '#6366f1']}
                    style={styles.editButtonGradient}
                  >
                    <Icon name="edit" size={18} color={colors.text.white} />
                    <Text style={styles.editButtonText}>Edit Trip</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteTrip}
                >
                  <Icon name="delete" size={18} color={colors.text.white} />
                  <Text style={styles.deleteButtonText}>Delete Trip</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Participants */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Participants</Text>
            {isCreator && (
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleOpenInviteModal}
              >
                <LinearGradient
                  colors={[colors.primary[600], colors.cyan[500]]}
                  style={styles.inviteButtonGradient}
                >
                  <Icon name="person-add" size={18} color={colors.text.white} />
                  <Text style={styles.inviteButtonText}>Invite</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Accepted Participants */}
          {acceptedParticipants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.participantsSubtitle}>Accepted ({acceptedParticipants.length})</Text>
              {acceptedParticipants.map((participant: any) => (
                <View key={participant.id} style={styles.participantItem}>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.user?.first_name} {participant.user?.last_name}
                      {participant.role === 'creator' && ' (Creator)'}
                    </Text>
                    <Text style={styles.participantUsername}>@{participant.user?.username}</Text>
                  </View>
                  <View style={styles.participantActions}>
                    {participant.user_id !== user?.id && (
                      <TouchableOpacity
                        style={styles.chatUserButton}
                        onPress={() => navigation.navigate('Chat', { userId: participant.user_id })}
                      >
                        <Icon name="message" size={18} color={colors.primary[600]} />
                      </TouchableOpacity>
                    )}
                    {isCreator && participant.role !== 'creator' && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveParticipant(
                          participant.id,
                          `${participant.user?.first_name} ${participant.user?.last_name}`
                        )}
                      >
                        <Icon name="person-remove" size={18} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Pending Invitations */}
          {pendingParticipants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.participantsSubtitle}>Pending ({pendingParticipants.length})</Text>
              {pendingParticipants.map((participant: any) => (
                <View key={participant.id} style={[styles.participantItem, styles.pendingParticipant]}>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.user?.first_name} {participant.user?.last_name}
                    </Text>
                    <Text style={styles.participantUsername}>@{participant.user?.username}</Text>
                  </View>
                  <View style={styles.participantActions}>
                    {participant.user_id === user?.id && participant.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptInvitation(participant.id)}
                      >
                        <Icon name="check" size={18} color={colors.text.white} />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                    )}
                    {isCreator && participant.role !== 'creator' && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveParticipant(
                          participant.id,
                          `${participant.user?.first_name} ${participant.user?.last_name}`
                        )}
                      >
                        <Icon name="person-remove" size={18} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Expenses Section */}
        {currentParticipant?.status === 'accepted' && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Expenses</Text>
              <TouchableOpacity
                style={styles.addExpenseButton}
                onPress={handleOpenAddExpenseModal}
              >
                <LinearGradient
                  colors={[colors.emerald[600], colors.green[500]]}
                  style={styles.addExpenseButtonGradient}
                >
                  <Icon name="add" size={18} color={colors.text.white} />
                  <Text style={styles.addExpenseButtonText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {loadingExpenses ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>Loading expenses...</Text>
              </View>
            ) : expenses.length === 0 ? (
              <Text style={styles.emptyText}>No expenses yet. Add your first expense!</Text>
            ) : (
              <View>
                {selectedExpensesForSettlement.length > 0 && (
                  <View style={styles.settlementSelectionBar}>
                    <Text style={styles.settlementSelectionText} numberOfLines={2}>
                      {selectedExpensesForSettlement.length} expense(s) selected
                    </Text>
                    <View style={styles.settlementSelectionActions}>
                      <TouchableOpacity
                        style={styles.settlementClearButton}
                        onPress={() => setSelectedExpensesForSettlement([])}
                      >
                        <Text style={styles.settlementClearText}>Clear</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.settlementCreateButton, creatingSettlement && styles.settlementCreateButtonDisabled]}
                        onPress={handleCreateSettlement}
                        disabled={creatingSettlement}
                      >
                        {creatingSettlement ? (
                          <ActivityIndicator size="small" color={colors.text.white} />
                        ) : (
                          <Text style={styles.settlementCreateText} numberOfLines={1}>Create Settlement</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={styles.expensesList}>
                {expenses.map((expense: any) => {
                  const currency = trip.budget_currency || 'USD';
                  // amount is now a string from API, convert to number for calculations
                  const amountNum = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount;
                  const equalShare = amountNum / (expense.splits?.length || 1);
                  const isSelected = selectedExpensesForSettlement.includes(expense.id);
                  const canSelectForSettlement = expense.status === 'ACTIVE' && !expense.is_locked;
                  
                  return (
                      <View
                        key={expense.id}
                        style={[
                          styles.expenseItem,
                          isSelected && styles.expenseItemSelected,
                          expense.type === 'ADJUSTMENT' && styles.expenseItemAdjustment,
                          expense.status === 'VOID' && styles.expenseItemVoided,
                          expense.is_locked && styles.expenseItemLocked,
                        ]}
                      >
                        {expense.type === 'ADJUSTMENT' && (
                          <View style={styles.adjustmentBadge}>
                            <Text style={styles.adjustmentBadgeText}>Adjustment</Text>
                          </View>
                        )}
                      <View style={styles.expenseHeader}>
                        <View style={styles.expenseAmountContainer}>
                          {canSelectForSettlement && (
                            <TouchableOpacity
                              onPress={() => handleToggleExpenseSelection(expense.id)}
                              style={styles.expenseCheckbox}
                            >
                              <Icon
                                name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                                size={24}
                                color={isSelected ? colors.primary[600] : colors.gray[400]}
                              />
                            </TouchableOpacity>
                          )}
                          <Text style={styles.expenseAmount}>
                            {formatBudget(expense.amount, currency)}
                          </Text>
                          {expense.is_locked && (
                            <View style={styles.lockedBadge}>
                              <Text style={styles.lockedBadgeText}>🔒 Locked</Text>
                            </View>
                          )}
                          {expense.status === 'VOID' && (
                            <View style={styles.voidedBadge}>
                              <Text style={styles.voidedBadgeText}>Voided</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.expenseActions}>
                          {canEditExpense(expense) && (
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => handleOpenEditExpenseModal(expense)}
                            >
                              <Icon name="edit" size={18} color={colors.primary[600]} />
                            </TouchableOpacity>
                          )}
                          {canVoidExpense(expense) && (
                            <TouchableOpacity
                              style={styles.voidButton}
                              onPress={() => handleVoidExpense(expense.id)}
                            >
                              <Icon name="delete-outline" size={18} color={colors.error} />
                              <Text style={styles.voidButtonText}>Void</Text>
                            </TouchableOpacity>
                          )}
                          {expense.status === 'ACTIVE' && expense.type !== 'ADJUSTMENT' && (
                            <TouchableOpacity
                              style={styles.adjustButton}
                              onPress={() => handleOpenAdjustmentModal(expense)}
                            >
                              <Icon name="tune" size={18} color={colors.purple[600]} />
                              <Text style={styles.adjustButtonText}>Adjust</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {expense.description && (
                        <Text style={styles.expenseDescription}>{expense.description}</Text>
                      )}
                      <View style={styles.expenseDetails}>
                        <Text style={styles.expenseDetailText}>
                          Paid by: <Text style={styles.expenseDetailBold}>{expense.payer?.first_name} {expense.payer?.last_name}</Text>
                        </Text>
                        {expense.splits && expense.splits.length > 0 ? (
                          <View style={styles.splitDetails}>
                            <Text style={styles.expenseDetailText}>Split:</Text>
                            {expense.splits.map((split: any) => (
                              <Text key={split.id} style={styles.splitItem}>
                                <Text style={styles.expenseDetailBold}>
                                  {split.user?.first_name} {split.user?.last_name}:
                                </Text>
                                {' '}{formatBudget(split.share, currency)}
                              </Text>
                            ))}
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
                                  <Text style={[styles.expenseDetailSmall, { fontStyle: 'italic', marginTop: 4 }]}>
                                    Rounding remainder of {formatBudget(remainderAmount, currency)} assigned to payer.
                                  </Text>
                                );
                              }
                              return null;
                            })()}
                          </View>
                        ) : (
                          <Text style={styles.expenseDetailText}>
                            Split: {formatBudget(equalShare, currency)} per person ({expense.splits?.length || 0} people)
                          </Text>
                        )}
                        <Text style={styles.expenseDetailSmall}>
                          Created by {expense.creator?.first_name} {expense.creator?.last_name} • {new Date(expense.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Settlements Section */}
        {currentParticipant?.status === 'accepted' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Settlements</Text>

            {loadingSettlements ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>Loading settlements...</Text>
              </View>
            ) : settlements.length === 0 ? (
              <Text style={styles.emptyText}>No settlements yet. Create a settlement by selecting expenses above.</Text>
            ) : (
              <View style={styles.settlementsList}>
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
                    <View
                      key={settlement.id}
                      style={[
                        styles.settlementItem,
                        settlement.status === 'PAID' && styles.settlementItemPaid,
                      ]}
                    >
                      <View style={styles.settlementHeader}>
                        <View style={styles.settlementStatusContainer}>
                          <View style={[
                            styles.settlementStatusBadge,
                            settlement.status === 'PAID' ? styles.settlementStatusPaid : styles.settlementStatusPending,
                          ]}>
                            <Text style={[
                              styles.settlementStatusText,
                              settlement.status === 'PAID' ? styles.settlementStatusTextPaid : styles.settlementStatusTextPending,
                            ]}>
                              {settlement.status === 'PAID' ? '✓ Paid' : 'Pending'}
                            </Text>
                          </View>
                          <Text style={styles.settlementAmount}>
                            {formatBudget(totalAmount, currency)}
                          </Text>
                        </View>
                        {settlement.status === 'PENDING' && isCreator && (
                          <TouchableOpacity
                            style={styles.markPaidButton}
                            onPress={async () => {
                              Alert.alert(
                                'Mark as Paid',
                                'Mark this settlement as paid? This will lock all included expenses.',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Mark as Paid',
                                    onPress: async () => {
                                      try {
                                        await apiService.markSettlementPaid(settlement.id);
                                        await fetchSettlements();
                                        await fetchExpenses();
                                      } catch (err: any) {
                                        setError(err.message || 'Failed to mark settlement as paid');
                                        Alert.alert('Error', err.message || 'Failed to mark settlement as paid');
                                      }
                                    },
                                  },
                                ]
                              );
                            }}
                          >
                            <Icon name="check-circle" size={18} color={colors.text.white} />
                            <Text style={styles.markPaidText}>Mark as Paid</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.settlementInfo}>
                        {settlementExpenses.length} expense(s) • Created {new Date(settlement.created_at).toLocaleDateString()}
                        {settlement.status === 'PAID' && settlement.paid_at && (
                          <Text> • Paid {new Date(settlement.paid_at).toLocaleDateString()}</Text>
                        )}
                      </Text>
                      <View style={styles.settlementExpensesList}>
                        <Text style={styles.settlementExpensesTitle}>Expenses included:</Text>
                        {settlementExpenses.map((exp: any) => (
                          <Text key={exp.id} style={styles.settlementExpenseItem}>
                            • {formatBudget(exp.amount, currency)} - {exp.description || 'No description'}
                          </Text>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddExpenseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddExpenseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            
            <ScrollView 
              style={styles.modalScrollView} 
              contentContainerStyle={styles.modalForm}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Amount ({trip?.budget_currency || 'USD'})
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={expenseDescription}
                  onChangeText={setExpenseDescription}
                  placeholder="What was this expense for?"
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Paid by</Text>
                <View style={styles.pickerContainer}>
                  {acceptedParticipants.map((participant: any) => (
                    <TouchableOpacity
                      key={participant.id}
                      style={[
                        styles.pickerOption,
                        expensePayer === participant.user_id && styles.pickerOptionSelected,
                      ]}
                      onPress={() => setExpensePayer(participant.user_id)}
                    >
                      <Icon
                        name={expensePayer === participant.user_id ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={20}
                        color={expensePayer === participant.user_id ? colors.primary[600] : colors.gray[400]}
                      />
                      <Text style={[
                        styles.pickerOptionText,
                        expensePayer === participant.user_id && styles.pickerOptionTextSelected,
                      ]}>
                        {participant.user?.first_name} {participant.user?.last_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Split among</Text>
                <View style={styles.participantsChecklist}>
                  {acceptedParticipants.map((participant: any) => {
                    const isSelected = expenseParticipants.includes(participant.user_id);
                    return (
                      <TouchableOpacity
                        key={participant.id}
                        style={[
                          styles.checklistItem,
                          isSelected && styles.checklistItemSelected,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setExpenseParticipants(expenseParticipants.filter((id) => id !== participant.user_id));
                          } else {
                            setExpenseParticipants([...expenseParticipants, participant.user_id]);
                          }
                        }}
                      >
                        <Icon
                          name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                          size={24}
                          color={isSelected ? colors.primary[600] : colors.gray[400]}
                        />
                        <Text style={[
                          styles.checklistItemText,
                          isSelected && styles.checklistItemTextSelected,
                        ]}>
                          {participant.user?.first_name} {participant.user?.last_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {expenseAmount && expenseParticipants.length > 0 && (
                  <Text style={styles.splitPreview}>
                    Each person pays: {(parseFloat(expenseAmount) / expenseParticipants.length).toFixed(2)} {trip?.budget_currency || 'USD'}
                  </Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddExpenseModal(false);
                  setExpenseAmount('');
                  setExpenseDescription('');
                  setExpensePayer('');
                  setExpenseParticipants([]);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreateButton,
                  (creatingExpense || !expenseAmount || !expensePayer || expenseParticipants.length === 0) && styles.modalCreateButtonDisabled,
                ]}
                onPress={handleCreateExpense}
                disabled={creatingExpense || !expenseAmount || !expensePayer || expenseParticipants.length === 0}
              >
                {creatingExpense ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        visible={showEditExpenseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditExpenseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Expense</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditExpenseModal(false);
                  setEditingExpenseId(null);
                  setEditExpenseAmount('');
                  setEditExpenseDescription('');
                  setError('');
                }}
              >
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
              <View style={styles.modalForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Amount ({trip?.budget_currency || 'USD'}) *
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={editExpenseAmount}
                    onChangeText={setEditExpenseAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.secondary}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description (optional)</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={editExpenseDescription}
                    onChangeText={setEditExpenseDescription}
                    placeholder="What was this expense for?"
                    placeholderTextColor={colors.text.secondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowEditExpenseModal(false);
                  setEditingExpenseId(null);
                  setEditExpenseAmount('');
                  setEditExpenseDescription('');
                  setError('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreateButton,
                  (editingExpense || !editExpenseAmount) && styles.modalCreateButtonDisabled,
                ]}
                onPress={handleUpdateExpense}
                disabled={editingExpense || !editExpenseAmount}
              >
                {editingExpense ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Text style={styles.modalCreateText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Users to Trip</Text>
            {loadingConnections ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.modalLoadingText}>Loading connections...</Text>
              </View>
            ) : availableConnections.length > 0 ? (
              <>
                <FlatList
                  data={availableConnections}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    // Get the other user from the connection
                    const otherUser = item.user_id === user?.id 
                      ? (item.connected_user || { id: item.connected_user_id, first_name: '', last_name: '', username: '' })
                      : (item.user || { id: item.user_id, first_name: '', last_name: '', username: '' });
                    const otherUserId = otherUser.id || (item.user_id === user?.id ? item.connected_user_id : item.user_id);
                    const isSelected = selectedUsers.includes(otherUserId);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.connectionItem,
                          isSelected && styles.connectionItemSelected,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedUsers(selectedUsers.filter(id => id !== otherUserId));
                          } else {
                            setSelectedUsers([...selectedUsers, otherUserId]);
                          }
                        }}
                      >
                        <Icon
                          name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                          size={24}
                          color={isSelected ? colors.primary[600] : colors.gray[400]}
                        />
                        <View style={styles.connectionInfo}>
                          <Text style={styles.connectionName}>
                            {otherUser.first_name} {otherUser.last_name}
                          </Text>
                          <Text style={styles.connectionUsername}>@{otherUser.username}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.connectionsList}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowInviteModal(false);
                      setSelectedUsers([]);
                    }}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalInviteButton,
                      (selectedUsers.length === 0 || inviting) && styles.modalInviteButtonDisabled,
                    ]}
                    onPress={handleInviteUsers}
                    disabled={selectedUsers.length === 0 || inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color={colors.text.white} />
                    ) : (
                      <Text style={styles.modalInviteText}>
                        Invite ({selectedUsers.length})
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalEmptyText}>No available connections to invite.</Text>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Trip Modal */}
      <Modal
        visible={showEditTripModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditTripModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Trip</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditTripModal(false);
                  setError('');
                }}
              >
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
              <View style={styles.modalForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Title *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="e.g., Summer Vacation 2024"
                    placeholderTextColor={colors.text.secondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Tell us about your trip..."
                    placeholderTextColor={colors.text.secondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Budget</Text>
                  <View style={styles.budgetRow}>
                    <TextInput
                      style={[styles.formInput, styles.budgetInput]}
                      value={editBudget}
                      onChangeText={setEditBudget}
                      placeholder="0.00"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="decimal-pad"
                    />
                    <TouchableOpacity
                      style={styles.currencyButton}
                      onPress={() => setShowEditCurrencyModal(true)}
                    >
                      <Text style={styles.currencyButtonText}>{editBudgetCurrency}</Text>
                      <Icon name="arrow-drop-down" size={20} color={colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEditStartDatePicker(true)}
                  >
                    <Icon name="calendar-today" size={20} color={colors.text.primary} />
                    <Text style={styles.dateButtonText}>
                      {editStartDate ? formatDateForDisplay(editStartDate) : 'Select start date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>End Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEditEndDatePicker(true)}
                    disabled={!editStartDate}
                  >
                    <Icon name="calendar-today" size={20} color={colors.text.primary} />
                    <Text style={[styles.dateButtonText, !editStartDate && styles.dateButtonTextDisabled]}>
                      {editEndDate ? formatDateForDisplay(editEndDate) : 'Select end date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowEditTripModal(false);
                  setError('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, (!editTitle || editingTrip) && styles.modalCreateButtonDisabled]}
                onPress={handleUpdateTrip}
                disabled={!editTitle || editingTrip}
              >
                {editingTrip ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <Text style={styles.modalCreateText}>Update Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Currency Modal */}
      <Modal
        visible={showEditCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowEditCurrencyModal(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={currencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerOption,
                    editBudgetCurrency === item.code && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setEditBudgetCurrency(item.code);
                    setShowEditCurrencyModal(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    editBudgetCurrency === item.code && styles.pickerOptionTextSelected
                  ]}>
                    {item.name} ({item.code})
                  </Text>
                  {editBudgetCurrency === item.code && (
                    <Icon name="check" size={20} color={colors.primary[600]} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Start Date Picker */}
      <Modal
        visible={showEditStartDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditStartDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Start Date</Text>
              <TouchableOpacity onPress={() => setShowEditStartDatePicker(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={todayString}
              onDayPress={(day) => {
                setEditStartDate(day.dateString);
                if (editEndDate && new Date(day.dateString) > new Date(editEndDate)) {
                  setEditEndDate('');
                }
                setShowEditStartDatePicker(false);
              }}
              markedDates={{
                [editStartDate]: { selected: true, selectedColor: colors.primary[600] }
              }}
              theme={{
                todayTextColor: colors.primary[600],
                selectedDayBackgroundColor: colors.primary[600],
                arrowColor: colors.primary[600],
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Edit End Date Picker */}
      <Modal
        visible={showEditEndDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditEndDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select End Date</Text>
              <TouchableOpacity onPress={() => setShowEditEndDatePicker(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={editStartDate || todayString}
              onDayPress={(day) => {
                setEditEndDate(day.dateString);
                setShowEditEndDatePicker(false);
              }}
              markedDates={{
                [editEndDate]: { selected: true, selectedColor: colors.primary[600] }
              }}
              theme={{
                todayTextColor: colors.primary[600],
                selectedDayBackgroundColor: colors.primary[600],
                arrowColor: colors.primary[600],
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        visible={showAdjustmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdjustmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Adjustment</Text>
            
            <ScrollView 
              style={styles.modalScrollView} 
              contentContainerStyle={styles.modalForm}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.adjustmentNote}>
                <Text style={styles.adjustmentNoteText}>
                  <Text style={styles.adjustmentNoteBold}>Note:</Text> Adjustments can be created even if the original expense is locked. This creates a new expense entry to correct or modify the original.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Adjustment Amount ({trip?.budget_currency || 'USD'})
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={adjustmentAmount}
                  onChangeText={setAdjustmentAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={adjustmentDescription}
                  onChangeText={setAdjustmentDescription}
                  placeholder="Reason for adjustment"
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Paid by</Text>
                <View style={styles.pickerContainer}>
                  <FlatList
                    data={acceptedParticipants}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: participant }) => (
                      <TouchableOpacity
                        style={styles.pickerOption}
                        onPress={() => setAdjustmentPayer(participant.user_id)}
                      >
                        <Icon
                          name={adjustmentPayer === participant.user_id ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={20}
                          color={adjustmentPayer === participant.user_id ? colors.primary[600] : colors.gray[400]}
                        />
                        <Text style={styles.pickerOptionText}>
                          {participant.user?.first_name} {participant.user?.last_name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Split among</Text>
                <View style={styles.checklistContainer}>
                  {acceptedParticipants.map((participant: any) => {
                    const isSelected = adjustmentParticipants.includes(participant.user_id);
                    return (
                      <TouchableOpacity
                        key={participant.id}
                        style={[
                          styles.checklistItem,
                          isSelected && styles.checklistItemSelected,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setAdjustmentParticipants(adjustmentParticipants.filter((id) => id !== participant.user_id));
                          } else {
                            setAdjustmentParticipants([...adjustmentParticipants, participant.user_id]);
                          }
                        }}
                      >
                        <Icon
                          name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                          size={24}
                          color={isSelected ? colors.primary[600] : colors.gray[400]}
                        />
                        <Text style={[
                          styles.checklistItemText,
                          isSelected && styles.checklistItemTextSelected,
                        ]}>
                          {participant.user?.first_name} {participant.user?.last_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {adjustmentAmount && adjustmentParticipants.length > 0 && (
                  <Text style={styles.splitPreview}>
                    Each person pays: {(parseFloat(adjustmentAmount) / adjustmentParticipants.length).toFixed(2)} {trip?.budget_currency || 'USD'}
                  </Text>
                )}
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAdjustmentModal(false);
                  setAdjustingExpenseId(null);
                  setAdjustmentAmount('');
                  setAdjustmentDescription('');
                  setAdjustmentPayer('');
                  setAdjustmentParticipants([]);
                  setError('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, (!adjustmentAmount || !adjustmentPayer || adjustmentParticipants.length === 0 || creatingAdjustment) && styles.modalCreateButtonDisabled]}
                onPress={handleCreateAdjustment}
                disabled={!adjustmentAmount || !adjustmentPayer || adjustmentParticipants.length === 0 || creatingAdjustment}
              >
                {creatingAdjustment ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <Text style={styles.modalCreateText}>Create Adjustment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.light,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    minHeight: 60,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
  },
  card: {
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  tripTitle: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: colors.yellow[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  pendingBadgeText: {
    fontSize: theme.fontSize.xs,
    color: colors.yellow[800],
    fontWeight: theme.fontWeight.medium,
  },
  tripDescription: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  tripMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  metaText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    color: colors.text.white,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'capitalize',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    flexWrap: 'wrap',
  },
  chatButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  chatButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  editButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.white,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  deleteButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  inviteButton: {
    // Style handled by gradient
  },
  inviteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  inviteButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  participantsSection: {
    marginTop: theme.spacing.md,
  },
  participantsSubtitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  pendingParticipant: {
    backgroundColor: colors.yellow[50],
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  participantUsername: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  participantActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chatUserButton: {
    padding: theme.spacing.sm,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emerald[600],
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  acceptButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  removeButton: {
    padding: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '90%',
    minHeight: 400,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  modalLoadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
  },
  connectionsList: {
    maxHeight: 300,
    marginBottom: theme.spacing.md,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  connectionItemSelected: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  connectionInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  connectionName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  connectionUsername: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  modalEmptyText: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.background.default,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
  },
  modalInviteButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.primary[600],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalInviteButtonDisabled: {
    opacity: 0.5,
  },
  modalInviteText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.white,
  },
  addExpenseButton: {
    // Style handled by gradient
  },
  addExpenseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  addExpenseButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  expensesList: {
    marginTop: theme.spacing.md,
  },
  expenseItem: {
    padding: theme.spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  expenseItemSelected: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[400],
  },
  expenseItemAdjustment: {
    backgroundColor: colors.purple[50],
    borderColor: colors.purple[200],
  },
  adjustmentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: colors.purple[100],
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.sm,
  },
  adjustmentBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: colors.purple[800],
  },
  expenseItemVoided: {
    opacity: 0.6,
    backgroundColor: colors.gray[100],
  },
  expenseItemLocked: {
    backgroundColor: colors.blue[50],
    borderColor: colors.blue[200],
  },
  expenseCheckbox: {
    marginRight: theme.spacing.sm,
  },
  settlementSelectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: colors.blue[50],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.blue[200],
  },
  settlementSelectionText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.primary,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  settlementSelectionActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexShrink: 0,
    alignItems: 'center',
  },
  settlementClearButton: {
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: theme.spacing.xs,
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.xs,
  },
  settlementClearText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  settlementCreateButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: colors.emerald[600],
    borderRadius: theme.borderRadius.md,
    flexShrink: 0,
  },
  settlementCreateButtonDisabled: {
    opacity: 0.5,
  },
  settlementCreateText: {
    fontSize: theme.fontSize.xs,
    color: colors.text.white,
    fontWeight: theme.fontWeight.semibold,
  },
  settlementsList: {
    marginTop: theme.spacing.md,
  },
  settlementItem: {
    padding: theme.spacing.md,
    backgroundColor: colors.yellow[50],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: colors.yellow[200],
  },
  settlementItemPaid: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[200],
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  settlementStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  settlementStatusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  settlementStatusPending: {
    backgroundColor: colors.yellow[100],
  },
  settlementStatusPaid: {
    backgroundColor: colors.green[100],
  },
  settlementStatusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  settlementStatusTextPending: {
    color: colors.yellow[800],
  },
  settlementStatusTextPaid: {
    color: colors.green[800],
  },
  settlementAmount: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: colors.emerald[600],
    borderRadius: theme.borderRadius.md,
  },
  markPaidText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.white,
    fontWeight: theme.fontWeight.semibold,
  },
  settlementInfo: {
    fontSize: theme.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  settlementExpensesList: {
    marginTop: theme.spacing.xs,
  },
  settlementExpensesTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  settlementExpenseItem: {
    fontSize: theme.fontSize.xs,
    color: colors.text.secondary,
    marginLeft: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  expenseAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    flex: 1,
  },
  expenseAmount: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  lockedBadge: {
    backgroundColor: colors.blue[100],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  lockedBadgeText: {
    fontSize: theme.fontSize.xs,
    color: colors.blue[800],
    fontWeight: theme.fontWeight.medium,
  },
  voidedBadge: {
    backgroundColor: colors.gray[200],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  voidedBadgeText: {
    fontSize: theme.fontSize.xs,
    color: colors.gray[700],
    fontWeight: theme.fontWeight.medium,
  },
  expenseActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  editButton: {
    padding: theme.spacing.xs,
  },
  voidButton: {
    padding: theme.spacing.xs,
  },
  expenseDescription: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  expenseDetails: {
    gap: theme.spacing.xs,
  },
  expenseDetailText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  expenseDetailBold: {
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
  },
  expenseDetailSmall: {
    fontSize: theme.fontSize.xs,
    color: colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  splitDetails: {
    marginLeft: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs / 2,
  },
  splitItem: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  modalForm: {
    paddingBottom: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  formLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    backgroundColor: colors.background.default,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  pickerOptionText: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  pickerOptionTextSelected: {
    fontWeight: theme.fontWeight.semibold,
    color: colors.primary[600],
  },
  participantsChecklist: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: theme.borderRadius.md,
    maxHeight: 200,
    overflow: 'scroll',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  checklistItemSelected: {
    backgroundColor: colors.primary[50],
  },
  checklistItemText: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  checklistItemTextSelected: {
    fontWeight: theme.fontWeight.semibold,
    color: colors.primary[600],
  },
  splitPreview: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  modalCreateButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.emerald[600],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  budgetRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  budgetInput: {
    flex: 1,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.background.default,
    minWidth: 80,
    justifyContent: 'space-between',
  },
  currencyButtonText: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    fontWeight: theme.fontWeight.medium,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.background.default,
    gap: theme.spacing.sm,
  },
  dateButtonText: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
  },
  dateButtonTextDisabled: {
    color: colors.text.secondary,
  },
  modalCreateButtonDisabled: {
    opacity: 0.5,
  },
  modalCreateText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.white,
  },
});

export default TripDetailScreen;

