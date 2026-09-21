import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, useColorScheme, 
  TouchableOpacity, TextInput, Modal, Alert, ScrollView 
} from 'react-native';
import { getDB } from '../../lib/db';
import Colors from '../../constants/Colors';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { 
  Search, Plus, Trash2, User, Landmark, ShoppingBag, 
  X, Printer, Zap, CheckCircle2, ChevronRight 
} from 'lucide-react-native';

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
    const isSolar = (product.category || '').toLowerCase().includes('solar') || (product.wattCapacity && product.wattCapacity > 0);
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
       if (existing.qty >= product.stockQuantity) {
          Alert.alert("Stock Limit", "Cannot exceed available warehouse stock.");
          return;
       }
       setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
       setCart([...cart, { 
         ...product, 
         qty: 1,
         isSolar,
         watts: product.wattCapacity || 0,
         rateType: isSolar ? 'perWatt' : 'perUnit',
         // If solar, default rate is per-watt (e.g. 47)
         effectiveRate: isSolar ? (product.salePrice > 1000 ? 47 : (product.salePrice || 47)) : (product.salePrice || 0)
       }]);
    }
    setProductModal(false);
  };

  const updateCartQty = (id: string, qty: number) => {
    const prod = products.find(p => p.id === id);
    if (prod && qty > prod.stockQuantity) {
      Alert.alert("Stock Alert", `Only ${prod.stockQuantity} units available in warehouse.`);
      return;
    }
    if (qty <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item => item.id === id ? { ...item, qty } : item));
    }
  };

  const updateCartRate = (id: string, rate: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, effectiveRate: rate } : item));
  };

  const getItemSubtotal = (item: any) => {
    if (item.isSolar && item.rateType === 'perWatt' && item.watts > 0) {
      return item.qty * item.watts * item.effectiveRate;
    }
    return item.qty * item.effectiveRate;
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  };

  const getNetTotal = () => {
    const sub = getSubtotal();
    const disc = parseFloat(discount) || 0;
    return Math.max(0, sub - disc);
  };

  const generateInvoiceHtml = (invoiceNo: string, customerName: string, saleDate: string, items: any[], subtotal: number, disc: number, net: number, paid: number, bal: number) => {
    const itemsHtml = items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 4px; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 8px 4px; font-size: 12px; font-weight: bold;">${item.title} ${item.watts ? `(${item.watts}W)` : ''}</td>
        <td style="padding: 8px 4px; font-size: 12px; text-align: center;">${item.qty}</td>
        <td style="padding: 8px 4px; font-size: 12px; text-align: right;">Rs. ${item.effectiveRate} ${item.isSolar ? '/W' : ''}</td>
        <td style="padding: 8px 4px; font-size: 12px; text-align: right; font-weight: bold;">Rs. ${Math.round(getItemSubtotal(item)).toLocaleString()}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNo}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 18px; }
          .title { font-size: 22px; font-weight: 800; color: #0284c7; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin: 4px 0 0 0; }
          .meta-box { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; padding: 8px 4px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; }
          .totals { margin-left: auto; width: 220px; font-size: 13px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">⚡ AIwithKashan • Solar ERP</h1>
          <p class="subtitle">Complete Solar Solutions & Equipment</p>
        </div>
        <div class="meta-box">
          <div>
            <strong>Customer:</strong> ${customerName}<br>
            <strong>Date:</strong> ${new Date(saleDate).toLocaleDateString()}
          </div>
          <div style="text-align: right;">
            <strong>Invoice #:</strong> ${invoiceNo}<br>
            <strong>Status:</strong> ${bal <= 0 ? 'PAID' : 'PENDING'}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>Description</th>
              <th style="text-align: center; width: 45px;">Qty</th>
              <th style="text-align: right; width: 80px;">Rate</th>
              <th style="text-align: right; width: 90px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row"><span>Subtotal:</span> <span>Rs. ${Math.round(subtotal).toLocaleString()}</span></div>
          ${disc > 0 ? `<div class="totals-row"><span>Discount:</span> <span>- Rs. ${Math.round(disc).toLocaleString()}</span></div>` : ''}
          <div class="totals-row" style="font-weight: bold; font-size: 14px; border-top: 1px solid #0f172a; padding-top: 4px;">
            <span>Net Total:</span> <span>Rs. ${Math.round(net).toLocaleString()}</span>
          </div>
          <div class="totals-row" style="color: #10b981;"><span>Paid Amount:</span> <span>Rs. ${Math.round(paid).toLocaleString()}</span></div>
          <div class="totals-row" style="color: ${bal > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">
            <span>Balance Due:</span> <span>Rs. ${Math.round(Math.max(0, bal)).toLocaleString()}</span>
          </div>
        </div>
        <div class="footer">
          Thank you for your business! Powered by Solar ERP.
        </div>
      </body>
      </html>
    `;
  };

  const handleCheckout = async () => {
    if (!selectedCustomerId) {
      Alert.alert("Missing Customer", "Please select a Customer for the Invoice.");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Empty Cart", "Your shopping cart is empty.");
      return;
    }

    const subtotal = getSubtotal();
    const netVal = getNetTotal();
    const paid = parseFloat(paidVal) || 0;
    const balPayable = netVal - paid;

    try {
      const db = getDB();
      const invoiceNo = 'INV-' + Date.now().toString().slice(-6);
      const saleId = 'SALE-' + Date.now().toString();
      const saleDate = new Date().toISOString();

      // 1. Insert Sale record
      db.runSync(
        `INSERT INTO Sale (id, accountId, totalAmount, discount, netAmount, paidAmount, balanceAmount, paymentStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, selectedCustomerId, subtotal, parseFloat(discount) || 0, netVal, paid, balPayable, balPayable <= 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID')]
      );

      // 2. Insert Sale Items & Deduct Stock
      cart.forEach(item => {
        const lineId = 'SI-' + Math.random().toString(36).substring(2, 9);
        const lineTotal = getItemSubtotal(item);
        db.runSync(
          `INSERT INTO SaleItem (id, saleId, productId, quantity, unitPrice, subTotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [lineId, saleId, item.id, item.qty, item.effectiveRate, lineTotal]
        );

        // Deduct remaining warehouse stock
        db.runSync(
          'UPDATE Product SET stockQuantity = stockQuantity - ? WHERE id = ?',
          [item.qty, item.id]
        );
      });

      // 3. Update Customer Ledger Account balance
      if (balPayable > 0) {
        db.runSync(
          'UPDATE Account SET balance = balance + ? WHERE id = ?',
          [balPayable, selectedCustomerId]
        );
      }

      // Generate printable invoice HTML
      const html = generateInvoiceHtml(
        invoiceNo, selectedCustomerName, saleDate, cart,
        subtotal, parseFloat(discount) || 0, netVal, paid, balPayable
      );

      Alert.alert(
        "Sale Completed! 🎉",
        `Invoice ${invoiceNo} recorded successfully.\nWould you like to print or share the invoice PDF?`,
        [
          {
            text: "Done",
            style: "cancel",
            onPress: () => {
              setCart([]);
              setDiscount('0');
              setPaidVal('0');
              setSelectedCustomerId('');
              setSelectedCustomerName('Select Customer');
              loadData();
            }
          },
          {
            text: "Print / Share PDF",
            onPress: async () => {
              try {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
              } catch (err: any) {
                console.error(err);
              }
              setCart([]);
              setDiscount('0');
              setPaidVal('0');
              setSelectedCustomerId('');
              setSelectedCustomerName('Select Customer');
              loadData();
            }
          }
        ]
      );
    } catch (e: any) {
      Alert.alert("Checkout Error", e.message || "Failed to record sale.");
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
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.selectorSub, { color: theme.tabIconDefault }]}>Customer</Text>
          <Text style={[styles.selectorText, { color: theme.text }]}>{selectedCustomerName}</Text>
        </View>
        <ChevronRight size={18} color={theme.tabIconDefault} />
      </TouchableOpacity>

      {/* Cart Items Title */}
      <View style={styles.cartHeader}>
        <Text style={[styles.cartTitle, { color: theme.text }]}>Sale Items ({cart.length})</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => setProductModal(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Container Log */}
      <FlatList
        data={cart}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: cart.length > 0 ? 240 : 20 }}
        renderItem={({ item }) => (
          <View style={[styles.cartItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                {item.isSolar ? (
                  <View style={styles.solarBadge}>
                    <Zap size={12} color="#38bdf8" />
                    <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: '700' }}>
                      {item.watts}W Panels • Total {item.qty * item.watts} Watts
                    </Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => updateCartQty(item.id, 0)} style={{ padding: 4 }}>
                <Trash2 size={16} color={theme.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.cartItemControls}>
              {/* Quantity */}
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={[styles.miniLabel, { color: theme.tabIconDefault }]}>Quantity</Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(item.qty)}
                  onChangeText={t => updateCartQty(item.id, parseInt(t) || 0)}
                  style={[styles.smallInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                />
              </View>

              {/* Rate */}
              <View style={{ flex: 1.5, marginHorizontal: 6 }}>
                <Text style={[styles.miniLabel, { color: theme.tabIconDefault }]}>
                  {item.isSolar ? 'Rate/Watt (PKR)' : 'Unit Rate (PKR)'}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(item.effectiveRate)}
                  onChangeText={t => updateCartRate(item.id, parseFloat(t) || 0)}
                  style={[styles.smallInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                />
              </View>

              {/* Total */}
              <View style={{ flex: 1.5, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Text style={[styles.miniLabel, { color: theme.tabIconDefault }]}>Line Total</Text>
                <Text style={[styles.itemSub, { color: theme.primary }]}>
                  PKR {Math.round(getItemSubtotal(item)).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyCartBox, { borderColor: theme.border }]}>
            <ShoppingBag color={theme.tabIconDefault} size={44} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyCartTitle, { color: theme.text }]}>Invoice cart is empty</Text>
            <Text style={{ color: theme.tabIconDefault, fontSize: 13, marginTop: 4 }}>Tap "Add Product" to select panels, inverters, or batteries.</Text>
          </View>
        }
      />

      {/* Pricing Summary Footer Dock */}
      {cart.length > 0 && (
        <View style={[styles.footerDock, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { color: theme.tabIconDefault }]}>Subtotal:</Text>
            <Text style={[styles.calcVal, { color: theme.text }]}>PKR {Math.round(getSubtotal()).toLocaleString()}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { color: theme.tabIconDefault }]}>Discount Deduction:</Text>
            <TextInput
              style={[styles.inlineInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              keyboardType="numeric"
              value={discount}
              onChangeText={setDiscount}
            />
          </View>

          <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, marginTop: 4 }]}>
            <Text style={[styles.calcLabel, { color: theme.text, fontWeight: '700' }]}>Net Invoice Total:</Text>
            <Text style={[styles.calcVal, { color: theme.primary, fontWeight: '800', fontSize: 16 }]}>
              PKR {Math.round(getNetTotal()).toLocaleString()}
            </Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { color: theme.tabIconDefault }]}>Cash Received (Paid):</Text>
            <TextInput
              style={[styles.inlineInput, { color: theme.success, borderColor: theme.border, backgroundColor: theme.surface }]}
              keyboardType="numeric"
              value={paidVal}
              onChangeText={setPaidVal}
            />
          </View>

          <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: theme.primary }]} onPress={handleCheckout}>
            <Printer size={18} color="#fff" />
            <Text style={styles.checkoutBtnText}>Record & Print Invoice</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Customer Selection Modal */}
      <Modal visible={customerModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeading}>
              <Text style={[styles.modalTitleText, { color: theme.text }]}>Select Customer</Text>
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
                  <View>
                    <Text style={[styles.listItemText, { color: theme.text }]}>{item.name}</Text>
                    <Text style={{ color: theme.tabIconDefault, fontSize: 12 }}>{item.region || 'General'}</Text>
                  </View>
                  <Text style={{ color: theme.tabIconDefault, fontSize: 12 }}>
                    Balance: PKR {Number(item.balance || 0).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Product Selection Modal */}
      <Modal visible={productModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeading}>
              <Text style={[styles.modalTitleText, { color: theme.text }]}>Add Product to Invoice</Text>
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
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.listItemText, { color: theme.text }]}>{item.title}</Text>
                    <Text style={{ color: theme.tabIconDefault, fontSize: 12 }}>
                      Available Stock: {item.stockQuantity} {item.unit} {item.wattCapacity ? `• ${item.wattCapacity}W` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.priceValueText, { color: theme.primary }]}>
                    PKR {Number(item.salePrice || 0).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  selectorBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  selectorSub: { fontSize: 10, textTransform: 'uppercase', fontWeight: '700' },
  selectorText: { fontWeight: '700', fontSize: 15, marginTop: 1 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cartTitle: { fontSize: 15, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cartItem: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  itemTitle: { fontWeight: '700', fontSize: 14 },
  solarBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cartItemControls: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  miniLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  smallInput: { height: 36, borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, fontSize: 13 },
  itemSub: { fontWeight: '800', fontSize: 14 },
  emptyCartBox: { padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderRadius: 14, marginTop: 24 },
  emptyCartTitle: { fontSize: 15, fontWeight: '700', marginTop: 10 },
  footerDock: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, borderTopWidth: 1, elevation: 8 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  calcLabel: { fontSize: 13 },
  calcVal: { fontSize: 14, fontWeight: '600' },
  inlineInput: { width: 110, height: 32, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, textAlign: 'right', fontSize: 13 },
  checkoutBtn: { flexDirection: 'row', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
  checkoutBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  modalTitleText: { fontSize: 17, fontWeight: '700' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
  listItemText: { fontSize: 15, fontWeight: '600' },
  priceValueText: { fontSize: 14, fontWeight: '700' }
});
