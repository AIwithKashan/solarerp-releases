// whatsappClient.js — WhatsApp Multi-Device Session Manager
// Uses @whiskeysockets/baileys to establish a real WhatsApp Web connection.
// Session data is persisted to ./auth_session/ so reconnects don't need a fresh QR scan.

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = path.join(__dirname, 'auth_session');

class WhatsAppClient {
  constructor() {
    this.sock = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
    this.qrDataUrl = null;
    this.linkedNumber = null;
    this.io = null; // Socket.IO server reference
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 5;
  }

  // Set the Socket.IO server instance for broadcasting events
  setIO(io) {
    this.io = io;
  }

  // Broadcast status to all connected frontend clients
  _emitStatus() {
    if (this.io) {
      this.io.emit('wa:status', {
        status: this.status,
        phoneNumber: this.linkedNumber,
      });
    }
  }

  // Broadcast QR code to all connected frontend clients
  _emitQR() {
    if (this.io && this.qrDataUrl) {
      this.io.emit('wa:qr', { qrDataUrl: this.qrDataUrl });
    }
  }

  // Initialize or reconnect the WhatsApp socket
  async connect() {
    if (this.status === 'connected' || this.status === 'connecting') {
      // Already connected or in progress
      return;
    }

    this.status = 'connecting';
    this._emitStatus();

    try {
      // Load or create session auth state from disk
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      // Create the Baileys socket with a silent logger to avoid noisy console output
      this.sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // We handle QR display ourselves via Socket.IO
        browser: ['AIwithKashan', 'Chrome', '22.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 25000,
        generateHighQualityLinkPreview: false,
      });

      // ── Connection lifecycle events ──────────────────────────────────────
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // QR code received — convert to data-URL PNG and broadcast
        if (qr) {
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: { dark: '#0f172a', light: '#ffffff' },
            });
            this.status = 'qr_ready';
            this._emitStatus();
            this._emitQR();
            console.log('[WA] QR code generated — waiting for scan...');
          } catch (err) {
            console.error('[WA] QR generation error:', err);
          }
        }

        // Connection opened successfully
        if (connection === 'open') {
          this.status = 'connected';
          this.qrDataUrl = null;
          this._reconnectAttempts = 0;

          // Extract the linked phone number from the socket's auth state
          const me = this.sock.user;
          this.linkedNumber = me?.id?.split(':')[0] || me?.id?.split('@')[0] || null;
          if (this.linkedNumber) {
            this.linkedNumber = '+' + this.linkedNumber;
          }

          console.log(`[WA] Connected as ${this.linkedNumber}`);
          this._emitStatus();
        }

        // Connection closed — determine if we should reconnect or require fresh scan
        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WA] Disconnected. Status code: ${statusCode}. Reconnect: ${shouldReconnect}`);

          if (shouldReconnect && this._reconnectAttempts < this._maxReconnectAttempts) {
            // Transient disconnect — auto-reconnect with exponential backoff
            this._reconnectAttempts++;
            // Don't set status to 'connecting' here, let connect() do it, otherwise connect() aborts!
            this.status = 'disconnected'; 
            this._emitStatus();
            const delay = Math.min(this._reconnectAttempts * 2000, 10000);
            console.log(`[WA] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts})...`);
            setTimeout(() => this.connect(), delay);
          } else {
            // Logged out or too many failures — clear session, require fresh QR scan
            this.status = 'disconnected';
            this.linkedNumber = null;
            this.qrDataUrl = null;
            this.sock = null;
            this._reconnectAttempts = 0;

            if (statusCode === DisconnectReason.loggedOut) {
              console.log('[WA] Logged out — clearing session data...');
              await this._clearSession();
            }
            this._emitStatus();
          }
        }
      });

      // Persist credentials whenever they update (new session, key rotation, etc.)
      this.sock.ev.on('creds.update', saveCreds);

    } catch (err) {
      console.error('[WA] Connection error:', err);
      this.status = 'disconnected';
      this._emitStatus();
    }
  }

  // Logout: unlink device and clear stored session
  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
        this.sock = null;
      }
    } catch (err) {
      console.error('[WA] Logout error:', err);
    }
    this.status = 'disconnected';
    this.linkedNumber = null;
    this.qrDataUrl = null;
    await this._clearSession();
    this._emitStatus();
  }

  // Delete the auth_session directory to force a fresh QR scan
  async _clearSession() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        console.log('[WA] Session directory cleared.');
      }
    } catch (err) {
      console.error('[WA] Failed to clear session:', err);
    }
  }

  // Normalize a phone number string to WhatsApp JID format
  // Strips +, spaces, dashes, parens. Adds @s.whatsapp.net
  normalizeToJID(number) {
    // Remove all non-digit characters
    let cleaned = number.replace(/[^\d]/g, '');
    // If the number starts with 0 (local PK format), replace with 92
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.substring(1);
    }
    // If still no country code and looks like a PK number (10 digits), prepend 92
    if (cleaned.length === 10 && !cleaned.startsWith('92')) {
      cleaned = '92' + cleaned;
    }
    return cleaned + '@s.whatsapp.net';
  }

  // Validate if a number exists on WhatsApp
  async isOnWhatsApp(number) {
    if (!this.sock || this.status !== 'connected') {
      return { exists: false, error: 'WhatsApp not connected' };
    }
    try {
      const jid = this.normalizeToJID(number);
      const [result] = await this.sock.onWhatsApp(jid);
      return { exists: !!result?.exists, jid: result?.jid || jid };
    } catch (err) {
      return { exists: false, error: err.message };
    }
  }

  // Send a document (PDF/image) to a specific JID
  async sendDocument({ jid, fileBuffer, fileName, mimeType, caption }) {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp not connected');
    }

    // Determine if we should send as document or image
    const isImage = mimeType && mimeType.startsWith('image/');

    if (isImage) {
      await this.sock.sendMessage(jid, {
        image: fileBuffer,
        caption: caption || '',
        mimetype: mimeType,
      });
    } else {
      await this.sock.sendMessage(jid, {
        document: fileBuffer,
        fileName: fileName || 'invoice.pdf',
        mimetype: mimeType || 'application/pdf',
        caption: caption || '',
      });
    }
  }

  // Get current connection info for REST API
  getStatus() {
    return {
      status: this.status,
      phoneNumber: this.linkedNumber,
    };
  }
}

// Singleton instance — one WhatsApp connection per server
module.exports = new WhatsAppClient();
