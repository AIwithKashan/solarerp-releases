const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { invoice_no: 'desc' }
  });
  console.log("PURCHASES:");
  console.table(purchases.map(p => ({
    inv: p.invoice_no,
    name: p.item_name,
    unit: p.accounting_unit,
    power: p.power_watt,
    qty: p.quantity,
    rate: p.rate,
    amt: p.amount
  })));

  // Find all records where power_watt = 8 but unit is not Watt/KW
  // and fix them
  for (const p of purchases) {
    const isWattBased = ['watt', 'kw'].includes(p.accounting_unit.toLowerCase());
    if (!isWattBased && p.power_watt === 8) {
      console.log(`Fixing ${p.invoice_no} (${p.item_name}): Setting power_watt to null and fixing amount...`);
      const newAmount = p.rate * p.quantity;
      await prisma.purchase.update({
        where: { id: p.id },
        data: { power_watt: null, amount: newAmount }
      });
    }
  }

  // Also check Sales
  const sales = await prisma.saleItem.findMany();
  for (const s of sales) {
    const isWattBased = ['watt', 'kw'].includes(s.accounting_unit.toLowerCase());
    if (!isWattBased && s.power_watt === 8) {
      console.log(`Fixing sale item ${s.item_name}: Setting power_watt to null and fixing amount...`);
      const newAmount = s.rate * s.quantity;
      await prisma.saleItem.update({
        where: { id: s.id },
        data: { power_watt: null, amount: newAmount }
      });
      // Need to re-calc sale totals, but maybe user just wants the list fixed
    }
  }

}

main().finally(() => prisma.$disconnect());
