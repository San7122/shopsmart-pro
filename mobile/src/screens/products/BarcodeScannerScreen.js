// BarcodeScannerScreen.js - Placeholder for camera-based barcode scanning
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS } from '../../utils/helpers';

const BarcodeScannerScreen = ({ navigation }) => {
  // Note: In production, this would use react-native-camera or expo-barcode-scanner
  // For now, this is a placeholder UI
  
  return (
    <View style={styles.container}>
      <View style={styles.scanArea}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.instructions}>
          Point camera at barcode to scan
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.hint}>
          💡 Camera permission required for scanning
        </Text>
        
        <TouchableOpacity 
          style={styles.manualButton}
          onPress={() => navigation.goBack()}>
          <Icon name="edit-3" size={20} color={COLORS.primary} />
          <Text style={styles.manualText}>Enter Manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructions: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 32,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  hint: {
    fontSize: 14,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 16,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  manualText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default BarcodeScannerScreen;
