import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, useColorScheme, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import { Search, Plus, Trash2, User, Landmark, ShoppingBag, X } from 'lucide-react-native';

export default function SalesPOSScreen() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  // Active Transaction State
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('Select Customer');

  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState('0');
  const [paidVal, setPaidVal] = useState('0');

  // Modals status
  const [customerModal, setCustomerModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    try {
      const db = getDB();
      const accountsList = db.getAllSync("SELECT * FROM Account WHERE type = 'Customer' ORDER BY name ASC");
      const productsList = db.getAllSync("SELECT * FROM Product WHERE stockQuantity > 0 ORDER BY title ASC");
      setCustomers(accountsList);
      setProducts(productsList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
       if (existing.qty >= product.stockQuantity) {
          Alert.alert("Warning", "Cannot exceed available warehouse stock limit.");
          return;
       }
       setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
       setCart([...cart, { ...product, qty: 1 }]);
    }
    setProductModal(false);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getSubtotal = () => {
     return cart.reduce((sum, item) => sum + (item.salePrice * item.qty), 0);
  };

  const getNetTotal = () => {
     const sub = getSubtotal();
     const disc = parseFloat(discount) || 0;
     return Math.max(0, sub - disc);
  };

  const handleCheckout = () => {
     if (!selectedCustomerId) {
        Alert.alert("Error", "Please select a Customer for the Invoice.");
        return;
     }
     if (cart.length === 0) {
        Alert.alert("Error", "Your shopping cart is empty.");
        return;
     }

     const subtotal = getSubtotal();
     const netVal = getNetTotal();
     const paid = parseFloat(paidVal) || 0;
     const balPayable = netVal - paid;

     try {
       const db = getDB();
       const saleId = Date.now().toString();

       // Start Transaction logic locally on database
       db.runSync(
         `INSERT INTO Sale (id, accountId, totalAmount, discount, netAmount, paidAmount, balanceAmount, paymentStatus)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
         [saleId, selectedCustomerId, subtotal, parseFloat(discount) || 0, netVal, paid, balPayable, balPayable <= 0 ? 'PAID' : 'PARTIAL']
       );

       // Insert line items and update inventory counts
       cart.forEach(item => {
          const lineId = Math.random().toString();
          db.runSync(
            `INSERT INTO SaleItem (id, saleId, productId, quantity, unitPrice, subTotal)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [lineId, saleId, item.id, item.qty, item.salePrice, item.salePrice * item.qty]
          );

          // Update product remaining stock quantity
          db.runSync(
            'UPDATE Product SET stockQuantity = stockQuantity - ? WHERE id = ?',
            [item.qty, item.id]
          );
       });

       // Update Customer Ledger Account balance
       db.runSync(
          'UPDATE Account SET balance = balance + ? WHERE id = ?',
          [balPayable, selectedCustomerId]
       );

       Alert.alert("Success", "Invoice recorded and generated successfully!");
       setCart([]);
       setDiscount('0');
       setPaidVal('0');
       setSelectedCustomerId('');
       setSelectedCustomerName('Select Customer');
       loadData();
     } catch (e) {
       Alert.alert("Error", "Checkout transition transaction failed.");
     }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Customer Selector Ribbon */}
      <TouchableOpacity
        style={[styles.selectorBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => setCustomerModal(true)}
      >
        <User color={theme.primary} size={20} />
        <Text style={[styles.selectorText, { color: theme.text }]}>{selectedCustomerName}</Text>
      </TouchableOpacity>

      {/* Cart Items Title */}
      <View style={styles.cartHeader}>
         <Text style={[styles.cartTitle, { color: theme.text }]}>Shopping Items ({cart.length})</Text>
         <TouchableOpacity
           style={[styles.addBtn, { backgroundColor: theme.surface }]}
           onPress={() => setProductModal(true)}
         >
           <Plus size={16} color={theme.primary} />
           <Text style={[styles.addBtnText, { color: theme.primary }]}>Add Product</Text>
         </TouchableOpacity>
      </View>

      {/* Cart Container Log */}
      <FlatList
        data={cart}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.cartItem, { borderBottomColor: theme.border }]}>
             <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={styles.itemMeta}>Qty: {item.qty} Pcs • Rs. {item.salePrice.toLocaleString()} each</Text>
             </View>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.itemSub, { color: theme.text }]}>Rs. {(item.salePrice * item.qty).toLocaleString()}</Text>
                <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ marginLeft: 16 }}>
                   <Trash2 size={18} color={theme.danger} />
                </TouchableOpacity>
             </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCartBox}>
             <ShoppingBag color="#CCC" size={48} />
             <Text style={{ color: '#888', marginTop: 12 }}>No items added to invoicing cart yet.</Text>
          </View>
        }
      />

      {/* Pricing Summary Footer Dock */}
      {cart.length > 0 && (
         <View style={[styles.footerDock, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
            <View style={styles.calcRow}>
               <Text style={[styles.calcLabel, { color: theme.text }]}>Subtotal:</Text>
               <Text style={[styles.calcVal, { color: theme.text }]}>Rs. {getSubtotal().toLocaleString()}</Text>
            </View>

            <View style={styles.calcRow}>
               <Text style={[styles.calcLabel, { color: theme.text }]}>Discount deduction:</Text>
               <TextInput
                 style={[styles.inlineInput, { color: theme.text, borderColor: theme.border }]}
                 keyboardType="numeric"
                 value={discount}
                 onChangeText={setDiscount}
               />
            </View>

            <View style={styles.calcRow}>
               <Text style={[styles.calcLabel, { color: theme.text, fontWeight: 'bold' }]}>Net Payable Invoice Total:</Text>
               <Text style={[styles.calcVal, { color: theme.primary, fontWeight: 'bold' }]}>Rs. {getNetTotal().toLocaleString()}</Text>
            </View>

            <View style={styles.calcRow}>
               <Text style={[styles.calcLabel, { color: theme.text }]}>Paid Cash Received:</Text>
               <TextInput
                 style={[styles.inlineInput, { color: theme.text, borderColor: theme.border }]}
                 keyboardType="numeric"
                 value={paidVal}
                 onChangeText={setPaidVal}
               />
            </View>

            <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: theme.primary }]} onPress={handleCheckout}>
               <Text style={styles.checkoutBtnText}>Record & Print Invoice</Text>
            </TouchableOpacity>
         </View>
      )}

      {/* Customer Selection Modal */}
      <Modal visible={customerModal} animationType="slide">
         <View style={{ flex: 1, backgroundColor: theme.background, padding: 16 }}>
            <View style={styles.modalHeading}>
               <Text style={[styles.modalTitleText, { color: theme.text }]}>Select Customer Ledger</Text>
               <TouchableOpacity onPress={() => setCustomerModal(false)}>
                  <X size={24} color={theme.text} />
               </TouchableOpacity>
            </View>
            <FlatList
              data={customers}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                     setSelectedCustomerId(item.id);
                     setSelectedCustomerName(item.name);
                     setCustomerModal(false);
                  }}
                >
                   <Text style={[styles.listItemText, { color: theme.text }]}>{item.name}</Text>
                   <Text style={{ color: '#888', fontSize: 12 }}>{item.region}</Text>
                </TouchableOpacity>
              )}
            />
         </View>
      </Modal>

      {/* Product Selection Modal */}
      <Modal visible={productModal} animationType="slide">
         <View style={{ flex: 1, backgroundColor: theme.background, padding: 16 }}>
            <View style={styles.modalHeading}>
               <Text style={[styles.modalTitleText, { color: theme.text }]}>Add Product Item</Text>
               <TouchableOpacity onPress={() => setProductModal(false)}>
                  <X size={24} color={theme.text} />
               </TouchableOpacity>
            </View>
            <FlatList
              data={products}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: theme.border }]}
                  onPress={() => addToCart(item)}
                >
                   <View>
                      <Text style={[styles.listItemText, { color: theme.text }]}>{item.title}</Text>
                      <Text style={{ color: '#888', fontSize: 12 }}>Stock available: {item.stockQuantity} Pcs</Text>
                   </View>
                   <Text style={[styles.priceValueText, { color: theme.primary }]}>Rs. {item.salePrice.toLocaleString()}</Text>
                </TouchableOpacity>
              )}
            />
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  selectorBar: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  selectorText: { marginLeft: 12, fontWeight: '600', fontSize: 15 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cartTitle: { fontSize: 16, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { marginLeft: 4, fontWeight: 'bold', fontSize: 13 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  itemTitle: { fontWeight: '600', fontSize: 15 },
  itemMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  itemSub: { fontWeight: 'bold', fontSize: 15 },
  emptyCartBox: { padding: 48, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC', borderRadius: 16, marginTop: 16 },
  footerDock: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calcLabel: { fontSize: 14, color: '#888' },
  calcVal: { fontSize: 14 },
  inlineInput: { width: 100, height: 32, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, textAlign: 'right', fontSize: 13 },
  checkoutBtn: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  modalTitleText: { fontSize: 18, fontWeight: 'bold' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  listItemText: { fontSize: 15, fontWeight: '600' },
  priceValueText: { fontSize: 14, fontWeight: 'bold' }
});

