import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  ArrowRightLeft,
  Plus,
  Download,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Smartphone,
  Coins,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Account, Expense, Transaction } from '../../types';
import { formatBDT, formatDate, formatDateTime, exportToCSV } from '../../utils/formatters';
import { NewExpenseModal } from './NewExpenseModal';
import { FundTransferModal } from './FundTransferModal';
import { AccountStatementModal } from './AccountStatementModal';
import { FileText } from 'lucide-react';

export const AccountsManager: React.FC = () => {
  const {
    accounts,
    expenses,
    transactions,
    expenseCategories,
    addAccount,
    language,
    t,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'expenses' | 'transactions'>('accounts');

  // Modals
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [selectedStatementAccount, setSelectedStatementAccount] = useState<Account | null>(null);

  // New Account state
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<Account['type']>('bank');
  const [accNumber, setAccNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  // Filter states
  const [txSearch, setTxSearch] = useState('');
  const [expCategoryFilter, setExpCategoryFilter] = useState<string>('ALL');

  const totalLiquidBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t: Transaction) => {
      const q = txSearch.toLowerCase();
      const matchSearch =
        t.description.toLowerCase().includes(q) ||
        t.accountName.toLowerCase().includes(q);
      return matchSearch;
    });
  }, [transactions, txSearch]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expCategoryFilter === 'ALL') return true;
      return e.categoryId === expCategoryFilter;
    });
  }, [expenses, expCategoryFilter]);

  const handleExportTransactionsCSV = () => {
    const rows = [
      ['Date', 'Type', 'Account', 'Amount', 'Flow', 'Description', 'Recorded By'],
      ...filteredTransactions.map((tx: Transaction) => [
        formatDateTime(tx.date),
        tx.type,
        tx.accountName,
        tx.amount,
        tx.flow.toUpperCase(),
        tx.description,
        tx.creatorName,
      ]),
    ];
    exportToCSV(`RM_Transactions_Journal_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportExpensesCSV = () => {
    const rows = [
      ['Date', 'Category', 'Amount', 'Paid From', 'Payee', 'Voucher #', 'Description'],
      ...filteredExpenses.map((e) => [
        formatDate(e.date),
        e.categoryName,
        e.amount,
        e.accountName,
        e.payee || '',
        e.voucherNo || '',
        e.description,
      ]),
    ];
    exportToCSV(`RM_Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    addAccount({
      name: accName.trim(),
      type: accType,
      accountNumber: accNumber.trim() || undefined,
      bankBranch: bankBranch.trim() || undefined,
      balance: initialBalance,
      isDefault: false,
    });

    setIsNewAccountOpen(false);
    setAccName('');
    setAccNumber('');
    setBankBranch('');
    setInitialBalance(0);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('accounts')} & Cash Drawer Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cash register, bank balances, MFS wallets, operating expenses, and fund transfers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
            <span>Fund Transfer</span>
          </button>

          <button
            onClick={() => setIsExpenseOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{t('recordExpense')}</span>
          </button>

          <button
            onClick={() => setIsNewAccountOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Top Liquidity Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
          <span className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider block">
            Total Liquid Working Capital
          </span>
          <h2 className="text-2xl font-black mt-0.5 tracking-tight">
            {formatBDT(totalLiquidBalance)}
          </h2>
          <span className="text-[11px] text-emerald-200 mt-1 block">
            Combined cash drawer, bank deposits & bKash
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Operating Expenses Recorded
          </span>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">
            {formatBDT(totalExpenses)}
          </h3>
          <span className="text-[11px] text-slate-500">
            {expenses.length} expenditure vouchers
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Cash Flow Audit Log
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {transactions.length} Transactions
          </h3>
          <span className="text-[11px] text-slate-500">
            Real-time multi-account journal
          </span>
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'accounts'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Accounts & Cash Drawers ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'expenses'
              ? 'border-rose-500 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expenses Vouchers ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'transactions'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Transaction Journal ({transactions.length})</span>
        </button>
      </div>

      {/* TAB 1: ACCOUNTS CARDS */}
      {activeSubTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-xl ${
                        acc.type === 'cash'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          : acc.type === 'bank'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          : 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400'
                      }`}
                    >
                      {acc.type === 'cash' ? (
                        <Coins className="w-5 h-5" />
                      ) : acc.type === 'bank' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <Smartphone className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {acc.name}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {acc.type} ACCOUNT
                      </span>
                    </div>
                  </div>

                  {acc.isDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950">
                      DEFAULT
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Current Balance
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                    {formatBDT(acc.balance)}
                  </div>
                </div>

                {(acc.accountNumber || acc.bankBranch) && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-0.5 font-mono text-[11px]">
                    {acc.accountNumber && <div>A/C: {acc.accountNumber}</div>}
                    {acc.bankBranch && <div>Branch: {acc.bankBranch}</div>}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedStatementAccount(acc)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 transition-all text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'স্টেটমেন্ট দেখুন' : 'Statement'}</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTransferOpen(true)}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpenseOpen(true)}
                    className="text-rose-600 dark:text-rose-400 font-bold hover:underline"
                  >
                    Pay Expense →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: EXPENSES LIST */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Category Filter:</span>
              <select
                value={expCategoryFilter}
                onChange={(e) => setExpCategoryFilter(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">All Categories</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportExpensesCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-3.5">Paid From Account</th>
                    <th className="py-3 px-3.5">Payee / Recipient</th>
                    <th className="py-3 px-3.5">Particulars / Note</th>
                    <th className="py-3 px-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(exp.date)}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            {exp.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-medium text-slate-800 dark:text-slate-200">
                          {exp.accountName}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                          {exp.payee || '—'}
                        </td>
                        <td className="py-3 px-3.5 text-slate-800 dark:text-slate-200">
                          {exp.description}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-rose-600 dark:text-rose-400">
                          {formatBDT(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION JOURNAL */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={handleExportTransactionsCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5">Date & Time</th>
                    <th className="py-3 px-3.5">Flow</th>
                    <th className="py-3 px-3.5">Account</th>
                    <th className="py-3 px-3.5">Transaction Type</th>
                    <th className="py-3 px-3.5">Description</th>
                    <th className="py-3 px-3.5 text-right">Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx: Transaction) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateTime(tx.date)}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.flow === 'in'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {tx.flow === 'in' ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            <span>{tx.flow.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {tx.accountName}
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 uppercase text-[10px] font-mono">
                          {tx.type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300">
                          {tx.description}
                        </td>
                        <td
                          className={`py-3 px-3.5 text-right font-black ${
                            tx.flow === 'in'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {tx.flow === 'in' ? '+' : '-'} {formatBDT(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Account Statement Ledger Modal */}
      {selectedStatementAccount && (
        <AccountStatementModal
          account={selectedStatementAccount}
          isOpen={!!selectedStatementAccount}
          onClose={() => setSelectedStatementAccount(null)}
        />
      )}

      {/* New Expense Modal */}
      {isExpenseOpen && (
        <NewExpenseModal isOpen={isExpenseOpen} onClose={() => setIsExpenseOpen(false)} />
      )}

      {/* Fund Transfer Modal */}
      {isTransferOpen && (
        <FundTransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
      )}

      {/* Add Account Modal */}
      {isNewAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                <Wallet className="w-5 h-5 text-amber-500" />
                <span>Add Bank / Cash Account</span>
              </div>
              <button onClick={() => setIsNewAccountOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BRAC Bank Current A/C"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Account Type *
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as Account['type'])}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="cash">Cash Register / Drawer</option>
                  <option value="bank">Bank Account</option>
                  <option value="mobile_banking">Mobile Financial Services (bKash / Nagad / Rocket)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Account / Wallet #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 205012345678"
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tejgaon Branch"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Opening Balance (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-sm"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewAccountOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
