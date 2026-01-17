import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { transactionsAPI } from '../../services/api';
import { COLORS, formatCurrency } from '../../utils/helpers';
import Toast from 'react-native-toast-message';

const AddTransactionScreen = ({ navigation, route }) => {
  const { customerId, customerName, type } = route.params;
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: 'dollar-sign' },
    { value: 'upi', label: 'UPI', icon: 'smartphone' },
    { value: 'card', label: 'Card', icon: 'credit-card' },
    { value: 'bank_transfer', label: 'Bank', icon: 'briefcase' },
  ];

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid amount',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await transactionsAPI.create({
        customerId,
        type,
        amount: parseFloat(amount),
        description,
        paymentMethod: type === 'payment' ? paymentMethod : undefined,
      });

      if (response.data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: type === 'credit' ? 'Credit added successfully' : 'Payment recorded successfully',
        });
        navigation.goBack();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.error || 'Failed to add transaction',
      });
    } finally {
      setLoading(false);
    }
  };

  const isCredit = type === 'credit';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Customer Info */}
        <View
          style={[
            styles.customerCard,
            { backgroundColor: isCredit ? '#fef2f2' : '#f0fdf4' },
          ]}>
          <View
            style={[
              styles.typeIcon,
              { backgroundColor: isCredit ? COLORS.danger + '20' : COLORS.success + '20' },
            ]}>
            <Icon
              name={isCredit ? 'plus' : 'minus'}
              size={24}
              color={isCredit ? COLORS.danger : COLORS.success}
            />
          </View>
          <View>
            <Text style={styles.typeLabel}>
              {isCredit ? 'Adding Credit' : 'Recording Payment'}
            </Text>
            <Text style={styles.customerName}>{customerName}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount (₹)</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.rupeeSign}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={COLORS.gray[400]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              autoFocus
            />
          </View>
        </View>

        {/* Payment Method (only for payments) */}
        {!isCredit && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodGrid}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.methodButton,
                    paymentMethod === method.value && styles.methodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod(method.value)}>
                  <Icon
                    name={method.icon}
                    size={20}
                    color={paymentMethod === method.value ? COLORS.white : COLORS.gray[600]}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      paymentMethod === method.value && styles.methodTextActive,
                    ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <View style={styles.inputContainer}>
            <Icon name="file-text" size={20} color={COLORS.gray[400]} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Monthly groceries, Bill payment"
              placeholderTextColor={COLORS.gray[400]}
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Quick Amounts */}
        <View style={styles.quickAmounts}>
          {[100, 500, 1000, 5000].map((val) => (
            <TouchableOpacity
              key={val}
              style={styles.quickButton}
              onPress={() => setAmount(String(val))}>
              <Text style={styles.quickText}>{formatCurrency(val)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isCredit ? COLORS.danger : COLORS.success },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Icon name={isCredit ? 'plus' : 'check'} size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>
                {isCredit ? 'Add Credit' : 'Record Payment'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    padding: 20,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 12,
    color: COLORS.gray[600],
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[900],
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
  },
  rupeeSign: {
    fontSize: 32,
    fontWeight: '600',
    color: COLORS.gray[400],
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  methodTextActive: {
    color: COLORS.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.gray[900],
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.gray[100],
    borderRadius: 10,
    alignItems: 'center',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddTransactionScreen;
