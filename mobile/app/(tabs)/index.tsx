import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, useColorScheme, TouchableOpacity, RefreshControl } from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import { TrendingUp, AlertTriangle, Landmark, Scale, DollarSign } from 'lucide-react-native';

export default function DashboardScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalReceivables: 0,
    totalPayables: 0,
    netBalance: 0
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const loadData = () => {
    try {
      const db = getDB();

      // 1. Calculate sales summation
      const salesResult: any = db.getAllSync('SELECT SUM(netAmount) as totalSales FROM Sale');
      const totalSales = salesResult[0]?.totalSales || 0;

      // 2. Receivables from Accounts (where type = Customer and balance is negative or positive based on ledger specs)
      const accounts: any[] = db.getAllSync('SELECT type, balance FROM Account');
      let receivables = 0;
      let payables = 0;

      accounts.forEach(a => {
        if (a.type === 'Customer' && a.balance > 0) receivables += a.balance;
        if (a.type === 'Supplier' && a.balance > 0) payables += a.balance;
      });

      // 3. Low stock count (threshold <= 5 items remaining)
      const products: any[] = db.getAllSync('SELECT id, stockQuantity FROM Product WHERE stockQuantity <= 5');
      setLowStockCount(products.length);

      // 4. Pull recent transactions
      const recentSales: any[] = db.getAllSync(`
        SELECT s.id, 'Sale' as type, s.netAmount as amount, a.name as partyName, s.date
        FROM Sale s
        JOIN Account a ON s.accountId = a.id
        ORDER BY s.date DESC LIMIT 5
      `);

      setRecentTransactions(recentSales);

      setMetrics({
        totalSales,
        totalReceivables: receivables,
        totalPayables: payables,
        netBalance: totalSales - payables + receivables,
      });

    } catch (e) {
      console.warn("DB query error:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={[styles.welcome, { color: theme.text }]}>Welcome Back,</Text>
        <Text style={[styles.businessText, { color: theme.primary }]}>SolarERP Command Center</Text>
      </View>

      {/* Metrics Row Grid */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <TrendingUp color={theme.primary} size={28} />
          <Text style={[styles.cardLabel, { color: theme.text }]}>Total Sales</Text>
          <Text style={[styles.cardVal, { color: theme.primary }]}>Rs. {metrics.totalSales.toLocaleString()}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <AlertTriangle color={theme.danger} size={28} />
          <Text style={[styles.cardLabel, { color: theme.text }]}>Receivables (Udhaar)</Text>
          <Text style={[styles.cardVal, { color: theme.danger }]}>Rs. {metrics.totalReceivables.toLocaleString()}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Landmark color={theme.warning} size={28} />
          <Text style={[styles.cardLabel, { color: theme.text }]}>Payables (Karz)</Text>
          <Text style={[styles.cardVal, { color: theme.warning }]}>Rs. {metrics.totalPayables.toLocaleString()}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Scale color={theme.tint} size={28} />
          <Text style={[styles.cardLabel, { color: theme.text }]}>Net Balance</Text>
          <Text style={[styles.cardVal, { color: theme.text }]}>Rs. {metrics.netBalance.toLocaleString()}</Text>
        </View>
      </View>

      {/* Low Stock Banner Drawer */}
      {lowStockCount > 0 && (
        <View style={[styles.warningBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <AlertTriangle color="#D97706" size={24} />
          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontWeight: 'bold', color: '#92400E' }}>Low Stock Alert!</Text>
            <Text style={{ color: '#B45309', fontSize: 13 }}>{lowStockCount} inventory products are in low state or out of stock.</Text>
          </View>
        </View>
      )}

      {/* Recent Activity Log */}
      <View style={[styles.section, { borderTopWidth: 1, borderTopColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
        {recentTransactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Text style={{ color: '#888' }}>No transactions recorded today.</Text>
          </View>
        ) : (
          recentTransactions.map((tx) => (
            <View key={tx.id} style={[styles.txItem, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.txParty, { color: theme.text }]}>{tx.partyName}</Text>
                <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: theme.primary }]}>+ Rs. {tx.amount.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24 },
  welcome: { fontSize: 14, opacity: 0.7 },
  businessText: { fontSize: 24, fontWeight: 'bold' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  metricCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  cardLabel: { fontSize: 13, marginTop: 8, opacity: 0.7 },
  cardVal: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  warningBanner: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24, alignItems: 'center' },
  section: { marginTop: 8, paddingTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyCard: { padding: 24, borderRadius: 12, alignItems: 'center' },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
  txParty: { fontWeight: '600', fontSize: 15 },
  txDate: { fontSize: 12, color: '#888', marginTop: 2 },
  txAmount: { fontWeight: 'bold', fontSize: 16 }
});
