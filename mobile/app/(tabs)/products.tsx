import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, useColorScheme, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import { Search, Plus, Edit2, Trash2, Cpu, Tag, X } from 'lucide-react-native';

export const PRODUCT_CATEGORIES = [
  'Solars',
  'Inverters',
  'Cables',
  'Batteries',
  'Accessories',
  'Breakers',
  'Mounting Structure',
  'VFD',
  'Pump/Motors',
  'Filters',
  'Misc',
];

export const ACCOUNTING_UNITS = [
  'Number',
  'Liter',
  'Kg',
  'KW',
  'Yard',
  'Meter',
  'Foot',
  'Roll',
  'Box',
  'Set',
  'Pair',
  'Watt',
  'Ampere',
  'Volt',
  'Area',
];

export default function ProductsScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unit, setUnit] = useState('Watt');
  const [customUnit, setCustomUnit] = useState('');
  const [wattCapacity, setWattCapacity] = useState('');
  const [category, setCategory] = useState('Solars');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');

  const loadProducts = () => {
    try {
      const db = getDB();
      const list = db.getAllSync('SELECT * FROM Product ORDER BY title ASC');
      setProducts(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setTitle('');
    setStockQuantity('');
    setUnit('Watt');
    setCustomUnit('');
    setWattCapacity('');
    setCategory('Solars');
    setPurchasePrice('');
    setSalePrice('');
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingProduct(item);
    setTitle(item.title || '');
    setStockQuantity(item.stockQuantity !== undefined ? String(item.stockQuantity) : '0');
    if (ACCOUNTING_UNITS.includes(item.unit)) {
      setUnit(item.unit);
      setCustomUnit('');
    } else {
      setUnit('Custom');
      setCustomUnit(item.unit || '');
    }
    setWattCapacity(item.wattCapacity ? String(item.wattCapacity) : '');
    setCategory(item.category || 'Solars');
    setPurchasePrice(item.purchasePrice !== undefined ? String(item.purchasePrice) : '0');
    setSalePrice(item.salePrice !== undefined ? String(item.salePrice) : '0');
    setModalVisible(true);
  };

  const handleSaveProduct = () => {
    if (!title.trim() || !purchasePrice.trim() || !salePrice.trim()) {
      Alert.alert("Error", "Please fill in product title, purchase price, and sale price.");
      return;
    }

    const unitValue = unit === 'Custom' ? customUnit.trim() : unit;
    const pPrice = parseFloat(purchasePrice) || 0.0;
    const sPrice = parseFloat(salePrice) || 0.0;
    const wCap = parseInt(wattCapacity, 10) || 0;
    const stock = parseInt(stockQuantity, 10) || 0;

    try {
      const db = getDB();
      if (editingProduct) {
        db.runSync(
          `UPDATE Product SET title = ?, stockQuantity = ?, unit = ?, wattCapacity = ?, category = ?, purchasePrice = ?, salePrice = ? WHERE id = ?`,
          [title.trim(), stock, unitValue, wCap, category, pPrice, sPrice, editingProduct.id]
        );
        Alert.alert("Success", "Product updated successfully.");
      } else {
        const id = Date.now().toString();
        db.runSync(
          `INSERT INTO Product (id, title, stockQuantity, unit, wattCapacity, category, purchasePrice, salePrice)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, title.trim(), stock, unitValue, wCap, category, pPrice, sPrice]
        );
        Alert.alert("Success", "Product added successfully.");
      }

      setModalVisible(false);
      loadProducts();
    } catch (error) {
      Alert.alert("Error", "Failed to save product.");
    }
  };

  const handleDeleteProduct = (item: any) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete product "${item.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              const db = getDB();
              db.runSync('DELETE FROM Product WHERE id = ?', [item.id]);
              loadProducts();
            } catch (e) {
              Alert.alert("Error", "Failed to delete product.");
            }
          }
        }
      ]
    );
  };

  const filteredProducts = products.filter(item => {
    const matchesSearch = (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (item.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
      <View style={styles.topHeader}>
        <Text style={[styles.title, { color: theme.text }]}>Products Inventory</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={openCreateModal}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.addBtnText}>New Product</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <Search size={18} color="#888" />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search products by title or category..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollView}>
        <TouchableOpacity
          style={[styles.chip, selectedCategory === 'ALL' && { backgroundColor: theme.primary }]}
          onPress={() => setSelectedCategory('ALL')}
        >
          <Text style={[styles.chipText, selectedCategory === 'ALL' && { color: '#FFF' }]}>All Categories</Text>
        </TouchableOpacity>
        {PRODUCT_CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, selectedCategory === c && { backgroundColor: theme.primary }]}
            onPress={() => setSelectedCategory(c)}
          >
            <Text style={[styles.chipText, selectedCategory === c && { color: '#FFF' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.cardInfo}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.badge, { backgroundColor: theme.border, color: theme.text }]}>{item.category}</Text>
              </View>

              <View style={styles.row}>
                <Tag size={14} color="#6B7280" />
                <Text style={styles.specText}>
                  Stock: {item.stockQuantity || 0} {item.unit || 'Units'}
                  {item.wattCapacity && item.wattCapacity > 0 ? ` • ${item.wattCapacity} Watts` : ''}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceTag}>Cost: Rs. {(item.purchasePrice || 0).toLocaleString()}</Text>
                <Text style={styles.salePriceTag}>Sell: Rs. {(item.salePrice || 0).toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.actionColumn}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                <Edit2 size={16} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteProduct(item)} style={styles.iconBtn}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
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
                {editingProduct ? 'Edit Product' : 'New Product Item'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Product Name / Model *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Longi 580W N-Type Solar Panel"
                placeholderTextColor="#888"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.typeBtn,
                      { borderColor: theme.border },
                      category === c && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={{ color: category === c ? '#FFF' : theme.text, fontSize: 12, fontWeight: '600' }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.text }]}>Accounting Unit *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {ACCOUNTING_UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.typeBtn,
                      { borderColor: theme.border },
                      unit === u && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => { setUnit(u); setCustomUnit(''); }}
                  >
                    <Text style={{ color: unit === u ? '#FFF' : theme.text, fontSize: 12, fontWeight: '600' }}>{u}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { borderColor: theme.border },
                    unit === 'Custom' && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}
                  onPress={() => setUnit('Custom')}
                >
                  <Text style={{ color: unit === 'Custom' ? '#FFF' : theme.text, fontSize: 12, fontWeight: '600' }}>+ Custom Unit</Text>
                </TouchableOpacity>
              </ScrollView>

              {unit === 'Custom' && (
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
                  placeholder="Enter custom unit name..."
                  placeholderTextColor="#888"
                  value={customUnit}
                  onChangeText={setCustomUnit}
                />
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: '48%' }}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Stock Quantity *</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    placeholder="0"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                  />
                </View>

                <View style={{ width: '48%' }}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Power (Watts)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. 580"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={wattCapacity}
                    onChangeText={setWattCapacity}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <View style={{ width: '48%' }}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Purchase Price (Rs.) *</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    placeholder="0"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                  />
                </View>

                <View style={{ width: '48%' }}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Sale Price (Rs.) *</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    placeholder="0"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={salePrice}
                    onChangeText={setSalePrice}
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSaveProduct}>
                <Text style={styles.submitBtnText}>{editingProduct ? 'Save Changes' : 'Add Product Item'}</Text>
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
  priceRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  priceTag: { fontSize: 12, color: '#6B7280' },
  salePriceTag: { fontSize: 12, color: '#10B981', fontWeight: 'bold' },
  actionColumn: { justifyContent: 'space-between', alignItems: 'flex-end', paddingLeft: 8 },
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
