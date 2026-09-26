import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Filter,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Printer,
  Building2,
  Smartphone,
  Coins,
  FileSpreadsheet,
  CheckCircle2,
  Receipt,
  Layers,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Account, Transaction } from '../../types';
import { formatBDT, formatDate, formatDateTime, exportToCSV } from '../../utils/formatters';
import { ReportExportModal } from '../common/ReportExportModal';

interface AccountStatementModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
}

type StatementTimeFilter = 'today' | '7days' | 'month' | 'year' | 'all' | 'custom';

export const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
  account,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !account) return null;

  return (
    <AccountStatementModalContent
      key={account.id}
      account={account}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

const AccountStatementModalContent: React.FC<{
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}> = ({
  account,
  isOpen,
  onClose,
}) => {
  const { transactions, businessProfile, language } = useApp();

  const [timeFilter, setTimeFilter] = useState<StatementTimeFilter>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Filter transactions for this account and time range
  const accountTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthPrefix = now.toISOString().slice(0, 7);
    const thisYearPrefix = now.getFullYear().toString();

    // 1. Filter by account ID
    let list = transactions.filter((t) => t.accountId === account.id);

    // 2. Filter by time
    list = list.filter((tx) => {
      const txDate = tx.date.slice(0, 10);

      if (timeFilter === 'today') {
        return txDate === todayStr;
      }
      if (timeFilter === '7days') {
        const d = new Date(tx.date);
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (timeFilter === 'month') {
        return txDate.startsWith(thisMonthPrefix);
      }
      if (timeFilter === 'year') {
        return txDate.startsWith(thisYearPrefix);
      }
      if (timeFilter === 'custom') {
        if (customStartDate && txDate < customStartDate) return false;
        if (customEndDate && txDate > customEndDate) return false;
        return true;
      }
      return true; // 'all'
    });

    // 3. Filter by flow
    if (flowFilter === 'IN') {
      list = list.filter((t) => t.flow === 'in');
    } else if (flowFilter === 'OUT') {
      list = list.filter((t) => t.flow === 'out');
    }

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          (t.creatorName && t.creatorName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [transactions, account.id, timeFilter, customStartDate, customEndDate, flowFilter, searchQuery]);

  // Aggregate metrics
  const totalInflow = useMemo(
    () => accountTransactions.filter((t) => t.flow === 'in').reduce((sum, t) => sum + t.amount, 0),
    [accountTransactions]
  );

  const totalOutflow = useMemo(
    () => accountTransactions.filter((t) => t.flow === 'out').reduce((sum, t) => sum + t.amount, 0),
    [accountTransactions]
  );

  const netCashFlow = totalInflow - totalOutflow;

  const handleExportCSV = () => {
    const rows = [
      ['Account Name', account.name],
      ['Account Type', account.type],
      ['Statement Period', timeFilter],
      ['Current Balance', account.balance],
      ['Total Inflow', totalInflow],
      ['Total Outflow', totalOutflow],
      ['Net Movement', netCashFlow],
      ['', ''],
      ['Date & Time', 'Transaction Type', 'Flow', 'Amount (BDT)', 'Description', 'Recorded By'],
      ...accountTransactions.map((tx) => [
        formatDateTime(tx.date),
        tx.type,
        tx.flow.toUpperCase(),
        tx.amount,
        tx.description,
        tx.creatorName || '',
      ]),
    ];
    exportToCSV(`RM_Account_Statement_${account.name.replace(/\s+/g, '_')}_${timeFilter}.csv`, rows);
  };

  const getCleanPrintHtml = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account_Statement_${account.name}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 16px; background: #fff; font-size: 11px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 18px; font-weight: 900; }
    .sub { font-size: 10px; color: #475569; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 14px; }
    .summary-item { font-size: 10px; color: #64748b; }
    .summary-val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
    .text-right { text-align: right; }
    .inflow { color: #059669; font-weight: bold; }
    .outflow { color: #dc2626; font-weight: bold; }
    .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${businessProfile.businessName}</div>
      <div class="sub">${businessProfile.address || ''} • Phone: ${businessProfile.phone}</div>
      <div style="margin-top: 4px; font-weight: 700; color: #d97706; font-size: 13px;">
        Account Ledger Statement: ${account.name} (${account.type.toUpperCase()})
      </div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #475569;">
      <div>Generated: ${new Date().toLocaleDateString()}</div>
      <div>Timeframe: ${timeFilter.toUpperCase()}</div>
      ${account.accountNumber ? `<div>A/C: ${account.accountNumber}</div>` : ''}
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-item">
      <div>Current Balance</div>
      <div class="summary-val">${formatBDT(account.balance)}</div>
    </div>
    <div class="summary-item">
      <div>Total Inflow (+)</div>
      <div class="summary-val" style="color: #059669;">+${formatBDT(totalInflow)}</div>
    </div>
    <div class="summary-item">
      <div>Total Outflow (-)</div>
      <div class="summary-val" style="color: #dc2626;">-${formatBDT(totalOutflow)}</div>
    </div>
    <div class="summary-item">
      <div>Net Period Movement</div>
      <div class="summary-val">${formatBDT(netCashFlow)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Particulars / Description</th>
        <th>Inflow (+)</th>
        <th>Outflow (-)</th>
        <th>Operator</th>
      </tr>
    </thead>
    <tbody>
      ${accountTransactions
        .map(
          (t) => `
        <tr>
          <td>${formatDate(t.date)}</td>
          <td style="font-size: 9px; text-transform: uppercase;">${t.type.replace(/_/g, ' ')}</td>
          <td>${t.description}</td>
          <td class="text-right inflow">${t.flow === 'in' ? formatBDT(t.amount) : '-'}</td>
          <td class="text-right outflow">${t.flow === 'out' ? formatBDT(t.amount) : '-'}</td>
          <td>${t.creatorName || ''}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    Account Statement • ${businessProfile.businessName} • Generated via RM AutoManage ERP
  </div>
</body>
</html>`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
                  account.type === 'cash'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    : account.type === 'bank'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    : 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400'
                }`}
              >
                {account.type === 'cash' ? (
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : account.type === 'bank' ? (
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white truncate">
                    {account.name}
                  </h2>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {account.type}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  {language === 'bn'
                    ? 'বিস্তারিত লেনদেন খাতা ও ক্যাশ ফ্লো অডিট স্টেটমেন্ট'
                    : 'Detailed Ledger & Audit Trail Statement'}
                  {account.accountNumber ? ` • A/C: ${account.accountNumber}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'bn' ? 'প্রিন্ট ও ডাউনলোড' : 'Print / Export'}</span>
                <span className="sm:hidden">{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Time & Flow Filters Bar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
            {/* Time Filter Pills */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs overflow-x-auto scrollbar-thin max-w-full">
              <button
                type="button"
                onClick={() => setTimeFilter('today')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                  timeFilter === 'today'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {language === 'bn' ? 'আজকের' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('7days')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                  timeFilter === '7days'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {language === 'bn' ? '১ সপ্তাহ' : '7 Days'}
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('month')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                  timeFilter === 'month'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {language === 'bn' ? 'চলতি মাস' : 'This Month'}
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('year')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                  timeFilter === 'year'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {language === 'bn' ? 'বাৎসরিক' : 'This Year'}
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                  timeFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {language === 'bn' ? 'সব সময়' : 'All Time'}
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('custom')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                  timeFilter === 'custom'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {language === 'bn' ? 'নির্দিষ্ট তারিখ' : 'Custom Range'}
              </button>
            </div>

            {/* Custom Date Pickers */}
            {timeFilter === 'custom' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 text-xs">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent font-semibold outline-hidden text-slate-900 dark:text-white"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent font-semibold outline-hidden text-slate-900 dark:text-white"
                />
              </div>
            )}

            {/* Flow & Search Filters */}
            <div className="flex items-center gap-2">
              <select
                value={flowFilter}
                onChange={(e) => setFlowFilter(e.target.value as any)}
                className="px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-hidden"
              >
                <option value="ALL">{language === 'bn' ? 'সকল লেনদেন' : 'All Cashflows'}</option>
                <option value="IN">{language === 'bn' ? 'শুধু জমা (+)' : 'Inflow Only (+)'}</option>
                <option value="OUT">{language === 'bn' ? 'শুধু খরচ (-)' : 'Outflow Only (-)'}</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'অনুসন্ধান...' : 'Search remarks...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden w-28 sm:w-44"
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2.5 sm:p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}
              </span>
              <div className="text-sm sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {formatBDT(account.balance)}
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                {language === 'bn' ? 'নির্বাচিত সময়ে মোট জমা' : 'Period Total Inflow'}
              </span>
              <div className="text-sm sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                +{formatBDT(totalInflow)}
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                {language === 'bn' ? 'নির্বাচিত সময়ে মোট খরচ' : 'Period Total Outflow'}
              </span>
              <div className="text-sm sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                -{formatBDT(totalOutflow)}
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'নীট ক্যাশ মুভমেন্ট' : 'Net Period Movement'}
              </span>
              <div
                className={`text-sm sm:text-xl font-black mt-0.5 truncate ${
                  netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {netCashFlow >= 0 ? '+' : ''}
                {formatBDT(netCashFlow)}
              </div>
            </div>
          </div>

          {/* Ledger Table Container */}
          <div className="flex-1 overflow-y-auto min-h-0 p-2 sm:p-5">
            {/* Printable Snapshot Area */}
            <div
              ref={printAreaRef}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs p-1 sm:p-2"
            >
              <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {account.name} - {language === 'bn' ? 'লেনদেন খতিয়ান' : 'Account Transactions Ledger'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'bn' ? 'মোট রেকর্ড:' : 'Total records:'} {accountTransactions.length}
                  </p>
                </div>
                <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {formatBDT(account.balance)}
                </span>
              </div>

              {accountTransactions.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-400">
                  <Receipt className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-xs">
                    {language === 'bn'
                      ? 'এই নির্দিষ্ট সময়ে কোনো লেনদেন পাওয়া যায়নি'
                      : 'No transactions found for this account in the selected period.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card List View (sm:hidden) */}
                  <div className="sm:hidden p-2 space-y-2">
                    {accountTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-slate-400">
                            {formatDateTime(tx.date)}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              tx.flow === 'in'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
                            }`}
                          >
                            {tx.type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                          {tx.description}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700 text-xs">
                          <span className="text-[10px] text-slate-400">
                            বাই: {tx.creatorName || 'System'}
                          </span>
                          <span
                            className={`font-black font-mono text-sm ${
                              tx.flow === 'in'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {tx.flow === 'in' ? '+' : '-'} {formatBDT(tx.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View (hidden sm:block) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">{language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                          <th className="py-2.5 px-3">{language === 'bn' ? 'ধরন' : 'Type'}</th>
                          <th className="py-2.5 px-3">{language === 'bn' ? 'বিবরণ ও রেফারেন্স' : 'Description & Ref'}</th>
                          <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'জমা (+)' : 'Inflow (+)'}</th>
                          <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'খরচ (-)' : 'Outflow (-)'}</th>
                          <th className="py-2.5 px-3">{language === 'bn' ? 'এন্ট্রিদাতা' : 'Recorded By'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {accountTransactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {formatDateTime(tx.date)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  tx.flow === 'in'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
                                }`}
                              >
                                {tx.type.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {tx.description}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              {tx.flow === 'in' ? `+${formatBDT(tx.amount)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-rose-600 dark:text-rose-400 font-mono">
                              {tx.flow === 'out' ? `-${formatBDT(tx.amount)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {tx.creatorName || 'System'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export & Print Options Modal */}
      {isExportModalOpen && (
        <ReportExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title={`Account Statement - ${account.name}`}
          subtitle={`${timeFilter.toUpperCase()} • Current Balance: ${formatBDT(account.balance)}`}
          defaultFilename={`Statement_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`}
          targetElementRef={printAreaRef}
          onExportCSV={handleExportCSV}
          getPrintHtml={getCleanPrintHtml}
        />
      )}
    </>
  );
};
