import OpeningBalancesModule from '@/components/onboarding/OpeningBalancesModule';
import { prisma } from '@/lib/db';

export default async function OpeningBalancesPage() {
    
  const accounts = await prisma.account.findMany({
    orderBy: { account_title: 'asc' }
  });

  const products = await prisma.product.findMany({
    orderBy: { item_name: 'asc' }
  });

  return <OpeningBalancesModule accounts={accounts} products={products} />;
}
