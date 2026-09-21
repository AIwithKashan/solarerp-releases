import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, useColorScheme, 
  TouchableOpacity, TextInput, Alert, ScrollView, Modal 
} from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import { router } from 'expo-router';
import { 
  ArrowDownLeft, ArrowUpRight, Plus, Trash2, Check, 
  X, Scale, BookOpen, AlertCircle, ChevronDown 
} from 'lucide-react-native';

export default function CreateVoucherScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [mode, setMode] = useState<'quick' | 'journal'>('quick');

  // Quick Voucher State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountName, setSelectedAccountName] = useState('Select Account Ledger');
  const [type, setType] = useState<'Receipt' | 'Payment'>('Payment');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [ref, setRef] = useState('');
  const [accountModal, setAccountModal] = useState(false);

  // Journal Multi-Line State
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [journalRemarks, setJournalRemarks] = useState('');
  const [journalLines, setJournalLines] = useState<any[]>([
    { accountId: '', accountName: 'Select Debit Account', remarks: '', debit: '0', credit: '0' },
    { accountId: '', accountName: 'Select Credit Account', remarks: '', debit: '0', credit: '0' },
  ]);

  const loadAccounts = () => {
    try {
      const db = getDB();
      const list = db.getAllSync('SELECT * FROM Account ORDER BY name ASC');
      setAccounts(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Quick Voucher Save
  const handleSaveQuickVoucher = () => {
    if (!selectedAccountId || !amount.trim()) {
      Alert.alert("Missing Information", "Please select an Account and enter the Amount.");
      return;
    }

    const amtVal = parseFloat(amount);
    if (isNaN(amtVal) || amtVal <= 0) {
      Alert.alert("Invalid Amount", "Amount must be greater than zero.");
      return;
    }

    try {
      const db = getDB();
      const id = 'VOU-' + Date.now().toString();

      db.runSync(
        `INSERT INTO Voucher (id, type, amount, notes, reference)
         VALUES (?, ?, ?, ?, ?)`,
        [id, type, amtVal, notes, ref]
      );

      // Adjust account balance
      const balanceChange = type === 'Payment' ? -amtVal : amtVal;
      db.runSync(
        'UPDATE Account SET balance = balance + ? WHERE id = ?',
        [balanceChange, selectedAccountId]
      );

      Alert.alert("Voucher Saved", `${type} of PKR ${amtVal.toLocaleString()} recorded successfully.`);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save voucher.");
    }
  };

  // Journal Multi-line helpers
  const addJournalLine = () => {
    setJournalLines([
      ...journalLines,
      { accountId: '', accountName: 'Select Account', remarks: '', debit: '0', credit: '0' }
    ]);
  };

  const removeJournalLine = (idx: number) => {
    if (journalLines.length <= 2) {
      Alert.alert("Minimum Lines", "Journal entry requires at least 2 posting lines.");
      return;
    }
    setJournalLines(journalLines.filter((_, i) => i !== idx));
  };

  const updateJournalLine = (idx: number, field: string, value: any) => {
    setJournalLines(journalLines.map((line, i) => {
      if (i === idx) {
        if (field === 'debit' && parseFloat(value) > 0) {
          return { ...line, debit: value, credit: '0' };
        }
        if (field === 'credit' && parseFloat(value) > 0) {
          return { ...line, credit: value, debit: '0' };
        }
        return { ...line, [field]: value };
      }
      return line;
    }));
  };

  const getTotalDebit = () => {
    return journalLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  };

  const getTotalCredit = () => {
    return journalLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  };

  const handleSaveJournalVoucher = () => {
    const totalDebit = getTotalDebit();
    const totalCredit = getTotalCredit();

    if (totalDebit <= 0 || totalCredit <= 0) {
      Alert.alert("Zero Amount", "Debits and Credits must be greater than zero.");
      return;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      Alert.alert("Unbalanced Entry", `Debits (PKR ${totalDebit.toLocaleString()}) must equal Credits (PKR ${totalCredit.toLocaleString()}). Difference: PKR ${Math.abs(totalDebit - totalCredit).toLocaleString()}`);
      return;
    }

    // Verify all lines have accounts selected
    for (let i = 0; i < journalLines.length; i++) {
      if (!journalLines[i].accountId) {
        Alert.alert("Missing Account", `Line #${i + 1} does not have an Account selected.`);
        return;
      }
    }

    try {
      const db = getDB();
      const jvId = 'JV-' + Date.now().toString();
      const jvNo = 'JV-' + Date.now().toString().slice(-6);

      // 1. Insert Journal Header
      db.runSync(
        `INSERT INTO JournalVoucher (id, voucherNo, remarks, totalDebit, totalCredit)
         VALUES (?, ?, ?, ?, ?)`,
        [jvId, jvNo, journalRemarks, totalDebit, totalCredit]
      );

      // 2. Insert Lines & Update Account Balances
      journalLines.forEach(l => {
        const lineId = 'JVL-' + Math.random().toString(36).substring(2, 9);
        const deb = parseFloat(l.debit) || 0;
        const cred = parseFloat(l.credit) || 0;

        db.runSync(
          `INSERT INTO JournalVoucherLine (id, voucherId, accountId, remarks, debit, credit)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [lineId, jvId, l.accountId, l.remarks, deb, cred]
        );

        // Debit increases assets/expenses, Credit increases liabilities/equity
        const netChange = deb - cred;
        db.runSync(
          'UPDATE Account SET balance = balance + ? WHERE id = ?',
          [netChange, l.accountId]
        );
      });

      Alert.alert("Success", `Journal Voucher ${jvNo} saved and balanced!`);
      router.back();
    } catch (e: any) {
      Alert.alert("Database Error", e.message || "Failed to record journal voucher.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Mode Switcher Header */}
      <View style={styles.modeTabs}>
        <TouchableOpacity 
          style={[styles.modeTab, mode === 'quick' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setMode('quick')}
        >
          <Text style={[styles.modeTabText, { color: mode === 'quick' ? '#fff' : theme.tabIconDefault }]}>
            Cash / Bank Voucher
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modeTab, mode === 'journal' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setMode('journal')}
        >
          <Text style={[styles.modeTabText, { color: mode === 'journal' ? '#fff' : theme.tabIconDefault }]}>
            Journal Entry (Debit/Credit)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {mode === 'quick' ? (
          /* QUICK VOUCHER FORM */
          <View style={styles.formWrap}>
            {/* Direction Selector */}
            <View style={styles.directionRow}>
              <TouchableOpacity
                style={[styles.directionBtn, type === 'Receipt' && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: theme.success }]}
                onPress={() => setType('Receipt')}
              >
                <ArrowDownLeft size={20} color={type === 'Receipt' ? theme.success : theme.tabIconDefault} />
                <Text style={[styles.directionText, { color: type === 'Receipt' ? theme.success : theme.tabIconDefault }]}>
                  Money IN (Receipt)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.directionBtn, type === 'Payment' && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: theme.danger }]}
                onPress={() => setType('Payment')}
              >
                <ArrowUpRight size={20} color={type === 'Payment' ? theme.danger : theme.tabIconDefault} />
                <Text style={[styles.directionText, { color: type === 'Payment' ? theme.danger : theme.tabIconDefault }]}>
                  Money OUT (Payment)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Target Account */}
            <Text style={[styles.fieldLabel, { color: theme.tabIconDefault }]}>Party / Account Ledger *</Text>
            <TouchableOpacity
              style={[styles.selectBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => {
                setActiveLineIdx(null);
                setAccountModal(true);
              }}
            >
              <Text style={{ color: selectedAccountId ? theme.text : theme.tabIconDefault, fontSize: 15, fontWeight: '600' }}>
                {selectedAccountName}
              </Text>
              <ChevronDown size={18} color={theme.tabIconDefault} />
            </TouchableOpacity>

            {/* Amount */}
            <Text style={[styles.fieldLabel, { color: theme.tabIconDefault }]}>Amount (PKR) *</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={theme.tabIconDefault}
              value={amount}
              onChangeText={setAmount}
              style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
            />

            {/* Reference */}
            <Text style={[styles.fieldLabel, { color: theme.tabIconDefault }]}>Reference / Cheque #</Text>
            <TextInput
              placeholder="Optional check or receipt #"
              placeholderTextColor={theme.tabIconDefault}
              value={ref}
              onChangeText={setRef}
              style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
            />

            {/* Notes */}
            <Text style={[styles.fieldLabel, { color: theme.tabIconDefault }]}>Narration / Notes</Text>
            <TextInput
              placeholder="Description of payment or receipt..."
              placeholderTextColor={theme.tabIconDefault}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={[styles.textArea, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
            />

            <TouchableOpacity 
              style={[styles.btnSubmit, { backgroundColor: theme.primary }]}
              onPress={handleSaveQuickVoucher}
            >
              <Check size={18} color="#fff" />
              <Text style={styles.btnSubmitText}>Save Voucher</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* MULTI-LINE JOURNAL VOUCHER */
          <View style={styles.formWrap}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Posting Lines ({journalLines.length})</Text>
              <TouchableOpacity 
                style={[styles.btnAddSm, { backgroundColor: theme.primary }]}
                onPress={addJournalLine}
              >
                <Plus size={14} color="#fff" />
                <Text style={styles.btnAddSmText}>Add Line</Text>
              </TouchableOpacity>
            </View>

            {/* Cards for each posting line (exact mobile design) */}
            {journalLines.map((line, idx) => (
              <View key={idx} style={[styles.jvCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.jvLineNo, { color: theme.tabIconDefault }]}>Line #{idx + 1}</Text>
                  {journalLines.length > 2 && (
                    <TouchableOpacity onPress={() => removeJournalLine(idx)}>
                      <Trash2 size={16} color={theme.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Account Selection */}
                <TouchableOpacity
                  style={[styles.jvSelectBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    setActiveLineIdx(idx);
                    setAccountModal(true);
                  }}
                >
                  <Text style={{ color: line.accountId ? theme.text : theme.tabIconDefault, fontSize: 14, fontWeight: '600' }}>
                    {line.accountName}
                  </Text>
                  <ChevronDown size={16} color={theme.tabIconDefault} />
                </TouchableOpacity>

                {/* Narration */}
                <TextInput
                  placeholder="Optional line remarks..."
                  placeholderTextColor={theme.tabIconDefault}
                  value={line.remarks}
                  onChangeText={t => updateJournalLine(idx, 'remarks', t)}
                  style={[styles.jvInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                />

                {/* Debit & Credit 2-Column */}
                <View style={styles.row2}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={[styles.jvColLabel, { color: '#38bdf8' }]}>Debit (IN / Asset +)</Text>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={theme.tabIconDefault}
                      value={line.debit}
                      onChangeText={t => updateJournalLine(idx, 'debit', t)}
                      style={[styles.jvInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={[styles.jvColLabel, { color: '#ef4444' }]}>Credit (OUT / Asset -)</Text>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={theme.tabIconDefault}
                      value={line.credit}
                      onChangeText={t => updateJournalLine(idx, 'credit', t)}
                      style={[styles.jvInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* General Narration */}
            <Text style={[styles.fieldLabel, { color: theme.tabIconDefault, marginTop: 10 }]}>Overall Journal Description</Text>
            <TextInput
              placeholder="Context or explanation for journal entry adjustments..."
              placeholderTextColor={theme.tabIconDefault}
              value={journalRemarks}
              onChangeText={setJournalRemarks}
              multiline
              numberOfLines={2}
              style={[styles.textArea, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
            />

            {/* Trial Balance Status */}
            <View style={[styles.balanceCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={styles.balanceRow}>
                <Text style={{ color: theme.tabIconDefault, fontSize: 13 }}>Total Debits:</Text>
                <Text style={{ color: '#38bdf8', fontWeight: '700', fontSize: 14 }}>
                  PKR {getTotalDebit().toLocaleString()}
                </Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={{ color: theme.tabIconDefault, fontSize: 13 }}>Total Credits:</Text>
                <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>
                  PKR {getTotalCredit().toLocaleString()}
                </Text>
              </View>
              <View style={[styles.balanceRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, marginTop: 4 }]}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Status:</Text>
                <Text style={{ 
                  color: Math.abs(getTotalDebit() - getTotalCredit()) < 0.01 && getTotalDebit() > 0 ? theme.success : theme.danger,
                  fontWeight: '700', fontSize: 13
                }}>
                  {Math.abs(getTotalDebit() - getTotalCredit()) < 0.01 && getTotalDebit() > 0 
                    ? '✓ Balanced' 
                    : `Unbalanced (Diff: PKR ${Math.abs(getTotalDebit() - getTotalCredit()).toLocaleString()})`}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.btnSubmit, { backgroundColor: theme.primary }]}
              onPress={handleSaveJournalVoucher}
            >
              <Scale size={18} color="#fff" />
              <Text style={styles.btnSubmitText}>Post Journal Entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ACCOUNT SELECTOR MODAL */}
      <Modal visible={accountModal} animationType="slide" transparent={true}>
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Account</Text>
            <FlatList
              data={accounts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    if (activeLineIdx !== null) {
                      setJournalLines(journalLines.map((line, i) => {
                        if (i === activeLineIdx) {
                          return { ...line, accountId: item.id, accountName: item.name };
                        }
                        return line;
                      }));
                    } else {
                      setSelectedAccountId(item.id);
                      setSelectedAccountName(item.name);
                    }
                    setAccountModal(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.pickerItemSub, { color: theme.tabIconDefault }]}>
                    {item.type} • Balance: PKR {Number(item.balance || 0).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.btnCancel} onPress={() => setAccountModal(false)}>
              <Text style={{ color: theme.danger, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  modeTabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', borderColor: 'transparent' },
  modeTabText: { fontSize: 13, fontWeight: '700' },
  formWrap: { gap: 12 },
  directionRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  directionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  directionText: { fontSize: 13, fontWeight: '700' },
  fieldLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1 },
  input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  textArea: { minHeight: 70, borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  btnSubmit: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 48, borderRadius: 12, marginTop: 16 },
  btnSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  btnAddSm: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 8 },
  btnAddSmText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  jvCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8, marginBottom: 10 },
  jvLineNo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  jvSelectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1 },
  jvInput: { height: 38, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, fontSize: 13 },
  row2: { flexDirection: 'row' },
  jvColLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  balanceCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 8, gap: 6 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerModalContent: { maxHeight: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  pickerTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 15, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, marginTop: 2 },
  btnCancel: { alignItems: 'center', padding: 14, marginTop: 10 }
});
