import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, useColorScheme, TouchableOpacity, TextInput, Alert, ScrollView, Modal } from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import { router } from 'expo-router';

export default function CreateVoucherScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountName, setSelectedAccountName] = useState('Select Account Ledger');
  const [type, setType] = useState('Payment'); // Payment or Receipt

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [ref, setRef] = useState('');

  const [accountsModal, setAccountsModal] = useState(false);

  const loadData = () => {
     try {
       const db = getDB();
       const list = db.getAllSync('SELECT * FROM Account ORDER BY name ASC');
       setAccounts(list);
     } catch (e) {
       console.error(e);
     }
  };

  useEffect(() => {
     loadData();
  }, []);

  const handleSaveVoucher = () => {
     if (!selectedAccountId || !amount.trim()) {
        Alert.alert("Error", "Please select an Account Ledger and provide an Amount.");
        return;
     }

     const amtVal = parseFloat(amount);
     if (isNaN(amtVal) || amtVal <= 0) {
        Alert.alert("Error", "Amount must be a positive number.");
        return;
     }

     try {
       const db = getDB();
       const id = Date.now().toString();

       // Record General Voucher Ledger entry
       db.runSync(
          `INSERT INTO Voucher (id, type, amount, notes, reference)
           VALUES (?, ?, ?, ?, ?)`,
          [id, type, amtVal, notes, ref]
       );

       // Update targeted Party Account balance accordingly
       // Payment diminishes liabilities/assets depending on role, Receipt diminishes receivables
       const balanceDelta = type === 'Receipt' ? -amtVal : amtVal;
       db.runSync(
          'UPDATE Account SET balance = balance + ? WHERE id = ?',
          [balanceDelta, selectedAccountId]
       );

       Alert.alert("Success", "Voucher recorded and account balance adjusted!");
       router.back();
     } catch (e) {
       Alert.alert("Error", "Failed to preserve Voucher transaction.");
     }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
       <View style={styles.formCard}>
          <Text style={[styles.title, { color: theme.text }]}>Record Voucher Transactions</Text>

          <Text style={[styles.label, { color: theme.text }]}>Voucher Type *</Text>
          <View style={styles.tabRow}>
             {['Payment', 'Receipt'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tabBtn,
                    { borderColor: theme.border },
                    type === t && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}
                  onPress={() => setType(t)}
                >
                   <Text style={{ color: type === t ? '#FFF' : theme.text, fontWeight: 'bold' }}>{t} Voucher</Text>
                </TouchableOpacity>
             ))}
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Target Account Ledger *</Text>
          <TouchableOpacity
            style={[styles.selector, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => setAccountsModal(true)}
          >
             <Text style={{ color: theme.text }}>{selectedAccountName}</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: theme.text }]}>Voucher Amount (Rs.) *</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="0.00"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={[styles.label, { color: theme.text }]}>Reference / Cheque Number</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="e.g. Bank Transfer Ref, Cheque No."
            placeholderTextColor="#888"
            value={ref}
            onChangeText={setRef}
          />

          <Text style={[styles.label, { color: theme.text }]}>Remarks / Description</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, height: 80 }]}
            placeholder="Enter payment notes..."
            placeholderTextColor="#888"
            multiline={true}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSaveVoucher}>
             <Text style={styles.submitBtnText}>Post Transaction</Text>
          </TouchableOpacity>
       </View>

       {/* Accounts Picker Screen Modal */}
       <Modal visible={accountsModal} animationType="slide">
          <View style={{ flex: 1, backgroundColor: theme.background, padding: 16 }}>
             <Text style={[styles.modalTitle, { color: theme.text }]}>Select Ledger Account</Text>
             <FlatList
                data={accounts}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                       setSelectedAccountId(item.id);
                       setSelectedAccountName(item.name);
                       setAccountsModal(false);
                    }}
                  >
                     <Text style={[styles.listItemText, { color: theme.text }]}>{item.name}</Text>
                     <Text style={{ color: '#888', fontSize: 12 }}>{item.type} • Bal: Rs. {item.balance}</Text>
                  </TouchableOpacity>
                )}
             />
          </View>
       </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  formCard: { padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  tabRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tabBtn: { width: '48%', height: 44, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  selector: { height: 48, borderWidth: 1, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 12, marginBottom: 8 },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  submitBtn: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 28, marginBottom: 40 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 12 },
  listItem: { paddingVertical: 14, borderBottomWidth: 1 },
  listItemText: { fontSize: 15, fontWeight: '600' }
});

