import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Open or create the local mobile database
export const getDB = () => {
  return SQLite.openDatabaseSync('solar_erp.db');
};

// Initialize schema on app start
export const initDB = () => {
  try {
    const db = getDB();

    // Core Schema mirroring desktop Prisma schemas
    // Create BusinessSettings Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS BusinessSettings (
        id TEXT PRIMARY KEY,
        businessName TEXT NOT NULL DEFAULT 'Solar Shop',
        ownerName TEXT,
        contactEmail TEXT,
        contactPhone TEXT,
        website TEXT,
        address TEXT,
        ntnOrTaxId TEXT,
        currencySymbol TEXT DEFAULT 'Rs',
        currencyCode TEXT DEFAULT 'PKR',
        invoiceFootnote TEXT,
        logoPath TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Account Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS Account (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        subType TEXT,
        balance REAL NOT NULL DEFAULT 0.0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        phone TEXT,
        email TEXT,
        address TEXT,
        area TEXT,
        region TEXT
      );
    `);

    // Auto-migrate missing columns for existing SQLite tables
    try { db.execSync("ALTER TABLE Account ADD COLUMN phone TEXT;"); } catch (e) {}
    try { db.execSync("ALTER TABLE Account ADD COLUMN area TEXT;"); } catch (e) {}
    try { db.execSync("ALTER TABLE Account ADD COLUMN region TEXT;"); } catch (e) {}
    try { db.execSync("ALTER TABLE Account ADD COLUMN email TEXT;"); } catch (e) {}
    try { db.execSync("ALTER TABLE Account ADD COLUMN address TEXT;"); } catch (e) {}
    try { db.execSync("ALTER TABLE Account ADD COLUMN subType TEXT;"); } catch (e) {}

    // Create Product Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS Product (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        stockQuantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL,
        wattCapacity INTEGER,
        category TEXT,
        purchasePrice REAL NOT NULL DEFAULT 0.0,
        salePrice REAL NOT NULL DEFAULT 0.0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Creates Sales, Purchases, Vouchers Tables...
    db.execSync(`
      CREATE TABLE IF NOT EXISTS Sale (
        id TEXT PRIMARY KEY,
        date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        accountId TEXT NOT NULL,
        totalAmount REAL NOT NULL DEFAULT 0.0,
        discount REAL NOT NULL DEFAULT 0.0,
        netAmount REAL NOT NULL DEFAULT 0.0,
        paidAmount REAL NOT NULL DEFAULT 0.0,
        balanceAmount REAL NOT NULL DEFAULT 0.0,
        paymentStatus TEXT NOT NULL DEFAULT 'UNPAID',
        paymentMethod TEXT DEFAULT 'CASH',
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (accountId) REFERENCES Account(id)
      );

      CREATE TABLE IF NOT EXISTS SaleItem (
        id TEXT PRIMARY KEY,
        saleId TEXT NOT NULL,
        productId TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unitPrice REAL NOT NULL,
        subTotal REAL NOT NULL,
        FOREIGN KEY (saleId) REFERENCES Sale(id),
        FOREIGN KEY (productId) REFERENCES Product(id)
      );

      CREATE TABLE IF NOT EXISTS Purchase (
         id TEXT PRIMARY KEY,
         date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         accountId TEXT NOT NULL,
         supplierInvoiceNo TEXT,
         containerNo TEXT,
         biltiNo TEXT,
         totalAmount REAL NOT NULL DEFAULT 0.0,
         discount REAL NOT NULL DEFAULT 0.0,
         netAmount REAL NOT NULL DEFAULT 0.0,
         paidAmount REAL NOT NULL DEFAULT 0.0,
         balanceAmount REAL NOT NULL DEFAULT 0.0,
         paymentStatus TEXT NOT NULL DEFAULT 'UNPAID',
         paymentMethod TEXT DEFAULT 'CASH',
         notes TEXT,
         createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
         updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (accountId) REFERENCES Account(id)
      );

      CREATE TABLE IF NOT EXISTS PurchaseItem (
        id TEXT PRIMARY KEY,
        purchaseId TEXT NOT NULL,
        productId TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unitPrice REAL NOT NULL,
        watts INTEGER DEFAULT 0,
        subTotal REAL NOT NULL,
        FOREIGN KEY (purchaseId) REFERENCES Purchase(id),
        FOREIGN KEY (productId) REFERENCES Product(id)
      );

      CREATE TABLE IF NOT EXISTS Voucher (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        notes TEXT,
        reference TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS JournalVoucher (
        id TEXT PRIMARY KEY,
        voucherNo TEXT NOT NULL,
        voucherDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        totalDebit REAL NOT NULL DEFAULT 0.0,
        totalCredit REAL NOT NULL DEFAULT 0.0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS JournalVoucherLine (
        id TEXT PRIMARY KEY,
        voucherId TEXT NOT NULL,
        accountId TEXT NOT NULL,
        remarks TEXT,
        debit REAL NOT NULL DEFAULT 0.0,
        credit REAL NOT NULL DEFAULT 0.0,
        FOREIGN KEY (voucherId) REFERENCES JournalVoucher(id),
        FOREIGN KEY (accountId) REFERENCES Account(id)
      );
    `);

    // Auto-migrate missing columns for Purchase table
    try { db.execSync("ALTER TABLE Purchase ADD COLUMN containerNo TEXT;"); } catch (e) {}
    try { db.execSync("ALTER TABLE Purchase ADD COLUMN biltiNo TEXT;"); } catch (e) {}
    try { db.execSync("ALTER TABLE Purchase ADD COLUMN supplierInvoiceNo TEXT;"); } catch (e) {}

    // Auto-migrate missing columns for Product table
    try { db.execSync("ALTER TABLE Product ADD COLUMN category TEXT;"); } catch (e) {}
    try { db.execSync("ALTER TABLE Product ADD COLUMN wattCapacity INTEGER;"); } catch (e) {}

    // Seed default Business Settings if missing and fetch them
    const result = db.getAllSync('SELECT * FROM BusinessSettings LIMIT 1');
    if (result.length === 0) {
      db.runSync(
        `INSERT INTO BusinessSettings (id, businessName, ownerName) VALUES ('1', 'AIwithKashan', 'Kashan Khan')`
      );
    }
    console.log('[DB Init] Database initialized successfully!');
  } catch (error) {
    console.error('[DB Init] Error:', error);
  }
};

// Utilities for File Based Syncing (Google Drive Backup)
export const exportDatabase = async () => {
    try {
      const dbPath = FileSystem.documentDirectory + 'SQLite/solar_erp.db';
      const fileInfo = await FileSystem.getInfoAsync(dbPath);

      if (fileInfo.exists) {
        // Trigger generic device share framework which allows direct sending to Google Drive app installed on Android
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(dbPath, {
                mimeType: 'application/x-sqlite3',
                dialogTitle: 'Backup Database to Google Drive'
            });
        }
      }
    } catch (e) {
      console.error(e)
    }
}

