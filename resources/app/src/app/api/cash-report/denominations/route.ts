import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
        const body = await request.json();
    const { date, n5000, n1000, n500, n100, n50, n20, n10, coins, total } = body;

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    // Upsert logic
    const db = prisma as any;
    
    if (!db.cashDenomination) {
      return NextResponse.json({ success: false, error: 'CashDenomination table not yet available' }, { status: 500 });
    }

    const saved = await db.cashDenomination.upsert({
      where: { date },
      update: {
        n5000: n5000 || 0,
        n1000: n1000 || 0,
        n500: n500 || 0,
        n100: n100 || 0,
        n50: n50 || 0,
        n20: n20 || 0,
        n10: n10 || 0,
        coins: coins || 0,
        total: total || 0
      },
      create: {
                date,
        n5000: n5000 || 0,
        n1000: n1000 || 0,
        n500: n500 || 0,
        n100: n100 || 0,
        n50: n50 || 0,
        n20: n20 || 0,
        n10: n10 || 0,
        coins: coins || 0,
        total: total || 0
      }
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('Save Denominations Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
