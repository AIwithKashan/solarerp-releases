import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getPaths(): { configPath: string } {
  const dbUrl = process.env.DATABASE_URL;
  let dbPath = '';
  if (!dbUrl) {
    dbPath = path.resolve(process.cwd(), 'server', 'prisma', 'dev.db');
  } else if (dbUrl.startsWith('file:')) {
    dbPath = path.resolve(dbUrl.slice(5));
  } else {
    dbPath = path.resolve(dbUrl);
  }
  const dbDir = path.dirname(dbPath);
  const configPath = path.join(dbDir, 'backup-config.json');
  return { configPath };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      throw new Error(`Google Auth error: ${error}`);
    }

    if (!code) {
      throw new Error('No authorization code provided.');
    }

    const { configPath } = getPaths();
    if (!fs.existsSync(configPath)) {
      throw new Error('Backup configuration file not found. Please set credentials in Settings and click Connect first.');
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const clientId = config.clientId;
    const clientSecret = config.clientSecret;

    if (!clientId || !clientSecret) {
      throw new Error('Google Client ID or Client Secret is missing in configuration.');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'http://localhost:3000/api/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
    }

    // Save tokens in config
    config.refreshToken = tokens.refresh_token || config.refreshToken;
    config.accessToken = tokens.access_token;
    config.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
    config.connected = true;

    // Fetch user info to display the connected account email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (userRes.ok) {
      const userInfo = await userRes.json();
      config.email = userInfo.email;
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    return new NextResponse(`
      <html>
        <head>
          <title>Google Drive Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { text-align: center; padding: 40px; border-radius: 16px; background: #1e293b; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; }
            h1 { color: #10b981; margin-bottom: 16px; font-size: 24px; }
            p { color: #94a3b8; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
            button { background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
            button:hover { background: #059669; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Success!</h1>
            <p>Google Drive has been successfully connected to SolarERP.</p>
            <p style="font-size: 14px; color: #64748b;">You can close this browser tab now and return to the application settings.</p>
            <button onclick="window.close()">Close Tab</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (err) {
    console.error('[Google Callback Error]', err);
    return new NextResponse(`
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { text-align: center; padding: 40px; border-radius: 16px; background: #1e293b; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; }
            h1 { color: #ef4444; margin-bottom: 16px; font-size: 24px; }
            p { color: #94a3b8; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
            .error-box { background: #334155; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #ef4444; text-align: left; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Connection Failed</h1>
            <p>We could not link Google Drive to the application.</p>
            <div class="error-box">${err instanceof Error ? err.message : 'Unknown error'}</div>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    });
  }
}
