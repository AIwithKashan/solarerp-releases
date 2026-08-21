import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let serverIp = 'localhost';

  // Iterate over all network interfaces to find a real IPv4 addrees on LAN
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;

    for (const net of netList) {
      // Skip internal loopback and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        serverIp = net.address;
        break;
      }
    }
  }

  return NextResponse.json({
    ip: serverIp,
    port: process.env.PORT || '3000',
    url: `http://${serverIp}:${process.env.PORT || '3000'}`
  });
}
