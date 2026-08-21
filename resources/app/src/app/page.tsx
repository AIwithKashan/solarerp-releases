import { getSummaryMetrics, getLowStockAlerts, getRecentActivity, getSalesTrend } from './dashboard/actions';
import { getSettings } from './settings/actions';
import DashboardClient from '@/components/dashboard/DashboardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Executive Dashboard — SolarERP',
  description: 'Your business command center.',
};

export default async function DashboardPage() {
  const [metricsRes, stockRes, activityRes, trendRes, settingsRes] = await Promise.all([
    getSummaryMetrics(),
    getLowStockAlerts(),
    getRecentActivity(),
    getSalesTrend(),
    getSettings()
  ]);

  return (
    <DashboardClient 
      settings={settingsRes.success ? settingsRes.data : null}
      metrics={metricsRes.success ? metricsRes.data : { monthlyRevenue: 0, totalReceivables: 0, totalPayables: 0, liquidCash: 0 }}
      lowStock={stockRes.success ? stockRes.data : []}
      recentActivity={activityRes.success ? activityRes.data : []}
      salesTrend={trendRes.success ? trendRes.data : []}
    />
  );
}
