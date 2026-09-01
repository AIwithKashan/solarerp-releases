// index.js — Express server for Auth & Admin integration

try { require('dotenv').config(); } catch (e) {}


const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const prisma = require('./src/lib/db');

// Import new routers
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const app = express();
const server = http.createServer(app);

// CORS for REST endpoints - support all LAN mobile clients
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' })); 

// Mount Auth & Admin Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ── Start server & Seed Developer ─────────────────────────────────────────────

const startServer = async () => {
  try {
    // Seed Developer Account (Disabled due to missing User model)
    const devEmail = process.env.DEV_EMAIL;
    const devPassword = process.env.DEV_PASSWORD;
    /*
    if (devEmail && devPassword) {
      const existingDev = await prisma.user.findUnique({ where: { email: devEmail } });
      if (!existingDev) {
        const passwordHash = await bcrypt.hash(devPassword, 10);
        await prisma.user.create({
          data: {
            fullName: 'Super Admin',
            email: devEmail,
            passwordHash,
            role: 'developer',
            status: 'active'
          }
        });
        console.log(`[Auth] Developer account seeded: ${devEmail}`);
      }
    }
    */

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n  ⚡ AIwithKashan Auth Server`);
      console.log(`  ├─ Auth API:   http://localhost:${PORT}/api/auth`);
      console.log(`  ├─ Admin API:  http://localhost:${PORT}/api/admin`);
      console.log(`  └─ CORS:       ${CORS_ORIGIN}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer();
