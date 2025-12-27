import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { searchUsers, sendConnectionRequest, clearSearchResults } from '../../store/slices/connectionsSlice';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const SearchUsersScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { searchResults, isSearching, isUpdating, error } = useSelector((state: RootState) => state.connections);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  // Clear search results when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      dispatch(clearSearchResults());
      setSearchQuery('');
    });

    return unsubscribe;
  }, [navigation, dispatch]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }
    dispatch(searchUsers(searchQuery.trim()));
  };

  const handleSendRequest = async (userId: string) => {
    setSendingRequest(userId);
    try {
      await dispatch(sendConnectionRequest(userId)).unwrap();
      Alert.alert('Success', 'Connection request sent!');
      // Refresh search results
      if (searchQuery.trim()) {
        dispatch(searchUsers(searchQuery.trim()));
      }
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to send connection request');
    } finally {
      setSendingRequest(null);
    }
  };

  const renderUser = ({ item }: any) => {
    const displayName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username || 'Unknown User';
    const connectionStatus = item.connection_status;

    return (
      <View style={[styles.userCard, theme.shadows.md]}>
        <View style={styles.avatar}>
          <Icon name="person" size={32} color={colors.primary[600]} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          {item.username && (
            <Text style={styles.userUsername}>@{item.username}</Text>
          )}
          {item.email && (
            <Text style={styles.userEmail}>{item.email}</Text>
          )}
        </View>
        <View style={styles.actionContainer}>
          {!connectionStatus ? (
            <TouchableOpacity
              style={[styles.connectButton, theme.shadows.sm]}
              onPress={() => handleSendRequest(item.id)}
              disabled={sendingRequest === item.id || isUpdating}
            >
              {sendingRequest === item.id ? (
                <ActivityIndicator size="small" color={colors.text.white} />
              ) : (
                <LinearGradient
                  colors={[colors.primary[600], colors.cyan[500]]}
                  style={styles.connectButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Icon name="person-add" size={20} color={colors.text.white} />
                  <Text style={styles.connectButtonText}>Connect</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{connectionStatus}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Users</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icon name="search" size={24} color={colors.gray[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username, email, or name..."
            placeholderTextColor={colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.searchButton, theme.shadows.sm]}
          onPress={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.text.white} />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Searching users...</Text>
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      ) : searchQuery.trim() ? (
        <View style={styles.emptyState}>
          <Icon name="search-off" size={64} color={colors.gray[400]} />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>Try a different search query</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="search" size={64} color={colors.gray[400]} />
          <Text style={styles.emptyText}>Search for users</Text>
          <Text style={styles.emptySubtext}>Enter a username, email, or name to find users</Text>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.light,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    paddingVertical: theme.spacing.sm,
  },
  searchButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.md,
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
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
  },
  list: {
    padding: theme.spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  userUsername: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.fontSize.xs,
    color: colors.text.tertiary,
  },
  actionContainer: {
    marginLeft: theme.spacing.sm,
  },
  connectButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  connectButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  statusBadge: {
    backgroundColor: colors.gray[200],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'capitalize',
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
    textAlign: 'center',
  },
});

export default SearchUsersScreen;

