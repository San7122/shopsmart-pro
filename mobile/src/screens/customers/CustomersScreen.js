import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { customersAPI } from '../../services/api';
import { COLORS, formatCurrency, getInitials, getAvatarColor, debounce } from '../../utils/helpers';
import Toast from 'react-native-toast-message';

const CustomersScreen = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchCustomers = async (searchQuery = '') => {
    try {
      const params = {
        search: searchQuery,
        hasBalance: filter === 'balance' ? 'true' : undefined,
      };
      const response = await customersAPI.getAll(params);
      if (response.data.success) {
        setCustomers(response.data.data);
        setStats(response.data.stats);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load customers',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [filter]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCustomers(search);
    });
    return unsubscribe;
  }, [navigation, search]);

  const debouncedSearch = useCallback(
    debounce((query) => fetchCustomers(query), 300),
    [filter]
  );

  const handleSearch = (text) => {
    setSearch(text);
    debouncedSearch(text);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers(search);
  }, [search]);

  const renderCustomer = ({ item }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => navigation.navigate('CustomerDetail', { id: item._id })}
      activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        {item.phone && (
          <View style={styles.phoneRow}>
            <Icon name="phone" size={12} color={COLORS.gray[400]} />
            <Text style={styles.customerPhone}>{item.phone}</Text>
          </View>
        )}
      </View>
      <View style={styles.balanceContainer}>
        <Text
          style={[
            styles.balance,
            {
              color:
                item.balance > 0
                  ? COLORS.danger
                  : item.balance < 0
                  ? COLORS.success
                  : COLORS.gray[500],
            },
          ]}>
          {formatCurrency(Math.abs(item.balance))}
        </Text>
        <Text style={styles.balanceLabel}>
          {item.balance > 0 ? 'To Receive' : item.balance < 0 ? 'To Pay' : 'Clear'}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View>
      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#f0f9ff' }]}>
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>
              {stats.totalCustomers}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>
              {formatCurrency(stats.totalReceivable)}
            </Text>
            <Text style={styles.statLabel}>Receivable</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fffbeb' }]}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {stats.customersWithBalance}
            </Text>
            <Text style={styles.statLabel}>With Balance</Text>
          </View>
        </View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}>
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'balance' && styles.filterButtonActive]}
          onPress={() => setFilter('balance')}>
          <Icon
            name="dollar-sign"
            size={14}
            color={filter === 'balance' ? COLORS.white : COLORS.gray[600]}
          />
          <Text
            style={[
              styles.filterText,
              filter === 'balance' && styles.filterTextActive,
            ]}>
            With Balance
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="users" size={60} color={COLORS.gray[300]} />
      <Text style={styles.emptyTitle}>No customers found</Text>
      <Text style={styles.emptyText}>
        {search ? 'Try a different search' : 'Add your first customer'}
      </Text>
      {!search && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('AddCustomer')}>
          <Icon name="user-plus" size={18} color={COLORS.white} />
          <Text style={styles.emptyButtonText}>Add Customer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddCustomer')}>
          <Icon name="plus" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={COLORS.gray[400]}
          value={search}
          onChangeText={handleSearch}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="x" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Customer List */}
      <FlatList
        data={customers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.gray[900],
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  filterTextActive: {
    color: COLORS.white,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  balanceContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  balance: {
    fontSize: 16,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 10,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CustomersScreen;
