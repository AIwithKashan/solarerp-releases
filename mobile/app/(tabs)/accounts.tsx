import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, useColorScheme, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import { Search, Plus, UserPlus, Phone, MapPin, X, Edit2, Trash2 } from 'lucide-react-native';

export const ACCOUNT_TYPES = [
  'Cash Account',
  'Bank Account',
  'Suppliers',
  'Customers',
  'Staff',
  'Expense Account',
  'Investors',
  'Inventory',
  'Assets Account',
  'Movable & Non Movable Property',
];

export const PAKISTAN_AREAS = [
  'Serai Naurang',
  'Bannu',
  'Lakki Marwat',
  'Karak',
  'Kohat',
  'Peshawar',
  'D.I. Khan',
  'Mardan',
  'Swat',
  'Islamabad',
  'Rawalpindi',
  'Lahore',
  'Karachi',
  'Quetta',
];

export default function AccountsScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState('Customers');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('Serai Naurang');
  const [customRegion, setCustomRegion] = useState('');

  const loadAccounts = () => {
    try {
      const db = getDB();
      const accountsList = db.getAllSync('SELECT * FROM Account ORDER BY name ASC');
      setAccounts(accountsList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setType('Customers');
    setPhone('');
    setRegion('Serai Naurang');
    setCustomRegion('');
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingAccount(item);
    setName(item.name || '');
    setType(item.type || 'Customers');
    setPhone(item.phone || '');
    if (PAKISTAN_AREAS.includes(item.region)) {
      setRegion(item.region);
      setCustomRegion('');
    } else {
      setRegion('Custom');
      setCustomRegion(item.region || '');
    }
    setModalVisible(true);
  };

  const handleSaveAccount = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a valid account title.");
      return;
    }

    const areaValue = (region === 'Custom' ? customRegion.trim() : region) || '';
    const phoneValue = phone ? phone.trim() : '';
    const accountType = type || 'Customers';

    try {
      const db = getDB();

      // Ensure columns exist on legacy mobile databases
      try { db.execSync("ALTER TABLE Account ADD COLUMN phone TEXT;"); } catch (e) {}
      try { db.execSync("ALTER TABLE Account ADD COLUMN region TEXT;"); } catch (e) {}

      if (editingAccount) {
        db.runSync(
          `UPDATE Account SET name = ?, type = ?, phone = ?, region = ? WHERE id = ?`,
          [name.trim(), accountType, phoneValue, areaValue, String(editingAccount.id)]
        );
        Alert.alert("Success", "Account updated successfully.");
      } else {
        const id = 'acc_' + Date.now().toString() + '_' + Math.floor(Math.random() * 1000);
        db.runSync(
          `INSERT INTO Account (id, name, type, phone, region, balance) VALUES (?, ?, ?, ?, ?, 0.0)`,
          [id, name.trim(), accountType, phoneValue, areaValue]
        );
        Alert.alert("Success", "Account created successfully.");
      }

      setModalVisible(false);
      loadAccounts();
    } catch (error: any) {
      console.error("Failed to save account:", error);
      Alert.alert("Error", `Failed to save account: ${error?.message || String(error)}`);
    }
  };

  const handleDeleteAccount = (item: any) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete account "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              const db = getDB();
              db.runSync('DELETE FROM Account WHERE id = ?', [item.id]);
              loadAccounts();
            } catch (e) {
              Alert.alert("Error", "Failed to delete account.");
            }
          }
        }
      ]
    );
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = (acc.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (acc.phone || '').includes(search) ||
                          (acc.region || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'ALL' || acc.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
      <View style={styles.topHeader}>
        <Text style={[styles.title, { color: theme.text }]}>Accounts Ledger</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={openCreateModal}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.addBtnText}>New Account</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <Search size={18} color="#888" />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by title, phone, or region..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollView}>
        <TouchableOpacity
          style={[styles.chip, selectedType === 'ALL' && { backgroundColor: theme.primary }]}
          onPress={() => setSelectedType('ALL')}
        >
          <Text style={[styles.chipText, selectedType === 'ALL' && { color: '#FFF' }]}>All Accounts</Text>
        </TouchableOpacity>
        {ACCOUNT_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, selectedType === t && { backgroundColor: theme.primary }]}
            onPress={() => setSelectedType(t)}
          >
            <Text style={[styles.chipText, selectedType === t && { color: '#FFF' }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Account List */}
      <FlatList
        data={filteredAccounts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.cardInfo}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.badge, { backgroundColor: theme.border, color: theme.text }]}>{item.type}</Text>
              </View>

              {item.phone ? (
                <View style={styles.row}>
                  <Phone size={14} color="#6B7280" />
                  <Text style={styles.specText}>{item.phone}</Text>
                </View>
              ) : null}

              {item.region ? (
                <View style={styles.row}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.specText}>{item.region}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.rightSection}>
              <Text style={[styles.balanceText, { color: (item.balance || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                Rs. {(item.balance || 0).toLocaleString()}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                  <Edit2 size={16} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAccount(item)} style={styles.iconBtn}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingAccount ? 'Edit Account' : 'New Account'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Account Title *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Al-Madina Solar Traders"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Account Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {ACCOUNT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeBtn,
                      { borderColor: theme.border },
                      type === t && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setType(t)}
                  >
                    <Text style={{ color: type === t ? '#FFF' : theme.text, fontSize: 12, fontWeight: '600' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.text }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. 03001234567"
                placeholderTextColor="#888"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Region / Area</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {PAKISTAN_AREAS.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[
                      styles.chip,
                      { borderColor: theme.border },
                      region === a && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => { setRegion(a); setCustomRegion(''); }}
                  >
                    <Text style={[styles.chipText, region === a && { color: '#FFF' }]}>{a}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.chip, region === 'Custom' && { backgroundColor: theme.primary }]}
                  onPress={() => setRegion('Custom')}
                >
                  <Text style={[styles.chipText, region === 'Custom' && { color: '#FFF' }]}>+ Custom Area</Text>
                </TouchableOpacity>
              </ScrollView>

              {region === 'Custom' && (
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 4 }]}
                  placeholder="Enter custom area name..."
                  placeholderTextColor="#888"
                  value={customRegion}
                  onChangeText={setCustomRegion}
                />
              )}

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSaveAccount}>
                <Text style={styles.submitBtnText}>{editingAccount ? 'Save Changes' : 'Create Account'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  chipScrollView: { marginBottom: 12, maxHeight: 36 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  cardInfo: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 10, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  specText: { fontSize: 12, color: '#6B7280', marginLeft: 6 },
  rightSection: { alignItems: 'flex-end', justifyContent: 'space-between' },
  balanceText: { fontSize: 14, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  iconBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  submitBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});
