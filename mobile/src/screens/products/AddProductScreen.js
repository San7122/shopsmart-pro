// AddProductScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { productsAPI, categoriesAPI } from '../../services/api';
import { COLORS } from '../../utils/helpers';
import Toast from 'react-native-toast-message';

const AddProductScreen = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '', brand: '', category: '', sellingPrice: '', costPrice: '', mrp: '', 
    stock: '', unit: 'pcs', lowStockAlert: '10', barcode: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.log('Failed to load categories');
    }
  };

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.sellingPrice) newErrors.sellingPrice = 'Price is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await productsAPI.create({
        ...formData,
        sellingPrice: parseFloat(formData.sellingPrice),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        mrp: formData.mrp ? parseFloat(formData.mrp) : undefined,
        stock: formData.stock ? parseFloat(formData.stock) : 0,
        lowStockAlert: parseInt(formData.lowStockAlert) || 10
      });
      if (response.data.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Product added successfully' });
        navigation.goBack();
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.error || 'Failed to add product' });
    } finally {
      setLoading(false);
    }
  };

  const units = ['pcs', 'kg', 'g', 'l', 'ml', 'dozen', 'pack', 'box'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput style={[styles.input, errors.name && styles.inputError]} placeholder="Enter product name"
            placeholderTextColor={COLORS.gray[400]} value={formData.name} onChangeText={(t) => updateField('name', t)} />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Brand</Text>
          <TextInput style={styles.input} placeholder="Brand name" placeholderTextColor={COLORS.gray[400]}
            value={formData.brand} onChangeText={(t) => updateField('brand', t)} />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Selling Price *</Text>
            <TextInput style={[styles.input, errors.sellingPrice && styles.inputError]} placeholder="₹0"
              placeholderTextColor={COLORS.gray[400]} value={formData.sellingPrice} keyboardType="numeric"
              onChangeText={(t) => updateField('sellingPrice', t)} />
            {errors.sellingPrice && <Text style={styles.errorText}>{errors.sellingPrice}</Text>}
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.label}>Cost Price</Text>
            <TextInput style={styles.input} placeholder="₹0" placeholderTextColor={COLORS.gray[400]}
              value={formData.costPrice} keyboardType="numeric" onChangeText={(t) => updateField('costPrice', t)} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Stock</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor={COLORS.gray[400]}
              value={formData.stock} keyboardType="numeric" onChangeText={(t) => updateField('stock', t)} />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.unitRow}>
              {units.slice(0, 4).map((u) => (
                <TouchableOpacity key={u} style={[styles.unitBtn, formData.unit === u && styles.unitBtnActive]}
                  onPress={() => updateField('unit', u)}>
                  <Text style={[styles.unitText, formData.unit === u && styles.unitTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Barcode</Text>
          <View style={styles.barcodeRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Scan or enter barcode"
              placeholderTextColor={COLORS.gray[400]} value={formData.barcode}
              onChangeText={(t) => updateField('barcode', t)} />
            <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('BarcodeScanner')}>
              <Icon name="camera" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : (
            <>
              <Icon name="plus" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Add Product</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray[700], marginBottom: 8 },
  input: { backgroundColor: COLORS.gray[50], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: COLORS.gray[900], borderWidth: 1, borderColor: COLORS.gray[200] },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row' },
  unitRow: { flexDirection: 'row', gap: 6 },
  unitBtn: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: COLORS.gray[100], borderRadius: 8 },
  unitBtnActive: { backgroundColor: COLORS.primary },
  unitText: { fontSize: 13, color: COLORS.gray[700] },
  unitTextActive: { color: COLORS.white, fontWeight: '600' },
  barcodeRow: { flexDirection: 'row', gap: 10 },
  scanBtn: { width: 50, height: 50, backgroundColor: COLORS.primary + '15', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 16, marginTop: 12, gap: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});

export default AddProductScreen;
