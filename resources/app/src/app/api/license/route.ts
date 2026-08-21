import { NextResponse } from 'next/server';
import { getLicenseStatus, activateLicense } from '@/lib/license';

export async function GET() {
  try {
    const status = getLicenseStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { licenseKey } = body;
    if (!licenseKey) {
      return NextResponse.json({ success: false, message: 'License key is required' }, { status: 400 });
    }

    const result = activateLicense(licenseKey);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
