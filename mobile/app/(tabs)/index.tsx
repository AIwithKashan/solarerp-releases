import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, useColorScheme, TouchableOpacity, RefreshControl } from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import { router } from 'expo-router';
import { 
  TrendingUp, AlertTriangle, Landmark, Scale, 
  ShoppingCart, Truck, BookOpen, LineChart, Plus, ChevronRight 
} from 'lucide-react-native';

export default function DashboardScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState('AIwithKashan');
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalReceivables: 0,
    totalPayables: 0,
    netBalance: 0
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const loadData = () => {
    try {
      const db = getDB();

      // 0. Business Name
      const bizRes: any[] = db.getAllSync('SELECT businessName FROM BusinessSettings LIMIT 1');
      if (bizRes.length > 0 && bizRes[0].businessName) {
        setBusinessName(bizRes[0].businessName);
      }

      // 1. Sales & Purchases
      const salesResult: any = db.getAllSync('SELECT SUM(netAmount) as totalSales FROM Sale');
      const totalSales = salesResult[0]?.totalSales || 0;

      const purResult: any = db.getAllSync('SELECT SUM(netAmount) as totalPur FROM Purchase');
      const totalPurchases = purResult[0]?.totalPur || 0;

      // 2. Receivables & Payables
      const accounts: any[] = db.getAllSync('SELECT type, balance FROM Account');
      let receivables = 0;
      let payables = 0;

      accounts.forEach(a => {
        if ((a.type === 'Customer' || a.type === 'Customers') && a.balance > 0) receivables += a.balance;
        if ((a.type === 'Supplier' || a.type === 'Suppliers') && a.balance > 0) payables += a.balance;
      });

      // 3. Low stock count
      const products: any[] = db.getAllSync('SELECT id FROM Product WHERE stockQuantity <= 5');
      setLowStockCount(products.length);

      // 4. Recent transactions
      const recentSales: any[] = db.getAllSync(`
        SELECT s.id, 'Sale' as type, s.netAmount as amount, a.name as partyName, s.date
        FROM Sale s
        LEFT JOIN Account a ON s.accountId = a.id
        ORDER BY s.date DESC LIMIT 5
      `);

      setRecentTransactions(recentSales);

      setMetrics({
        totalSales,
        totalPurchases,
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
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={[styles.welcome, { color: theme.tabIconDefault }]}>⚡ Solar Command Center</Text>
        <Text style={[styles.businessText, { color: theme.text }]}>{businessName}</Text>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => router.push('/sales' as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
            <ShoppingCart size={20} color="#38bdf8" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.text }]}>New Sale</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => router.push('/purchases' as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Truck size={20} color="#f59e0b" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.text }]}>Purchase</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => router.push('/vouchers/create' as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <BookOpen size={20} color="#10b981" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.text }]}>Voucher</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => router.push('/reports/index' as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <LineChart size={20} color="#a78bfa" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.text }]}>P&L Report</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Row Grid */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <TrendingUp color="#38bdf8" size={24} />
          <Text style={[styles.cardLabel, { color: theme.tabIconDefault }]}>Total Sales</Text>
          <Text style={[styles.cardVal, { color: '#38bdf8' }]}>PKR {metrics.totalSales.toLocaleString()}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Truck color="#f59e0b" size={24} />
          <Text style={[styles.cardLabel, { color: theme.tabIconDefault }]}>Purchases / Stock</Text>
          <Text style={[styles.cardVal, { color: '#f59e0b' }]}>PKR {metrics.totalPurchases.toLocaleString()}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <AlertTriangle color={theme.danger} size={24} />
          <Text style={[styles.cardLabel, { color: theme.tabIconDefault }]}>Receivables (Udhaar)</Text>
          <Text style={[styles.cardVal, { color: theme.danger }]}>PKR {metrics.totalReceivables.toLocaleString()}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Landmark color={theme.warning} size={24} />
          <Text style={[styles.cardLabel, { color: theme.tabIconDefault }]}>Payables (Karz)</Text>
          <Text style={[styles.cardVal, { color: theme.warning }]}>PKR {metrics.totalPayables.toLocaleString()}</Text>
        </View>
      </View>

      {/* Low Stock Banner */}
      {lowStockCount > 0 && (
        <TouchableOpacity 
          style={[styles.warningBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
          onPress={() => router.push('/products' as any)}
        >
          <AlertTriangle color="#f59e0b" size={22} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '700', color: '#f59e0b' }}>Low Stock Alert!</Text>
            <Text style={{ color: theme.tabIconDefault, fontSize: 12, marginTop: 1 }}>
              {lowStockCount} inventory products are in low state or out of stock.
            </Text>
          </View>
          <ChevronRight size={18} color="#f59e0b" />
        </TouchableOpacity>
      )}

      {/* Recent Activity Log */}
      <View style={[styles.section, { borderTopWidth: 1, borderTopColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Invoices</Text>
        {recentTransactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={{ color: theme.tabIconDefault, fontSize: 13 }}>No transactions recorded yet.</Text>
          </View>
        ) : (
          recentTransactions.map((tx) => (
            <View key={tx.id} style={[styles.txItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View>
                <Text style={[styles.txParty, { color: theme.text }]}>{tx.partyName || 'Walk-in Customer'}</Text>
                <Text style={[styles.txDate, { color: theme.tabIconDefault }]}>{new Date(tx.date).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: '#38bdf8' }]}>PKR {tx.amount.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  header: { marginBottom: 16 },
  welcome: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  businessText: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 6 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  metricCard: { width: '48.5%', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  cardLabel: { fontSize: 11, marginTop: 8, fontWeight: '600', textTransform: 'uppercase' },
  cardVal: { fontSize: 15, fontWeight: '800', marginTop: 3 },
  warningBanner: { flexDirection: 'row', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 18, alignItems: 'center' },
  section: { paddingTop: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  emptyCard: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8, alignItems: 'center' },
  txParty: { fontWeight: '700', fontSize: 14 },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmount: { fontWeight: '700', fontSize: 14 }
});
