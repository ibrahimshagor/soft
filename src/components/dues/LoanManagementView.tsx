import React, { useState, useMemo } from 'react';
import {
  Landmark,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  Wallet,
  Coins,
  FileText,
  Search,
  Plus,
  Phone,
  Building2,
  User,
  Users,
  Clock,
  X,
  AlertCircle,
  AlertTriangle,
  Tag,
  CreditCard,
  Download,
  Send,
  Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LoanParty, LoanRecord, LoanEntityType, InstallmentScheduleItem } from '../../types';
import { formatBDT, formatDate, sanitizePhoneNumber, exportToCSV } from '../../utils/formatters';
import {
  getMatchingAccountForPaymentMethod,
  getMatchingPaymentMethodForAccount,
} from '../../utils/paymentAccountLink';
import { ManualLoanModal } from './ManualLoanModal';
import { LoanPartyLedgerModal } from './LoanPartyLedgerModal';

const LoanManagementViewInner: React.FC = () => {
  const {
    loanParties,
    loanRecords,
    addLoanParty,
    recordLoanTransaction,
    payLoanInstallment,
    accounts,
    paymentMethods,
    dueReminders,
    businessProfile,
    language,
  } = useApp();

  // Sub-tabs: 'records' | 'parties'
  const [subTab, setSubTab] = useState<'records' | 'parties'>('parties');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'borrow' | 'lend' | 'repay_borrow' | 'collect_lend'>('all');

  // Modals state
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [isManualLoanModalOpen, setIsManualLoanModalOpen] = useState(false);
  const [manualLoanInitialType, setManualLoanInitialType] = useState<'borrow' | 'lend'>('borrow');
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<LoanParty | null>(null);

  // Installment schedule modal state
  const [selectedRecordForInstallments, setSelectedRecordForInstallments] = useState<LoanRecord | null>(null);
  const [payingInstallmentItem, setPayingInstallmentItem] = useState<InstallmentScheduleItem | null>(null);
  const [installmentPayAccountId, setInstallmentPayAccountId] = useState<string>(accounts[0]?.id || '');
  const [installmentPayMethodId, setInstallmentPayMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [installmentPayNotes, setInstallmentPayNotes] = useState<string>('');

  // Pre-configured transaction modal mode
  const [txType, setTxType] = useState<'borrow' | 'lend' | 'repay_borrow' | 'collect_lend'>('borrow');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txAccountId, setTxAccountId] = useState<string>(accounts[0]?.id || '');
  const [txPaymentMethodId, setTxPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [txDueDate, setTxDueDate] = useState<string>('');
  const [txNotes, setTxNotes] = useState<string>('');
  const [txError, setTxError] = useState<string>('');

  // Add party form state
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyType, setPartyType] = useState<LoanEntityType>('person');
  const [partyCompany, setPartyCompany] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyNotes, setPartyNotes] = useState('');
  const [partyError, setPartyError] = useState('');

  const safeLoanParties = useMemo(() => Array.isArray(loanParties) ? loanParties : [], [loanParties]);
  const safeLoanRecords = useMemo(() => Array.isArray(loanRecords) ? loanRecords : [], [loanRecords]);
  const safeAccounts = useMemo(() => Array.isArray(accounts) ? accounts : [], [accounts]);
  const safePaymentMethods = useMemo(() => Array.isArray(paymentMethods) ? paymentMethods : [], [paymentMethods]);

  // Summary figures with safe defaults
  const totalLoanPayable = useMemo(
    () => safeLoanParties.reduce((sum, p) => sum + (p?.currentPayable || 0), 0),
    [safeLoanParties]
  );

  const totalLoanReceivable = useMemo(
    () => safeLoanParties.reduce((sum, p) => sum + (p?.currentReceivable || 0), 0),
    [safeLoanParties]
  );

  const totalBorrowedLifetime = useMemo(
    () => safeLoanParties.reduce((sum, p) => sum + (p?.totalBorrowed || 0), 0),
    [safeLoanParties]
  );

  const totalLentLifetime = useMemo(
    () => safeLoanParties.reduce((sum, p) => sum + (p?.totalLent || 0), 0),
    [safeLoanParties]
  );

  // Filtered records
  const filteredRecords = useMemo(() => {
    return safeLoanRecords.filter((rec) => {
      if (!rec) return false;
      if (typeFilter !== 'all' && rec.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (rec.partyName || '').toLowerCase().includes(q);
        const matchVoucher = (rec.voucherNo || '').toLowerCase().includes(q);
        const matchNotes = (rec.notes || '').toLowerCase().includes(q);
        return matchName || matchVoucher || matchNotes;
      }
      return true;
    });
  }, [safeLoanRecords, typeFilter, searchQuery]);

  // Filtered parties
  const filteredParties = useMemo(() => {
    return safeLoanParties.filter((p) => {
      if (!p) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').includes(q);
        const matchCompany = (p.companyName || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchCompany;
      }
      return true;
    });
  }, [safeLoanParties, searchQuery]);

  // Open modal with specific type & party
  const openNewTransaction = (
    type: 'borrow' | 'lend' | 'repay_borrow' | 'collect_lend',
    partyId?: string
  ) => {
    setTxType(type);
    setSelectedPartyId(partyId || safeLoanParties[0]?.id || '');
    setTxAmount(0);
    setTxAccountId(safeAccounts[0]?.id || '');
    setTxPaymentMethodId(safePaymentMethods[0]?.id || '');
    setTxDueDate('');
    setTxNotes('');
    setTxError('');
    setIsNewTxModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId) {
      setTxError(language === 'bn' ? 'দয়া করে লোন পার্টনার / ব্যক্তি নির্বাচন করুন।' : 'Please select a loan party.');
      return;
    }
    if (txAmount <= 0) {
      setTxError(language === 'bn' ? 'সঠিক টাকার পরিমাণ দিন।' : 'Please enter a valid amount.');
      return;
    }
    if (!txAccountId) {
      setTxError(language === 'bn' ? 'টাকা আদান-প্রদানের একাউন্ট নির্বাচন করুন।' : 'Please select an account.');
      return;
    }

    const party = safeLoanParties.find((p) => p && p.id === selectedPartyId);
    if (!party) {
      setTxError('Selected party not found');
      return;
    }

    // Validation for repayment / collection
    if (txType === 'repay_borrow' && txAmount > party.currentPayable) {
      setTxError(
        language === 'bn'
          ? `পরিশোধের পরিমাণ বর্তমান দেনার (${formatBDT(party.currentPayable)}) চেয়ে বেশি হতে পারে না!`
          : `Repayment amount cannot exceed current payable (${formatBDT(party.currentPayable)})!`
      );
      return;
    }

    if (txType === 'collect_lend' && txAmount > party.currentReceivable) {
      setTxError(
        language === 'bn'
          ? `আদায়ের পরিমাণ বর্তমান পাওনার (${formatBDT(party.currentReceivable)}) চেয়ে বেশি হতে পারে না!`
          : `Collection amount cannot exceed current receivable (${formatBDT(party.currentReceivable)})!`
      );
      return;
    }

    recordLoanTransaction({
      type: txType,
      partyId: party.id,
      partyName: party.name,
      partyType: party.entityType,
      amount: txAmount,
      accountId: txAccountId,
      paymentMethodId: txPaymentMethodId,
      dueDate: txDueDate || undefined,
      notes: txNotes || undefined,
    });

    setIsNewTxModalOpen(false);
  };

  const handleSaveParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      setPartyError(language === 'bn' ? 'পার্টনার বা ব্যক্তির নাম আবশ্যক।' : 'Party name is required.');
      return;
    }
    if (!partyPhone.trim()) {
      setPartyError(language === 'bn' ? 'মোবাইল নম্বর দিন।' : 'Phone number is required.');
      return;
    }

    const created = addLoanParty({
      name: partyName.trim(),
      phone: partyPhone.trim(),
      entityType: partyType,
      companyName: partyCompany.trim() || undefined,
      address: partyAddress.trim() || undefined,
      notes: partyNotes.trim() || undefined,
    });

    setPartyName('');
    setPartyPhone('');
    setPartyType('person');
    setPartyCompany('');
    setPartyAddress('');
    setPartyNotes('');
    setPartyError('');
    setIsAddPartyModalOpen(false);

    // Auto select newly created party
    setSelectedPartyId(created.id);
  };

  const handleExportCSV = () => {
    if (subTab === 'records') {
      const rows = [
        ['Voucher No', 'Date', 'Type', 'Party Name', 'Amount (BDT)', 'Account', 'Due Date', 'Notes'],
        ...filteredRecords.map((r) => [
          r.voucherNo,
          formatDate(r.date),
          r.type,
          r.partyName,
          r.amount,
          r.accountName,
          r.dueDate ? formatDate(r.dueDate) : '',
          r.notes || '',
        ]),
      ];
      exportToCSV(`RM_Loans_Transactions_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } else {
      const rows = [
        ['Name', 'Type', 'Phone', 'Company', 'Current Payable (BDT)', 'Current Receivable (BDT)', 'Total Borrowed', 'Total Lent'],
        ...filteredParties.map((p) => [
          p.name,
          p.entityType,
          p.phone,
          p.companyName || '',
          p.currentPayable,
          p.currentReceivable,
          p.totalBorrowed,
          p.totalLent,
        ]),
      ];
      exportToCSV(`RM_Loan_Parties_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }
  };

  const handleSendReminderWhatsApp = (partyOrRecord: { name?: string; partyName?: string; phone?: string; currentPayable?: number; currentReceivable?: number; amount?: number; type?: string; companyName?: string }) => {
    const rawPhone = partyOrRecord.phone || '';
    const phone = sanitizePhoneNumber(rawPhone);
    if (!phone) {
      alert(language === 'bn' ? 'কোনো সঠিক মোবাইল বা হোয়াটসঅ্যাপ নম্বর পাওয়া যায়নি।' : 'No valid WhatsApp phone number found.');
      return;
    }

    const name = partyOrRecord.name || partyOrRecord.partyName || 'সম্মানিত গ্রাহক';
    const payable = partyOrRecord.currentPayable ?? (partyOrRecord.type === 'borrow' ? partyOrRecord.amount : 0) ?? 0;
    const receivable = partyOrRecord.currentReceivable ?? (partyOrRecord.type === 'lend' ? partyOrRecord.amount : 0) ?? 0;

    let text = '';
    if (receivable > 0) {
      text = `আসসালামু আলাইকুম ${name} সাহেব, ${businessProfile.businessName} হতে বিনীতভাবে জানানো যাচ্ছে যে, আপনার কাছে আমাদের প্রদত্ত ধার/হাওলাত বাবদ ${formatBDT(receivable)} পাওনা রয়েছে। অনুগ্রহপূর্বক পরিশোধের সম্ভাব্য তারিখ জানিয়ে সহযোগিতা করার অনুরোধ রইল। ধন্যবাদ। যোগাযোগ: ${businessProfile.phone}`;
    } else if (payable > 0) {
      text = `সম্মানিত ${name} (${partyOrRecord.companyName || 'ঋণদাতা'}), ${businessProfile.businessName} থেকে জানানো যাচ্ছে যে, আপনাদের নিকট আমাদের গৃহীত লোন/ধারের অবশিষ্ট দেনা ${formatBDT(payable)}। আমরা দ্রুত পরিশোধের ব্যবস্থা নিচ্ছি। যোগাযোগ: ${businessProfile.phone}`;
    } else {
      text = `আসসালামু আলাইকুম ${name} সাহেব, ${businessProfile.businessName} থেকে যোগাযোগ করা হচ্ছে। আপনার সাথে আমাদের বর্তমান লোন/হাওলাত হিসাব সম্পূর্ণ নিষ্পন্ন রয়েছে। ধন্যবাদ।`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getPartyDueDate = (partyId: string) => {
    const reminder = dueReminders?.find((r) => r.partyId === partyId);
    if (reminder?.dueDate) return reminder.dueDate;
    const withDueDate = safeLoanRecords.filter((r) => r.partyId === partyId && r.dueDate);
    if (withDueDate.length > 0) {
      return withDueDate[withDueDate.length - 1].dueDate;
    }
    return undefined;
  };

  const getPartyDueStatus = (dueDate?: string) => {
    if (!dueDate) return 'NO_DATE';
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dueDate < todayStr) return 'OVERDUE';
    if (dueDate === todayStr) return 'DUE_TODAY';
    return 'UPCOMING';
  };

  const getEntityBadge = (type: LoanEntityType) => {
    switch (type) {
      case 'bank':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">ব্যাংক (Bank)</span>;
      case 'cooperative':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">সমিতি (Co-op)</span>;
      case 'person':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">ব্যক্তি / বন্ধু (Person)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">অন্যান্য (Other)</span>;
    }
  };

  const getTxTypeBadge = (type: LoanRecord['type']) => {
    switch (type) {
      case 'borrow':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 w-fit">
            <ArrowDownLeft className="w-3 h-3 text-rose-600" />
            <span>{language === 'bn' ? 'ঋণ গ্রহণ (Loan In)' : 'Borrow (In)'}</span>
          </span>
        );
      case 'lend':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-fit">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            <span>{language === 'bn' ? 'ধার প্রদান (Loan Out)' : 'Lend (Out)'}</span>
          </span>
        );
      case 'repay_borrow':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>{language === 'bn' ? 'ঋণ পরিশোধ (Repay)' : 'Repaid'}</span>
          </span>
        );
      case 'collect_lend':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 flex items-center gap-1 w-fit">
            <Coins className="w-3 h-3 text-teal-600" />
            <span>{language === 'bn' ? 'ধার আদায় (Collected)' : 'Collected'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Emergency Quick Action Bar (Borrow In, Lend Out, New Party) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl shadow-md border border-slate-700/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 border border-amber-500/30">
            ⚡
          </div>
          <div>
            <h3 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
              <span>{language === 'bn' ? 'জরুরি লোন অ্যাকশন' : 'Quick Loan Actions'}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-normal">Top Priority</span>
            </h3>
            <p className="text-[10px] text-slate-300">
              {language === 'bn' ? 'তাৎক্ষণিক ঋণ গ্রহণ, ধার প্রদান বা নতুন লোন পার্টনার এন্ট্রি' : 'Instant Borrow In, Lend Out, or New Loan Party'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setManualLoanInitialType('borrow');
              setIsManualLoanModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-sm active:scale-95 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{language === 'bn' ? '+ ঋণ গ্রহণ (Borrow In)' : '+ Borrow (In)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setManualLoanInitialType('lend');
              setIsManualLoanModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm active:scale-95 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{language === 'bn' ? '+ ধার প্রদান (Lend Out)' : '+ Lend (Out)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddPartyModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? '+ নতুন পার্টনার (New Party)' : '+ New Party'}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards for Loans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Payable Loan (Current Debt) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'bn' ? 'বর্তমান ঋণ দেনা (Payable)' : 'Current Loan Debt (Payable)'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-2">
            {formatBDT(totalLoanPayable)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'bn' ? `মোট গৃহীত ঋণ: ${formatBDT(totalBorrowedLifetime)}` : `Lifetime Borrowed: ${formatBDT(totalBorrowedLifetime)}`}
          </div>
        </div>

        {/* Receivable Loan (Current Lent) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'bn' ? 'প্রদত্ত ধার পাওনা (Receivable)' : 'Current Lent Due (Receivable)'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-2">
            {formatBDT(totalLoanReceivable)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'bn' ? `মোট প্রদত্ত ধার: ${formatBDT(totalLentLifetime)}` : `Lifetime Lent: ${formatBDT(totalLentLifetime)}`}
          </div>
        </div>

        {/* Total Loan Parties */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'bn' ? 'লোন পার্টনার / ব্যক্তি' : 'Loan Parties & Agents'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight mt-2">
            {safeLoanParties.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'bn' ? 'ব্যাংক, সমবায় সমিতি ও ব্যক্তিগত ঋণদাতা' : 'Banks, Cooperatives & Personal lenders'}
          </div>
        </div>

        {/* Total Transactions */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'bn' ? 'মোট লেনদেন ভাউচার' : 'Total Vouchers Recorded'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight mt-2">
            {safeLoanRecords.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'bn' ? 'সকল ঋণ গ্রহণ, প্রদান ও কিস্তি রেকর্ড' : 'All loan inflows, outflows & installments'}
          </div>
        </div>
      </div>

      {/* Control Bar: Sub-tabs, Actions, Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Left Sub-tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setSubTab('records')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'records'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {language === 'bn' ? 'লেনদেন ভাউচার (Transactions)' : 'Transactions'} ({safeLoanRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('parties')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'parties'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {language === 'bn' ? 'পার্টনার তালিকা (Parties)' : 'Loan Parties'} ({safeLoanParties.length})
          </button>
        </div>

        {/* Center / Right: Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setManualLoanInitialType('borrow');
              setIsManualLoanModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? '+ ঋণ গ্রহণ (Loan In)' : '+ Borrow (In)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setManualLoanInitialType('lend');
              setIsManualLoanModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? '+ ধার প্রদান (Loan Out)' : '+ Lend (Out)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddPartyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === 'bn' ? '+ নতুন পার্টনার' : '+ New Party'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'bn' ? 'নাম, ভাউচার নম্বর বা ফোন লিখুন...' : 'Search by name, voucher, phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
          />
        </div>

        {subTab === 'records' && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                typeFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {language === 'bn' ? 'সব' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('borrow')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                typeFilter === 'borrow' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {language === 'bn' ? 'ঋণ গ্রহণ' : 'Borrowed'}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('lend')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                typeFilter === 'lend' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {language === 'bn' ? 'ধার প্রদান' : 'Lent'}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('repay_borrow')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                typeFilter === 'repay_borrow' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {language === 'bn' ? 'পরিশোধিত' : 'Repaid'}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('collect_lend')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                typeFilter === 'collect_lend' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {language === 'bn' ? 'আদায়কৃত' : 'Collected'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Table or Cards */}
      {subTab === 'records' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {language === 'bn' ? 'কোনো লোন লেনদেন রেকর্ড পাওয়া যায়নি।' : 'No loan transaction vouchers found.'}
            </div>
          ) : (
            <>
              {/* Mobile & Tablet Card List View (xl:hidden) */}
              <div className="xl:hidden p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRecords.map((r) => {
                  const party = safeLoanParties.find((p) => p && p.id === r.partyId);
                  const phone = party?.phone || '';
                  const dueStatus = getPartyDueStatus(r.dueDate);

                  return (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      {/* Card Header: Type badge & Status */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          {getTxTypeBadge(r.type)}
                          <span className="font-mono text-[10px] text-slate-400">
                            {r.voucherNo}
                          </span>
                        </div>

                        {dueStatus === 'OVERDUE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Overdue</span>
                          </span>
                        )}
                        {dueStatus === 'DUE_TODAY' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Clock className="w-3 h-3" />
                            <span>Due Today</span>
                          </span>
                        )}
                        {dueStatus === 'UPCOMING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            <span>Upcoming</span>
                          </span>
                        )}
                        {dueStatus === 'NO_DATE' && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(r.date)}
                          </span>
                        )}
                      </div>

                      {/* Party details & Phone */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{r.partyName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            {getEntityBadge(r.partyType)}
                            <span>•</span>
                            <span className="text-slate-500 font-medium">{r.accountName}</span>
                          </div>
                        </div>

                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-xs shrink-0"
                          >
                            <Phone className="w-3.5 h-3.5 text-amber-500" />
                            <span>{phone}</span>
                          </a>
                        )}
                      </div>

                      {/* Amount and Due Date Box */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {r.type === 'borrow' || r.type === 'collect_lend'
                              ? (language === 'bn' ? 'টাকা গ্রহণ (In)' : 'Cash In')
                              : (language === 'bn' ? 'টাকা প্রদান (Out)' : 'Cash Out')}
                          </span>
                          <span
                            className={`text-base font-black ${
                              r.type === 'borrow' || r.type === 'collect_lend'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {r.type === 'borrow' || r.type === 'collect_lend' ? '+' : '-'} {formatBDT(r.amount)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {language === 'bn' ? 'তাগাদা / মেয়াদ' : 'Due Date'}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {r.dueDate ? formatDate(r.dueDate) : 'Open'}
                          </span>
                        </div>
                      </div>

                      {r.notes && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg truncate">
                          {r.notes}
                        </div>
                      )}

                      {/* Action Buttons: WhatsApp, View Details, Transact */}
                      <div className="pt-1 flex items-center justify-between gap-2">
                        {phone && (
                          <button
                            type="button"
                            onClick={() => handleSendReminderWhatsApp({ ...r, phone, name: r.partyName })}
                            className="flex-1 py-1.5 px-2 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'তাগাদা' : 'WhatsApp'}</span>
                          </button>
                        )}

                        {party && (
                          <button
                            type="button"
                            onClick={() => setSelectedPartyForLedger(party)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View Ledger"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {r.isInstallment && r.schedule && r.schedule.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedRecordForInstallments(r)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all text-center"
                          >
                            {language === 'bn' ? 'কিস্তি শিডিউল' : 'Installments'}
                          </button>
                        ) : r.type === 'borrow' ? (
                          <button
                            type="button"
                            onClick={() => openNewTransaction('repay_borrow', r.partyId)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-xs active:scale-95 transition-all text-center"
                          >
                            {language === 'bn' ? 'দেনা শোধ' : 'Pay Bill'}
                          </button>
                        ) : r.type === 'lend' ? (
                          <button
                            type="button"
                            onClick={() => openNewTransaction('collect_lend', r.partyId)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs active:scale-95 transition-all text-center"
                          >
                            {language === 'bn' ? 'টাকা আদায়' : 'Collect'}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold px-2">
                            ✓ {language === 'bn' ? 'নিষ্পন্ন' : 'Settled'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (hidden xl:block) */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">ভাউচার / তারিখ</th>
                    <th className="p-3">পার্টনার / ব্যক্তি</th>
                    <th className="p-3">ধরণ</th>
                    <th className="p-3 text-right">টাকার পরিমাণ (৳)</th>
                    <th className="p-3">উৎস/জমা একাউন্ট</th>
                    <th className="p-3">মেয়াদ / মন্তব্য</th>
                    <th className="p-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredRecords.map((r) => {
                    const party = safeLoanParties.find((p) => p && p.id === r.partyId);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">{r.voucherNo}</div>
                          <div className="text-[10px] text-slate-400">{formatDate(r.date)}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{r.partyName}</div>
                          <div className="text-[10px] text-slate-400">{getEntityBadge(r.partyType)}</div>
                        </td>
                        <td className="p-3">{getTxTypeBadge(r.type)}</td>
                        <td className="p-3 text-right font-black text-sm">
                          <span
                            className={
                              r.type === 'borrow' || r.type === 'collect_lend'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {r.type === 'borrow' || r.type === 'collect_lend' ? '+' : '-'} {formatBDT(r.amount)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{r.accountName}</div>
                        </td>
                        <td className="p-3 text-slate-500">
                          {r.dueDate && (
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(r.dueDate)}</span>
                            </div>
                          )}
                          <div className="text-[11px] truncate max-w-xs">{r.notes || '—'}</div>
                          {r.isInstallment && r.schedule && r.schedule.length > 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {r.schedule.filter((s) => s.isPaid).length}/{r.schedule.length} কিস্তি পরিশোধিত
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {party && (
                              <button
                                type="button"
                                onClick={() => setSelectedPartyForLedger(party)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                title="View Details / Ledger"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {r.isInstallment && r.schedule && r.schedule.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setSelectedRecordForInstallments(r)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all"
                              >
                                {language === 'bn' ? 'কিস্তি শিডিউল' : 'Installments'}
                              </button>
                            ) : r.type === 'borrow' ? (
                              <button
                                type="button"
                                onClick={() => openNewTransaction('repay_borrow', r.partyId)}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all"
                              >
                                {language === 'bn' ? 'দেনা শোধ' : 'Repay'}
                              </button>
                            ) : r.type === 'lend' ? (
                              <button
                                type="button"
                                onClick={() => openNewTransaction('collect_lend', r.partyId)}
                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all"
                              >
                                {language === 'bn' ? 'ধার আদায়' : 'Collect'}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">
                                {language === 'bn' ? 'নিষ্পন্ন' : 'Settled'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>
      ) : (
        /* Loan Parties Directory - Styled Identical to Receivables & Payables */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredParties.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              {language === 'bn' ? 'কোনো লোন পার্টনার পাওয়া যায়নি।' : 'No loan parties found.'}
            </div>
          ) : (
            filteredParties.map((p) => {
              const dueDate = getPartyDueDate(p.id);
              const dueStatus = getPartyDueStatus(dueDate);

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 space-y-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Card Header: Type badge & Status */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getEntityBadge(p.entityType)}
                        {p.currentPayable > 0 && p.currentReceivable === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <Landmark className="w-3 h-3" />
                            <span>{language === 'bn' ? 'ঋণ দেনা' : 'Payable'}</span>
                          </span>
                        )}
                        {p.currentReceivable > 0 && p.currentPayable === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            <Coins className="w-3 h-3" />
                            <span>{language === 'bn' ? 'ধার পাওনা' : 'Receivable'}</span>
                          </span>
                        )}
                        {p.currentPayable === 0 && p.currentReceivable === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>{language === 'bn' ? 'নিষ্পন্ন' : 'Settled'}</span>
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      {dueStatus === 'OVERDUE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue</span>
                        </span>
                      )}
                      {dueStatus === 'DUE_TODAY' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>Due Today</span>
                        </span>
                      )}
                      {dueStatus === 'UPCOMING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          <span>Upcoming</span>
                        </span>
                      )}
                      {dueStatus === 'NO_DATE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <span>Open Terms</span>
                        </span>
                      )}
                    </div>

                    {/* Party Details & Contact */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {p.name}
                        </h4>
                        {p.companyName && (
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{p.companyName}</span>
                          </div>
                        )}
                        {p.address && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                            {p.address}
                          </div>
                        )}
                      </div>

                      {p.phone && (
                        <a
                          href={`tel:${p.phone}`}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-xs shrink-0"
                          title="Call Phone"
                        >
                          <Phone className="w-3.5 h-3.5 text-amber-500" />
                          <span>{p.phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Amount & Due Date Banner */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          {p.currentReceivable > 0
                            ? (language === 'bn' ? 'বকেয়া পাওনা (ধার)' : 'Lent Receivable')
                            : p.currentPayable > 0
                            ? (language === 'bn' ? 'প্রদেয় দেনা (লোন)' : 'Loan Payable')
                            : (language === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Current Balance')}
                        </span>
                        <span
                          className={`text-base font-black ${
                            p.currentReceivable > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : p.currentPayable > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {p.currentReceivable > 0
                            ? formatBDT(p.currentReceivable)
                            : p.currentPayable > 0
                            ? formatBDT(p.currentPayable)
                            : '৳ 0'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          {language === 'bn' ? 'তাগাদা / মেয়াদ' : 'Due Date'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {dueDate ? formatDate(dueDate) : 'Open'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: WhatsApp, View Details, Transact */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {p.phone && (
                      <button
                        type="button"
                        onClick={() => handleSendReminderWhatsApp(p)}
                        className="flex-1 py-1.5 px-2 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        title="Send WhatsApp Reminder"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'তাগাদা মেসেজ' : 'WhatsApp'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPartyForLedger(p)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={language === 'bn' ? 'লেজার ও বিস্তারিত দেখুন' : 'View Ledger'}
                    >
                      <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>

                    {p.currentPayable > 0 && (
                      <button
                        type="button"
                        onClick={() => openNewTransaction('repay_borrow', p.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-sm active:scale-95 transition-all text-center"
                      >
                        {language === 'bn' ? 'দেনা পরিশোধ' : 'Pay Bill'}
                      </button>
                    )}

                    {p.currentReceivable > 0 && (
                      <button
                        type="button"
                        onClick={() => openNewTransaction('collect_lend', p.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm active:scale-95 transition-all text-center"
                      >
                        {language === 'bn' ? 'টাকা আদায়' : 'Collect'}
                      </button>
                    )}

                    {p.currentPayable === 0 && p.currentReceivable === 0 && (
                      <button
                        type="button"
                        onClick={() => openNewTransaction('borrow', p.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-sm active:scale-95 transition-all text-center"
                      >
                        {language === 'bn' ? '+ লেনদেন' : '+ Entry'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Record Loan Transaction Modal */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    txType === 'borrow'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                      : txType === 'lend'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                      : txType === 'repay_borrow'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                      : 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    {txType === 'borrow' && (language === 'bn' ? 'নতুন ঋণ / ধার গ্রহণ (Loan In)' : 'Borrow Loan (Cash In)')}
                    {txType === 'lend' && (language === 'bn' ? 'ধার / হাওলাত প্রদান (Loan Out)' : 'Lend Money (Cash Out)')}
                    {txType === 'repay_borrow' && (language === 'bn' ? 'গৃহীত ঋণের কিস্তি / পরিশোধ (Repay)' : 'Repay Borrowed Loan')}
                    {txType === 'collect_lend' && (language === 'bn' ? 'প্রদত্ত ধারের টাকা আদায় (Collect)' : 'Collect Lent Money')}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {language === 'bn' ? 'অ্যাকাউন্টে স্বয়ংক্রিয় ব্যালেন্স সমন্বয় হবে' : 'Accounts will be automatically adjusted'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTxModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-4 space-y-3.5 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setTxType('borrow')}
                  className={`py-1.5 rounded-lg font-bold text-center transition-all ${
                    txType === 'borrow'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {language === 'bn' ? 'ঋণ গ্রহণ (In)' : 'Borrow (In)'}
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('lend')}
                  className={`py-1.5 rounded-lg font-bold text-center transition-all ${
                    txType === 'lend'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {language === 'bn' ? 'ধার প্রদান (Out)' : 'Lend (Out)'}
                </button>
              </div>

              {/* Loan Party Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {language === 'bn' ? 'পার্টনার / ব্যক্তি নির্বাচন *' : 'Select Party / Person *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewTxModalOpen(false);
                      setIsAddPartyModalOpen(true);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    + {language === 'bn' ? 'নতুন ব্যক্তি' : 'New Party'}
                  </button>
                </div>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                >
                  {safeLoanParties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.companyName ? `(${p.companyName})` : ''} - {p.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Amount (BDT) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={txAmount || ''}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-base focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Account and Payment Method Auto-linked */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'পরিশোধের মাধ্যম' : 'Payment Method'}
                  </label>
                  <select
                    value={txPaymentMethodId}
                    onChange={(e) => {
                      const newPm = e.target.value;
                      setTxPaymentMethodId(newPm);
                      const matchedAcc = getMatchingAccountForPaymentMethod(newPm, paymentMethods, accounts);
                      if (matchedAcc) setTxAccountId(matchedAcc);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {language === 'bn' ? (pm.nameBn || pm.name) : pm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'একাউন্ট (জমা/উৎস)' : 'Account'}
                  </label>
                  <select
                    value={txAccountId}
                    onChange={(e) => {
                      const newAcc = e.target.value;
                      setTxAccountId(newAcc);
                      const matchedPm = getMatchingPaymentMethodForAccount(newAcc, accounts, paymentMethods);
                      if (matchedPm) setTxPaymentMethodId(matchedPm);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatBDT(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'ফেরতের সম্ভাব্য তারিখ (ঐচ্ছিক)' : 'Due / Return Date (Optional)'}
                </label>
                <input
                  type="date"
                  value={txDueDate}
                  onChange={(e) => setTxDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'মন্তব্য বা শর্তাদি' : 'Notes / Remarks'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'যেমন: ৩ কিস্তিতে পরিশোধযোগ্য / জরুরি চেক...' : 'e.g. 3 installments, urgent cheque...'}
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {txError && (
                <div className="p-2 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{txError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-md hover:opacity-90 transition-all"
                >
                  {language === 'bn' ? 'সংরক্ষণ করুন' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Loan Party Modal */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {language === 'bn' ? 'নতুন লোন পার্টনার / ঋণদাতা যোগ করুন' : 'Add New Loan Party / Lender'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'ব্যক্তি বা প্রতিষ্ঠানের নাম *' : 'Name / Entity *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'bn' ? 'যেমন: হাজী মো. রফিক উল্লাহ / প্রাইম ব্যাংক' : 'e.g. Haji Rafiq / Prime Bank'}
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="017XXXXXXXX"
                    value={partyPhone}
                    onChange={(e) => setPartyPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ধরণ (Type)' : 'Entity Type'}
                  </label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as LoanEntityType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="person">{language === 'bn' ? 'ব্যক্তিগত / বন্ধু' : 'Person'}</option>
                    <option value="bank">{language === 'bn' ? 'ব্যাংক' : 'Bank'}</option>
                    <option value="cooperative">{language === 'bn' ? 'সমবায় সমিতি' : 'Cooperative'}</option>
                    <option value="other">{language === 'bn' ? 'অন্যান্য' : 'Other'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'প্রতিষ্ঠানের নাম (যদি থাকে)' : 'Company Name (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'যেমন: উত্তরা ট্রেডার্স' : 'e.g. Uttara Traders'}
                  value={partyCompany}
                  onChange={(e) => setPartyCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'ঠিকানা' : 'Address'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'দোকান বা বাড়ির ঠিকানা...' : 'Shop or office address...'}
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'মন্তব্য' : 'Notes'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'বিশেষ কোনো তথ্য...' : 'Additional notes...'}
                  value={partyNotes}
                  onChange={(e) => setPartyNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {partyError && (
                <div className="p-2 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{partyError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-black shadow-md hover:bg-blue-500 transition-all"
                >
                  {language === 'bn' ? 'পার্টনার যোগ করুন' : 'Save Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Installment Schedule & Payment Modal */}
      {selectedRecordForInstallments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {language === 'bn' ? 'কিস্তি তালিকা ও পরিশোধ' : 'Installment Schedule & Payments'}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {selectedRecordForInstallments.partyName} • {selectedRecordForInstallments.voucherNo}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRecordForInstallments(null);
                  setPayingInstallmentItem(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Summary details */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">{language === 'bn' ? 'মোট লোন' : 'Total Amount'}</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {formatBDT(selectedRecordForInstallments.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{language === 'bn' ? 'পরিশোধিত' : 'Paid'}</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatBDT(
                      (selectedRecordForInstallments.schedule || [])
                        .filter((s) => s.isPaid)
                        .reduce((sum, s) => sum + s.amount, 0)
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{language === 'bn' ? 'অবশিষ্ট বকেয়া' : 'Remaining'}</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    {formatBDT(
                      (selectedRecordForInstallments.schedule || [])
                        .filter((s) => !s.isPaid)
                        .reduce((sum, s) => sum + s.amount, 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Paying Installment Form if an item is selected */}
              {payingInstallmentItem && (
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                      {language === 'bn' ? `কিস্তি #${payingInstallmentItem.installmentNo} পরিশোধ` : `Pay Installment #${payingInstallmentItem.installmentNo}`}
                    </span>
                    <span className="font-black text-indigo-700 dark:text-indigo-300 text-base">
                      {formatBDT(payingInstallmentItem.amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}
                      </label>
                      <select
                        value={installmentPayMethodId}
                        onChange={(e) => {
                          const mId = e.target.value;
                          setInstallmentPayMethodId(mId);
                          const linked = getMatchingAccountForPaymentMethod(mId, paymentMethods, accounts);
                          if (linked) setInstallmentPayAccountId(linked);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {language === 'bn' ? 'টাকা প্রদানের একাউন্ট' : 'Account'}
                      </label>
                      <select
                        value={installmentPayAccountId}
                        onChange={(e) => {
                          const aId = e.target.value;
                          setInstallmentPayAccountId(aId);
                          const linkedM = getMatchingPaymentMethodForAccount(aId, accounts, paymentMethods);
                          if (linkedM) setInstallmentPayMethodId(linkedM);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatBDT(a.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPayingInstallmentItem(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                    >
                      {language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const success = payLoanInstallment(
                          selectedRecordForInstallments.id,
                          payingInstallmentItem.installmentNo,
                          installmentPayAccountId,
                          installmentPayMethodId,
                          installmentPayNotes
                        );
                        if (success) {
                          // Refresh selected record
                          const updated = safeLoanRecords.find((r) => r && r.id === selectedRecordForInstallments.id);
                          if (updated) setSelectedRecordForInstallments(updated);
                          setPayingInstallmentItem(null);
                        }
                      }}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all active:scale-95"
                    >
                      {language === 'bn' ? 'পরিশোধ নিশ্চিত করুন' : 'Confirm Payment'}
                    </button>
                  </div>
                </div>
              )}

              {/* Installments table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">কিস্তি নং</th>
                      <th className="p-2.5">নির্ধারিত তারিখ</th>
                      <th className="p-2.5 text-right">পরিমাণ (৳)</th>
                      <th className="p-2.5 text-center">স্ট্যাটাস</th>
                      <th className="p-2.5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(selectedRecordForInstallments.schedule || []).map((item) => (
                      <tr key={item.installmentNo} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          #{item.installmentNo}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">
                          {formatDate(item.dueDate)}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900 dark:text-white">
                          {formatBDT(item.amount)}
                        </td>
                        <td className="p-2.5 text-center">
                          {item.isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{language === 'bn' ? 'পরিশোধিত' : 'Paid'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <Clock className="w-3 h-3" />
                              <span>{language === 'bn' ? 'বকেয়া' : 'Pending'}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          {item.isPaid ? (
                            <span className="text-[10px] text-slate-400">
                              {item.paidDate ? formatDate(item.paidDate) : '—'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPayingInstallmentItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all"
                            >
                              {selectedRecordForInstallments.type === 'borrow'
                                ? (language === 'bn' ? 'কিস্তি দিন' : 'Pay')
                                : (language === 'bn' ? 'কিস্তি আদায়' : 'Collect')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Party Ledger & Details Modal */}
      <LoanPartyLedgerModal
        party={selectedPartyForLedger}
        onClose={() => setSelectedPartyForLedger(null)}
        onOpenTransaction={(type, partyId) => openNewTransaction(type, partyId)}
        onOpenInstallmentSchedule={(record) => setSelectedRecordForInstallments(record)}
      />

      {/* Manual Loan / Hawlat Modal */}
      <ManualLoanModal
        isOpen={isManualLoanModalOpen}
        onClose={() => setIsManualLoanModalOpen(false)}
        initialType={manualLoanInitialType}
      />
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LoanErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LoanManagementView caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            লোন ডিরেক্টরি লোড করতে সমস্যা হয়েছে
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            ডাটার সাময়িক অসামঞ্জস্যতার কারণে পেজটি রেন্ডার হতে পারেনি। নিচের বাটনে ক্লিক করে পুনরায় চেষ্টা করুন।
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs"
            >
              পুনরায় চেষ্টা করুন (Retry)
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              পেজ রিলোড করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const LoanManagementView: React.FC = () => {
  return (
    <LoanErrorBoundary>
      <LoanManagementViewInner />
    </LoanErrorBoundary>
  );
};
