import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  PackagePlus,
  Coins,
  Receipt,
  Wallet,
  Users,
  Building2,
  Boxes,
  AlertTriangle,
  ArrowRight,
  Eye,
  Send,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from './StatCard';
import { DueAlerts } from './DueAlerts';
import { formatBDT, formatDate, generateWhatsAppInvoiceUrl } from '../../utils/formatters';
import { WhatsAppShareModal } from '../sales/WhatsAppShareModal';
import { Sale } from '../../types';

interface DashboardProps {
  onOpenNewSale: () => void;
  onOpenNewPurchase: () => void;
  onOpenNewProduct: () => void;
  onOpenExpense: () => void;
  onOpenCollectDue: (customerId?: string, refInvoiceNo?: string) => void;
  onOpenPaySupplier: (supplierId?: string, refPurchaseNo?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenNewSale,
  onOpenNewPurchase,
  onOpenNewProduct,
  onOpenExpense,
  onOpenCollectDue,
  onOpenPaySupplier,
}) => {
  const {
    businessProfile,
    metrics,
    t,
    sales,
    purchases,
    accounts,
    lowStockProducts,
    outOfStockProducts,
    setActiveTab,
    setSelectedInvoice,
    currentUser,
  } = useApp();

  const [shareModalSale, setShareModalSale] = useState<Sale | null>(null);

  // 7-day Sales & Purchases trend calculation
  if (!currentUser) return null;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const trendData = last7Days.map((dateStr) => {
    const daySales = sales
      .filter((s) => s.date.startsWith(dateStr))
      .reduce((sum, s) => sum + s.grandTotal, 0);

    const dayPurchases = purchases
      .filter((p) => p.date.startsWith(dateStr))
      .reduce((sum, p) => sum + p.grandTotal, 0);

    const dayLabel = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
    return { date: dateStr, label: dayLabel, sales: daySales, purchases: dayPurchases };
  });

  const maxTrendVal = Math.max(...trendData.map((d) => Math.max(d.sales, d.purchases, 1000)));

  const handleShareWhatsApp = (sale: Sale) => {
    setShareModalSale(sale);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Live Business Console
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {businessProfile.businessName}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Welcome back, <span className="font-semibold text-amber-400">{currentUser.name}</span>.
            Here is your daily automobile parts sales, stock liquidity, and due collection summary.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:self-center">
          <button
            onClick={onOpenNewSale}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-transform active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('quickSale')}</span>
          </button>
          <button
            onClick={onOpenNewPurchase}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-xs transition-colors"
          >
            <PackagePlus className="w-4 h-4 text-blue-400" />
            <span>{t('quickPurchase')}</span>
          </button>
          <button
            onClick={() => onOpenCollectDue()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-xs transition-colors"
          >
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>{t('collectDue')}</span>
          </button>
        </div>
      </div>

      {/* 8 Essential Business KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={t('todaySales')}
          value={formatBDT(metrics.todaySales)}
          subtitle="Real-time today's billing"
          icon={ShoppingBag}
          color="amber"
        />

        <StatCard
          title={t('todayCollection')}
          value={formatBDT(metrics.todayCollection)}
          subtitle="Cash & bank collected"
          icon={Coins}
          color="emerald"
        />

        <StatCard
          title={t('todayPurchases')}
          value={formatBDT(metrics.todayPurchases)}
          subtitle="New parts received"
          icon={PackagePlus}
          color="blue"
        />

        <StatCard
          title={t('todayExpenses')}
          value={formatBDT(metrics.todayExpenses)}
          subtitle="Operating disbursements"
          icon={Receipt}
          color="red"
        />

        {currentUser.permissions.canViewProfitAndReports && (
          <StatCard
            title={t('todayProfit')}
            value={formatBDT(metrics.todayGrossProfit)}
            subtitle="Gross margin on sales"
            icon={TrendingUp}
            color="purple"
            trend={metrics.todaySales > 0 ? `${Math.round((metrics.todayGrossProfit / metrics.todaySales) * 100)}% Margin` : undefined}
            isPositive={true}
          />
        )}

        <StatCard
          title={t('totalReceivable')}
          value={formatBDT(metrics.totalReceivable)}
          subtitle="Due from customers"
          icon={Users}
          color="indigo"
        />

        <StatCard
          title={t('totalPayable')}
          value={formatBDT(metrics.totalPayable)}
          subtitle="Due to suppliers"
          icon={Building2}
          color="cyan"
        />

        <StatCard
          title={t('inventoryValue')}
          value={formatBDT(metrics.inventoryValuation)}
          subtitle="Parts stock valuation"
          icon={Boxes}
          color="amber"
        />
      </div>

      {/* Charts & Balances Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Purchases 7-Day Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sales & Purchase Flow (Last 7 Days)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily volume comparison
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Purchases</span>
              </div>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-slate-100 dark:border-slate-700/50">
            {trendData.map((d, idx) => {
              const salesHeight = Math.max(8, Math.round((d.sales / maxTrendVal) * 120));
              const purHeight = Math.max(8, Math.round((d.purchases / maxTrendVal) * 120));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="w-full max-w-[40px] flex items-end justify-center gap-1.5">
                    {/* Sales bar */}
                    <div
                      style={{ height: `${salesHeight}px` }}
                      className="w-1/2 rounded-t-sm bg-amber-500 hover:bg-amber-400 transition-all cursor-pointer relative group/bar"
                      title={`Sales: ${formatBDT(d.sales)}`}
                    >
                      <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap pointer-events-none transition-opacity z-10">
                        {formatBDT(d.sales)}
                      </div>
                    </div>

                    {/* Purchase bar */}
                    <div
                      style={{ height: `${purHeight}px` }}
                      className="w-1/2 rounded-t-sm bg-blue-500 hover:bg-blue-400 transition-all cursor-pointer relative group/bar"
                      title={`Purchases: ${formatBDT(d.purchases)}`}
                    >
                      <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap pointer-events-none transition-opacity z-10">
                        {formatBDT(d.purchases)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Aggregated by date</span>
            <span>Currency: Bangladeshi Taka (৳)</span>
          </div>
        </div>

        {/* Cash & Bank Balances Widget */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Available Balances
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('accounts')}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                View Accounts →
              </button>
            </div>

            <div className="space-y-2.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-700/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        acc.type === 'cash'
                          ? 'bg-amber-500'
                          : acc.type === 'bank'
                          ? 'bg-blue-500'
                          : 'bg-pink-500'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {acc.type.toUpperCase()} {acc.accountNumber ? `• ${acc.accountNumber}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {formatBDT(acc.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Liquid Capital:</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
              {formatBDT(accounts.reduce((sum, a) => sum + a.balance, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Due Date Reminders & Inventory Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due Reminders Widget */}
        <DueAlerts
          onCollectPayment={(customerId, refNo) => onOpenCollectDue(customerId, refNo)}
          onPaySupplier={(supplierId, refNo) => onOpenPaySupplier(supplierId, refNo)}
        />

        {/* Inventory Stock Health & Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Stock Alerts & Reorder Needed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lowStockProducts.length} low stock, {outOfStockProducts.length} out of stock
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              All Inventory →
            </button>
          </div>

          {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p>All automobile parts are sufficiently stocked.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {outOfStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-red-200/80 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white uppercase tracking-wider">
                      OUT OF STOCK
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        SKU: {p.sku} • Rack: {p.rackLocation || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onOpenNewPurchase}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold transition-all"
                  >
                    Reorder Now
                  </button>
                </div>
              ))}

              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {p.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                        Stock: {p.currentStock} {p.unit}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Min Alert: {p.minStockLevel} • Reorder Threshold: {p.reorderLevel} • Rack: {p.rackLocation}
                    </div>
                  </div>

                  <button
                    onClick={onOpenNewPurchase}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-semibold transition-all"
                  >
                    Restock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Sales & Invoices
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest transactions, payment status, and customer cash memos
            </p>
          </div>
          <button
            onClick={() => setActiveTab('invoices')}
            className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile View: Clean Responsive Cards (No Horizontal Sliding) */}
        <div className="md:hidden space-y-3">
          {sales.slice(0, 5).map((sale) => (
            <div
              key={sale.id}
              className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
            >
              {/* Top Row: Invoice #, Date & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    #{sale.invoiceNo}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(sale.date)}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sale.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : sale.paymentStatus === 'PARTIALLY_PAID'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {sale.paymentStatus === 'PAID'
                    ? t('invoiceStatusPaid')
                    : sale.paymentStatus === 'PARTIALLY_PAID'
                    ? t('invoiceStatusPartial')
                    : t('invoiceStatusDue')}
                </span>
              </div>

              {/* Customer and Vehicle Info */}
              <div className="flex items-start justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {sale.customerName}
                  </div>
                  {sale.customerPhone && (
                    <div className="text-[11px] text-slate-400">{sale.customerPhone}</div>
                  )}
                </div>
                {sale.vehicleInfo && (
                  <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    🚗 {sale.vehicleInfo}
                  </div>
                )}
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Total</div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {formatBDT(sale.grandTotal)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Paid</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {formatBDT(sale.paidAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Due</div>
                  <div className={`font-bold text-xs ${sale.dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                    {sale.dueAmount > 0 ? formatBDT(sale.dueAmount) : '৳0'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
                {(sale.customerWhatsapp || sale.customerPhone) && (
                  <button
                    onClick={() => handleShareWhatsApp(sale)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedInvoice(sale)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Invoice</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Data Table */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Due</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {sales.slice(0, 5).map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {sale.invoiceNo}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(sale.date)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {sale.customerName}
                    </div>
                    {sale.customerPhone && (
                      <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                    {sale.vehicleInfo || '—'}
                  </td>
                  <td className="py-3 px-3 font-bold text-right text-slate-900 dark:text-white">
                    {formatBDT(sale.grandTotal)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatBDT(sale.paidAmount)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400 font-semibold">
                    {sale.dueAmount > 0 ? formatBDT(sale.dueAmount) : '—'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sale.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : sale.paymentStatus === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {sale.paymentStatus === 'PAID'
                        ? t('invoiceStatusPaid')
                        : sale.paymentStatus === 'PARTIALLY_PAID'
                        ? t('invoiceStatusPartial')
                        : t('invoiceStatusDue')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(sale.customerWhatsapp || sale.customerPhone) && (
                        <button
                          onClick={() => handleShareWhatsApp(sale)}
                          className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                          title="Share via WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedInvoice(sale)}
                        className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="View / Print Invoice"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Share 3-Options Modal */}
      {shareModalSale && (
        <WhatsAppShareModal
          sale={shareModalSale}
          onClose={() => setShareModalSale(null)}
          onOpenFullInvoice={() => setSelectedInvoice(shareModalSale)}
        />
      )}
    </div>
  );
};
