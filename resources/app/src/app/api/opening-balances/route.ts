import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    
    const settings = await prisma.businessSettings.findFirst({  });
    if (!settings) throw new Error('Settings not found');

    const jv = await prisma.journalVoucher.findFirst({
      where: { voucher_no: 'OB-SETUP' },
      include: { lines: true }
    });

    const stockPurchases = await prisma.purchase.findMany({
      where: { invoice_no: 'OB-STOCK' }
    });

    return NextResponse.json({
      success: true,
      data: {
        booksStartDate: settings.books_start_date,
        journalVoucher: jv,
        stockPurchases
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
        const payload = await request.json();
    const { booksStartDate, cashAccounts, bankAccounts, receivables, payables, stocks, capital } = payload;

    if (!booksStartDate) throw new Error('Books Start Date is required');

    let totalAssets = 0;
    let totalLiabilities = 0;

    const jvLines: any[] = [];

    cashAccounts.forEach((c: any) => {
      totalAssets += c.amount;
      jvLines.push({ account_id: c.accountId, account_name: c.accountName, debit: c.amount, credit: 0, remarks: 'Opening Cash Balance' });
    });
    bankAccounts.forEach((b: any) => {
      totalAssets += b.amount;
      jvLines.push({ account_id: b.accountId, account_name: b.accountName, debit: b.amount, credit: 0, remarks: 'Opening Bank Balance' });
    });
    receivables.forEach((r: any) => {
      totalAssets += r.amount;
      jvLines.push({ account_id: r.accountId, account_name: r.accountName, debit: r.amount, credit: 0, remarks: 'Opening Receivable' });
    });
    payables.forEach((p: any) => {
      totalLiabilities += p.amount;
      jvLines.push({ account_id: p.accountId, account_name: p.accountName, debit: 0, credit: p.amount, remarks: 'Opening Payable' });
    });
    totalLiabilities += capital.amount; // Capital is equity/liability

    // Check if Capital account exists, if not create it
    let capitalAcc = await prisma.account.findFirst({
      where: { account_title: 'Opening Capital' }
    });
    if (!capitalAcc) {
      capitalAcc = await prisma.account.create({
        data: {
                    account_title: 'Opening Capital',
          account_type: 'Equity',
          region: 'System',
        }
      });
    }

    jvLines.push({
      account_id: capitalAcc.id,
      account_name: capitalAcc.account_title,
      debit: 0,
      credit: capital.amount,
      remarks: 'Opening Capital'
    });

    let stockAcc = await prisma.account.findFirst({
      where: { account_title: 'Inventory Asset' }
    });
    if (!stockAcc) {
      stockAcc = await prisma.account.create({
        data: {
                    account_title: 'Inventory Asset',
          account_type: 'Current Asset',
          region: 'System',
        }
      });
    }

    let stockAmount = stocks.reduce((acc: number, s: any) => acc + s.amount, 0);
    if (stockAmount > 0) {
      totalAssets += stockAmount;
      jvLines.push({
        account_id: stockAcc.id,
        account_name: stockAcc.account_title,
        debit: stockAmount,
        credit: 0,
        remarks: 'Opening Stock Value'
      });
    }

    let diff = Math.abs(totalAssets - totalLiabilities);
    if (diff > 0.01) {
      throw new Error(`Trial Balance mismatch by ${diff}. Assets must equal Liabilities + Capital.`);
    }

    // Wrap in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update settings
      await tx.businessSettings.updateMany({
        data: { books_start_date: new Date(booksStartDate).toISOString() }
      });

      // 2. Delete existing OB-SETUP JV and OB-STOCK purchases
      await tx.journalVoucher.deleteMany({
        where: { voucher_no: 'OB-SETUP' }
      });
      await tx.purchase.deleteMany({
        where: { invoice_no: 'OB-STOCK' }
      });

      // 3. Create OB-SETUP JV
      const totalJV = jvLines.reduce((acc, l) => acc + l.debit, 0);
      if (jvLines.length > 0) {
        await tx.journalVoucher.create({
          data: {
                        voucher_no: 'OB-SETUP',
            voucher_date: booksStartDate,
            remarks: 'Business Opening Balances',
            total_debit: totalJV,
            total_credit: totalJV,
            lines: {
              create: jvLines.map(l => ({
                account_id: l.account_id,
                account_name: l.account_name,
                debit: l.debit,
                credit: l.credit,
                remarks: l.remarks
              }))
            }
          }
        });
      }

      // 4. Create OB-STOCK purchases
      for (const s of stocks) {
        await tx.purchase.create({
          data: {
                        invoice_no: 'OB-STOCK',
            item_name: s.productName,
            accounting_unit: 'Unit',
            quantity: s.qty,
            rate: s.rate,
            amount: s.amount,
            paidAmount: s.amount,      
            remainingAmount: 0,
            paymentStatus: 'paid',
            supplier_id: capitalAcc!.id, 
            supplier_name: 'Opening Stock System',
            purchase_date: booksStartDate,
            remarks: 'Opening Stock Injection'
          }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
