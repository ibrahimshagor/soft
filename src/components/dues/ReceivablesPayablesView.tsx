import React, { useState, useMemo } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Send,
  Building2,
  Users,
  Eye,
  CreditCard,
  Phone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Supplier } from '../../types';
import { formatBDT, formatDate, sanitizePhoneNumber, exportToCSV } from '../../utils/formatters';
import { CollectDueModal } from '../customers/CollectDueModal';
import { PaySupplierModal } from '../suppliers/PaySupplierModal';
import { CustomerLedgerModal } from '../customers/CustomerLedgerModal';
import { SupplierLedgerModal } from '../suppliers/SupplierLedgerModal';
import { ManualLoanModal } from './ManualLoanModal';
import { Landmark } from 'lucide-react';

interface ReceivablesPayablesViewProps {
  onOpenCollectDue?: (customerId?: string, refInvoiceNo?: string) => void;
  onOpenPaySupplier?: (supplierId?: string, refPurchaseNo?: string) => void;
}

export const ReceivablesPayablesView: React.FC<ReceivablesPayablesViewProps> = ({
  onOpenCollectDue,
  onOpenPaySupplier,
}) => {
  const {
    customers,
    suppliers,
    dueReminders,
    loanParties,
    businessProfile,
    t,
    language,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'RECEIVABLES' | 'PAYABLES' | 'OVERDUE' | 'LOANS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const safeCustomers = useMemo(() => Array.isArray(customers) ? customers : [], [customers]);
  const safeSuppliers = useMemo(() => Array.isArray(suppliers) ? suppliers : [], [suppliers]);
  const safeLoanParties = useMemo(() => Array.isArray(loanParties) ? loanParties : [], [loanParties]);
  const safeDueReminders = useMemo(() => Array.isArray(dueReminders) ? dueReminders : [], [dueReminders]);

  // Modals state
  const [collectDueCustomer, setCollectDueCustomer] = useState<Customer | null>(null);
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [viewCustomerLedger, setViewCustomerLedger] = useState<Customer | null>(null);
  const [viewSupplierLedger, setViewSupplierLedger] = useState<Supplier | null>(null);
  const [isManualLoanModalOpen, setIsManualLoanModalOpen] = useState(false);
  const [manualLoanInitialType, setManualLoanInitialType] = useState<'borrow' | 'lend'>('borrow');

  // Financial totals (Customer Dues + Supplier Payables + Bank/Samity Loans)
  const totalReceivables = useMemo(
    () =>
      safeCustomers.reduce((sum, c) => sum + (c?.currentDue || 0), 0) +
      safeLoanParties.reduce((sum, lp) => sum + (lp?.currentReceivable || 0), 0),
    [safeCustomers, safeLoanParties]
  );

  const totalPayables = useMemo(
    () =>
      safeSuppliers.reduce((sum, s) => sum + (s?.currentPayable || s?.currentBalance || 0), 0) +
      safeLoanParties.reduce((sum, lp) => sum + (lp?.currentPayable || 0), 0),
    [safeSuppliers, safeLoanParties]
  );

  const netBalance = totalReceivables - totalPayables;

  // Unified items list
  interface DueRecord {
    id: string;
    type: 'CUSTOMER_RECEIVABLE' | 'SUPPLIER_PAYABLE' | 'LOAN_PAYABLE' | 'LOAN_RECEIVABLE';
    partyId: string;
    partyName: string;
    phone: string;
    whatsappNumber?: string;
    address?: string;
    companyName?: string;
    amount: number;
    creditLimit?: number;
    dueDate?: string;
    isOverdue: boolean;
    dueStatus: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | 'NO_DATE';
    rawCustomer?: Customer;
    rawSupplier?: Supplier;
    rawLoanParty?: typeof loanParties[0];
  }

  const allRecords = useMemo(() => {
    const list: DueRecord[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Customer Receivables
    customers.forEach((c) => {
      if ((c.currentDue || 0) > 0) {
        const reminder = dueReminders.find((r) => r.partyId === c.id);
        const dueDate = reminder?.dueDate;
        let isOverdue = false;
        let dueStatus: DueRecord['dueStatus'] = 'NO_DATE';

        if (dueDate) {
          if (dueDate < todayStr) {
            isOverdue = true;
            dueStatus = 'OVERDUE';
          } else if (dueDate === todayStr) {
            dueStatus = 'DUE_TODAY';
          } else {
            dueStatus = 'UPCOMING';
          }
        }

        list.push({
          id: 'due-cust-' + c.id,
          type: 'CUSTOMER_RECEIVABLE',
          partyId: c.id,
          partyName: c.name,
          phone: c.phone,
          whatsappNumber: c.whatsappNumber,
          address: c.address,
          amount: c.currentDue,
          creditLimit: c.creditLimit,
          dueDate,
          isOverdue,
          dueStatus,
          rawCustomer: c,
        });
      }
    });

    // 2. Supplier Payables
    suppliers.forEach((s) => {
      const payableAmt = s.currentPayable ?? s.currentBalance ?? 0;
      if (payableAmt > 0) {
        const reminder = dueReminders.find((r) => r.partyId === s.id);
        const dueDate = reminder?.dueDate;
        let isOverdue = false;
        let dueStatus: DueRecord['dueStatus'] = 'NO_DATE';

        if (dueDate) {
          if (dueDate < todayStr) {
            isOverdue = true;
            dueStatus = 'OVERDUE';
          } else if (dueDate === todayStr) {
            dueStatus = 'DUE_TODAY';
          } else {
            dueStatus = 'UPCOMING';
          }
        }

        list.push({
          id: 'due-sup-' + s.id,
          type: 'SUPPLIER_PAYABLE',
          partyId: s.id,
          partyName: s.name,
          phone: s.phone,
          whatsappNumber: s.phone,
          companyName: s.companyName,
          address: s.address,
          amount: payableAmt,
          dueDate,
          isOverdue,
          dueStatus,
          rawSupplier: s,
        });
      }
    });

    // 3. Bank / Samity / Personal Loan Payables (আমরা যাদের থেকে লোন নিয়েছি)
    safeLoanParties.forEach((lp) => {
      if ((lp?.currentPayable || 0) > 0) {
        const reminder = safeDueReminders.find((r) => r.partyId === lp.id);
        const dueDate = reminder?.dueDate;
        let isOverdue = false;
        let dueStatus: DueRecord['dueStatus'] = 'NO_DATE';

        if (dueDate) {
          if (dueDate < todayStr) {
            isOverdue = true;
            dueStatus = 'OVERDUE';
          } else if (dueDate === todayStr) {
            dueStatus = 'DUE_TODAY';
          } else {
            dueStatus = 'UPCOMING';
          }
        }

        list.push({
          id: 'due-lp-pay-' + lp.id,
          type: 'LOAN_PAYABLE',
          partyId: lp.id,
          partyName: lp.name,
          phone: lp.phone || '',
          whatsappNumber: lp.phone || '',
          companyName: lp.companyName || `${lp.entityType.toUpperCase()} (লোন দেনা)`,
          address: lp.address,
          amount: lp.currentPayable,
          dueDate,
          isOverdue,
          dueStatus,
          rawLoanParty: lp,
        });
      }

      // 4. Loan Receivables (কাউকে ধার দিয়েছি, তারা আমাদের ফেরত দেবে)
      if ((lp.currentReceivable || 0) > 0) {
        const reminder = dueReminders.find((r) => r.partyId === lp.id);
        const dueDate = reminder?.dueDate;
        let isOverdue = false;
        let dueStatus: DueRecord['dueStatus'] = 'NO_DATE';

        if (dueDate) {
          if (dueDate < todayStr) {
            isOverdue = true;
            dueStatus = 'OVERDUE';
          } else if (dueDate === todayStr) {
            dueStatus = 'DUE_TODAY';
          } else {
            dueStatus = 'UPCOMING';
          }
        }

        list.push({
          id: 'due-lp-rec-' + lp.id,
          type: 'LOAN_RECEIVABLE',
          partyId: lp.id,
          partyName: lp.name,
          phone: lp.phone || '',
          whatsappNumber: lp.phone || '',
          companyName: lp.companyName || `${lp.entityType.toUpperCase()} (ধার পাওনা)`,
          address: lp.address,
          amount: lp.currentReceivable,
          dueDate,
          isOverdue,
          dueStatus,
          rawLoanParty: lp,
        });
      }
    });

    return list;
  }, [customers, suppliers, loanParties, dueReminders]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      // Type filtering
      if (activeFilter === 'RECEIVABLES' && rec.type !== 'CUSTOMER_RECEIVABLE' && rec.type !== 'LOAN_RECEIVABLE') return false;
      if (activeFilter === 'PAYABLES' && rec.type !== 'SUPPLIER_PAYABLE' && rec.type !== 'LOAN_PAYABLE') return false;
      if (activeFilter === 'LOANS' && rec.type !== 'LOAN_PAYABLE' && rec.type !== 'LOAN_RECEIVABLE') return false;
      if (activeFilter === 'OVERDUE' && rec.dueStatus !== 'OVERDUE') return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.partyName.toLowerCase().includes(q);
        const matchPhone = rec.phone.includes(q);
        const matchCompany = rec.companyName?.toLowerCase().includes(q) || false;
        return matchName || matchPhone || matchCompany;
      }
      return true;
    });
  }, [allRecords, activeFilter, searchQuery]);

  const overdueCount = useMemo(
    () => allRecords.filter((r) => r.dueStatus === 'OVERDUE').length,
    [allRecords]
  );

  const handleSendReminderWhatsApp = (rec: DueRecord) => {
    const rawPhone = rec.whatsappNumber || rec.phone;
    const phone = sanitizePhoneNumber(rawPhone);
    if (!phone) {
      alert('No valid WhatsApp phone number found.');
      return;
    }

    let text = '';
    if (rec.type === 'CUSTOMER_RECEIVABLE') {
      text = `আসসালামু আলাইকুম ${rec.partyName} সাহেব, ${businessProfile.businessName} হতে বিনীতভাবে জানানো যাচ্ছে যে, আপনার কাছে মোট বকেয়া ${formatBDT(rec.amount)}। অনুগ্রহপূর্বক দ্রুত পরিশোধ করে সহযোগিতা করুন। ধন্যবাদ। যোগাযোগ: ${businessProfile.phone}`;
    } else {
      text = `সম্মানিত ${rec.partyName} (${rec.companyName || 'Supplier'}), ${businessProfile.businessName} থেকে জানানো যাচ্ছে যে, আপনাদের বিলের দেনা বাকি রয়েছে ${formatBDT(rec.amount)}। আমরা দ্রুত পরিশোধের ব্যবস্থা নিচ্ছি। যোগাযোগ: ${businessProfile.phone}`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportCSV = () => {
    const rows = [
      ['Party Type', 'Name', 'Company / Contact', 'Phone', 'Outstanding Amount (BDT)', 'Due Date', 'Status'],
      ...filteredRecords.map((r) => [
        r.type === 'CUSTOMER_RECEIVABLE' ? 'Customer (Receivable)' : 'Supplier (Payable)',
        r.partyName,
        r.companyName || r.address || '',
        r.phone,
        r.amount,
        r.dueDate ? formatDate(r.dueDate) : 'Open',
        r.dueStatus,
      ]),
    ];
    exportToCSV(`RM_Receivables_Payables_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'bn' ? 'পাওনা ও দেনা (লিজার হিসাব)' : 'Payables & Receivables Ledger'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'bn'
              ? 'গ্রাহকদের মোট বাকি লেনা, সাপ্লায়ারদের প্রদেয় দেনা এবং ব্যাংক ও সমিতির লোন খাতা'
              : 'Complete tracking of customer receivables, supplier payables, due dates, and loans'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* User Requested: Top Borrow In & Lend Out Buttons */}
          <button
            type="button"
            onClick={() => {
              setManualLoanInitialType('borrow');
              setIsManualLoanModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs shadow-sm transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{language === 'bn' ? '📥 লোন/ধার নিন (Borrow)' : 'Borrow In (Loan)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setManualLoanInitialType('lend');
              setIsManualLoanModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{language === 'bn' ? '📤 ধার দিন (Lend Out)' : 'Lend Out'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors w-fit"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* Due Reminder Alert Banner - Specifically clarifies the "1" badge on the sidebar menu! */}
      {dueReminders.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
              {dueReminders.length}
            </div>
            <div>
              <div className="font-black text-rose-950 dark:text-rose-100 text-xs sm:text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  {language === 'bn'
                    ? `আসন্ন বকেয়া তাগাদা (মেনুতে লাল "${dueReminders.length}" ব্যাজ নোটিফিকেশন)`
                    : `Upcoming Due Reminder (Sidebar Red "${dueReminders.length}" Badge)`}
                </span>
              </div>
              <div className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 space-y-0.5">
                {dueReminders.map((r) => (
                  <div key={r.id}>
                    • <strong>{r.partyName}</strong>: {formatBDT(r.amount)} {r.refNo ? `(${r.refNo})` : ''} - {language === 'bn' ? 'পরিশোধের শেষ তারিখ:' : 'Due Date:'} <span className="font-bold underline">{formatDate(r.dueDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const first = dueReminders[0];
                if (first) {
                  onOpenCollectDue?.(first.partyId, first.refNo);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'তাগাদা আদায় করুন' : 'Collect Due Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards: Receivables, Payables, Net Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Customer Receivables Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'গ্রাহকদের কাছে পাওনা (মোট লেনা)' : 'Total Customer Receivables'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-2">
            {formatBDT(totalReceivables)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Users className="w-3 h-3 text-emerald-500" />
            <span>{customers.filter((c) => (c.currentDue || 0) > 0).length} {language === 'bn' ? 'জন বাকী গ্রাহক' : 'due customers'}</span>
          </div>
        </div>

        {/* Supplier Payables Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'সাপ্লায়ারদের মোট দেনা' : 'Total Supplier Payables'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-2">
            {formatBDT(totalPayables)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-rose-500" />
            <span>{suppliers.filter((s) => (s.currentPayable ?? s.currentBalance ?? 0) > 0).length} {language === 'bn' ? 'টি বকেয়া সাপ্লায়ার' : 'payable suppliers'}</span>
          </div>
        </div>

        {/* Net Outstanding Balance Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'নেট লেনা-দেনা স্থিতি' : 'Net Market Balance'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight mt-2 ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {formatBDT(Math.abs(netBalance))}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {netBalance >= 0
              ? (language === 'bn' ? '✓ লেনা বেশি (সারপ্লাস অবস্থান)' : '✓ Net Receivable surplus')
              : (language === 'bn' ? '⚠ দেনা বেশি (নেট প্রদেয়)' : '⚠ Net Payable deficit')}
          </div>
        </div>

        {/* Overdue Alerts Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'মেয়াদোত্তীর্ণ তাগাদা' : 'Overdue Reminders'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight mt-2">
            {overdueCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'bn' ? 'দ্রুত তাগাদা দেওয়া প্রয়োজন' : 'Immediate follow-up required'}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'bn' ? 'সকল লেনা ও দেনা' : 'All Accounts'} ({allRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('RECEIVABLES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeFilter === 'RECEIVABLES'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'bn' ? 'কাস্টমার পাওনা (লেনা)' : 'Receivables'} ({customers.filter((c) => (c.currentDue || 0) > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('PAYABLES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeFilter === 'PAYABLES'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'bn' ? 'সাপ্লায়ার দেনা' : 'Payables'} ({suppliers.filter((s) => (s.currentPayable ?? s.currentBalance ?? 0) > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeFilter === 'OVERDUE'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'bn' ? 'মেয়াদ শেষ (Overdue)' : 'Overdue'} ({overdueCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('LOANS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeFilter === 'LOANS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{language === 'bn' ? 'হাওলাত ও ঋণ খাতা' : 'Loans & Hawlat'}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${activeFilter === 'LOANS' ? 'bg-white/20' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'}`}>
              {safeLoanParties.length}
            </span>
          </button>
        </div>

        {/* Search Input (Hidden on loans tab since it has its own search) */}
        {activeFilter !== 'LOANS' && (
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'bn' ? 'নাম বা মোবাইল দিয়ে খুঁজুন...' : 'Search by name or phone...'}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      {/* Unified List View: Responsive Cards on Mobile (< md), Table on Desktop (>= md) */}
      {/* 1. Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <Coins className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
            <p>{language === 'bn' ? 'কোনো বকেয়া বা দেনা পাওয়া যায়নি।' : 'No outstanding receivables or payables found.'}</p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 space-y-3 shadow-xs"
            >
              {/* Card Header: Type badge & Status */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                {rec.type === 'CUSTOMER_RECEIVABLE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Users className="w-3 h-3" />
                    <span>{language === 'bn' ? 'গ্রাহক লেনা (পাওনা)' : 'Customer Receivable'}</span>
                  </span>
                )}
                {rec.type === 'SUPPLIER_PAYABLE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    <Building2 className="w-3 h-3" />
                    <span>{language === 'bn' ? 'সাপ্লায়ার দেনা' : 'Supplier Payable'}</span>
                  </span>
                )}
                {rec.type === 'LOAN_PAYABLE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    <Landmark className="w-3 h-3" />
                    <span>{language === 'bn' ? 'ব্যাংক/সমিতি লোন দেনা' : 'Loan Payable'}</span>
                  </span>
                )}
                {rec.type === 'LOAN_RECEIVABLE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    <Coins className="w-3 h-3" />
                    <span>{language === 'bn' ? 'ধার / হাওলাত পাওনা' : 'Lent Out Receivable'}</span>
                  </span>
                )}

                {/* Status */}
                {rec.dueStatus === 'OVERDUE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Overdue</span>
                  </span>
                )}
                {rec.dueStatus === 'DUE_TODAY' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Clock className="w-3 h-3" />
                    <span>Due Today</span>
                  </span>
                )}
                {rec.dueStatus === 'UPCOMING' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    <span>Upcoming</span>
                  </span>
                )}
                {rec.dueStatus === 'NO_DATE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <span>Open Terms</span>
                  </span>
                )}
              </div>

              {/* Party Details & Contact */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {rec.partyName}
                  </h4>
                  {rec.companyName && (
                    <div className="text-[11px] text-slate-500 font-medium">
                      {rec.companyName}
                    </div>
                  )}
                  {rec.address && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {rec.address}
                    </div>
                  )}
                </div>

                {rec.phone && (
                  <a
                    href={`tel:${rec.phone}`}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-xs shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    <span>{rec.phone}</span>
                  </a>
                )}
              </div>

              {/* Amount & Due Date Banner */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {rec.type === 'CUSTOMER_RECEIVABLE' || rec.type === 'LOAN_RECEIVABLE'
                      ? (language === 'bn' ? 'বকেয়া পাওনা (লেনা)' : 'Receivable Amount')
                      : (language === 'bn' ? 'প্রদেয় দেনা' : 'Payable Amount')}
                  </span>
                  <span className={`text-base font-black ${
                    rec.type === 'CUSTOMER_RECEIVABLE' || rec.type === 'LOAN_RECEIVABLE'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatBDT(rec.amount)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'bn' ? 'তাগাদা / মেয়াদ' : 'Due Date'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {rec.dueDate ? formatDate(rec.dueDate) : 'Open'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-between gap-2">
                {rec.phone && (
                  <button
                    type="button"
                    onClick={() => handleSendReminderWhatsApp(rec)}
                    className="flex-1 py-1.5 px-2 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'তাগাদা মেসেজ' : 'WhatsApp'}</span>
                  </button>
                )}

                {(rec.rawCustomer || rec.rawSupplier) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (rec.type === 'CUSTOMER_RECEIVABLE' && rec.rawCustomer) {
                        setViewCustomerLedger(rec.rawCustomer);
                      } else if (rec.rawSupplier) {
                        setViewSupplierLedger(rec.rawSupplier);
                      }
                    }}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Ledger"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}

                {rec.type === 'CUSTOMER_RECEIVABLE' && (
                  <button
                    type="button"
                    onClick={() => rec.rawCustomer && setCollectDueCustomer(rec.rawCustomer)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm active:scale-95 transition-all text-center"
                  >
                    {language === 'bn' ? 'টাকা আদায়' : 'Collect'}
                  </button>
                )}

                {rec.type === 'SUPPLIER_PAYABLE' && (
                  <button
                    type="button"
                    onClick={() => rec.rawSupplier && setPaySupplier(rec.rawSupplier)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-sm active:scale-95 transition-all text-center"
                  >
                    {language === 'bn' ? 'দেনা পরিশোধ' : 'Pay Bill'}
                  </button>
                )}

                {rec.type === 'LOAN_PAYABLE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualLoanInitialType('borrow');
                      setIsManualLoanModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-sm active:scale-95 transition-all text-center"
                  >
                    {language === 'bn' ? 'লোন শোধ' : 'Repay Loan'}
                  </button>
                )}

                {rec.type === 'LOAN_RECEIVABLE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualLoanInitialType('lend');
                      setIsManualLoanModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs shadow-sm active:scale-95 transition-all text-center"
                  >
                    {language === 'bn' ? 'ধার আদায়' : 'Collect Loan'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Records Table (Desktop: >= md) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">ধরন (Type)</th>
                <th className="py-3 px-4 font-bold">নাম ও প্রতিষ্ঠান (Party Details)</th>
                <th className="py-3 px-4 font-bold">মোবাইল ও ঠিকানা</th>
                <th className="py-3 px-4 font-bold text-right">বকেয়া পরিমাণ (৳)</th>
                <th className="py-3 px-4 font-bold">মেয়াদ / তাগাদা তারিখ</th>
                <th className="py-3 px-4 font-bold text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 font-bold text-right">অ্যাকশন (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {language === 'bn' ? 'কোনো বকেয়া বা দেনা পাওয়া যায়নি।' : 'No outstanding receivables or payables found.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Type badge */}
                    <td className="py-3.5 px-4">
                      {rec.type === 'CUSTOMER_RECEIVABLE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <Users className="w-3 h-3" />
                          <span>{language === 'bn' ? 'গ্রাহক লেনা' : 'Customer'}</span>
                        </span>
                      )}
                      {rec.type === 'SUPPLIER_PAYABLE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <Building2 className="w-3 h-3" />
                          <span>{language === 'bn' ? 'সাপ্লায়ার দেনা' : 'Supplier'}</span>
                        </span>
                      )}
                      {rec.type === 'LOAN_PAYABLE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          <Landmark className="w-3 h-3" />
                          <span>{language === 'bn' ? 'লোন দেনা' : 'Loan Payable'}</span>
                        </span>
                      )}
                      {rec.type === 'LOAN_RECEIVABLE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                          <Coins className="w-3 h-3" />
                          <span>{language === 'bn' ? 'ধার পাওনা' : 'Lent Out'}</span>
                        </span>
                      )}
                    </td>

                    {/* Party Details */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>{rec.partyName}</div>
                      {rec.companyName && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          {rec.companyName}
                        </div>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{rec.phone || 'N/A'}</span>
                      </div>
                      {rec.address && (
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {rec.address}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`text-sm font-black ${
                        rec.type === 'CUSTOMER_RECEIVABLE' || rec.type === 'LOAN_RECEIVABLE'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {formatBDT(rec.amount)}
                      </div>
                      {rec.creditLimit !== undefined && rec.creditLimit > 0 && (
                        <div className="text-[10px] text-slate-400">
                          {language === 'bn' ? 'সীমা' : 'Limit'}: {formatBDT(rec.creditLimit)}
                        </div>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {rec.dueDate ? (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(rec.dueDate)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Open Terms</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 text-center">
                      {rec.dueStatus === 'OVERDUE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue</span>
                        </span>
                      )}
                      {rec.dueStatus === 'DUE_TODAY' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>Today</span>
                        </span>
                      )}
                      {rec.dueStatus === 'UPCOMING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          <span>Upcoming</span>
                        </span>
                      )}
                      {rec.dueStatus === 'NO_DATE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <span>Pending</span>
                        </span>
                      )}
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp reminder */}
                        {rec.phone && (
                          <button
                            type="button"
                            onClick={() => handleSendReminderWhatsApp(rec)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 transition-colors"
                            title="Send WhatsApp Due Reminder"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View Ledger */}
                        {(rec.rawCustomer || rec.rawSupplier) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (rec.type === 'CUSTOMER_RECEIVABLE' && rec.rawCustomer) {
                                setViewCustomerLedger(rec.rawCustomer);
                              } else if (rec.rawSupplier) {
                                setViewSupplierLedger(rec.rawSupplier);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                            title="View Full Ledger Statement"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Direct Payment Action */}
                        {rec.type === 'CUSTOMER_RECEIVABLE' && (
                          <button
                            type="button"
                            onClick={() => rec.rawCustomer && setCollectDueCustomer(rec.rawCustomer)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-all active:scale-95"
                          >
                            {language === 'bn' ? 'টাকা আদায়' : 'Collect'}
                          </button>
                        )}

                        {rec.type === 'SUPPLIER_PAYABLE' && (
                          <button
                            type="button"
                            onClick={() => rec.rawSupplier && setPaySupplier(rec.rawSupplier)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs transition-all active:scale-95"
                          >
                            {language === 'bn' ? 'দেনা পরিশোধ' : 'Pay Bill'}
                          </button>
                        )}

                        {rec.type === 'LOAN_PAYABLE' && (
                          <button
                            type="button"
                            onClick={() => {
                              setManualLoanInitialType('borrow');
                              setIsManualLoanModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs transition-all active:scale-95"
                          >
                            {language === 'bn' ? 'লোন শোধ' : 'Repay'}
                          </button>
                        )}

                        {rec.type === 'LOAN_RECEIVABLE' && (
                          <button
                            type="button"
                            onClick={() => {
                              setManualLoanInitialType('lend');
                              setIsManualLoanModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-xs transition-all active:scale-95"
                          >
                            {language === 'bn' ? 'ধার আদায়' : 'Collect'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Loan / Hawlat Modal */}
      <ManualLoanModal
        isOpen={isManualLoanModalOpen}
        onClose={() => setIsManualLoanModalOpen(false)}
        initialType={manualLoanInitialType}
      />

      {/* Modals */}
      {collectDueCustomer && (
        <CollectDueModal
          isOpen={Boolean(collectDueCustomer)}
          preSelectedCustomerId={collectDueCustomer.id}
          onClose={() => setCollectDueCustomer(null)}
        />
      )}

      {paySupplier && (
        <PaySupplierModal
          isOpen={Boolean(paySupplier)}
          preSelectedSupplierId={paySupplier.id}
          onClose={() => setPaySupplier(null)}
        />
      )}

      {viewCustomerLedger && (
        <CustomerLedgerModal
          customer={viewCustomerLedger}
          onClose={() => setViewCustomerLedger(null)}
        />
      )}

      {viewSupplierLedger && (
        <SupplierLedgerModal
          supplier={viewSupplierLedger}
          onClose={() => setViewSupplierLedger(null)}
        />
      )}
    </div>
  );
};
