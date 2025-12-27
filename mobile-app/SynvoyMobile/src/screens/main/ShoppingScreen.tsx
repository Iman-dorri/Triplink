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
import { fetchShoppingItems } from '../../store/slices/shoppingSlice';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const ShoppingScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((state: RootState) => state.shopping);

  useEffect(() => {
    dispatch(fetchShoppingItems());
  }, [dispatch]);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIcon}>
          <Icon name="shopping-bag" size={24} color={colors.indigo[500]} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.category && (
            <Text style={styles.itemCategory}>{item.category}</Text>
          )}
        </View>
        {item.isActive ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.emerald[500] }]}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: colors.gray[400] }]}>
            <Text style={styles.statusText}>Inactive</Text>
          </View>
        )}
      </View>
      <View style={styles.priceContainer}>
        {item.targetPrice && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Target:</Text>
            <Text style={styles.priceValue}>${item.targetPrice}</Text>
          </View>
        )}
        {item.currentPrice && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Current:</Text>
            <Text style={[styles.priceValue, { color: colors.primary[600] }]}>
              ${item.currentPrice}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping List</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddItem')}
        >
          <LinearGradient
            colors={[colors.indigo[600], colors.pink[500]]}
            style={styles.addButtonGradient}
          >
            <Icon name="add" size={24} color={colors.text.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="shopping-bag" size={64} color={colors.gray[400]} />
          <Text style={styles.emptyText}>No items yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AddItem')}
          >
            <Text style={styles.emptyButtonText}>Add Your First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => dispatch(fetchShoppingItems())}
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
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  addButton: {
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: theme.spacing.md,
  },
  itemCard: {
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
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.indigo[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  itemCategory: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    textTransform: 'capitalize',
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
  },
  priceContainer: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  priceValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
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

export default ShoppingScreen;

