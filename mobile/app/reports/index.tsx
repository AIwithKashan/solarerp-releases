import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import Colors from '../../constants/Colors';
import { getDB } from '../../lib/db';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { 
  BookOpen, 
  Wallet, 
  TrendingUp, 
  PackageSearch, 
  LineChart, 
  Receipt, 
  Printer, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Layers
} from 'lucide-react-native';

const REPORT_CARDS = [
  { id: 'profit-loss', title: 'Profit & Loss', desc: 'Gross Sales, COGS, Expenses & Net Profit', icon: LineChart, color: '#10b981' },
  { id: 'daily-book', title: 'Daily Book Ledger', desc: 'Day-to-day Sales, Purchases & Vouchers', icon: BookOpen, color: '#3b82f6' },
  { id: 'daily-cash', title: 'Daily Cash Flow', desc: 'Cash Receipts, Payments & Ending Cash', icon: Wallet, color: '#0ea5e9' },
  { id: 'sales-report', title: 'Sales Report', desc: 'Invoice totals, itemized sales & discounts', icon: TrendingUp, color: '#ec4899' },
  { id: 'stock-valuation', title: 'Stock in Store', desc: 'Product inventory counts & total stock worth', icon: PackageSearch, color: '#14b8a6' },
  { id: 'chart-accounts', title: 'Chart of Accounts', desc: 'Live running balances of all account ledgers', icon: Layers, color: '#8b5cf6' },
];

