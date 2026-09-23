import AccountStatementModule from '@/components/reports/AccountStatementModule';
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';

function getFirstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const metadata: Metadata = {
  title: 'Account Statement — AIwithKashan',
  description: 'View full transaction history and running ledger balance for any account.',
};

export default async function AccountStatementPage({
  searchParams
}: {
  searchParams?: Promise<{ accountId?: string; from?: string; to?: string }> | { accountId?: string; from?: string; to?: string };
}) {
  const params = await Promise.resolve(searchParams || {});
  const defaultAccountId = params.accountId || '';
  const fromParam = params.from || getFirstDayOfMonth();
  const toParam = params.to || getToday();

  let accounts: any[] = [];
  try {
    accounts = await prisma.account.findMany({
      select: { id: true, account_title: true, account_type: true, region: true },
      orderBy: { account_title: 'asc' }
    });
  } catch (err) {
    console.error('Failed to load accounts for statement', err);
  }

  return (
    <AccountStatementModule 
      initialAccounts={accounts} 
      defaultAccountId={defaultAccountId}
      defaultFrom={fromParam} 
      defaultTo={toParam} 
    />
  );
}
