import React from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import { BookOpen, Table, FileSpreadsheet, CloudLightning, Database, Settings, ShieldCheck, HelpCircle } from 'lucide-react-native';
import { exportDatabase } from '../../lib/db';

export default function MoreMenuScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const handleExport = async () => {
     await exportDatabase();
     Alert.alert("Backup Process Initiated", "Check your device sharing dialogue to upload data directly to your preferred Google Drive folder.");
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
         <Text style={[styles.title, { color: theme.text }]}>Settings & Utilities</Text>
         <Text style={[styles.subtitle, { color: theme.text }]}>Access reporting logs, account bookkeeping, and data portability.</Text>
      </View>

      {/* Grid Links */}
      <View style={styles.grid}>
         <TouchableOpacity
           style={[styles.menuItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
           onPress={() => router.push('/vouchers/create')}
         >
            <BookOpen color={theme.primary} size={32} />
            <Text style={[styles.itemText, { color: theme.text }]}>Voucher Ledger</Text>
            <Text style={styles.itemDesc}>Double entry cash & bank receipts</Text>
         </TouchableOpacity>

         <TouchableOpacity
           style={[styles.menuItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
           onPress={() => router.push('/reports/index')}
         >
            <FileSpreadsheet color={theme.primary} size={32} />
            <Text style={[styles.itemText, { color: theme.text }]}>Statements & Reports</Text>
            <Text style={styles.itemDesc}>Generate and export balance PDFs</Text>
         </TouchableOpacity>

         <TouchableOpacity
           style={[styles.menuItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
           onPress={() => router.push('/settings/backup')}
         >
            <CloudLightning color={theme.primary} size={32} />
            <Text style={[styles.itemText, { color: theme.text }]}>Google Drive Backup</Text>
            <Text style={styles.itemDesc}>Sync database state instantly</Text>
         </TouchableOpacity>

         <TouchableOpacity
           style={[styles.menuItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
           onPress={() => {
              Alert.alert("Branding Logo", "Click options on the Desktop ERP to toggle system logos.");
           }}
         >
            <Settings color={theme.primary} size={32} />
            <Text style={[styles.itemText, { color: theme.text }]}>Business Profile</Text>
            <Text style={styles.itemDesc}>Shop metadata configurations</Text>
         </TouchableOpacity>
      </View>

      <View style={[styles.footerBanner, { backgroundColor: theme.surface }]}>
         <ShieldCheck size={20} color={theme.success} />
         <Text style={[styles.footerText, { color: theme.text }]}>Local Engine Secure • Licensing Verified</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 8 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 13, opacity: 0.7, marginTop: 4, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuItem: { width: '48%', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16, elevation: 1 },
  itemText: { fontSize: 15, fontWeight: 'bold', marginTop: 12 },
  itemDesc: { fontSize: 11, color: '#888', marginTop: 4 },
  footerBanner: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 40 },
  footerText: { marginLeft: 8, fontSize: 12, fontWeight: '600' }
});
