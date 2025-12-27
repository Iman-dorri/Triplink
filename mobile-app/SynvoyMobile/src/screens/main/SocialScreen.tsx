import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchConnections, updateConnection, deleteConnection } from '../../store/slices/connectionsSlice';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

type ConnectionStatus = 'all' | 'pending' | 'accepted' | 'blocked';

const SocialScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { connections, isLoading, isUpdating, error } = useSelector((state: RootState) => state.connections);
  const [activeTab, setActiveTab] = useState<ConnectionStatus>('all');
  const [updatingConnectionId, setUpdatingConnectionId] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectionsForTab();
  }, [activeTab]);

  const fetchConnectionsForTab = () => {
    const statusFilter = activeTab === 'all' ? undefined : activeTab;
    dispatch(fetchConnections(statusFilter));
  };

  const handleUpdateConnection = async (connectionId: string, status: 'accepted' | 'blocked') => {
    setUpdatingConnectionId(connectionId);
    try {
      await dispatch(updateConnection({ connectionId, status })).unwrap();
      fetchConnectionsForTab();
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to update connection');
    } finally {
      setUpdatingConnectionId(null);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    Alert.alert(
      'Delete Connection',
      'Are you sure you want to delete this connection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdatingConnectionId(connectionId);
            try {
              await dispatch(deleteConnection(connectionId)).unwrap();
              fetchConnectionsForTab();
            } catch (err: any) {
              Alert.alert('Error', err || 'Failed to delete connection');
            } finally {
              setUpdatingConnectionId(null);
            }
          },
        },
      ]
    );
  };

  const handleMessage = (userId: string, userName: string) => {
    navigation.navigate('Chat', { userId, userName });
  };

  const renderConnection = ({ item }: any) => {
    const connectedUser = item.connected_user;
    const displayName = connectedUser
      ? `${connectedUser.first_name || ''} ${connectedUser.last_name || ''}`.trim() || connectedUser.username || 'Unknown User'
      : 'Unknown User';
    const status = typeof item.status === 'string' ? item.status : item.status?.value || 'pending';
    const isPending = status === 'pending';
    const isAccepted = status === 'accepted';
    const isReceivedRequest = isPending && item.connected_user_id === user?.id;
    const isSentRequest = isPending && item.user_id === user?.id;
    const isUpdating = updatingConnectionId === item.id;

    return (
      <View style={[styles.connectionCard, theme.shadows.md]}>
        {/* User Info Section */}
        <View style={styles.connectionContent}>
          <View style={styles.avatar}>
            <Icon name="person" size={32} color={colors.primary[500]} />
          </View>
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionName} numberOfLines={1}>{displayName}</Text>
            {connectedUser?.username && (
              <Text style={styles.connectionUsername} numberOfLines={1}>@{connectedUser.username}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          {isReceivedRequest && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton, theme.shadows.sm]}
                onPress={() => handleUpdateConnection(item.id, 'accepted')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <>
                    <Icon name="check" size={16} color={colors.text.white} />
                    <Text style={styles.actionButtonText} numberOfLines={1}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.blockButton, theme.shadows.sm]}
                onPress={() => handleUpdateConnection(item.id, 'blocked')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <>
                    <Icon name="block" size={16} color={colors.text.white} />
                    <Text style={styles.actionButtonText} numberOfLines={1}>Block</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          {isSentRequest && (
            <View style={[styles.statusBadge, styles.requestSentBadge]}>
              <Text style={styles.requestSentText}>Request Sent</Text>
            </View>
          )}
          {isAccepted && (
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton, theme.shadows.sm]}
              onPress={() => handleMessage(connectedUser?.id, displayName)}
            >
              <Icon name="message" size={16} color={colors.text.white} />
              <Text style={styles.actionButtonText} numberOfLines={1}>Message</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, theme.shadows.sm]}
            onPress={() => handleDeleteConnection(item.id)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Icon name="delete" size={18} color={colors.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return colors.emerald[500];
      case 'pending':
        return colors.orange[500];
      case 'blocked':
        return colors.error;
      default:
        return colors.gray[400];
    }
  };

  const tabs: ConnectionStatus[] = ['all', 'pending', 'accepted', 'blocked'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connections</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('SearchUsers')}
        >
          <LinearGradient
            colors={[colors.indigo[600], colors.primary[500]]}
            style={styles.addButtonGradient}
          >
            <Icon name="person-add" size={24} color={colors.text.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading connections...</Text>
        </View>
      ) : connections.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="people" size={64} color={colors.gray[400]} />
          <Text style={styles.emptyText}>No connections found</Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'all' ? 'Start connecting with other travelers!' : `No ${activeTab} connections`}
          </Text>
          {activeTab === 'all' && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('SearchUsers')}
            >
              <Text style={styles.emptyButtonText}>Find Friends</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={connections}
          renderItem={renderConnection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchConnectionsForTab}
            />
          }
        />
      )}
    </View>
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
  addButtonGradient: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.default,
    padding: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    gap: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  tabActive: {
    backgroundColor: colors.primary[600],
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: colors.text.secondary,
    textTransform: 'capitalize',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tabTextActive: {
    color: colors.text.white,
    fontWeight: theme.fontWeight.semibold,
  },
  errorContainer: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: colors.error + '20',
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
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
  list: {
    padding: theme.spacing.md,
  },
  connectionCard: {
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  connectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    flexShrink: 0,
  },
  connectionInfo: {
    flex: 1,
    minWidth: 0, // Allows text to truncate properly
  },
  connectionName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  connectionUsername: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    flexShrink: 0,
    marginLeft: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    color: colors.text.white,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'capitalize',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    minHeight: 40,
    minWidth: 100,
  },
  acceptButton: {
    backgroundColor: colors.emerald[600],
    minWidth: 100,
  },
  blockButton: {
    backgroundColor: colors.error,
    minWidth: 90,
  },
  messageButton: {
    backgroundColor: colors.primary[600],
    minWidth: 110,
  },
  deleteButton: {
    backgroundColor: colors.background.light,
    borderWidth: 1,
    borderColor: colors.gray[300],
    minWidth: 40,
    paddingHorizontal: theme.spacing.sm,
  },
  actionButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  requestSentBadge: {
    backgroundColor: colors.gray[200],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  requestSentText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: theme.fontWeight.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: colors.indigo[500],
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  emptyButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});

export default SocialScreen;
