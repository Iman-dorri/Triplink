import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchTrips } from '../../store/slices/tripsSlice';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const TripsScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { trips, isLoading } = useSelector((state: RootState) => state.trips);

  useEffect(() => {
    dispatch(fetchTrips());
  }, [dispatch]);

  const renderTrip = ({ item }: any) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripIcon}>
          <Icon name="flight" size={24} color={colors.primary[500]} />
        </View>
        <View style={styles.tripInfo}>
          <Text style={styles.tripTitle}>{item.title}</Text>
          <Text style={styles.tripSubtitle}>
            {item.startDate && new Date(item.startDate).toLocaleDateString()}
            {item.endDate && ` - ${new Date(item.endDate).toLocaleDateString()}`}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      {item.description && (
        <Text style={styles.tripDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      {item.budget && (
        <View style={styles.tripFooter}>
          <Icon name="attach-money" size={16} color={colors.text.secondary} />
          <Text style={styles.budgetText}>${item.budget}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.emerald[500];
      case 'planning':
        return colors.primary[500];
      case 'completed':
        return colors.gray[500];
      default:
        return colors.gray[400];
    }
  };

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
          <Text style={styles.headerTitle}>My Trips</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateTrip')}
        >
          <LinearGradient
            colors={[colors.primary[600], colors.cyan[500]]}
            style={styles.addButtonGradient}
          >
            <Icon name="add" size={24} color={colors.text.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="flight" size={64} color={colors.gray[400]} />
          <Text style={styles.emptyText}>No trips yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('CreateTrip')}
          >
            <Text style={styles.emptyButtonText}>Create Your First Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => dispatch(fetchTrips())} />
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
  list: {
    padding: theme.spacing.md,
  },
  tripCard: {
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  tripIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  tripSubtitle: {
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
  tripDescription: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  tripFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  budgetText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginLeft: theme.spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: colors.text.secondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary[500],
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

export default TripsScreen;

