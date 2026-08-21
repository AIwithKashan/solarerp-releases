import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Colors from '../../constants/Colors';
import { getDB } from '../../lib/db';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FileSpreadsheet, Printer, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';

export default function DailyBookReportScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [summary, setSummary] = useState({
    salesTotal: 0,
    receiptsTotal: 0,
    paymentsTotal: 0,
    netCash: 0,
    receivables: 0,
    payables: 0,
  });

  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);

  const loadReportData = () => {
    try {
      const db = getDB();

      // 1. Sales Total
      const salesRes: any[] = db.getAllSync('SELECT SUM(netAmount) as total FROM Sale');
      const salesTotal = salesRes[0]?.total || 0;

      // 2. Vouchers Total
      const receiptsRes: any[] = db.getAllSync("SELECT SUM(amount) as total FROM Voucher WHERE type = 'Receipt'");
      const receiptsTotal = receiptsRes[0]?.total || 0;

      const paymentsRes: any[] = db.getAllSync("SELECT SUM(amount) as total FROM Voucher WHERE type = 'Payment'");
      const paymentsTotal = paymentsRes[0]?.total || 0;

      // 3. Accounts Balances
      const accountsList: any[] = db.getAllSync('SELECT type, balance FROM Account');
      let receivables = 0;
      let payables = 0;

      accountsList.forEach(a => {
        if (a.type === 'Customer' && a.balance > 0) receivables += a.balance;
        if (a.type === 'Supplier' && a.balance > 0) payables += a.balance;
      });

      // 4. Recent Vouchers
      const vouchersList: any[] = db.getAllSync('SELECT * FROM Voucher ORDER BY createdAt DESC LIMIT 10');
      setRecentVouchers(vouchersList);

      setSummary({
        salesTotal,
        receiptsTotal,
        paymentsTotal,
        netCash: (salesTotal + receiptsTotal) - paymentsTotal,
        receivables,
        payables,
      });
    } catch (error) {
      console.error("Error loading report data:", error);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handlePrintPDF = async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #10b981; margin-bottom: 4px; }
            h3 { color: #666; margin-top: 0; margin-bottom: 20px; }
            .card { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e2e8f0; }
            .grid { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; color: #475569; }
            .val { font-weight: bold; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            th { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Solar ERP Mobile Statement</h1>
          <h3>Generated Date: ${new Date().toLocaleDateString()}</h3>

          <div class="card">
            <div class="grid"><span class="label">Total Sales Invoices:</span><span class="val">Rs. ${summary.salesTotal.toLocaleString()}</span></div>
            <div class="grid"><span class="label">Total Cash Receipts:</span><span class="val">Rs. ${summary.receiptsTotal.toLocaleString()}</span></div>
            <div class="grid"><span class="label">Total Cash Payments:</span><span class="val" style="color: #ef4444;">Rs. ${summary.paymentsTotal.toLocaleString()}</span></div>
            <hr />
            <div class="grid"><span class="label">Net Cash Position:</span><span class="val" style="color: #10b981;">Rs. ${summary.netCash.toLocaleString()}</span></div>
          </div>

          <div class="card">
            <div class="grid"><span class="label">Total Outstanding Receivables (Customers):</span><span class="val">Rs. ${summary.receivables.toLocaleString()}</span></div>
            <div class="grid"><span class="label">Total Outstanding Payables (Suppliers):</span><span class="val" style="color: #ef4444;">Rs. ${summary.payables.toLocaleString()}</span></div>
          </div>

          <h2>Recent Voucher Ledger Entries</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount (PKR)</th>
                <th>Notes / Ref</th>
              </tr>
            </thead>
            <tbody>
              ${recentVouchers.map(v => `
                <tr>
                  <td>${v.type}</td>
                  <td>Rs. ${v.amount.toLocaleString()}</td>
                  <td>${v.notes || '-'} (${v.reference || 'N/A'})</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Solar ERP PDF Report' });
      } else {
        Alert.alert("Report Generated", `PDF saved to: ${uri}`);
      }
    } catch (error) {
      Alert.alert("Print Error", "Failed to generate PDF document.");
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <FileSpreadsheet color={theme.primary} size={36} />
        <Text style={[styles.title, { color: theme.text }]}>Daily Cash & Profit Statements</Text>
      </View>

      {/* Main Cash Balance Card */}
      <View style={[styles.metricCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.tabIconDefault }]}>NET CASH POSITION</Text>
        <Text style={[styles.bigAmount, { color: theme.primary }]}>
          Rs. {summary.netCash.toLocaleString()}
        </Text>
      </View>

      {/* Grid Summary */}
      <View style={styles.row}>
        <View style={[styles.halfCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <ArrowUpRight color="#10b981" size={20} />
            <Text style={[styles.cardLabel, { color: theme.tabIconDefault }]}>Total Invoices</Text>
          </View>
          <Text style={[styles.cardValue, { color: theme.text }]}>
            Rs. {summary.salesTotal.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.halfCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <ArrowDownRight color="#ef4444" size={20} />
            <Text style={[styles.cardLabel, { color: theme.tabIconDefault }]}>Voucher Payments</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#ef4444' }]}>
            Rs. {summary.paymentsTotal.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.halfCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.tabIconDefault }]}>Receivables</Text>
          <Text style={[styles.cardValue, { color: theme.text }]}>
            Rs. {summary.receivables.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.halfCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.tabIconDefault }]}>Payables</Text>
          <Text style={[styles.cardValue, { color: '#ef4444' }]}>
            Rs. {summary.payables.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* PDF Export Button */}
      <TouchableOpacity 
        style={[styles.pdfButton, { backgroundColor: theme.primary }]}
        onPress={handlePrintPDF}
      >
        <Printer color="#fff" size={22} style={{ marginRight: 8 }} />
        <Text style={styles.pdfButtonText}>Generate & Share PDF Statement</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  metricCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  bigAmount: { fontSize: 28, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardLabel: { fontSize: 13, fontWeight: '500' },
  cardValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  pdfButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
