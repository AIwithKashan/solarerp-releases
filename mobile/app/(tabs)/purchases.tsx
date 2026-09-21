import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, useColorScheme, 
  TouchableOpacity, TextInput, Modal, Alert, ScrollView 
} from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import { 
  Search, Plus, Trash2, Truck, Box, Calendar, 
  DollarSign, Check, X, ShieldAlert, ArrowDownLeft 
} from 'lucide-react-native';

export default function PurchasesScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [createModal, setCreateModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('Select Supplier');
  const [supplierModal, setSupplierModal] = useState(false);

  // Form Fields
  const [containerNo, setContainerNo] = useState('');
  const [biltiNo, setBiltiNo] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [paidVal, setPaidVal] = useState('0');
  const [discountVal, setDiscountVal] = useState('0');
  const [notes, setNotes] = useState('');

  // Line items
  const [cart, setCart] = useState<any[]>([]);
  const [productModal, setProductModal] = useState(false);

  const loadData = () => {
    try {
      const db = getDB();
      // 1. Purchases with Supplier Name
      const purchaseList = db.getAllSync(`
        SELECT p.*, a.name as supplierName 
        FROM Purchase p 
        LEFT JOIN Account a ON p.accountId = a.id 
        ORDER BY p.date DESC
      `);
      setPurchases(purchaseList);

      // 2. Suppliers
      const supList = db.getAllSync("SELECT * FROM Account WHERE type = 'Supplier' ORDER BY name ASC");
      setSuppliers(supList);

      // 3. Products
      const prodList = db.getAllSync("SELECT * FROM Product ORDER BY title ASC");
      setProducts(prodList);
    } catch (e) {
      console.error('Error loading purchases:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addProductToPurchase = (prod: any) => {
    const isSolar = (prod.category || '').toLowerCase().includes('solar') || (prod.wattCapacity && prod.wattCapacity > 0);
    const existing = cart.find(item => item.id === prod.id);
    if (existing) {
      setCart(cart.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, {
        id: prod.id,
        title: prod.title,
        watts: prod.wattCapacity || 0,
        isSolar,
        qty: 1,
        rateType: isSolar ? 'perWatt' : 'perUnit',
        rate: isSolar ? (prod.purchasePrice > 1000 ? 45 : prod.purchasePrice || 45) : (prod.purchasePrice || 0)
      }]);
    }
    setProductModal(false);
  };

  const updateItemQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item => item.id === id ? { ...item, qty } : item));
    }
  };

  const updateItemRate = (id: string, rate: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, rate } : item));
  };

  const getItemSubtotal = (item: any) => {
    if (item.isSolar && item.rateType === 'perWatt' && item.watts > 0) {
      return item.qty * item.watts * item.rate;
    }
    return item.qty * item.rate;
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  };

  const getNetTotal = () => {
    const sub = getSubtotal();
    const disc = parseFloat(discountVal) || 0;
    return Math.max(0, sub - disc);
  };

  const handleSavePurchase = () => {
    if (!selectedSupplierId) {
      Alert.alert('Missing Supplier', 'Please select a Supplier for this purchase.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Empty Items', 'Please add at least one product to the purchase.');
      return;
    }

    const subtotal = getSubtotal();
    const netVal = getNetTotal();
    const paid = parseFloat(paidVal) || 0;
    const balance = netVal - paid;

    try {
      const db = getDB();
      const purchaseId = 'PUR-' + Date.now().toString();

      // 1. Insert Purchase Record
      db.runSync(
        `INSERT INTO Purchase (
          id, accountId, supplierInvoiceNo, containerNo, biltiNo,
          totalAmount, discount, netAmount, paidAmount, balanceAmount,
          paymentStatus, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseId, selectedSupplierId, supplierInvoiceNo, containerNo, biltiNo,
          subtotal, parseFloat(discountVal) || 0, netVal, paid, balance,
          balance <= 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID'), notes
        ]
      );

      // 2. Insert Line Items & Increment Inventory Stock
      cart.forEach(item => {
        const lineId = 'PI-' + Math.random().toString(36).substring(2, 9);
        const lineSubtotal = getItemSubtotal(item);
        db.runSync(
          `INSERT INTO PurchaseItem (id, purchaseId, productId, quantity, unitPrice, watts, subTotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [lineId, purchaseId, item.id, item.qty, item.rate, item.watts || 0, lineSubtotal]
        );

        // Increase product warehouse stock
        db.runSync(
          'UPDATE Product SET stockQuantity = stockQuantity + ? WHERE id = ?',
          [item.qty, item.id]
        );
      });

      // 3. Update Supplier Ledger (Increase payable balance)
      if (balance > 0) {
        db.runSync(
          'UPDATE Account SET balance = balance + ? WHERE id = ?',
          [balance, selectedSupplierId]
        );
      }

      Alert.alert('Success', `Purchase recorded successfully! ${containerNo ? 'Container #' + containerNo : ''}`);
      setCart([]);
      setPaidVal('0');
      setDiscountVal('0');
      setContainerNo('');
      setBiltiNo('');
      setSupplierInvoiceNo('');
      setNotes('');
      setCreateModal(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Database Error', e.message || 'Failed to save purchase.');
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.supplierName || '').toLowerCase().includes(q) ||
      (p.containerNo || '').toLowerCase().includes(q) ||
      (p.biltiNo || '').toLowerCase().includes(q) ||
      (p.supplierInvoiceNo || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Top Controls */}
      <View style={styles.topBar}>
        <View style={[styles.searchBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Search size={18} color={theme.tabIconDefault} />
          <TextInput
            placeholder="Search Supplier, Container #, Bilti..."
            placeholderTextColor={theme.tabIconDefault}
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.tabIconDefault} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity 
          style={[styles.btnAdd, { backgroundColor: theme.primary }]}
          onPress={() => setCreateModal(true)}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.btnAddText}>New Purchase</Text>
        </TouchableOpacity>
      </View>

      {/* List of Purchases */}
      <FlatList
        data={filteredPurchases}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Truck size={48} color={theme.tabIconDefault} style={{ opacity: 0.5, marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No purchase records found</Text>
            <Text style={[styles.emptySubtext, { color: theme.tabIconDefault }]}>
              Tap "New Purchase" to add supplier stock, container shipments, or local inventory.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.supplierTitle, { color: theme.text }]}>{item.supplierName || 'Unknown Supplier'}</Text>
                <Text style={[styles.dateText, { color: theme.tabIconDefault }]}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.badge, 
                { 
                  backgroundColor: item.paymentStatus === 'PAID' 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : (item.paymentStatus === 'PARTIAL' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)') 
                }
              ]}>
                <Text style={{ 
                  fontSize: 11, 
                  fontWeight: '700',
                  color: item.paymentStatus === 'PAID' ? theme.success : (item.paymentStatus === 'PARTIAL' ? theme.warning : theme.danger)
                }}>
                  {item.paymentStatus}
                </Text>
              </View>
            </View>

            {/* Container & Bilti Tags */}
            {(item.containerNo || item.biltiNo) ? (
              <View style={styles.tagsRow}>
                {item.containerNo ? (
                  <View style={[styles.tag, { backgroundColor: 'rgba(2, 132, 199, 0.15)', borderColor: 'rgba(2, 132, 199, 0.3)' }]}>
                    <Box size={12} color="#38bdf8" />
                    <Text style={[styles.tagText, { color: '#38bdf8' }]}>Container: {item.containerNo}</Text>
                  </View>
                ) : null}
                {item.biltiNo ? (
                  <View style={[styles.tag, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                    <Truck size={12} color="#f59e0b" />
                    <Text style={[styles.tagText, { color: '#f59e0b' }]}>Bilti: {item.biltiNo}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Financial Summary */}
            <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
              <View>
                <Text style={[styles.metaLabel, { color: theme.tabIconDefault }]}>Total Amount</Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>
                  PKR {Number(item.netAmount || 0).toLocaleString()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.metaLabel, { color: theme.tabIconDefault }]}>Pending Balance</Text>
                <Text style={[styles.metaValue, { color: item.balanceAmount > 0 ? theme.danger : theme.success }]}>
                  PKR {Number(item.balanceAmount || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* CREATE PURCHASE MODAL */}
      <Modal visible={createModal} animationType="slide" transparent={false}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Record Supplier Purchase</Text>
            <TouchableOpacity onPress={() => setCreateModal(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Supplier Selector */}
            <Text style={[styles.fieldLabel, { color: theme.tabIconDefault }]}>Supplier Account *</Text>
            <TouchableOpacity 
              style={[styles.selectBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setSupplierModal(true)}
            >
              <Text style={{ color: selectedSupplierId ? theme.text : theme.tabIconDefault, fontSize: 15, fontWeight: '600' }}>
                {selectedSupplierName}
              </Text>
            </TouchableOpacity>

            {/* Container & Bilti Info */}
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.fieldLabel, { color: theme.tabIconDefault }]}>Container Number</Text>
                <TextInput
                  placeholder="e.g. MSKU-849201"
                  placeholderTextColor={theme.tabIconDefault}
                  style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  value={containerNo}
                  onChangeText={setContainerNo}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.fieldLabel, { color: theme.tabIconDefault }]}>Bilti / Builty #</Text>
                <TextInput
                  placeholder="e.g. BL-7821"
                  placeholderTextColor={theme.tabIconDefault}
                  style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  value={biltiNo}
                  onChangeText={setBiltiNo}
                />
              </View>
            </View>

            {/* Line Items Section */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Purchase Items ({cart.length})</Text>
              <TouchableOpacity 
                style={[styles.btnAddSm, { backgroundColor: theme.primary }]}
                onPress={() => setProductModal(true)}
              >
                <Plus size={14} color="#fff" />
                <Text style={styles.btnAddSmText}>Add Product</Text>
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: theme.border }]}>
                <Text style={{ color: theme.tabIconDefault, fontSize: 13 }}>No items added yet. Tap "Add Product".</Text>
              </View>
            ) : (
              cart.map((item, idx) => (
                <View key={idx} style={[styles.cartCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.cartItemTitle, { color: theme.text }]}>{item.title}</Text>
                    <TouchableOpacity onPress={() => updateItemQty(item.id, 0)}>
                      <Trash2 size={16} color={theme.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.row3}>
                    {/* Quantity */}
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={[styles.subLabel, { color: theme.tabIconDefault }]}>Qty (Units)</Text>
                      <TextInput
                        keyboardType="numeric"
                        value={String(item.qty)}
                        onChangeText={t => updateItemQty(item.id, parseInt(t) || 0)}
                        style={[styles.smallInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                      />
                    </View>

                    {/* Rate */}
                    <View style={{ flex: 1.5, marginHorizontal: 6 }}>
                      <Text style={[styles.subLabel, { color: theme.tabIconDefault }]}>
                        {item.isSolar ? `Rate/Watt (PKR)` : `Unit Rate (PKR)`}
                      </Text>
                      <TextInput
                        keyboardType="numeric"
                        value={String(item.rate)}
                        onChangeText={t => updateItemRate(item.id, parseFloat(t) || 0)}
                        style={[styles.smallInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                      />
                    </View>

                    {/* Subtotal */}
                    <View style={{ flex: 1.5, alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={[styles.subLabel, { color: theme.tabIconDefault }]}>Subtotal</Text>
                      <Text style={[styles.itemSubtotal, { color: theme.primary }]}>
                        PKR {Math.round(getItemSubtotal(item)).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Totals & Payments */}
            <View style={[styles.totalsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.tabIconDefault }]}>Subtotal:</Text>
                <Text style={[styles.summaryVal, { color: theme.text }]}>PKR {Math.round(getSubtotal()).toLocaleString()}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.tabIconDefault }]}>Discount:</Text>
                <TextInput
                  keyboardType="numeric"
                  value={discountVal}
                  onChangeText={setDiscountVal}
                  style={[styles.miniInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                />
              </View>

              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.summaryLabel, { color: theme.text, fontWeight: '700' }]}>Net Bill:</Text>
                <Text style={[styles.summaryVal, { color: theme.primary, fontWeight: '700', fontSize: 16 }]}>
                  PKR {Math.round(getNetTotal()).toLocaleString()}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.tabIconDefault }]}>Amount Paid:</Text>
                <TextInput
                  keyboardType="numeric"
                  value={paidVal}
                  onChangeText={setPaidVal}
                  style={[styles.miniInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.success }]}
                />
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.tabIconDefault }]}>Remaining Due:</Text>
                <Text style={[styles.summaryVal, { color: (getNetTotal() - (parseFloat(paidVal) || 0)) > 0 ? theme.danger : theme.success }]}>
                  PKR {Math.round(Math.max(0, getNetTotal() - (parseFloat(paidVal) || 0))).toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.btnSubmit, { backgroundColor: theme.primary }]}
              onPress={handleSavePurchase}
            >
              <Check size={18} color="#fff" />
              <Text style={styles.btnSubmitText}>Save Purchase & Update Stock</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* SUPPLIER PICKER MODAL */}
      <Modal visible={supplierModal} animationType="slide" transparent={true}>
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Supplier</Text>
            <FlatList
              data={suppliers}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setSelectedSupplierId(item.id);
                    setSelectedSupplierName(item.name);
                    setSupplierModal(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.pickerItemSub, { color: theme.tabIconDefault }]}>Balance: PKR {Number(item.balance || 0).toLocaleString()}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.btnCancel} onPress={() => setSupplierModal(false)}>
              <Text style={{ color: theme.danger, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PRODUCT PICKER MODAL */}
      <Modal visible={productModal} animationType="slide" transparent={true}>
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Product to Purchase</Text>
            <FlatList
              data={products}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                  onPress={() => addProductToPurchase(item)}
                >
                  <Text style={[styles.pickerItemText, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.pickerItemSub, { color: theme.tabIconDefault }]}>
                    In Stock: {item.stockQuantity} {item.unit} {item.wattCapacity ? `(${item.wattCapacity}W)` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.btnCancel} onPress={() => setProductModal(false)}>
              <Text style={{ color: theme.danger, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', padding: 14, gap: 10, alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  btnAdd: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: 10, justifyContent: 'center' },
  btnAddText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: 14, paddingBottom: 80 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  supplierTitle: { fontSize: 16, fontWeight: '700' },
  dateText: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  metaLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '600' },
  metaValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 17, fontWeight: '700' },
  emptySubtext: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  selectBtn: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  row2: { flexDirection: 'row', marginBottom: 14 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  btnAddSm: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 8 },
  btnAddSmText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyBox: { padding: 20, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginVertical: 8 },
  cartCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  cartItemTitle: { fontSize: 14, fontWeight: '700' },
  row3: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  subLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  smallInput: { height: 36, borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, fontSize: 13 },
  itemSubtotal: { fontSize: 13, fontWeight: '700' },
  totalsCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 14, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13 },
  summaryVal: { fontSize: 14, fontWeight: '600' },
  miniInput: { width: 100, height: 34, borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, textAlign: 'right', fontSize: 13 },
  btnSubmit: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 48, borderRadius: 12, marginTop: 20 },
  btnSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerModalContent: { maxHeight: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  pickerTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 15, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, marginTop: 2 },
  btnCancel: { alignItems: 'center', padding: 14, marginTop: 10 }
});
