import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  PackagePlus,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Purchase } from '../../types';
import { formatBDT, formatDate, exportToCSV } from '../../utils/formatters';

interface PurchasesListProps {
  onOpenNewPurchase: () => void;
}

export const PurchasesList: React.FC<PurchasesListProps> = ({ onOpenNewPurchase }) => {
  const { purchases, language, t } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID'>('ALL');

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        const matchSearch =
          p.purchaseNo.toLowerCase().includes(search.toLowerCase()) ||
          p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
          (p.supplierInvoiceNo && p.supplierInvoiceNo.toLowerCase().includes(search.toLowerCase()));

        const matchStatus = statusFilter === 'ALL' || p.paymentStatus === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime() || 0;
        const timeB = new Date(b.createdAt || b.date).getTime() || 0;
        return timeB - timeA;
      });
  }, [purchases, search, statusFilter]);

  const totalPurchased = useMemo(() => filteredPurchases.reduce((sum, p) => sum + p.grandTotal, 0), [filteredPurchases]);
  const totalPaid = useMemo(() => filteredPurchases.reduce((sum, p) => sum + p.paidAmount, 0), [filteredPurchases]);
  const totalPayable = useMemo(() => filteredPurchases.reduce((sum, p) => sum + p.payableAmount, 0), [filteredPurchases]);

  const handleExportCSV = () => {
    const rows = [
      ['Purchase No', 'Supplier Ref #', 'Date', 'Supplier', 'Grand Total', 'Paid', 'Payable', 'Status', 'Due Date'],
      ...filteredPurchases.map((p) => [
        p.purchaseNo,
        p.supplierInvoiceNo || '',
        formatDate(p.date),
        p.supplierName,
        p.grandTotal,
        p.paidAmount,
        p.payableAmount,
        p.paymentStatus,
        formatDate(p.dueDate),
      ]),
    ];
    exportToCSV(`RM_Purchases_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'bn' ? 'ক্রয় ও স্টক ইনটেক বিল' : `${t('purchases')} & Restock Bills`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'bn'
              ? 'পার্টস ক্রয়, সাপ্লায়ার বাকি এবং স্টক মজুদের বিস্তারিত তালিকা'
              : 'Automobile parts procurement, supplier payables, and inventory intake records'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportCsv')}</span>
          </button>

          <button
            onClick={onOpenNewPurchase}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন ক্রয়' : 'New Purchase'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'bn' ? 'মোট ক্রয় বিল' : 'Total Invoiced Volume'}
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {formatBDT(totalPurchased)}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            {filteredPurchases.length} {language === 'bn' ? 'বিল' : 'Bills'}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'bn' ? 'সাপ্লায়ারকে পরিশোধ' : 'Total Paid Out'}
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatBDT(totalPaid)}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-60" />
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'bn' ? 'বকেয়া দেনা (Payables)' : 'Outstanding Payables'}
            </span>
            <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
              {formatBDT(totalPayable)}
            </span>
          </div>
          <AlertTriangle className="w-5 h-5 text-rose-500 opacity-60" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'ক্রয় #, সাপ্লায়ার নাম বা ইনভয়েস...'
                : 'Search purchase #, supplier name or invoice...'
            }
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar text-xs">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>

          {(['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {st === 'ALL'
                ? language === 'bn' ? 'সব' : 'All'
                : st === 'PAID'
                ? language === 'bn' ? 'পরিশোধিত' : 'Paid'
                : st === 'PARTIALLY_PAID'
                ? language === 'bn' ? 'আংশিক' : 'Partial'
                : language === 'bn' ? 'বকেয়া' : 'Payable'}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE-FIRST VIEW: Responsive Cards on Mobile (< md), Table on Desktop (>= md) */}
      {/* 1. Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredPurchases.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <PackagePlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{language === 'bn' ? 'কোনো ক্রয়ের তথ্য পাওয়া যায়নি।' : 'No purchase records found matching your filters.'}</p>
          </div>
        ) : (
          filteredPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-3.5 space-y-3 shadow-xs hover:border-blue-400 transition-all"
            >
              {/* Card Header: Purchase # & Date & Status */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-black text-xs">
                    #{purchase.purchaseNo}
                  </span>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(purchase.date)}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    purchase.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : purchase.paymentStatus === 'PARTIALLY_PAID'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {purchase.paymentStatus === 'PAID'
                    ? language === 'bn' ? 'পরিশোধিত' : 'PAID'
                    : purchase.paymentStatus === 'PARTIALLY_PAID'
                    ? language === 'bn' ? 'আংশিক' : 'PARTIAL'
                    : language === 'bn' ? 'বকেয়া' : 'PAYABLE'}
                </span>
              </div>

              {/* Supplier Info */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {purchase.supplierName}
                  </span>
                  {purchase.supplierInvoiceNo && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Ref: {purchase.supplierInvoiceNo}
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Breakup */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'bn' ? 'মোট ক্রয়' : 'Total'}
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {formatBDT(purchase.grandTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'bn' ? 'পরিশোধ' : 'Paid'}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBDT(purchase.paidAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'bn' ? 'দেনা (বাকি)' : 'Due'}
                  </span>
                  <span className={`font-black ${purchase.payableAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                    {purchase.payableAmount > 0 ? formatBDT(purchase.payableAmount) : '—'}
                  </span>
                </div>
              </div>

              {/* Bottom line: Items and Due Date */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                <span>{purchase.items.length} {language === 'bn' ? 'টি পার্টস' : 'parts items'}</span>
                {purchase.dueDate && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <Clock className="w-3 h-3" />
                    <span>{language === 'bn' ? 'পরিশোধ শেষ:' : 'Due:'} {formatDate(purchase.dueDate)}</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 2. Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5">Purchase #</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Supplier</th>
                <th className="py-3 px-3.5">Supplier Ref #</th>
                <th className="py-3 px-3.5 text-center">Items</th>
                <th className="py-3 px-3.5 text-right">Grand Total</th>
                <th className="py-3 px-3.5 text-right">Paid</th>
                <th className="py-3 px-3.5 text-right">Payable (Due)</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    <PackagePlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No purchase records found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {purchase.purchaseNo}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(purchase.date)}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {purchase.supplierName}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {purchase.supplierInvoiceNo || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">
                      {purchase.items.length} parts
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-slate-900 dark:text-white">
                      {formatBDT(purchase.grandTotal)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(purchase.paidAmount)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                      {purchase.payableAmount > 0 ? formatBDT(purchase.payableAmount) : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          purchase.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : purchase.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {purchase.paymentStatus === 'PAID'
                          ? 'PAID'
                          : purchase.paymentStatus === 'PARTIALLY_PAID'
                          ? 'PARTIAL'
                          : 'DUE'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                      {purchase.dueDate ? formatDate(purchase.dueDate) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
