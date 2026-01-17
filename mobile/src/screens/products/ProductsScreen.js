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
import { productsAPI } from '../../services/api';
import { COLORS, formatCurrency, debounce, getStockStatus } from '../../utils/helpers';
import Toast from 'react-native-toast-message';

const ProductsScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchProducts = async (searchQuery = '') => {
    try {
      const params = {
        search: searchQuery,
        stockStatus: filter !== 'all' ? filter : undefined,
      };
      const response = await productsAPI.getAll(params);
      if (response.data.success) {
        setProducts(response.data.data);
        setSummary(response.data.summary);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load products',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProducts(search);
    });
    return unsubscribe;
  }, [navigation, search]);

  const debouncedSearch = useCallback(
    debounce((query) => fetchProducts(query), 300),
    [filter]
  );

  const handleSearch = (text) => {
    setSearch(text);
    debouncedSearch(text);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(search);
  }, [search]);

  const renderProduct = ({ item }) => {
    const stockStatus = getStockStatus(item.stock, item.lowStockAlert);
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { id: item._id })}
        activeOpacity={0.7}>
        <View style={styles.productIcon}>
          <Icon name="package" size={24} color={COLORS.gray[400]} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          {item.brand && <Text style={styles.productBrand}>{item.brand}</Text>}
          {item.category && (
            <Text style={styles.productCategory}>
              {item.category.icon} {item.category.name}
            </Text>
          )}
        </View>
        <View style={styles.productRight}>
          <Text style={styles.productPrice}>{formatCurrency(item.sellingPrice)}</Text>
          <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
            <Text
              style={[
                styles.stockText,
                { color: COLORS[stockStatus.color] || COLORS.gray[600] },
              ]}>
              {item.stock} {item.unit}
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" size={20} color={COLORS.gray[400]} />
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Stats */}
      {summary && (
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#f0f9ff' }]}>
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>
              {summary.totalProducts}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fffbeb' }]}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {summary.lowStock}
            </Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>
              {summary.outOfStock}
            </Text>
            <Text style={styles.statLabel}>Out</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#f5f3ff' }]}>
            <Text style={[styles.statValue, { color: COLORS.primary }]} numberOfLines={1}>
              {formatCurrency(summary.totalValue)}
            </Text>
            <Text style={styles.statLabel}>Value</Text>
          </View>
        </View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        {[
          { value: 'all', label: 'All' },
          { value: 'low_stock', label: 'Low', icon: 'alert-triangle' },
          { value: 'out_of_stock', label: 'Out', icon: 'x-circle' },
        ].map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterButton, filter === f.value && styles.filterButtonActive]}
            onPress={() => setFilter(f.value)}>
            {f.icon && (
              <Icon
                name={f.icon}
                size={14}
                color={filter === f.value ? COLORS.white : COLORS.gray[600]}
              />
            )}
            <Text
              style={[
                styles.filterText,
                filter === f.value && styles.filterTextActive,
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="package" size={60} color={COLORS.gray[300]} />
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptyText}>
        {search ? 'Try a different search' : 'Add your first product'}
      </Text>
      {!search && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('AddProduct')}>
          <Icon name="plus" size={18} color={COLORS.white} />
          <Text style={styles.emptyButtonText}>Add Product</Text>
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
        <Text style={styles.headerTitle}>Products</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('BarcodeScanner')}>
            <Icon name="camera" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProduct')}>
            <Icon name="plus" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, barcode..."
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

      {/* Product List */}
      <FlatList
        data={products}
        renderItem={renderProduct}
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
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
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
  productCard: {
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
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  productBrand: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  productCategory: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  productRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  stockBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
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

export default ProductsScreen;
