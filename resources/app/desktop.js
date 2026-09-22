const { app, BrowserWindow, shell } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

let nextProcess = null;
let expressProcess = null;
let mainWindow = null;

// Helper to query the Windows Registry for the database path
function getDatabasePathFromRegistry(callback) {
  // Only query on Windows
  if (process.platform !== 'win32') {
    callback(null);
    return;
  }

  exec('reg query "HKCU\\Software\\SolarERP" /v DatabasePath', (err, stdout, stderr) => {
    if (err) {
      console.warn('[Registry]: DatabasePath registry key not found. Using default paths.');
      callback(null);
      return;
    }
    
    // Output format:
    // HKEY_CURRENT_USER\Software\SolarERP
    //     DatabasePath    REG_SZ    D:\SolarERP_Data
    const match = stdout.match(/DatabasePath\s+REG_SZ\s+(.*)/);
    if (match && match[1]) {
      callback(match[1].trim());
    } else {
      callback(null);
    }
  });
}

// Auto-detect the safest drive if no registry key or configuration exists
function autoDetectDatabaseDirectory() {
  const drives = ['D', 'E', 'F', 'G'];
  for (const drive of drives) {
    const drivePath = `${drive}:\\`;
    try {
      if (fs.existsSync(drivePath)) {
        return path.join(drivePath, 'SolarERP_Data');
      }
    } catch (e) {}
  }
  
  // Default fallback to user documents folder on C:\
  const documentsPath = app.getPath('documents');
  return path.join(documentsPath, 'SolarERP_Data');
}

// Main initialization function
function initializeDatabaseAndStart(dbDirectory) {
  let dbDir = dbDirectory;

  // Fallback if no path is configured in Registry
  if (!dbDir) {
    dbDir = autoDetectDatabaseDirectory();
  }

  console.log(`[Database]: Target database directory resolved to: ${dbDir}`);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (err) {
      console.error(`[Database]: Failed to create directory ${dbDir}:`, err);
      // Absolute fallback to userData path if creation fails
      dbDir = path.join(app.getPath('userData'), 'database');
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const dbPath = path.join(dbDir, 'dev.db');
  const defaultDbPath = path.join(__dirname, 'server', 'prisma', 'dev.db');

  // Copy template database if no file is present
  if (!fs.existsSync(dbPath)) {
    try {
      if (fs.existsSync(defaultDbPath)) {
        fs.copyFileSync(defaultDbPath, dbPath);
        console.log(`[Database]: Database seeded to ${dbPath}`);
      } else {
        console.warn(`[Database]: Default database template not found at ${defaultDbPath}`);
      }
    } catch (err) {
      console.error('[Database]: Failed to copy database template:', err);
    }
  } else {
    console.log(`[Database]: Database exists at ${dbPath}`);
  }

  // Set environments for child processes
  const sqliteUrl = 'file:' + dbPath.split(path.sep).join('/');
  process.env.DATABASE_URL = sqliteUrl;
  process.env.JWT_SECRET = 'super_secret_jwt_key_solar_erp_2026';
  process.env.DEV_EMAIL = 'admin@example.com';
  process.env.DEV_PASSWORD = 'admin';

  // Automatically migrate schema columns (e.g. bilti_no) before booting servers
  autoMigrateDatabase(dbPath, () => {
    startBackend();
    startFrontend();

    checkServerReady(() => {
      createWindow();
    });
  });
}

function autoMigrateDatabase(dbFilePath, callback) {
  try {
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.error('[Migration]: Could not open db for auto-migration:', err);
        return callback();
      }

      db.serialize(() => {
        db.all("PRAGMA table_info(Purchase)", (pErr, rows) => {
          if (!pErr && rows && rows.length > 0) {
            const hasBilti = rows.some(r => r.name === 'bilti_no');
            if (!hasBilti) {
              console.log('[Migration]: Adding bilti_no to Purchase table...');
              db.run("ALTER TABLE Purchase ADD COLUMN bilti_no TEXT", (aErr) => {
                if (aErr) console.warn('[Migration]: Purchase bilti_no alter notice:', aErr.message);
              });
            }
          }
        });

        db.all("PRAGMA table_info(SaleItem)", (sErr, rows) => {
          if (!sErr && rows && rows.length > 0) {
            const hasBilti = rows.some(r => r.name === 'bilti_no');
            if (!hasBilti) {
              console.log('[Migration]: Adding bilti_no to SaleItem table...');
              db.run("ALTER TABLE SaleItem ADD COLUMN bilti_no TEXT", (aErr) => {
                if (aErr) console.warn('[Migration]: SaleItem bilti_no alter notice:', aErr.message);
              });
            }
          }
        });

        db.all("PRAGMA table_info(Account)", (accErr, rows) => {
          if (!accErr && rows && rows.length > 0) {
            const hasSalary = rows.some(r => r.name === 'monthly_salary');
            if (!hasSalary) {
              console.log('[Migration]: Adding monthly_salary to Account table...');
              db.run("ALTER TABLE Account ADD COLUMN monthly_salary REAL DEFAULT 0", (alterErr) => {
                if (alterErr) console.warn('[Migration]: Account monthly_salary alter notice:', alterErr.message);
              });
            }
          }
        });

        // ── Auto-reconcile supplier purchases on boot ──────
        db.all("SELECT id, account_title, balance FROM Account WHERE account_type IN ('Suppliers', 'Supplier', 'Supplier Account')", (supErr, suppliers) => {
          if (!supErr && suppliers && suppliers.length > 0) {
            suppliers.forEach(sup => {
              db.get("SELECT (COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)) AS net FROM JournalVoucherLine WHERE account_id = ?", [sup.id], (jErr, jRow) => {
                const jvNet = (jRow && jRow.net) ? jRow.net : 0;
                db.get("SELECT (COALESCE(SUM(CASE WHEN direction = 'payment' THEN amount ELSE -amount END), 0)) AS net FROM Voucher WHERE party_account_id = ?", [sup.id], (vErr, vRow) => {
                  const vNet = (vRow && vRow.net) ? vRow.net : 0;
                  db.get("SELECT COALESCE(SUM(p.amount), 0) AS net FROM SalePayment p LEFT JOIN Sale s ON p.sale_id = s.id WHERE p.payment_account_id = ? OR (p.payment_account_name LIKE '%Contra%' AND s.customer_id = ?)", [sup.id, sup.id], (cErr, cRow) => {
                    const cNet = (cRow && cRow.net) ? cRow.net : 0;
                    const pool = Math.max(0, jvNet + vNet + cNet);
                    if (pool > 0) {
                      db.all("SELECT id, amount, paidAmount, remainingAmount, paymentStatus FROM Purchase WHERE supplier_id = ? ORDER BY purchase_date ASC, created_at ASC, id ASC", [sup.id], (pErr, purchases) => {
                        if (!pErr && purchases && purchases.length > 0) {
                          let remPool = pool;
                          purchases.forEach(p => {
                            const pAmt = p.amount || 0;
                            let alloc = 0;
                            if (remPool >= pAmt) {
                              alloc = pAmt;
                              remPool -= pAmt;
                            } else if (remPool > 0) {
                              alloc = remPool;
                              remPool = 0;
                            }
                            const newRem = Math.max(0, pAmt - alloc);
                            const newStatus = newRem <= 0.001 ? 'paid' : (alloc > 0 ? 'partial' : 'unpaid');
                            if (Math.abs((p.paidAmount || 0) - alloc) > 0.001 || Math.abs((p.remainingAmount || 0) - newRem) > 0.001 || p.paymentStatus !== newStatus) {
                              db.run("UPDATE Purchase SET paidAmount = ?, remainingAmount = ?, paymentStatus = ? WHERE id = ?", [alloc, newRem, newStatus, p.id]);
                            }
                          });
                        }
                      });
                    }
                  });
                });
              });
            });
          }
        });
      });

      db.close(() => {
        callback();
      });
    });
  } catch (e) {
    console.error('[Migration]: Exception in autoMigrateDatabase:', e);
    callback();
  }
}

