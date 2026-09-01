import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { exec } from 'child_process';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { downloadUrl } = await req.json();

    if (!downloadUrl) {
      return new Response(JSON.stringify({ error: 'Missing downloadUrl' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tempDir = process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp';
    const installerPath = path.join(tempDir, `SolarERP_Update_${Date.now()}.exe`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(data: Record<string, any>) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        try {
          await downloadWithProgress(downloadUrl, installerPath, (loaded, total) => {
            const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
            sendEvent({
              percent,
              loaded,
              total,
              loadedMB: (loaded / (1024 * 1024)).toFixed(1),
              totalMB: (total / (1024 * 1024)).toFixed(1),
              status: 'downloading'
            });
          });

          sendEvent({ percent: 100, status: 'applying', message: 'Launching update installer...' });

          // Write detached launcher batch script to avoid any file locking issues
          if (process.platform === 'win32') {
            const batPath = path.join(tempDir, `run_solar_update_${Date.now()}.bat`);
            const batContent = `@echo off\r\ntimeout /t 2 /nobreak >nul\r\nstart "" "${installerPath}" /SILENT\r\nexit\r\n`;
            fs.writeFileSync(batPath, batContent);

            exec(`cmd.exe /c start "" "${batPath}"`, { windowsHide: true });

            setTimeout(() => {
              process.exit(0);
            }, 1200);
          }

          sendEvent({ percent: 100, status: 'complete', done: true });
          controller.close();
        } catch (err: any) {
          sendEvent({ error: err.message || 'Download failed', status: 'error' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function downloadWithProgress(
  url: string,
  dest: string,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;

    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SolarERP-Updater' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        return downloadWithProgress(response.headers.location, dest, onProgress).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`Download failed with status ${response.statusCode}`));
      }

      const total = parseInt(response.headers['content-length'] || '0', 10);
      let loaded = 0;

      response.on('data', (chunk) => {
        loaded += chunk.length;
        onProgress(loaded, total);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}
