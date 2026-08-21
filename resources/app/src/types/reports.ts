export interface UnifiedTransaction {
  source_id: string;
  txn_date: string; // YYYY-MM-DD
  source_type: 'PURCHASE' | 'SALE' | 'SALE_PAYMENT_RECEIPT' | 'SALE_PAYMENT_CREDIT' | 'SALE_OTHER_CREDIT' | 'VOUCHER_MAIN' | 'VOUCHER_PARTY' | 'JOURNAL_VOUCHER';
  ref_no: string;
  account_id: string | null;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  created_at?: number;
}

export interface DailyBookReport {
  opening_balance: number;
  transactions: UnifiedTransaction[];
  period_debit: number;
  period_credit: number;
  closing_balance: number;
}

export interface ProfitReportSalesBreakdown {
  invoice_no: string;
  sale_date: string;
  customer_name: string | null;
  net_total: number;
  cogs: number;
  gross_profit: number;
}

export interface ProfitReport {
  gross_sales: number;
  discount: number;
  net_sales: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  sales_breakdown: ProfitReportSalesBreakdown[];
}
