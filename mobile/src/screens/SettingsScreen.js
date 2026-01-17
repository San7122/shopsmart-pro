// SettingsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../context/AuthContext';
import { COLORS, getInitials, getAvatarColor } from '../utils/helpers';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    {
      title: 'Account',
      items: [
        { icon: 'user', label: 'Profile', subtitle: 'Edit your personal info', onPress: () => {} },
        { icon: 'shopping-bag', label: 'Shop Details', subtitle: 'Update shop information', onPress: () => {} },
        { icon: 'lock', label: 'Change Password', subtitle: 'Update your password', onPress: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'globe', label: 'Language', subtitle: 'English', onPress: () => {} },
        { icon: 'bell', label: 'Notifications', subtitle: 'Manage alerts', onPress: () => {} },
        { icon: 'printer', label: 'Print Settings', subtitle: 'Configure printing', onPress: () => {} },
      ],
    },
    {
      title: 'Data',
      items: [
        { icon: 'download', label: 'Export Data', subtitle: 'Download your data', onPress: () => {} },
        { icon: 'upload-cloud', label: 'Backup', subtitle: 'Sync to cloud', onPress: () => {} },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', label: 'Help & FAQ', subtitle: 'Get help', onPress: () => {} },
        { icon: 'message-square', label: 'Contact Support', subtitle: 'Chat with us', onPress: () => {} },
        { icon: 'star', label: 'Rate App', subtitle: 'Love us? Rate us!', onPress: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(user?.name) }]}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.shopName}>{user?.shopName}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
        </View>
      </View>

      {/* Menu Sections */}
      {menuItems.map((section, sIdx) => (
        <View key={sIdx} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, iIdx) => (
              <TouchableOpacity
                key={iIdx}
                style={[styles.menuItem, iIdx < section.items.length - 1 && styles.menuItemBorder]}
                onPress={item.onPress}>
                <View style={styles.menuIcon}>
                  <Icon name={item.icon} size={20} color={COLORS.primary} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={COLORS.gray[400]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Icon name="log-out" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.version}>ShopSmart Pro v1.0.0</Text>
        <Text style={styles.copyright}>© 2024 ShopSmart Pro</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    padding: 20, marginBottom: 16,
  },
  avatar: { width: 70, height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '600', color: COLORS.white },
  profileInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 20, fontWeight: 'bold', color: COLORS.gray[900] },
  shopName: { fontSize: 14, color: COLORS.gray[600], marginTop: 2 },
  phone: { fontSize: 13, color: COLORS.gray[500], marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.gray[500], marginLeft: 20, marginBottom: 8, textTransform: 'uppercase' },
  card: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  menuIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
  menuContent: { flex: 1, marginLeft: 12 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: COLORS.gray[900] },
  menuSubtitle: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 8, padding: 16,
    borderRadius: 16, gap: 10,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: COLORS.danger },
  footer: { alignItems: 'center', paddingVertical: 24 },
  version: { fontSize: 13, color: COLORS.gray[500] },
  copyright: { fontSize: 12, color: COLORS.gray[400], marginTop: 4 },
});

export default SettingsScreen;
