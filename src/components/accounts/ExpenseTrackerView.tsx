import React, { useState, useMemo, useRef } from 'react';
import {
  ReceiptText,
  Plus,
  Download,
  Printer,
  Filter,
  Search,
  Calendar,
  Wallet,
  Tag,
  TrendingDown,
  DollarSign,
  Layers,
  ArrowUpRight,
  FolderPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense } from '../../types';
import { formatBDT, formatDate, exportToCSV } from '../../utils/formatters';
import { NewExpenseModal } from './NewExpenseModal';
import { ReportExportModal } from '../common/ReportExportModal';

export const ExpenseTrackerView: React.FC = () => {
  const { expenses, expenseCategories, accounts, addExpenseCategory, businessProfile, language, t } = useApp();

  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const expenseContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Quick Category creation inline
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Date range filter
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'THIS_MONTH' | 'TODAY'>('THIS_MONTH');

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);

    return expenses.filter((exp) => {
      // Category match
      if (selectedCategory !== 'ALL' && exp.categoryId !== selectedCategory) {
        return false;
      }
      // Account match
      if (selectedAccount !== 'ALL' && exp.accountId !== selectedAccount) {
        return false;
      }
      // Time match
      if (timeFilter === 'TODAY' && !exp.date.startsWith(todayStr)) {
        return false;
      }
      if (timeFilter === 'THIS_MONTH' && !exp.date.startsWith(thisMonthPrefix)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = exp.description.toLowerCase().includes(q);
        const matchCat = exp.categoryName.toLowerCase().includes(q);
        const matchPayee = (exp.payee || '').toLowerCase().includes(q);
        const matchVoucher = (exp.voucherNo || '').toLowerCase().includes(q);
        return matchDesc || matchCat || matchPayee || matchVoucher;
      }

      return true;
    });
  }, [expenses, selectedCategory, selectedAccount, timeFilter, searchQuery]);

  // Analytics
  const totalFilteredAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const thisMonthExpenses = useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 7);
    return expenses
      .filter((e) => e.date.startsWith(prefix))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const todayExpenses = useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 10);
    return expenses
      .filter((e) => e.date.startsWith(prefix))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.categoryName] = (map[e.categoryName] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const handleExportCSV = () => {
    const rows = [
      ['Voucher #', 'Date', 'Category', 'Payee / Recipient', 'Paid From Account', 'Amount (BDT)', 'Remarks / Notes'],
      ...filteredExpenses.map((e) => [
        e.voucherNo || '',
        formatDate(e.date),
        e.categoryName,
        e.payee || '',
        e.accountName,
        e.amount,
        e.description,
      ]),
    ];
    exportToCSV(`RM_Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const getPrintHtml = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Expenses_Report_${timeFilter}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 18px; font-weight: 900; }
    .sub { font-size: 10px; color: #475569; }
    .summary { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5px; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; }
    .text-right { text-align: right; }
    .total-row { background: #f1f5f9; font-weight: bold; font-size: 11px; }
    .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${businessProfile.businessName}</div>
      <div class="sub">${businessProfile.address || ''} • Tel: ${businessProfile.phone}</div>
      <div style="margin-top: 4px; font-weight: 700; color: #e11d48; font-size: 12px;">Operating Expenses Statement (${timeFilter})</div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #475569;">
      <div>Generated: ${new Date().toLocaleDateString('en-GB')}</div>
      <div>Vouchers: ${filteredExpenses.length}</div>
    </div>
  </div>

  <div class="summary">
    <span>Total Filtered Expenditure:</span>
    <span style="color: #e11d48; font-size: 14px;">৳ ${Math.round(totalFilteredAmount).toLocaleString()}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Voucher #</th>
        <th>Category</th>
        <th>Payee / Recipient</th>
        <th>Paid From Account</th>
        <th class="text-right">Amount (BDT)</th>
      </tr>
    </thead>
    <tbody>
      ${filteredExpenses.map((e) => `
        <tr>
          <td>${formatDate(e.date)}</td>
          <td style="font-family: monospace;">${e.voucherNo || '-'}</td>
          <td><b>${e.categoryName}</b></td>
          <td>${e.payee || '-'}</td>
          <td>${e.accountName}</td>
          <td class="text-right" style="font-weight: bold; color: #e11d48;">৳ ${Math.round(e.amount).toLocaleString()}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="5" style="text-align: right; font-weight: 900;">TOTAL EXPENSES:</td>
        <td class="text-right" style="font-weight: 900; color: #e11d48;">৳ ${Math.round(totalFilteredAmount).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Expenses Audit Report • ${businessProfile.businessName} • Generated via RM AutoManage
  </div>
</body>
</html>`;
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addExpenseCategory({
      name: newCatName.trim(),
      nameBn: newCatName.trim(),
    });
    setNewCatName('');
    setShowNewCatInput(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ReceiptText className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'bn' ? 'দোকানের খরচ ট্র্যাকার (Expense Tracker)' : 'Business Expense Tracker'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'bn'
              ? 'দোকান ভাড়া, স্টাফদের বেতন, আপ্যায়ন, বিদ্যুৎ ও পরিবহন খরচসহ যাবতীয় পরিচালন ব্যয় ট্র্যাক করুন'
              : 'Track and manage shop rent, staff wages, refreshments, utilities, transport, and operating costs'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print & Download Report Button opening Modal */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 text-xs font-bold shadow-xs transition-colors"
            title="Download PDF, Image or Print"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
            <span>{language === 'bn' ? 'প্রিন্ট / রিপোর্ট ডাউনলোড' : 'Print / Export'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t('exportCsv')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewExpenseOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? '+ নতুন খরচ যুক্ত করুন' : '+ Record Expense'}</span>
          </button>
        </div>
      </div>

      <div ref={expenseContainerRef} className="space-y-4 sm:space-y-6">

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {language === 'bn' ? 'চলতি মাসের মোট খরচ' : 'This Month Expenses'}
            </span>
            <Calendar className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400">
            {formatBDT(thisMonthExpenses)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {language === 'bn' ? 'চলতি ক্যালেন্ডার মাস' : 'Current calendar month'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {language === 'bn' ? 'আজকের খরচ' : 'Today Expenses'}
            </span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {formatBDT(todayExpenses)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {language === 'bn' ? 'ফিল্টার অনুযায়ী মোট খরচ' : 'Filtered Total'}
            </span>
            <Tag className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {formatBDT(totalFilteredAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {filteredExpenses.length} {language === 'bn' ? 'টি খরচের ভাউচার' : 'vouchers'}
          </span>
        </div>
      </div>

      {/* Category Breakdown Chips */}
      {categoryBreakdown.length > 0 && (
        <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'খাত অনুযায়ী খরচের পরিমাণ:' : 'Expenses by Category:'}
            </span>
            <button
              type="button"
              onClick={() => setShowNewCatInput(!showNewCatInput)}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:underline"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '+ নতুন খাত যোগ' : '+ New Category'}</span>
            </button>
          </div>

          {showNewCatInput && (
            <form onSubmit={handleAddCategory} className="mb-3 flex items-center gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: নাস্তা ও আপ্যায়ন, বিদ্যুৎ বিল...' : 'e.g. Refreshment, Electricity'}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 flex-1"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shrink-0"
              >
                {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewCatInput(false)}
                className="px-2 py-1.5 text-xs text-slate-400"
              >
                বাতিল
              </button>
            </form>
          )}

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            {categoryBreakdown.map(([catName, amount]) => (
              <div
                key={catName}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shrink-0"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300">{catName}</span>
                <span className="font-black text-rose-600 dark:text-rose-400">{formatBDT(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'বিবরণ, খাত, প্রাপক বা ভাউচার খুঁজুন...' : 'Search description, payee, voucher...'}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar text-xs">
          {/* Time Filter */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900 shrink-0">
            {(['THIS_MONTH', 'TODAY', 'ALL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  timeFilter === t
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t === 'THIS_MONTH'
                  ? language === 'bn' ? 'চলতি মাস' : 'This Month'
                  : t === 'TODAY'
                  ? language === 'bn' ? 'আজকের' : 'Today'
                  : language === 'bn' ? 'সব সময়' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
          >
            <option value="ALL">{language === 'bn' ? 'সকল খরচের খাত' : 'All Categories'}</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
          >
            <option value="ALL">{language === 'bn' ? 'সকল ক্যাশ/ব্যাংক' : 'All Accounts'}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatBDT(a.balance)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Card View (< md) - No horizontal scroll! */}
      <div className="md:hidden space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{language === 'bn' ? 'কোনো খরচের রেকর্ড পাওয়া যায়নি।' : 'No expense vouchers found.'}</p>
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-3.5 space-y-2.5 shadow-xs hover:border-rose-300 transition-all"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                    {exp.categoryName}
                  </span>
                  {exp.voucherNo && (
                    <span className="font-mono text-[10px] text-slate-400">
                      #{exp.voucherNo}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{formatDate(exp.date)}</span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                    {exp.description}
                  </h4>
                  {exp.payee && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {language === 'bn' ? 'প্রাপক:' : 'Paid to:'} <strong>{exp.payee}</strong>
                    </p>
                  )}
                </div>
                <div className="text-base font-black text-rose-600 dark:text-rose-400">
                  - {formatBDT(exp.amount)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-slate-400" />
                  <span>{exp.accountName}</span>
                </span>
                <span>ভাউচার সংরক্ষিত</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5">Voucher / Date</th>
                <th className="py-3 px-3.5">Expense Category</th>
                <th className="py-3 px-3.5">Description & Purpose</th>
                <th className="py-3 px-3.5">Payee / Recipient</th>
                <th className="py-3 px-3.5">Paid From Account</th>
                <th className="py-3 px-3.5 text-right">Amount (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No expense vouchers found matching the current filters.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {exp.voucherNo || `V-${exp.id.slice(-4)}`}
                      </div>
                      <div className="text-[10px] text-slate-400">{formatDate(exp.date)}</div>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-900">
                        {exp.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {exp.description}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                      {exp.payee || '—'}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Wallet className="w-3.5 h-3.5 text-slate-400" />
                        <span>{exp.accountName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-rose-600 dark:text-rose-400">
                      - {formatBDT(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* New Expense Modal */}
      {isNewExpenseOpen && (
        <NewExpenseModal
          isOpen={isNewExpenseOpen}
          onClose={() => setIsNewExpenseOpen(false)}
        />
      )}

      {/* Print and Export Popup Modal with PDF, Image & CSV options */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={language === 'bn' ? `দোকানের খরচ স্টেটমেন্ট (${timeFilter === 'TODAY' ? 'আজকের' : timeFilter === 'THIS_MONTH' ? 'চলতি মাসের' : 'সকল'})` : `Business Expenses Report (${timeFilter})`}
        subtitle={`${businessProfile.businessName} • ${formatDate(new Date().toISOString())}`}
        defaultFilename={`RM_Expenses_Report_${timeFilter}_${new Date().toISOString().slice(0, 10)}`}
        targetElementRef={expenseContainerRef}
        onExportCSV={handleExportCSV}
        getPrintHtml={getPrintHtml}
      />
    </div>
  );
};