function startBackend() {
  console.log('Starting Express backend...');
  const expressPath = path.join(__dirname, 'server', 'index.js');
  expressProcess = spawn(process.execPath, [expressPath], {
    cwd: __dirname,
    env: { ...process.env, PORT: '4000', CORS_ORIGIN: '*', ELECTRON_RUN_AS_NODE: '1', HOST: '0.0.0.0' }
  });

  expressProcess.stdout.on('data', (data) => {
    console.log(`[Express]: ${data}`);
  });

  expressProcess.stderr.on('data', (data) => {
    console.error(`[Express Error]: ${data}`);
  });
}

function startFrontend() {
  console.log('Starting Next.js frontend...');
  const isProd = app.isPackaged;
  
  const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
  
  if (isProd) {
    nextProcess = spawn(process.execPath, [nextBin, 'start', '-p', '3000', '-H', '0.0.0.0'], {
      cwd: __dirname,
      env: { ...process.env, PORT: '3000', ELECTRON_RUN_AS_NODE: '1' }
    });
  } else {
    nextProcess = spawn(process.execPath, [nextBin, 'dev', '-p', '3000', '-H', '0.0.0.0'], {
      cwd: __dirname,
      env: { ...process.env, PORT: '3000', ELECTRON_RUN_AS_NODE: '1' }
    });
  }

  nextProcess.stdout.on('data', (data) => {
    console.log(`[Next.js]: ${data}`);
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`[Next.js Error]: ${data}`);
  });
}

function checkServerReady(callback) {
  const req = http.get('http://localhost:3000', (res) => {
    if (res.statusCode === 200) {
      callback();
    } else {
      setTimeout(() => checkServerReady(callback), 500);
    }
  });

  req.on('error', () => {
    setTimeout(() => checkServerReady(callback), 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "SolarERP",
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  // Open external links and OAuth authorization windows in the user's default browser (Chrome, Edge, etc.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // 1. Read registry first
  getDatabasePathFromRegistry((registryPath) => {
    // 2. Initialize and boot servers
    initializeDatabaseAndStart(registryPath);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (expressProcess) {
    try {
      expressProcess.kill();
    } catch (e) {}
  }
  if (nextProcess) {
    try {
      nextProcess.kill();
    } catch (e) {}
  }
});
