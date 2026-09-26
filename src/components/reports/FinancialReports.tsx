import React, { useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  Printer,
  Boxes,
  Users,
  Building2,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT, formatDate, exportToCSV } from '../../utils/formatters';
import { ReportExportModal } from '../common/ReportExportModal';

export const FinancialReports: React.FC = () => {
  const {
    sales,
    expenses,
    products,
    categories,
    customers,
    suppliers,
    accounts,
    businessProfile,
    currentUser,
    language,
    t,
  } = useApp();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'month' | 'custom' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Authorization check
  const canViewReports = Boolean(currentUser?.permissions?.canViewProfitAndReports || currentUser?.role === 'super_admin');

  // Filter sales and expenses by selected date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return sales.filter((s) => {
      const itemDate = s.date.slice(0, 10);
      if (dateFilter === 'today') return itemDate === todayStr;
      if (dateFilter === '7days') {
        const d = new Date(s.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      if (dateFilter === '30days') {
        const d = new Date(s.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 30;
      }
      if (dateFilter === 'month') {
        return itemDate.startsWith(selectedMonth);
      }
      if (dateFilter === 'custom') {
        if (customStartDate && itemDate < customStartDate) return false;
        if (customEndDate && itemDate > customEndDate) return false;
        return true;
      }
      return true;
    });
  }, [sales, dateFilter, selectedMonth, customStartDate, customEndDate]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return expenses.filter((e) => {
      const itemDate = e.date.slice(0, 10);
      if (dateFilter === 'today') return itemDate === todayStr;
      if (dateFilter === '7days') {
        const d = new Date(e.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      if (dateFilter === '30days') {
        const d = new Date(e.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 30;
      }
      if (dateFilter === 'month') {
        return itemDate.startsWith(selectedMonth);
      }
      if (dateFilter === 'custom') {
        if (customStartDate && itemDate < customStartDate) return false;
        if (customEndDate && itemDate > customEndDate) return false;
        return true;
      }
      return true;
    });
  }, [expenses, dateFilter, selectedMonth, customStartDate, customEndDate]);

  // Financial figures
  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, s) => sum + s.grandTotal, 0),
    [filteredSales]
  );

  const totalCOGS = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const saleCost = s.items.reduce((itemSum, item) => itemSum + item.quantity * (item.costPrice || 0), 0);
      return sum + saleCost;
    }, 0);
  }, [filteredSales]);

  const grossProfit = Math.max(0, totalRevenue - totalCOGS);
  const grossMarginPct = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  const totalOperatingExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const netProfit = grossProfit - totalOperatingExpenses;
  const netMarginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const map: { [cat: string]: number } = {};
    filteredExpenses.forEach((e) => {
      map[e.categoryName] = (map[e.categoryName] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount }));
  }, [filteredExpenses]);

  // Top Selling Products in period
  const topSellingProducts = useMemo(() => {
    const map: { [prodId: string]: { name: string; sku: string; qty: number; revenue: number } } = {};
    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = { name: item.productName, sku: item.sku, qty: 0, revenue: 0 };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.total;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredSales]);

  // Balance Sheet Metrics
  const totalInventoryValuation = products.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  const totalCashBank = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalReceivable = customers.reduce((sum, c) => sum + c.currentDue, 0);
  const totalAssets = totalInventoryValuation + totalCashBank + totalReceivable;
  const totalPayable = suppliers.reduce((sum, s) => sum + s.currentPayable, 0);
  const netBusinessEquity = totalAssets - totalPayable;

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Amount (BDT)'],
      ['Revenue (Total Sales)', totalRevenue],
      ['Cost of Goods Sold (COGS)', totalCOGS],
      ['Gross Profit', grossProfit],
      ['Gross Margin %', `${grossMarginPct}%`],
      ['Total Operating Expenses', totalOperatingExpenses],
      ['Net Profit', netProfit],
      ['Net Margin %', `${netMarginPct}%`],
      ['', ''],
      ['Balance Sheet Assets', ''],
      ['Cash & Bank Balances', totalCashBank],
      ['Inventory Asset Valuation', totalInventoryValuation],
      ['Customer Receivables (Due)', totalReceivable],
      ['Total Business Assets', totalAssets],
      ['Supplier Payables (Liabilities)', totalPayable],
      ['Net Equity', netBusinessEquity],
    ];
    exportToCSV(`RM_Profit_Loss_Report_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const getPrintHtml = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Financial_Report_${dateFilter}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 18px; font-weight: 900; }
    .sub { font-size: 10px; color: #475569; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background: #f8fafc; }
    .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .kpi-val { font-size: 14px; font-weight: 900; margin-top: 3px; color: #0f172a; }
    .section-title { font-size: 12px; font-weight: 800; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 14px; margin-bottom: 8px; text-transform: uppercase; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; }
    .text-right { text-align: right; }
    .profit { color: #059669; font-weight: bold; }
    .expense { color: #dc2626; font-weight: bold; }
    .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${businessProfile.businessName}</div>
      <div class="sub">${businessProfile.address || ''} • Tel: ${businessProfile.phone}</div>
      <div style="margin-top: 4px; font-weight: 700; color: #d97706; font-size: 12px;">Financial Profit & Loss Statement (P&L Audit)</div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #475569;">
      <div>Generated: ${new Date().toLocaleDateString()}</div>
      <div>Timeframe: ${dateFilter.toUpperCase()}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Sales Revenue</div>
      <div class="kpi-val">${formatBDT(totalRevenue)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Cost of Goods (COGS)</div>
      <div class="kpi-val">${formatBDT(totalCOGS)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Operating Expenses</div>
      <div class="kpi-val expense">${formatBDT(totalOperatingExpenses)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Profit / Surplus</div>
      <div class="kpi-val profit">${formatBDT(netProfit)}</div>
    </div>
  </div>

  <div class="section-title">Income Statement (P&L Breakdown)</div>
  <table>
    <thead>
      <tr>
        <th>Accounting Item</th>
        <th class="text-right">Amount (BDT)</th>
        <th class="text-right">% of Revenue</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Gross Sales Revenue</strong></td>
        <td class="text-right"><strong>${formatBDT(totalRevenue)}</strong></td>
        <td class="text-right">100.0%</td>
      </tr>
      <tr>
        <td>Less: Cost of Goods Sold (Purchase Cost of Items Sold)</td>
        <td class="text-right expense">-${formatBDT(totalCOGS)}</td>
        <td class="text-right">${totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : 0}%</td>
      </tr>
      <tr style="background: #f1f5f9; font-weight: bold;">
        <td>Gross Profit Margin</td>
        <td class="text-right profit">${formatBDT(grossProfit)}</td>
        <td class="text-right">${grossMarginPct}%</td>
      </tr>
      <tr>
        <td>Less: Operating Expenses (Shop Rent, Bills, Logistics, Salaries)</td>
        <td class="text-right expense">-${formatBDT(totalOperatingExpenses)}</td>
        <td class="text-right">${totalRevenue > 0 ? ((totalOperatingExpenses / totalRevenue) * 100).toFixed(1) : 0}%</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: 800; font-size: 11.5px;">
        <td>Net Operating Profit (Before Tax)</td>
        <td class="text-right ${netProfit >= 0 ? 'profit' : 'expense'}">${formatBDT(netProfit)}</td>
        <td class="text-right">${netMarginPct}%</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">Balance Sheet Working Capital Summary</div>
  <table>
    <thead>
      <tr>
        <th>Asset / Liability Category</th>
        <th class="text-right">Current Valuation (BDT)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total Liquid Cash & Bank Deposits</td>
        <td class="text-right font-mono">${formatBDT(totalCashBank)}</td>
      </tr>
      <tr>
        <td>Inventory Stock Valuation (at Cost Price)</td>
        <td class="text-right font-mono">${formatBDT(totalInventoryValuation)}</td>
      </tr>
      <tr>
        <td>Customer Receivables (Outstanding Dues to Collect)</td>
        <td class="text-right font-mono">${formatBDT(totalReceivable)}</td>
      </tr>
      <tr style="font-weight: bold; background: #f1f5f9;">
        <td>Total Assets</td>
        <td class="text-right font-mono">${formatBDT(totalAssets)}</td>
      </tr>
      <tr>
        <td>Supplier Payables (Outstanding Purchase Debt)</td>
        <td class="text-right expense font-mono">-${formatBDT(totalPayable)}</td>
      </tr>
      <tr style="font-weight: 800; background: #f8fafc;">
        <td>Net Business Capital Equity</td>
        <td class="text-right profit font-mono">${formatBDT(netBusinessEquity)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Financial Audit Report • ${businessProfile.businessName} • Generated via RM AutoManage ERP
  </div>
</body>
</html>`;
  };

  if (!canViewReports) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3 opacity-60" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Your current user role ({currentUser?.role || 'Guest'}) is not authorized to view financial profit and loss analytics. Please contact the Business Owner / Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'bn' ? 'আর্থিক হিসাব ও লাভ-ক্ষতির রিপোর্ট' : `${t('reports')} & Profit/Loss Audit`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'bn'
              ? 'বাস্তব সময়ে লাভ-ক্ষতি (P&L), গ্রস মার্জিন, পরিচালন ব্যয় এবং ব্যালেন্স শিট বিশ্লেষণ'
              : 'Real-time Profit & Loss statement (P&L), Gross/Net margins, and balance sheet snapshot'}
          </p>
        </div>

        {/* Action controls with wrap & no overlap */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Date Range Selector - Wraps cleanly on mobile so All Time (সর্বমোট) is never pushed off-screen */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800 text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                dateFilter === 'today'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'bn' ? 'আজ' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('7days')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                dateFilter === '7days'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'bn' ? '৭ দিন' : '7 Days'}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('30days')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                dateFilter === '30days'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'bn' ? '৩০ দিন' : '30 Days'}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('month')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                dateFilter === 'month'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'bn' ? 'নির্দিষ্ট মাস' : 'Month'}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('custom')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                dateFilter === 'custom'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'bn' ? 'তারিখ রেঞ্জ' : 'Date Range'}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 ${
                dateFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'bn' ? 'সর্বমোট (All Time)' : 'All Time'}
            </button>
          </div>

          {/* Month Picker dropdown when dateFilter === 'month' */}
          {dateFilter === 'month' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold bg-transparent text-slate-900 dark:text-white outline-hidden cursor-pointer"
              />
            </div>
          )}

          {/* Custom Date Range when dateFilter === 'custom' */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-900 dark:text-white outline-hidden"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-900 dark:text-white outline-hidden"
              />
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Download Report (PDF, Image, CSV)"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors"
              title="Print or Save as PDF / Image"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
              <span>{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Report Container */}
      <div ref={reportContainerRef} className="space-y-6">
      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Sales Revenue
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatBDT(totalRevenue)}
          </h3>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {filteredSales.length} Invoices issued
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Cost of Goods Sold (COGS)
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-300 mt-1">
            {formatBDT(totalCOGS)}
          </h3>
          <span className="text-[11px] text-slate-500 mt-1 block">Direct parts procurement cost</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                Gross Profit
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {formatBDT(grossProfit)}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              {grossMarginPct}% Margin
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Revenue minus COGS</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Net Operating Profit
              </span>
              <h3
                className={`text-xl sm:text-2xl font-black mt-1 ${
                  netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {formatBDT(netProfit)}
              </h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                netProfit >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {netMarginPct}% Net
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">After all shop expenses</span>
        </div>
      </div>

      {/* P&L Detailed Statement Table & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profit & Loss Detailed Statement */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Detailed Statement of Profit & Loss (P&L)
              </h3>
              <p className="text-xs text-slate-500">
                Period: {dateFilter.toUpperCase()}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">BDT (৳)</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Sales Revenue */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between font-bold">
              <span className="text-slate-900 dark:text-white">1. Total Revenue / Gross Sales</span>
              <span>{formatBDT(totalRevenue)}</span>
            </div>

            {/* Cost of Goods Sold */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3">Less: Cost of Goods Sold (Inventory Purchase Cost)</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                - {formatBDT(totalCOGS)}
              </span>
            </div>

            {/* Gross Margin */}
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex justify-between font-black text-purple-900 dark:text-purple-200 text-sm">
              <span>Gross Profit (মোট মুনাফা)</span>
              <span>{formatBDT(grossProfit)}</span>
            </div>

            {/* Operating Expenses */}
            <div className="pt-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                2. Operating Expenses (দোকান ও পরিচালনা খরচ):
              </span>
              <div className="space-y-1.5 pl-3">
                {expenseByCategory.map((c, i) => (
                  <div key={i} className="flex justify-between text-slate-600 dark:text-slate-400 text-xs">
                    <span>{c.name}</span>
                    <span>- {formatBDT(c.amount)}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Total Operating Expenses</span>
                  <span className="text-rose-600 dark:text-rose-400">
                    - {formatBDT(totalOperatingExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div
              className={`p-3.5 rounded-xl border flex justify-between items-center font-black text-base mt-4 ${
                netProfit >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div>
                <span>Net Business Profit (নিট মুনাফা)</span>
                <span className="text-xs font-normal block opacity-80">
                  {netProfit >= 0 ? 'Surplus after all operations' : 'Operating loss for period'}
                </span>
              </div>
              <span className="text-xl">{formatBDT(netProfit)}</span>
            </div>
          </div>
        </div>

        {/* Top Selling Products & Category Distribution */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Selling Parts */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Top Selling Automobile Spare Parts
            </h3>

            {topSellingProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No parts sold in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {topSellingProducts.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {p.sku} • Sold: {p.qty} units
                      </div>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatBDT(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balance Sheet Capital Snapshot */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Business Balance Sheet Snapshot
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Inventory Asset Value:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatBDT(totalInventoryValuation)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Cash & Bank Liquid Capital:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatBDT(totalCashBank)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Customer Receivables (Dues):</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatBDT(totalReceivable)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-extrabold text-slate-900 dark:text-white">
                <span>Total Current Assets:</span>
                <span>{formatBDT(totalAssets)}</span>
              </div>

              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                <span>Less: Supplier Payables (Debt):</span>
                <span>- {formatBDT(totalPayable)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm text-amber-600 dark:text-amber-400">
                <span>Net Business Equity:</span>
                <span>{formatBDT(netBusinessEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Print and Export Popup Modal with PDF, Image & CSV options */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={language === 'bn' ? `আর্থিক লাভ-ক্ষতির পূর্ণাঙ্গ রিপোর্ট (${dateFilter})` : `Financial Profit & Loss Statement (${dateFilter})`}
        subtitle={`${businessProfile.businessName} • ${formatDate(new Date().toISOString())}`}
        defaultFilename={`RM_Financial_Report_${dateFilter}_${new Date().toISOString().slice(0, 10)}`}
        targetElementRef={reportContainerRef}
        onExportCSV={handleExportCSV}
        getPrintHtml={getPrintHtml}
      />
    </div>
  );
};
