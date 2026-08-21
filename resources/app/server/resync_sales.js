const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'file:C:/Users/Kashan Khan/Documents/SolarERP_Data/dev.db' }
  }
});
async function resyncSaleTotals() {
  const sales = await prisma.sale.findMany({ include: { sale_payments: true, voucher_allocations: true } });
  let fixedCount = 0;
  for (const sale of sales) {
    const directPayments = sale.sale_payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const voucherAllocations = sale.voucher_allocations.reduce((sum, v) => sum + (v.allocatedAmount || 0), 0);
    const totalReceived = directPayments + voucherAllocations;
    const remainingBalance = sale.net_total - totalReceived;
    if (sale.total_received !== totalReceived || sale.remaining_balance !== remainingBalance) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: { total_received: totalReceived, remaining_balance: remainingBalance }
      });
      fixedCount++;
      console.log('Fixed Sale ' + sale.invoice_no);
    }
  }
  console.log('Fixed ' + fixedCount + ' sales.');
}
resyncSaleTotals();
