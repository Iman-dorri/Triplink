import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchTrips } from '../../store/slices/tripsSlice';
import { fetchConnections } from '../../store/slices/connectionsSlice';
import { fetchNotifications } from '../../store/slices/notificationsSlice';
import { logout } from '../../store/slices/authSlice';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../services/api';

const DashboardScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { trips, isLoading: tripsLoading } = useSelector((state: RootState) => state.trips);
  const { connections, isLoading: connectionsLoading } = useSelector((state: RootState) => state.connections);
  const { notifications, unreadCount } = useSelector((state: RootState) => state.notifications);
  
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);
  const [pendingTripsCount, setPendingTripsCount] = useState(0);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tripsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const conversations = await apiService.getConversations();
        const total = conversations.reduce((sum: number, conv: any) => {
          return sum + (conv.unread_count || 0);
        }, 0);
        setUnreadMessageCount(total);
      } catch (err) {
        // Silently fail - don't show errors for unread count
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Poll every 5 seconds
    messageIntervalRef.current = setInterval(fetchUnreadCount, 5000);

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, [user]);

  // Fetch pending connection requests count
  useEffect(() => {
    if (!user) return;

    const fetchPendingConnections = async () => {
      try {
        const fetchedConnections = await apiService.getConnections();
        // Count only connections where current user is the receiver (not the sender)
        const pendingReceived = fetchedConnections.filter((conn: any) => {
          return conn.connected_user_id === user.id && conn.status === 'pending';
        });
        setPendingConnectionsCount(pendingReceived.length);
      } catch (err) {
        // Silently fail
      }
    };

    // Initial fetch
    fetchPendingConnections();

    // Poll every 5 seconds
    connectionsIntervalRef.current = setInterval(fetchPendingConnections, 5000);

    return () => {
      if (connectionsIntervalRef.current) {
        clearInterval(connectionsIntervalRef.current);
      }
    };
  }, [user]);

  // Fetch pending trip invitations count
  useEffect(() => {
    if (!user) return;

    const fetchPendingTrips = async () => {
      try {
        const fetchedTrips = await apiService.getTrips();
        // Count trips where current user has a pending invitation
        const pendingTrips = fetchedTrips.filter((trip: any) => {
          if (!trip.participants) return false;
          const userParticipant = trip.participants.find((p: any) => p.user_id === user.id);
          return userParticipant && userParticipant.status === 'pending';
        });
        setPendingTripsCount(pendingTrips.length);
      } catch (err) {
        // Silently fail
      }
    };

    // Initial fetch
    fetchPendingTrips();

    // Poll every 5 seconds
    tripsIntervalRef.current = setInterval(fetchPendingTrips, 5000);

    return () => {
      if (tripsIntervalRef.current) {
        clearInterval(tripsIntervalRef.current);
      }
    };
  }, [user]);

  const onRefresh = () => {
    dispatch(fetchTrips());
    dispatch(fetchConnections());
    dispatch(fetchNotifications());
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={tripsLoading || connectionsLoading} onRefresh={onRefresh} />}
    >
      {/* Header with Sign Out */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleLogout}
        >
          <Icon name="logout" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>
          Welcome back, {user?.firstName || (user as any)?.first_name || 'Traveler'}!
        </Text>
        <Text style={styles.welcomeSubtitle}>Your travel journey continues here</Text>
      </View>

      {/* Feature Cards - Matching Web App */}
      <View style={styles.featuresGrid}>
        {/* Find Users */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('SearchUsers')}
        >
          <View style={styles.featureIconContainer}>
            <Icon name="search" size={32} color={colors.primary[600]} />
          </View>
          <Text style={styles.featureTitle}>Find Users</Text>
          <Text style={styles.featureDescription}>Search and connect with other travelers</Text>
        </TouchableOpacity>

        {/* Connections */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Connections')}
        >
          <View style={styles.featureIconContainer}>
            <Icon name="people" size={32} color={colors.primary[600]} />
            {pendingConnectionsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingConnectionsCount > 99 ? '99+' : pendingConnectionsCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.featureTitle}>Connections</Text>
          <Text style={styles.featureDescription}>Manage your travel connections</Text>
        </TouchableOpacity>

        {/* Trips */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('TripsStack')}
        >
          <View style={styles.featureIconContainer}>
            <Icon name="flight" size={32} color={colors.primary[600]} />
            {pendingTripsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingTripsCount > 99 ? '99+' : pendingTripsCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.featureTitle}>Trips</Text>
          <Text style={styles.featureDescription}>Create and manage your trips</Text>
        </TouchableOpacity>

        {/* Messages */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('MessagesStack')}
        >
          <View style={styles.featureIconContainer}>
            <Icon name="message" size={32} color={colors.primary[600]} />
            {unreadMessageCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.featureTitle}>Messages</Text>
          <Text style={styles.featureDescription}>Chat with your connections</Text>
        </TouchableOpacity>

        {/* My Profile */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('ProfileStack')}
        >
          <View style={styles.featureIconContainer}>
            <Icon name="person" size={32} color={colors.primary[600]} />
          </View>
          <Text style={styles.featureTitle}>My Profile</Text>
          <Text style={styles.featureDescription}>View and manage your account information</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
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
  headerTitle: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  signOutButton: {
    padding: theme.spacing.xs,
  },
  welcomeSection: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  welcomeTitle: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: theme.fontSize.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: theme.fontWeight.medium,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '47%',
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    alignItems: 'flex-start',
    ...theme.shadows.card,
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  featureIconContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  featureTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  featureDescription: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 3,
    borderColor: colors.background.default,
    ...theme.shadows.md,
  },
  badgeText: {
    color: colors.text.white,
    fontSize: 11,
    fontWeight: theme.fontWeight.bold,
  },
});

export default DashboardScreen;

