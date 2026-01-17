import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';
import { COLORS, formatCurrency, formatDate } from '../utils/helpers';
import Toast from 'react-native-toast-message';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const fetchDashboard = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load dashboard',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const stats = [
    {
      title: "Today's Credit",
      value: formatCurrency(data?.today?.credit?.total || 0),
      subtitle: `${data?.today?.credit?.count || 0} transactions`,
      icon: 'trending-up',
      color: COLORS.danger,
      bgColor: '#fef2f2',
    },
    {
      title: "Today's Collection",
      value: formatCurrency(data?.today?.payment?.total || 0),
      subtitle: `${data?.today?.payment?.count || 0} payments`,
      icon: 'trending-down',
      color: COLORS.success,
      bgColor: '#f0fdf4',
    },
    {
      title: 'Total Receivable',
      value: formatCurrency(data?.receivables?.total || 0),
      subtitle: `From ${data?.receivables?.count || 0} customers`,
      icon: 'dollar-sign',
      color: COLORS.warning,
      bgColor: '#fffbeb',
    },
    {
      title: 'Total Customers',
      value: data?.customerCount || 0,
      subtitle: 'Active customers',
      icon: 'users',
      color: COLORS.secondary,
      bgColor: '#f0f9ff',
    },
  ];

  const quickActions = [
    {
      title: 'Add Customer',
      icon: 'user-plus',
      color: COLORS.primary,
      bgColor: '#f5f3ff',
      onPress: () => navigation.navigate('AddCustomer'),
    },
    {
      title: 'Add Product',
      icon: 'package',
      color: COLORS.success,
      bgColor: '#f0fdf4',
      onPress: () => navigation.navigate('AddProduct'),
    },
    {
      title: 'Scan Barcode',
      icon: 'camera',
      color: COLORS.warning,
      bgColor: '#fffbeb',
      onPress: () => navigation.navigate('BarcodeScanner'),
    },
    {
      title: 'Share Store',
      icon: 'share-2',
      color: COLORS.secondary,
      bgColor: '#f0f9ff',
      onPress: () => navigation.navigate('Store'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>नमस्ते, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.shopName}>{user?.shopName}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Settings')}>
          <Icon name="bell" size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
      </View>

      {/* Date */}
      <Text style={styles.date}>{formatDate(new Date(), 'long')}</Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={[styles.statCard, { backgroundColor: stat.bgColor }]}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Icon name={stat.icon} size={20} color={stat.color} />
              </View>
            </View>
            <Text style={styles.statTitle}>{stat.title}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
          </View>
        ))}
      </View>

      {/* Alerts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Alerts</Text>
        
        <TouchableOpacity
          style={[styles.alertCard, { borderLeftColor: COLORS.warning }]}
          onPress={() => navigation.navigate('Products')}>
          <Icon name="package" size={24} color={COLORS.warning} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Low Stock Items</Text>
            <Text style={styles.alertValue}>{data?.inventory?.lowStock || 0} products</Text>
          </View>
          <Icon name="chevron-right" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.alertCard, { borderLeftColor: COLORS.danger }]}
          onPress={() => navigation.navigate('Products')}>
          <Icon name="alert-circle" size={24} color={COLORS.danger} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Out of Stock</Text>
            <Text style={styles.alertValue}>{data?.inventory?.outOfStock || 0} products</Text>
          </View>
          <Icon name="chevron-right" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.alertCard, { borderLeftColor: COLORS.secondary }]}
          onPress={() => navigation.navigate('Customers')}>
          <Icon name="users" size={24} color={COLORS.secondary} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Pending Dues</Text>
            <Text style={styles.alertValue}>{data?.receivables?.count || 0} customers</Text>
          </View>
          <Icon name="chevron-right" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionCard, { backgroundColor: action.bgColor }]}
              onPress={action.onPress}>
              <Icon name={action.icon} size={28} color={action.color} />
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Inventory Value */}
      <View style={styles.inventoryCard}>
        <View style={styles.inventoryIcon}>
          <Icon name="box" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.inventoryContent}>
          <Text style={styles.inventoryLabel}>Total Inventory Value</Text>
          <Text style={styles.inventoryValue}>
            {formatCurrency(data?.inventory?.totalValue || 0)}
          </Text>
          <Text style={styles.inventorySubtitle}>
            {data?.inventory?.totalProducts || 0} products in stock
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    marginBottom: 8,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  shopName: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  date: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '50%',
    padding: 6,
  },
  statCardInner: {
    borderRadius: 16,
    padding: 16,
  },
  statHeader: {
    marginBottom: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: COLORS.gray[500],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  alertValue: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionCard: {
    width: '25%',
    padding: 6,
    alignItems: 'center',
  },
  actionCardInner: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginTop: 8,
    textAlign: 'center',
  },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inventoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inventoryContent: {
    flex: 1,
    marginLeft: 16,
  },
  inventoryLabel: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  inventoryValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 2,
  },
  inventorySubtitle: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
});

export default DashboardScreen;
