const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/Users/Kashan Khan/Documents/SolarERP_Data/dev.db'
    }
  }
});

async function fixLedger() {
  try {
    console.log('Finding Cash Account...');
    const accounts = await prisma.account.findMany();
    console.log('All Accounts:', accounts.map(a => `${a.account_title} - ${a.account_type}`));
    
    const cashAcc = accounts.find(a => a.account_title.toLowerCase().includes('cash'));

    if (!cashAcc) {
      console.log('No Cash Account found!');
      return;
    }

    console.log(`Cash Account ID: ${cashAcc.id}`);

    const updated = await prisma.salePayment.updateMany({
      where: { payment_account_id: null },
      data: {
        payment_account_id: cashAcc.id,
        payment_account_name: cashAcc.account_title
      }
    });

    console.log(`Fixed ${updated.count} orphaned sale payments!`);

  } catch (err) {
    console.error('Error fixing ledger data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixLedger();
