// StorefrontScreen.js - Digital Store Management
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Share, Linking, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import { storefrontAPI } from '../../services/api';
import { COLORS, generateStoreShareMessage, generateWhatsAppLink } from '../../utils/helpers';
import Toast from 'react-native-toast-message';

const StorefrontScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    enabled: false,
    slug: '',
    welcomeMessage: '',
    showPrices: true,
    showStock: false,
    whatsappNumber: '',
  });

  const storeUrl = `https://store.shopsmart.pro/${settings.slug || user?.phone}`;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await storefrontAPI.getSettings();
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      // Use defaults if no settings exist
      setSettings({
        enabled: false,
        slug: user?.phone || '',
        welcomeMessage: `Welcome to ${user?.shopName}!`,
        showPrices: true,
        showStock: false,
        whatsappNumber: user?.phone || '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field, value) => {
    setSettings({ ...settings, [field]: value });
    try {
      await storefrontAPI.updateSettings({ [field]: value });
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Store settings saved' });
    } catch (error) {
      setSettings({ ...settings, [field]: !value });
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update settings' });
    }
  };

  const handleShare = async () => {
    try {
      const message = generateStoreShareMessage(user?.shopName, storeUrl);
      await Share.share({
        message,
        title: `${user?.shopName} Online Store`,
      });
    } catch (error) {
      console.log('Share failed');
    }
  };

  const handleWhatsAppShare = () => {
    const message = generateStoreShareMessage(user?.shopName, storeUrl);
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
  };

  const copyToClipboard = () => {
    // In production, use @react-native-clipboard/clipboard
    Toast.show({ type: 'success', text1: 'Copied', text2: 'Store link copied to clipboard' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.storeIcon}>
          <Icon name="shopping-bag" size={32} color={COLORS.white} />
        </View>
        <Text style={styles.headerTitle}>Digital Storefront</Text>
        <Text style={styles.headerSubtitle}>
          Create your online store & share with customers
        </Text>
      </View>

      <View style={styles.content}>
        {/* Store Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Store Status</Text>
              <Text style={styles.cardSubtitle}>
                {settings.enabled ? 'Your store is live!' : 'Store is offline'}
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(val) => handleToggle('enabled', val)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.success + '60' }}
              thumbColor={settings.enabled ? COLORS.success : COLORS.gray[400]}
            />
          </View>
          
          {settings.enabled && (
            <View style={styles.storeUrlContainer}>
              <Text style={styles.storeUrl} numberOfLines={1}>{storeUrl}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyToClipboard}>
                <Icon name="copy" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Share Options */}
        {settings.enabled && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Share Your Store</Text>
            <View style={styles.shareButtons}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleWhatsAppShare}>
                <View style={[styles.shareBtnIcon, { backgroundColor: '#25D366' }]}>
                  <Icon name="message-circle" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.shareBtnText}>WhatsApp</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <View style={[styles.shareBtnIcon, { backgroundColor: COLORS.secondary }]}>
                  <Icon name="share-2" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareBtn} onPress={copyToClipboard}>
                <View style={[styles.shareBtnIcon, { backgroundColor: COLORS.primary }]}>
                  <Icon name="link" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.shareBtnText}>Copy Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Store Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Store Settings</Text>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Show Prices</Text>
              <Text style={styles.settingHint}>Display product prices to customers</Text>
            </View>
            <Switch
              value={settings.showPrices}
              onValueChange={(val) => handleToggle('showPrices', val)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary + '60' }}
              thumbColor={settings.showPrices ? COLORS.primary : COLORS.gray[400]}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Show Stock Status</Text>
              <Text style={styles.settingHint}>Show if products are in stock</Text>
            </View>
            <Switch
              value={settings.showStock}
              onValueChange={(val) => handleToggle('showStock', val)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary + '60' }}
              thumbColor={settings.showStock ? COLORS.primary : COLORS.gray[400]}
            />
          </View>
        </View>

        {/* WhatsApp Order */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order via WhatsApp</Text>
          <Text style={styles.cardSubtitle}>
            Customers can order directly via WhatsApp
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Your WhatsApp number"
                placeholderTextColor={COLORS.gray[400]}
                value={settings.whatsappNumber}
                onChangeText={(text) => setSettings({ ...settings, whatsappNumber: text })}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {/* Preview */}
        <TouchableOpacity style={styles.previewBtn} onPress={() => Linking.openURL(storeUrl)}>
          <Icon name="external-link" size={20} color={COLORS.white} />
          <Text style={styles.previewBtnText}>Preview Store</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    alignItems: 'center', backgroundColor: COLORS.primary, paddingTop: 24, paddingBottom: 32,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  storeIcon: {
    width: 70, height: 70, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white, marginTop: 12 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  content: { padding: 16, paddingTop: 20 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray[900] },
  cardSubtitle: { fontSize: 13, color: COLORS.gray[500], marginTop: 2 },
  storeUrlContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray[50],
    padding: 12, borderRadius: 10, marginTop: 16,
  },
  storeUrl: { flex: 1, fontSize: 13, color: COLORS.primary },
  copyBtn: { padding: 8 },
  shareButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  shareBtn: { alignItems: 'center' },
  shareBtnIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  shareBtnText: { fontSize: 12, color: COLORS.gray[700], marginTop: 8, fontWeight: '500' },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100],
  },
  settingLabel: { fontSize: 15, fontWeight: '500', color: COLORS.gray[800] },
  settingHint: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  inputGroup: { marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray[700], marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray[50],
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray[200],
  },
  inputPrefix: { paddingLeft: 16, fontSize: 16, color: COLORS.gray[500] },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, fontSize: 16, color: COLORS.gray[900] },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, gap: 10,
  },
  previewBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});

export default StorefrontScreen;
