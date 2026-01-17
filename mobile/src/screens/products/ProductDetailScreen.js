// ProductDetailScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { productsAPI } from '../../services/api';
import { COLORS, formatCurrency, getStockStatus } from '../../utils/helpers';
import Toast from 'react-native-toast-message';

const ProductDetailScreen = ({ navigation, route }) => {
  const { id } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.getOne(id);
      if (response.data.success) {
        setProduct(response.data.data);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load product' });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (type) => {
    Alert.prompt(
      type === 'add' ? 'Add Stock' : type === 'remove' ? 'Remove Stock' : 'Set Stock',
      'Enter quantity',
      async (value) => {
        if (!value || isNaN(value)) return;
        try {
          await productsAPI.updateStock(id, { adjustment: parseFloat(value), type });
          Toast.show({ type: 'success', text1: 'Stock Updated' });
          fetchProduct();
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update stock' });
        }
      },
      'plain-text',
      '',
      'numeric'
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!product) return null;

  const stockStatus = getStockStatus(product.stock, product.lowStockAlert);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.productIcon}>
          <Icon name="package" size={40} color={COLORS.gray[400]} />
        </View>
        <Text style={styles.name}>{product.name}</Text>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        {product.category && (
          <Text style={styles.category}>{product.category.icon} {product.category.name}</Text>
        )}
      </View>

      <View style={styles.priceCard}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Selling Price</Text>
          <Text style={[styles.priceValue, { color: COLORS.success }]}>
            {formatCurrency(product.sellingPrice)}
          </Text>
        </View>
        {product.costPrice && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Cost Price</Text>
            <Text style={styles.priceValue}>{formatCurrency(product.costPrice)}</Text>
          </View>
        )}
        {product.mrp && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>MRP</Text>
            <Text style={styles.priceValue}>{formatCurrency(product.mrp)}</Text>
          </View>
        )}
      </View>

      <View style={styles.stockCard}>
        <Text style={styles.sectionTitle}>Stock Management</Text>
        <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
          <Text style={[styles.stockValue, { color: COLORS[stockStatus.color] }]}>
            {product.stock} {product.unit}
          </Text>
          <Text style={styles.stockLabel}>{stockStatus.label}</Text>
        </View>
        
        <View style={styles.stockActions}>
          <TouchableOpacity style={[styles.stockBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => handleStockUpdate('add')}>
            <Icon name="plus" size={20} color={COLORS.success} />
            <Text style={[styles.stockBtnText, { color: COLORS.success }]}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.stockBtn, { backgroundColor: '#fef2f2' }]} onPress={() => handleStockUpdate('remove')}>
            <Icon name="minus" size={20} color={COLORS.danger} />
            <Text style={[styles.stockBtnText, { color: COLORS.danger }]}>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.stockBtn, { backgroundColor: '#f0f9ff' }]} onPress={() => handleStockUpdate('set')}>
            <Icon name="edit-2" size={20} color={COLORS.secondary} />
            <Text style={[styles.stockBtnText, { color: COLORS.secondary }]}>Set</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Low Stock Alert</Text>
          <Text style={styles.infoValue}>{product.lowStockAlert} {product.unit}</Text>
        </View>
        {product.barcode && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Barcode</Text>
            <Text style={styles.infoValue}>{product.barcode}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Stock Value</Text>
          <Text style={styles.infoValue}>{formatCurrency(product.sellingPrice * product.stock)}</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: 24, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  productIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: 'bold', color: COLORS.gray[900], marginTop: 12, textAlign: 'center' },
  brand: { fontSize: 14, color: COLORS.gray[500], marginTop: 4 },
  category: { fontSize: 13, color: COLORS.gray[500], marginTop: 4 },
  priceCard: { flexDirection: 'row', backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 16 },
  priceItem: { flex: 1, alignItems: 'center' },
  priceLabel: { fontSize: 12, color: COLORS.gray[500] },
  priceValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.gray[900], marginTop: 4 },
  stockCard: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray[900], marginBottom: 16 },
  stockBadge: { alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  stockValue: { fontSize: 28, fontWeight: 'bold' },
  stockLabel: { fontSize: 13, color: COLORS.gray[600], marginTop: 4 },
  stockActions: { flexDirection: 'row', gap: 10 },
  stockBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  stockBtnText: { fontSize: 14, fontWeight: '600' },
  infoCard: { backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  infoLabel: { fontSize: 14, color: COLORS.gray[600] },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.gray[900] },
});

export default ProductDetailScreen;
