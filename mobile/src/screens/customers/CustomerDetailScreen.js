import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { customersAPI } from '../../services/api';
import {
  COLORS,
  formatCurrency,
  formatDate,
  getInitials,
  getAvatarColor,
  generateWhatsAppLink,
  generatePaymentReminder,
} from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';

const CustomerDetailScreen = ({ navigation, route }) => {
  const { id } = route.params;
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [customerRes, txnRes] = await Promise.all([
        customersAPI.getOne(id),
        customersAPI.getTransactions(id, { limit: 50 }),
      ]);
      
      if (customerRes.data.success) {
        setCustomer(customerRes.data.data);
      }
      if (txnRes.data.success) {
        setTransactions(txnRes.data.data);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load customer details',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, [navigation]);

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const message = generatePaymentReminder(
        customer.name,
        customer.balance,
        user?.shopName || 'Shop'
      );
      const url = generateWhatsAppLink(customer.phone, message);
      Linking.openURL(url);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await customersAPI.delete(id);
              Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Customer has been deleted',
              });
              navigation.goBack();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete customer',
              });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!customer) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Customer Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(customer.name) }]}>
          <Text style={styles.avatarText}>{getInitials(customer.name)}</Text>
        </View>
        <Text style={styles.name}>{customer.name}</Text>
        
        {/* Contact Actions */}
        <View style={styles.contactRow}>
          {customer.phone && (
            <>
              <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                <Icon name="phone" size={20} color={COLORS.primary} />
                <Text style={styles.contactText}>{customer.phone}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.contactButton, styles.whatsappButton]}
                onPress={handleWhatsApp}>
                <Icon name="message-circle" size={20} color={COLORS.success} />
                <Text style={[styles.contactText, { color: COLORS.success }]}>
                  WhatsApp
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {customer.address && (
          <View style={styles.addressRow}>
            <Icon name="map-pin" size={14} color={COLORS.gray[400]} />
            <Text style={styles.address}>{customer.address}</Text>
          </View>
        )}
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceMain}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text
            style={[
              styles.balanceValue,
              {
                color:
                  customer.balance > 0
                    ? COLORS.danger
                    : customer.balance < 0
                    ? COLORS.success
                    : COLORS.gray[700],
              },
            ]}>
            {formatCurrency(Math.abs(customer.balance))}
          </Text>
          <Text style={styles.balanceSubtext}>
            {customer.balance > 0
              ? 'Customer owes you'
              : customer.balance < 0
              ? 'You owe customer'
              : 'No pending balance'}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
            onPress={() =>
              navigation.navigate('AddTransaction', {
                customerId: id,
                customerName: customer.name,
                type: 'credit',
              })
            }>
            <Icon name="plus" size={22} color={COLORS.danger} />
            <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Credit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]}
            onPress={() =>
              navigation.navigate('AddTransaction', {
                customerId: id,
                customerName: customer.name,
                type: 'payment',
              })
            }>
            <Icon name="minus" size={22} color={COLORS.success} />
            <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Payment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: '#fef2f2' }]}>
          <Text style={styles.statLabel}>Total Credit</Text>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>
            {formatCurrency(customer.totalCredit)}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
          <Text style={styles.statLabel}>Total Paid</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {formatCurrency(customer.totalPaid)}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#fffbeb' }]}>
          <Text style={styles.statLabel}>Trust</Text>
          <Text style={styles.statValue}>{'⭐'.repeat(customer.trustScore || 3)}</Text>
        </View>
      </View>

      {/* WhatsApp Reminder Button */}
      {customer.balance > 0 && customer.phone && (
        <TouchableOpacity style={styles.reminderButton} onPress={handleWhatsApp}>
          <Icon name="send" size={20} color={COLORS.white} />
          <Text style={styles.reminderText}>Send Payment Reminder via WhatsApp</Text>
        </TouchableOpacity>
      )}

      {/* Transaction History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        
        {transactions.length === 0 ? (
          <View style={styles.emptyTxn}>
            <Icon name="clock" size={40} color={COLORS.gray[300]} />
            <Text style={styles.emptyTxnText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((txn) => (
            <View
              key={txn._id}
              style={[
                styles.txnCard,
                { backgroundColor: txn.type === 'credit' ? '#fef2f2' : '#f0fdf4' },
              ]}>
              <View
                style={[
                  styles.txnIcon,
                  {
                    backgroundColor:
                      txn.type === 'credit' ? COLORS.danger + '20' : COLORS.success + '20',
                  },
                ]}>
                <Icon
                  name={txn.type === 'credit' ? 'plus' : 'minus'}
                  size={18}
                  color={txn.type === 'credit' ? COLORS.danger : COLORS.success}
                />
              </View>
              <View style={styles.txnInfo}>
                <Text style={styles.txnTitle}>
                  {txn.type === 'credit' ? 'Credit Given' : 'Payment Received'}
                </Text>
                <Text style={styles.txnDate}>
                  {formatDate(txn.transactionDate, 'datetime')}
                  {txn.paymentMethod && ` • ${txn.paymentMethod.toUpperCase()}`}
                </Text>
                {txn.description && (
                  <Text style={styles.txnDesc}>{txn.description}</Text>
                )}
              </View>
              <View style={styles.txnAmount}>
                <Text
                  style={[
                    styles.txnValue,
                    { color: txn.type === 'credit' ? COLORS.danger : COLORS.success },
                  ]}>
                  {txn.type === 'credit' ? '+' : '-'}
                  {formatCurrency(txn.amount)}
                </Text>
                <Text style={styles.txnBalance}>
                  Bal: {formatCurrency(txn.balanceAfter)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Delete Button */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Icon name="trash-2" size={18} color={COLORS.danger} />
        <Text style={styles.deleteText}>Delete Customer</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
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
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.white,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginTop: 12,
  },
  contactRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 20,
    gap: 6,
  },
  whatsappButton: {
    backgroundColor: COLORS.success + '15',
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  address: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  balanceCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceMain: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 4,
  },
  balanceSubtext: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray[600],
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  reminderText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  emptyTxn: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyTxnText: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 8,
  },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnInfo: {
    flex: 1,
    marginLeft: 12,
  },
  txnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  txnDate: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  txnDesc: {
    fontSize: 12,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  txnAmount: {
    alignItems: 'flex-end',
  },
  txnValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  txnBalance: {
    fontSize: 10,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
    borderRadius: 12,
    gap: 8,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.danger,
  },
});

export default CustomerDetailScreen;