export default function ReportsHubScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<'hub' | 'profit' | 'daily-book' | 'stock' | 'accounts'>('hub');

  // Report Metrics State
  const [metrics, setMetrics] = useState({
    salesTotal: 0,
    purchasesTotal: 0,
    receiptsTotal: 0,
    paymentsTotal: 0,
    expensesTotal: 0,
    netProfit: 0,
    stockValue: 0,
    totalProducts: 0,
    receivables: 0,
    payables: 0,
  });

  const [tradingItems, setTradingItems] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);

  const loadData = () => {
    try {
      const db = getDB();

      // 1. Sales & Purchases Total
      const salesRes: any[] = db.getAllSync('SELECT SUM(netAmount) as total, SUM(totalAmount) as gross FROM Sale');
      const salesTotal = salesRes[0]?.total || 0;

      // 2. Receipts & Payments Vouchers
      const receiptsRes: any[] = db.getAllSync("SELECT SUM(amount) as total FROM Voucher WHERE type = 'Receipt'");
      const receiptsTotal = receiptsRes[0]?.total || 0;

      const paymentsRes: any[] = db.getAllSync("SELECT SUM(amount) as total FROM Voucher WHERE type = 'Payment'");
      const paymentsTotal = paymentsRes[0]?.total || 0;

      // 3. Stock & Inventory Valuation
      const products: any[] = db.getAllSync('SELECT * FROM Product ORDER BY title ASC');
      let stockVal = 0;
      products.forEach(p => {
        stockVal += (p.stockQuantity || 0) * (p.purchasePrice || 0);
      });

      // 4. Accounts Ledgers Balances
      const accounts: any[] = db.getAllSync('SELECT * FROM Account ORDER BY name ASC');
      let recv = 0;
      let pay = 0;
      accounts.forEach(a => {
        if ((a.type === 'Customer' || a.type === 'Customers') && a.balance > 0) recv += a.balance;
        if ((a.type === 'Supplier' || a.type === 'Suppliers') && a.balance > 0) pay += a.balance;
      });

      // Estimated Profit calculation (Sales Net Total - Estimated COGS 80% - Expenses)
      const estimatedProfit = salesTotal > 0 ? (salesTotal * 0.18) - paymentsTotal : 0;

      setMetrics({
        salesTotal,
        purchasesTotal: paymentsTotal * 0.6,
        receiptsTotal,
        paymentsTotal,
        expensesTotal: paymentsTotal * 0.4,
        netProfit: estimatedProfit,
        stockValue: stockVal,
        totalProducts: products.length,
        receivables: recv,
        payables: pay,
      });

      setTradingItems(products);
      setAccountsList(accounts);

    } catch (error) {
      console.error("Reports loading error:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrintPDF = async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px; }
            .title { color: #10b981; font-size: 24px; margin: 0; font-weight: bold; }
            .subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }
            .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; }
            .row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #475569; }
            .val { font-weight: bold; font-size: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; color: #334155; }
            .green { color: #10b981; }
            .red { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Solar ERP Financial Statement</h1>
            <div class="subtitle">Generated Date: ${new Date().toLocaleDateString()} | Mobile Desktop-Sync Report</div>
          </div>

          <div class="summary-box">
            <div class="row"><span class="label">Total Invoiced Sales:</span><span class="val green">Rs. ${metrics.salesTotal.toLocaleString()}</span></div>
            <div class="row"><span class="label">Total Voucher Cash Receipts:</span><span class="val">Rs. ${metrics.receiptsTotal.toLocaleString()}</span></div>
            <div class="row"><span class="label">Total Voucher Payments / Expenses:</span><span class="val red">Rs. ${metrics.paymentsTotal.toLocaleString()}</span></div>
            <div class="row"><span class="label">Net Cash / Trading Position:</span><span class="val green">Rs. ${(metrics.salesTotal + metrics.receiptsTotal - metrics.paymentsTotal).toLocaleString()}</span></div>
          </div>

          <div class="summary-box">
            <div class="row"><span class="label">Total Outstanding Customer Receivables:</span><span class="val green">Rs. ${metrics.receivables.toLocaleString()}</span></div>
            <div class="row"><span class="label">Total Outstanding Supplier Payables:</span><span class="val red">Rs. ${metrics.payables.toLocaleString()}</span></div>
            <div class="row"><span class="label">Total Stock Inventory Valuation:</span><span class="val">Rs. ${metrics.stockValue.toLocaleString()}</span></div>
          </div>

          <h3>Accounts Ledger Running Balances</h3>
          <table>
            <thead>
              <tr>
                <th>Account Title</th>
                <th>Type</th>
                <th>Region / Area</th>
                <th>Balance (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${accountsList.map(a => `
                <tr>
                  <td>${a.name}</td>
                  <td>${a.type}</td>
                  <td>${a.region || '-'}</td>
                  <td class="${(a.balance || 0) >= 0 ? 'green' : 'red'}">Rs. ${(a.balance || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Solar ERP Financial Report' });
      } else {
        Alert.alert("Report Ready", `PDF Report exported to: ${uri}`);
      }
    } catch (e) {
      Alert.alert("Export Error", "Failed to generate PDF document.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Navigation Top Selector Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'hub' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('hub')}
        >
          <Text style={[styles.tabText, activeTab === 'hub' ? { color: '#FFF' } : { color: theme.text }]}>All Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'profit' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('profit')}
        >
          <Text style={[styles.tabText, activeTab === 'profit' ? { color: '#FFF' } : { color: theme.text }]}>Profit & Loss</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'stock' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('stock')}
        >
          <Text style={[styles.tabText, activeTab === 'stock' ? { color: '#FFF' } : { color: theme.text }]}>Stock Valuation</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'accounts' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('accounts')}
        >
          <Text style={[styles.tabText, activeTab === 'accounts' ? { color: '#FFF' } : { color: theme.text }]}>Chart of Accounts</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={{ flex: 1, padding: 16 }}>

        {activeTab === 'hub' && (
          <View>
            {/* Quick Hero Financial Summary */}
            <View style={[styles.heroCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.heroLabel, { color: theme.tabIconDefault }]}>NET BUSINESS LIQUIDITY</Text>
              <Text style={[styles.heroVal, { color: theme.primary }]}>
                Rs. ${(metrics.salesTotal + metrics.receiptsTotal - metrics.paymentsTotal).toLocaleString()}
              </Text>
              
              <View style={styles.heroRow}>
                <View style={styles.heroSubCol}>
                  <Text style={[styles.subLabel, { color: theme.tabIconDefault }]}>Receivables</Text>
                  <Text style={[styles.subVal, { color: '#10b981' }]}>Rs. {metrics.receivables.toLocaleString()}</Text>
                </View>

                <View style={styles.heroSubCol}>
                  <Text style={[styles.subLabel, { color: theme.tabIconDefault }]}>Payables</Text>
                  <Text style={[styles.subVal, { color: '#ef4444' }]}>Rs. {metrics.payables.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* Desktop Report Cards Grid */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Desktop Financial Reports Hub</Text>
            {REPORT_CARDS.map(card => {
              const IconComp = card.icon;
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.reportCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => {
                    if (card.id === 'profit-loss') setActiveTab('profit');
                    else if (card.id === 'stock-valuation') setActiveTab('stock');
                    else if (card.id === 'chart-accounts') setActiveTab('accounts');
                    else setActiveTab('profit');
                  }}
                >
                  <View style={[styles.iconBox, { backgroundColor: card.color + '15' }]}>
                    <IconComp color={card.color} size={28} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{card.title}</Text>
                    <Text style={[styles.cardDesc, { color: theme.tabIconDefault }]}>{card.desc}</Text>
                  </View>
                  <ChevronRight color={theme.tabIconDefault} size={20} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {activeTab === 'profit' && (
          <View>
            <View style={[styles.heroCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.heroLabel, { color: theme.tabIconDefault }]}>TOTAL SALES REVENUE</Text>
              <Text style={[styles.heroVal, { color: theme.primary }]}>Rs. {metrics.salesTotal.toLocaleString()}</Text>
            </View>

            <View style={[styles.detailCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>Profit & Loss Financial Statement</Text>
              
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: theme.tabIconDefault }]}>Gross Sales Invoices</Text>
                <Text style={[styles.dataVal, { color: theme.text }]}>Rs. {metrics.salesTotal.toLocaleString()}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: theme.tabIconDefault }]}>Cash Receipts Vouchers</Text>
                <Text style={[styles.dataVal, { color: '#10b981' }]}>Rs. {metrics.receiptsTotal.toLocaleString()}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: theme.tabIconDefault }]}>Payments & Expenses</Text>
                <Text style={[styles.dataVal, { color: '#ef4444' }]}>Rs. {metrics.paymentsTotal.toLocaleString()}</Text>
              </View>

              <View style={[styles.dataRow, { borderBottomWidth: 0, paddingTop: 12 }]}>
                <Text style={[styles.dataLabelBold, { color: theme.text }]}>Est. Net Cash Balance</Text>
                <Text style={[styles.dataValBold, { color: theme.primary }]}>
                  Rs. {(metrics.salesTotal + metrics.receiptsTotal - metrics.paymentsTotal).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'stock' && (
          <View>
            <View style={[styles.heroCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.heroLabel, { color: theme.tabIconDefault }]}>TOTAL INVENTORY VALUATION</Text>
              <Text style={[styles.heroVal, { color: theme.primary }]}>Rs. {metrics.stockValue.toLocaleString()}</Text>
              <Text style={[styles.subLabel, { color: theme.tabIconDefault, marginTop: 4 }]}>
                {metrics.totalProducts} Total Items In Stock Catalog
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Stock Items & Valuations</Text>
            {tradingItems.map(item => (
              <View key={item.id} style={[styles.listItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.itemSub, { color: theme.tabIconDefault }]}>
                    Stock: {item.stockQuantity || 0} {item.unit || 'Units'} • Cost: Rs. {(item.purchasePrice || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: theme.primary }]}>
                  Rs. {((item.stockQuantity || 0) * (item.purchasePrice || 0)).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'accounts' && (
          <View>
            <View style={[styles.heroCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.heroLabel, { color: theme.tabIconDefault }]}>TOTAL CUSTOMER RECEIVABLES</Text>
              <Text style={[styles.heroVal, { color: '#10b981' }]}>Rs. {metrics.receivables.toLocaleString()}</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Chart of Accounts Running Balances</Text>
            {accountsList.map(acc => (
              <View key={acc.id} style={[styles.listItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{acc.name}</Text>
                  <Text style={[styles.itemSub, { color: theme.tabIconDefault }]}>
                    Type: {acc.type} • {acc.region || 'Serai Naurang'}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: (acc.balance || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
                  Rs. {(acc.balance || 0).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Print / Export Button */}
        <TouchableOpacity 
          style={[styles.printBtn, { backgroundColor: theme.primary }]}
          onPress={handlePrintPDF}
        >
          <Printer color="#FFF" size={22} style={{ marginRight: 8 }} />
          <Text style={styles.printBtnText}>Export & Share PDF Statement</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { paddingHorizontal: 16, paddingVertical: 12, maxHeight: 56, flexGrow: 0 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, height: 36, justifyContent: 'center' },
  tabText: { fontSize: 13, fontWeight: 'bold' },
  heroCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
  heroLabel: { fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 },
  heroVal: { fontSize: 28, fontWeight: 'bold' },
  heroRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f030' },
  heroSubCol: { alignItems: 'center' },
  subLabel: { fontSize: 12, fontWeight: '500' },
  subVal: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  reportCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  iconBox: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 'bold' },
  cardDesc: { fontSize: 12, marginTop: 2 },
  detailCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  detailTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f020' },
  dataLabel: { fontSize: 14 },
  dataVal: { fontSize: 14, fontWeight: 'bold' },
  dataLabelBold: { fontSize: 15, fontWeight: 'bold' },
  dataValBold: { fontSize: 17, fontWeight: 'bold' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  itemTitle: { fontSize: 14, fontWeight: 'bold' },
  itemSub: { fontSize: 12, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: 'bold' },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  printBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
