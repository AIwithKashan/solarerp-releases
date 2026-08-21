const { app, BrowserWindow } = require('electron');
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

  startBackend();
  startFrontend();

  checkServerReady(() => {
    createWindow();
  });
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
