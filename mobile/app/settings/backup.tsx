import React from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/Colors';
import { exportDatabase } from '../../lib/db';
import { Database, UploadCloud } from 'lucide-react-native';

export default function BackupScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const handleExport = async () => {
    try {
      Alert.alert("Backup Process", "Opening sharing dialog to back up your Solar ERP database...");
      await exportDatabase();
    } catch (error) {
      Alert.alert("Export Error", "Failed to initiate database backup.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.iconCircle}>
          <Database color={theme.primary} size={40} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Google Drive Database Sync</Text>
        <Text style={[styles.subtitle, { color: theme.tabIconDefault }]}>
          Backup your mobile account ledgers, product catalog, sales invoices, and voucher records.
        </Text>

        <TouchableOpacity 
          style={[styles.backupButton, { backgroundColor: theme.primary }]}
          onPress={handleExport}
        >
          <UploadCloud color="#fff" size={24} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Export Database to Google Drive</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10b98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
