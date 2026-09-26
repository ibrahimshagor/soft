import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  ArrowRightLeft,
  Plus,
  Download,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Smartphone,
  Coins,
  FileText,
  Edit,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Account, Transaction } from '../../types';
import { formatBDT, formatDate, formatDateTime, exportToCSV } from '../../utils/formatters';
import { NewExpenseModal } from './NewExpenseModal';
import { FundTransferModal } from './FundTransferModal';
import { AccountStatementModal } from './AccountStatementModal';
import { AccountFormModal } from './AccountFormModal';
import { ShareAccountWhatsAppModal } from './ShareAccountWhatsAppModal';

export const AccountsManager: React.FC = () => {
  const {
    accounts,
    expenses,
    transactions,
    expenseCategories,
    deleteAccount,
    businessProfile,
    language,
    t,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'expenses' | 'transactions'>('accounts');

  // Modals & Selected items
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseAccountId, setExpenseAccountId] = useState<string | undefined>(undefined);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferFromAccountId, setTransferFromAccountId] = useState<string | undefined>(undefined);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedStatementAccount, setSelectedStatementAccount] = useState<Account | null>(null);
  const [sharingAccount, setSharingAccount] = useState<Account | null>(null);

  // Accordion state for "See Information"
  const [expandedAccountIds, setExpandedAccountIds] = useState<string[]>([]);

  // Copied account number feedback tracker
  const [copiedAccId, setCopiedAccId] = useState<string | null>(null);

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

  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setIsAccountModalOpen(true);
  };

  const handleDeleteAccount = (acc: Account) => {
    if (accounts.length <= 1) {
      alert(language === 'bn' ? 'কমপক্ষে একটি সক্রিয় একাউন্ট তালিকায় থাকতে হবে।' : 'At least one account must remain in the system.');
      return;
    }

    const confirmMsg = language === 'bn'
      ? `আপনি কি নিশ্চিতভাবে "${acc.name}" একাউন্টটি মুছে ফেলতে চান?`
      : `Are you sure you want to delete account "${acc.name}"?`;

    if (window.confirm(confirmMsg)) {
      deleteAccount(acc.id);
    }
  };

  const handleQuickCopyAccount = (acc: Account) => {
    const company = businessProfile.businessName || 'RM Automobiles';
    let text = '';

    if (acc.type === 'bank') {
      text = `🏛️ *ব্যাংক একাউন্ট:* ${acc.bankName || acc.name}\n🏷️ *নাম:* ${acc.name}\n🔢 *একাউন্ট নাম্বার:* ${acc.accountNumber || 'N/A'}\n${acc.bankBranch || acc.branch ? `📍 *শাখা:* ${acc.bankBranch || acc.branch}\n` : ''}📌 *প্রতিষ্ঠান:* ${company}`;
    } else if (acc.type === 'mobile_banking' || acc.type === 'mfs') {
      text = `📱 *মোবাইল ব্যাংকিং:* ${acc.name}\n📞 *নাম্বার:* ${acc.accountNumber || 'N/A'}\n${acc.bankBranch || acc.branch ? `💼 *টাইপ:* ${acc.bankBranch || acc.branch}\n` : ''}📌 *প্রতিষ্ঠান:* ${company}`;
    } else {
      text = `💵 *ক্যাশ একাউন্ট:* ${acc.name}\n📌 *প্রতিষ্ঠান:* ${company}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedAccId(acc.id);
    setTimeout(() => setCopiedAccId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDirectTransfer = (accId: string) => {
    setTransferFromAccountId(accId);
    setIsTransferOpen(true);
  };

  const handleDirectExpense = (accId: string) => {
    setExpenseAccountId(accId);
    setIsExpenseOpen(true);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'bn' ? 'একাউন্টস ও ব্যাংক ব্যালেন্স' : `${t('accounts')} & Cash Drawer Manager`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'bn'
              ? 'ক্যাশ ড্রয়ার, ব্যাংক একাউন্ট, বিকাশ/নগদ ওয়ালেট, খরচ ও লেনদেন হিসাব'
              : 'Cash register, bank balances, MFS wallets, operating expenses, and fund transfers'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setTransferFromAccountId(undefined);
              setIsTransferOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
            <span>{language === 'bn' ? 'তহবিল স্থানান্তর' : 'Fund Transfer'}</span>
          </button>

          <button
            onClick={() => {
              setExpenseAccountId(undefined);
              setIsExpenseOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'খরচ এন্ট্রি' : t('recordExpense')}</span>
          </button>

          <button
            onClick={handleOpenAddAccount}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন একাউন্ট যোগ' : 'Add Account'}</span>
          </button>
        </div>
      </div>

      {/* Top Liquidity Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
          <span className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider block">
            {language === 'bn' ? 'মোট বর্তমান নগদ ও ব্যাংক ব্যালেন্স' : 'Total Liquid Working Capital'}
          </span>
          <h2 className="text-2xl font-black mt-0.5 tracking-tight">
            {formatBDT(totalLiquidBalance)}
          </h2>
          <span className="text-[11px] text-emerald-200 mt-1 block">
            {language === 'bn' ? 'ক্যাশ, ব্যাংক এবং বিকাশ/নগদ ব্যালেন্সের সমন্বিত যোগফল' : 'Combined cash drawer, bank deposits & bKash'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'মোট অপারেটিং ব্যয়' : 'Operating Expenses Recorded'}
          </span>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">
            {formatBDT(totalExpenses)}
          </h3>
          <span className="text-[11px] text-slate-500">
            {expenses.length} {language === 'bn' ? 'টি খরচ ভাউচার' : 'expenditure vouchers'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'ক্যাশফ্লো জার্নাল লগ' : 'Cash Flow Audit Log'}
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {transactions.length} {language === 'bn' ? 'টি লেনদেন' : 'Transactions'}
          </h3>
          <span className="text-[11px] text-slate-500">
            {language === 'bn' ? 'রিয়েল-টাইম মাল্টি-একাউন্ট লেজার' : 'Real-time multi-account journal'}
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
          <span>{language === 'bn' ? `একাউন্টস ও ব্যাংক তালিকা (${accounts.length})` : `Accounts & Cash Drawers (${accounts.length})`}</span>
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
          <span>{language === 'bn' ? `খরচ ভাউচারসমূহ (${expenses.length})` : `Expenses Vouchers (${expenses.length})`}</span>
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
          <span>{language === 'bn' ? `লেনদেন জার্নাল (${transactions.length})` : `Transaction Journal (${transactions.length})`}</span>
        </button>
      </div>

      {/* TAB 1: ACCOUNTS CARDS */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {language === 'bn' ? 'সকল সক্রিয় ব্যাংক, ক্যাশ ও বিকাশ/নগদ একাউন্ট' : 'All active Bank, Cash, and MFS accounts'}
            </span>
            <button
              onClick={handleOpenAddAccount}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '+ নতুন একাউন্ট যোগ' : '+ Add Account'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const hasDetailedInfo = !!(acc.bankName || acc.accountNumber || acc.bankBranch || acc.branch);
              const isExpanded = expandedAccountIds.includes(acc.id);

              return (
                <div
                  key={acc.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header with Icon, Name, Type, and Quick Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2.5 rounded-2xl ${
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
                          <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                            {acc.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                                acc.type === 'bank'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : acc.type === 'cash'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300'
                              }`}
                            >
                              {acc.type === 'bank'
                                ? (language === 'bn' ? 'ব্যাংক একাউন্ট' : 'Bank A/C')
                                : acc.type === 'cash'
                                ? (language === 'bn' ? 'ক্যাশ ড্রয়ার' : 'Cash Drawer')
                                : (language === 'bn' ? 'বিকাশ / নগদ' : 'Mobile Banking')}
                            </span>
                            {acc.isDefault && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950">
                                DEFAULT
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions: Edit & Delete Icons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAccount(acc)}
                          title={language === 'bn' ? 'এডিট করুন' : 'Edit Account'}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc)}
                          title={language === 'bn' ? 'ডিলিট করুন' : 'Delete Account'}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Balance Display */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          {language === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                          {formatBDT(acc.balance)}
                        </div>
                      </div>

                      {/* WhatsApp & Copy Quick Share Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSharingAccount(acc)}
                          title={language === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান' : 'Share to WhatsApp'}
                          className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickCopyAccount(acc)}
                          title={language === 'bn' ? 'একাউন্ট তথ্য কপি করুন' : 'Copy account info'}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          {copiedAccId === acc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Information (Smooth Accordion for Bank/MFS) */}
                    {hasDetailedInfo && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => toggleExpand(acc.id)}
                          className="w-full flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                              {isExpanded
                                ? (language === 'bn' ? 'তথ্য সংক্ষেপ করুন' : 'Hide Information')
                                : (language === 'bn' ? 'তথ্য দেখুন (See Information)' : 'See Information')}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        {/* Collapsible Info Drawer */}
                        {isExpanded && (
                          <div className="mt-2 p-3 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1.5 text-xs animate-in slide-in-from-top-2 duration-150">
                            {acc.bankName && (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">{language === 'bn' ? 'ব্যাংক:' : 'Bank:'}</span>
                                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                                  {acc.bankName}
                                </span>
                              </div>
                            )}

                            {acc.accountNumber && (
                              <div className="flex items-center justify-between text-[11px] pt-0.5">
                                <span className="text-slate-500">
                                  {acc.type === 'bank' ? (language === 'bn' ? 'একাউন্ট নং:' : 'A/C No:') : (language === 'bn' ? 'মোবাইল নং:' : 'Mobile / No:')}
                                </span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {acc.accountNumber}
                                </span>
                              </div>
                            )}

                            {(acc.bankBranch || acc.branch) && (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">
                                  {acc.type === 'bank' ? (language === 'bn' ? 'শাখা / ব্রাঞ্চ:' : 'Branch:') : (language === 'bn' ? 'সার্ভিস ধরণ:' : 'Service:')}
                                </span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {acc.bankBranch || acc.branch}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM ACTION BUTTONS: Statement, Transfer, Pay Expense */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-3 gap-1.5 text-xs">
                    {/* 1. Statement */}
                    <button
                      type="button"
                      onClick={() => setSelectedStatementAccount(acc)}
                      className="py-2 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center gap-1 transition-colors text-[11px]"
                      title={language === 'bn' ? 'একাউন্ট স্টেটমেন্ট ও লেজার' : 'Account Statement'}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>{language === 'bn' ? 'স্টেটমেন্ট' : 'Statement'}</span>
                    </button>

                    {/* 2. Transfer from this account */}
                    <button
                      type="button"
                      onClick={() => handleDirectTransfer(acc.id)}
                      className="py-2 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center gap-1 transition-colors text-[11px]"
                      title={language === 'bn' ? 'এই একাউন্ট থেকে ফান্ড ট্রান্সফার করুন' : 'Transfer Funds from this account'}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>{language === 'bn' ? 'স্থানান্তর' : 'Transfer'}</span>
                    </button>

                    {/* 3. Pay Expense from this account */}
                    <button
                      type="button"
                      onClick={() => handleDirectExpense(acc.id)}
                      className="py-2 px-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center gap-1 transition-colors text-[11px]"
                      title={language === 'bn' ? 'এই একাউন্ট থেকে খরচ এন্ট্রি করুন' : 'Pay Expense from this account'}
                    >
                      <Receipt className="w-3.5 h-3.5 shrink-0" />
                      <span>{language === 'bn' ? 'খরচ এন্ট্রি' : 'Expense'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES LIST */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">
                {language === 'bn' ? 'ক্যাটাগরি ফিল্টার:' : 'Category Filter:'}
              </span>
              <select
                value={expCategoryFilter}
                onChange={(e) => setExpCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium"
              >
                <option value="ALL">{language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
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
              <span>{language === 'bn' ? 'এক্সপোর্ট CSV' : 'Export CSV'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="py-3 px-3.5">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="py-3 px-3.5">{language === 'bn' ? 'পরিশোধিত একাউন্ট' : 'Paid From Account'}</th>
                    <th className="py-3 px-3.5">{language === 'bn' ? 'প্রাপক / ব্যক্তি' : 'Payee / Recipient'}</th>
                    <th className="py-3 px-3.5">{language === 'bn' ? 'বিবরণ / নোট' : 'Particulars / Note'}</th>
                    <th className="py-3 px-3.5 text-right">{language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {language === 'bn' ? 'কোন খরচের এন্ট্রি পাওয়া যায়নি।' : 'No expenses recorded yet.'}
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
                placeholder={language === 'bn' ? 'লেনদেন খুঁজুন...' : 'Search transactions...'}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={handleExportTransactionsCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'এক্সপোর্ট CSV' : 'Export CSV'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5">{language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                    <th className="py-3 px-3.5">{language === 'bn' ? 'ফ্লো' : 'Flow'}</th>
                    <th className="py-3 px-3.5">{language === 'bn' ? 'একাউন্ট' : 'Account'}</th>
                    <th className="py-3 px-3.5">{language === 'bn' ? 'লেনদেনের ধরণ' : 'Transaction Type'}</th>
                    <th className="py-3 px-3.5">{language === 'bn' ? 'বিবরণ' : 'Description'}</th>
                    <th className="py-3 px-3.5 text-right">{language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {language === 'bn' ? 'কোন লেনদেন রেকর্ড পাওয়া যায়নি।' : 'No transactions found.'}
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

      {/* Account Form Modal (Add / Edit) */}
      <AccountFormModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        editingAccount={editingAccount}
      />

      {/* Share Account & WhatsApp Modal */}
      <ShareAccountWhatsAppModal
        isOpen={!!sharingAccount}
        onClose={() => setSharingAccount(null)}
        account={sharingAccount}
      />

      {/* New Expense Modal */}
      {isExpenseOpen && (
        <NewExpenseModal
          isOpen={isExpenseOpen}
          onClose={() => {
            setIsExpenseOpen(false);
            setExpenseAccountId(undefined);
          }}
          initialAccountId={expenseAccountId}
        />
      )}

      {/* Fund Transfer Modal */}
      {isTransferOpen && (
        <FundTransferModal
          isOpen={isTransferOpen}
          onClose={() => {
            setIsTransferOpen(false);
            setTransferFromAccountId(undefined);
          }}
          initialFromAccountId={transferFromAccountId}
        />
      )}
    </div>
  );
};
