import React, { useState, useMemo } from 'react';
import {
  X,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Building2,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  Wallet,
  Clock,
  Plus,
  AlertCircle,
  CreditCard,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  LoanParty,
  LoanEntityType,
  InstallmentFrequency,
  InstallmentScheduleItem,
} from '../../types';
import { formatBDT } from '../../utils/formatters';
import {
  getMatchingAccountForPaymentMethod,
  getMatchingPaymentMethodForAccount,
} from '../../utils/paymentAccountLink';

interface ManualLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'borrow' | 'lend';
}

export const ManualLoanModal: React.FC<ManualLoanModalProps> = ({
  isOpen,
  onClose,
  initialType = 'borrow',
}) => {
  const {
    loanParties,
    addLoanParty,
    customers,
    suppliers,
    accounts,
    paymentMethods,
    recordLoanTransaction,
    language,
  } = useApp();

  // Transaction direction: 'borrow' (লোন নিন) or 'lend' (ধার দিন)
  const [txType, setTxType] = useState<'borrow' | 'lend'>(initialType);

  // Party selector category: 'loan_account' | 'supplier' | 'customer'
  const [partyCategory, setPartyCategory] = useState<'loan_account' | 'supplier' | 'customer'>('loan_account');

  // Search queries for each category
  const [loanSearch, setLoanSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Selected party ID
  const [selectedPartyId, setSelectedPartyId] = useState('');

  // Inline Quick Add for New Loan Account (Bank / Samity / Person)
  const [showAddLoanAccount, setShowAddLoanAccount] = useState(false);
  const [newLoanName, setNewLoanName] = useState('');
  const [newLoanType, setNewLoanType] = useState<LoanEntityType>('bank');
  const [newLoanPhone, setNewLoanPhone] = useState('');
  const [newLoanCompany, setNewLoanCompany] = useState('');
  const [newLoanAddress, setNewLoanAddress] = useState('');

  // Transaction Financials
  const [amount, setAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Installment configuration (User explicitly requested!)
  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [installmentFrequency, setInstallmentFrequency] = useState<InstallmentFrequency>('monthly');
  const [totalInstallments, setTotalInstallments] = useState<number>(12);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  // Sync Payment Method and Account
  const handleAccountChange = (accId: string) => {
    setAccountId(accId);
    const matchedPmId = getMatchingPaymentMethodForAccount(accId, accounts, paymentMethods);
    if (matchedPmId) {
      setPaymentMethodId(matchedPmId);
    }
  };

  const handlePaymentMethodChange = (pmId: string) => {
    setPaymentMethodId(pmId);
    const matchedAccId = getMatchingAccountForPaymentMethod(pmId, paymentMethods, accounts);
    if (matchedAccId) {
      setAccountId(matchedAccId);
    }
  };

  const safeLoanParties = useMemo(() => Array.isArray(loanParties) ? loanParties : [], [loanParties]);
  const safeSuppliers = useMemo(() => Array.isArray(suppliers) ? suppliers : [], [suppliers]);
  const safeCustomers = useMemo(() => Array.isArray(customers) ? customers : [], [customers]);

  // Filtered lists based on search
  const filteredLoanParties = useMemo(() => {
    const q = loanSearch.toLowerCase().trim();
    if (!q) return safeLoanParties;
    return safeLoanParties.filter(
      (p) =>
        (p?.name || '').toLowerCase().includes(q) ||
        (p?.phone && p.phone.includes(q)) ||
        (p?.companyName && p.companyName.toLowerCase().includes(q))
    );
  }, [safeLoanParties, loanSearch]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) return safeSuppliers;
    return safeSuppliers.filter(
      (s) =>
        (s?.name || '').toLowerCase().includes(q) ||
        (s?.phone && s.phone.includes(q)) ||
        (s?.companyName && s.companyName.toLowerCase().includes(q))
    );
  }, [safeSuppliers, supplierSearch]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return safeCustomers.filter((c) => c?.id !== 'walk-in');
    return safeCustomers.filter(
      (c) =>
        c?.id !== 'walk-in' &&
        ((c?.name || '').toLowerCase().includes(q) || (c?.phone && c.phone.includes(q)))
    );
  }, [safeCustomers, customerSearch]);

  // Selected party entity details
  const selectedPartyInfo = useMemo(() => {
    if (!selectedPartyId) return null;
    if (partyCategory === 'loan_account') {
      const p = safeLoanParties.find((lp) => lp.id === selectedPartyId);
      if (!p) return null;
      return {
        name: p.name || 'Unnamed Party',
        sub: p.companyName || p.phone || '',
        typeLabel: (p.entityType || 'person').toUpperCase(),
        currentPayable: p.currentPayable || 0,
        currentReceivable: p.currentReceivable || 0,
      };
    } else if (partyCategory === 'supplier') {
      const s = safeSuppliers.find((sp) => sp.id === selectedPartyId);
      if (!s) return null;
      return {
        name: s.name || 'Unnamed Supplier',
        sub: s.companyName || s.phone || '',
        typeLabel: 'সাপ্লায়ার (Supplier)',
        currentPayable: s.currentPayable ?? s.currentBalance ?? 0,
        currentReceivable: 0,
      };
    } else {
      const c = safeCustomers.find((cp) => cp.id === selectedPartyId);
      if (!c) return null;
      return {
        name: c.name || 'Unnamed Customer',
        sub: c.phone || '',
        typeLabel: 'কাস্টমার (Customer)',
        currentPayable: 0,
        currentReceivable: c.currentDue || 0,
      };
    }
  }, [selectedPartyId, partyCategory, safeLoanParties, safeSuppliers, safeCustomers]);

  // Dynamic Installment Schedule Generator
  const installmentSchedule = useMemo((): InstallmentScheduleItem[] => {
    if (!isInstallment || amount <= 0 || totalInstallments <= 0) return [];

    const perAmount = Math.round(amount / totalInstallments);
    const schedule: InstallmentScheduleItem[] = [];
    const base = new Date(startDate || Date.now());

    for (let i = 1; i <= totalInstallments; i++) {
      const instDate = new Date(base);
      if (installmentFrequency === 'weekly') {
        instDate.setDate(base.getDate() + (i - 1) * 7);
      } else if (installmentFrequency === 'monthly') {
        instDate.setMonth(base.getMonth() + (i - 1));
      } else if (installmentFrequency === 'semi_annual') {
        instDate.setMonth(base.getMonth() + (i - 1) * 6);
      } else if (installmentFrequency === 'yearly') {
        instDate.setFullYear(base.getFullYear() + (i - 1));
      }

      // Final installment adjusts rounding difference
      const currentInstAmount =
        i === totalInstallments ? amount - perAmount * (totalInstallments - 1) : perAmount;

      schedule.push({
        installmentNo: i,
        dueDate: instDate.toISOString().slice(0, 10),
        amount: currentInstAmount,
        isPaid: false,
      });
    }

    return schedule;
  }, [isInstallment, amount, totalInstallments, installmentFrequency, startDate]);

  // Handle Quick Add Loan Account Submit
  const handleCreateLoanAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoanName.trim()) {
      setErrorMsg(language === 'bn' ? 'অ্যাকাউন্টের নাম লিখুন' : 'Enter account name');
      return;
    }
    const created = addLoanParty({
      name: newLoanName.trim(),
      entityType: newLoanType,
      phone: newLoanPhone.trim(),
      companyName: newLoanCompany.trim(),
      address: newLoanAddress.trim(),
      notes: '',
    });
    setSelectedPartyId(created.id);
    setShowAddLoanAccount(false);
    setNewLoanName('');
    setNewLoanPhone('');
    setNewLoanCompany('');
    setNewLoanAddress('');
    setErrorMsg('');
  };

  // Submit the Loan Transaction
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPartyId) {
      setErrorMsg(
        language === 'bn'
          ? 'অনুগ্রহ করে পার্টি (কাস্টমার / সাপ্লায়ার / লোন অ্যাকাউন্ট) নির্বাচন করুন।'
          : 'Please select a party (Customer / Supplier / Loan Account).'
      );
      return;
    }

    if (amount <= 0 || isNaN(amount)) {
      setErrorMsg(
        language === 'bn' ? 'টাকার পরিমাণ ০ এর বেশি হতে হবে।' : 'Amount must be greater than 0.'
      );
      return;
    }

    if (!accountId) {
      setErrorMsg(language === 'bn' ? 'হিসাব/অ্যাকাউন্ট নির্বাচন করুন।' : 'Select an account.');
      return;
    }

    let partyName = '';
    let partyType: LoanEntityType = 'other';
    let customerId: string | undefined = undefined;
    let supplierId: string | undefined = undefined;
    let loanPartyId: string | undefined = undefined;

    if (partyCategory === 'loan_account') {
      const p = safeLoanParties.find((lp) => lp && lp.id === selectedPartyId);
      if (!p) return;
      partyName = p.name || 'Unnamed Party';
      partyType = p.entityType || 'other';
      loanPartyId = p.id;
    } else if (partyCategory === 'supplier') {
      const s = safeSuppliers.find((sp) => sp && sp.id === selectedPartyId);
      if (!s) return;
      partyName = s.name || 'Unnamed Supplier';
      partyType = 'supplier';
      supplierId = s.id;
    } else {
      const c = safeCustomers.find((cp) => cp && cp.id === selectedPartyId);
      if (!c) return;
      partyName = c.name || 'Unnamed Customer';
      partyType = 'customer';
      customerId = c.id;
    }

    const calculatedDueDate = isInstallment
      ? installmentSchedule[installmentSchedule.length - 1]?.dueDate || dueDate
      : dueDate;

    try {
      recordLoanTransaction({
        type: txType,
        partyId: selectedPartyId,
        partyName,
        partyType,
        customerId,
        supplierId,
        loanPartyId,
        amount,
        accountId,
        paymentMethodId,
        dueDate: calculatedDueDate,
        isInstallment,
        installmentFrequency: isInstallment ? installmentFrequency : undefined,
        totalInstallments: isInstallment ? totalInstallments : undefined,
        perInstallmentAmount: isInstallment && installmentSchedule[0] ? installmentSchedule[0].amount : undefined,
        schedule: isInstallment ? installmentSchedule : undefined,
        notes,
      });

      setSuccessMsg(
        language === 'bn'
          ? `সফলভাবে ${txType === 'borrow' ? 'লোন গ্রহণ' : 'ধার প্রদান'} সম্পন্ন হয়েছে!`
          : `Loan transaction recorded successfully!`
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording transaction');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-2xl ${txType === 'borrow' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
              {txType === 'borrow' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {language === 'bn' ? 'ম্যানুয়াল লোন ও ধার হিসাব (Manual Loan / Hawlat)' : 'Manual Loan & Hawlat Entry'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'bn'
                  ? 'ব্যবসায়িক প্রয়োজনে ব্যাংক, সমিতি, সাপ্লায়ার বা কাস্টমার থেকে লোন নিন বা ধার দিন'
                  : 'Borrow or lend money for business needs with installment schedules'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
          
          {/* Success Message Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Toggle: Borrow In vs Lend Out */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              লেনদেনের দিক নির্বাচন করুন (Transaction Direction):
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTxType('borrow')}
                className={`py-3 px-4 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-black text-xs sm:text-sm transition-all ${
                  txType === 'borrow'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <div>{language === 'bn' ? 'লোন / ধার নিন (Borrow In)' : 'Borrow In (Loan)'}</div>
                  <div className="text-[10px] font-normal text-slate-400">ক্যাশে টাকা ঢুকবে, দেনা বাড়বে</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTxType('lend')}
                className={`py-3 px-4 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-black text-xs sm:text-sm transition-all ${
                  txType === 'lend'
                    ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ArrowUpRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div className="text-left">
                  <div>{language === 'bn' ? 'লোন / ধার দিন (Lend Out)' : 'Lend Out'}</div>
                  <div className="text-[10px] font-normal text-slate-400">ক্যাশ থেকে টাকা বের হবে, পাওনা বাড়বে</div>
                </div>
              </button>
            </div>
          </div>

          {/* Party Selection Checkboxes (User Requested: Checkbox for Customer, Supplier, Loan Account) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                কার কাছ থেকে নিচ্ছেন / কাকে দিচ্ছেন? (পার্টি ক্যাটাগরি টিক দিন):
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {/* Checkbox 1: Loan Account */}
                <label className="inline-flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={partyCategory === 'loan_account'}
                    onChange={() => {
                      setPartyCategory('loan_account');
                      setSelectedPartyId('');
                    }}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <Landmark className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    🏦 {language === 'bn' ? 'লোন অ্যাকাউন্ট (ব্যাংক/সমিতি/ব্যক্তি)' : 'Loan Account (Bank/Samity)'}
                  </span>
                </label>

                {/* Checkbox 2: Supplier */}
                <label className="inline-flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={partyCategory === 'supplier'}
                    onChange={() => {
                      setPartyCategory('supplier');
                      setSelectedPartyId('');
                    }}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    🏢 {language === 'bn' ? 'সাপ্লায়ার (Supplier)' : 'Supplier'}
                  </span>
                </label>

                {/* Checkbox 3: Customer */}
                <label className="inline-flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={partyCategory === 'customer'}
                    onChange={() => {
                      setPartyCategory('customer');
                      setSelectedPartyId('');
                    }}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    👤 {language === 'bn' ? 'কাস্টমার (Customer)' : 'Customer'}
                  </span>
                </label>
              </div>
            </div>

            {/* Category Search & Dropdown Picker */}
            {partyCategory === 'loan_account' && (
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    লোন অ্যাকাউন্ট নির্বাচন করুন:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddLoanAccount(!showAddLoanAccount)}
                    className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddLoanAccount ? 'ফর্ম বন্ধ করুন' : '+ নতুন লোন অ্যাকাউন্ট তৈরি করুন'}</span>
                  </button>
                </div>

                {/* Inline Add Loan Account Form */}
                {showAddLoanAccount && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700 space-y-2 animate-in fade-in">
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                      + নতুন ব্যাংক / সমিতি / লোন অ্যাকাউন্ট যোগ
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500">নাম বা প্রতিষ্ঠানের নাম *</span>
                        <input
                          type="text"
                          value={newLoanName}
                          onChange={(e) => setNewLoanName(e.target.value)}
                          placeholder="উদা: গ্রামীণ ব্যাংক, সমবায় সমিতি, করিম ভাই"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500">ধরনের ক্যাটাগরি</span>
                        <select
                          value={newLoanType}
                          onChange={(e) => setNewLoanType(e.target.value as LoanEntityType)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="bank">ব্যাংক (Bank)</option>
                          <option value="cooperative">সমিতি / এনজিও (Samity / NGO)</option>
                          <option value="person">ব্যক্তিগত ধার (Personal)</option>
                          <option value="other">অন্যান্য (Other)</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500">মোবাইল নম্বর</span>
                        <input
                          type="tel"
                          value={newLoanPhone}
                          onChange={(e) => setNewLoanPhone(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500">কোম্পানি / ব্রাঞ্চের নাম</span>
                        <input
                          type="text"
                          value={newLoanCompany}
                          onChange={(e) => setNewLoanCompany(e.target.value)}
                          placeholder="ধানমন্ডি ব্রাঞ্চ বা সমিতি কোড"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleCreateLoanAccount}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs"
                      >
                        অ্যাকাউন্ট সেভ ও নির্বাচন করুন
                      </button>
                    </div>
                  </div>
                )}

                {/* Search Bar for Loan Accounts */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="লোন অ্যাকাউন্টের নাম বা মোবাইল নম্বর দিয়ে সার্চ করুন..."
                    value={loanSearch}
                    onChange={(e) => setLoanSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Loan Accounts List */}
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredLoanParties.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      কোনো লোন অ্যাকাউন্ট পাওয়া যায়নি। উপরে "+ নতুন লোন অ্যাকাউন্ট তৈরি করুন" এ ক্লিক করুন।
                    </div>
                  ) : (
                    filteredLoanParties.map((lp) => (
                      <div
                        key={lp.id}
                        onClick={() => setSelectedPartyId(lp.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          selectedPartyId === lp.id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{lp.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {lp.companyName || lp.phone} • {lp.entityType.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-right text-[11px]">
                          {lp.currentPayable > 0 && (
                            <div className="text-rose-600 font-bold">দেনা: {formatBDT(lp.currentPayable)}</div>
                          )}
                          {lp.currentReceivable > 0 && (
                            <div className="text-emerald-600 font-bold">পাওনা: {formatBDT(lp.currentReceivable)}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Supplier Category Search */}
            {partyCategory === 'supplier' && (
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  সাপ্লায়ার নির্বাচন করুন (Search Supplier):
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="সাপ্লায়ারের নাম, কোম্পানি বা মোবাইল দিয়ে খুঁজুন..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredSuppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedPartyId(s.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        selectedPartyId === s.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</div>
                        <div className="text-[10px] text-slate-400">{s.companyName || s.phone}</div>
                      </div>
                      <div className="text-right text-[11px] font-bold text-rose-600">
                        দেনা: {formatBDT(s.currentPayable ?? s.currentBalance ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Category Search */}
            {partyCategory === 'customer' && (
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  কাস্টমার নির্বাচন করুন (Search Customer):
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="কাস্টমারের নাম বা মোবাইল দিয়ে খুঁজুন..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedPartyId(c.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        selectedPartyId === c.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.phone}</div>
                      </div>
                      <div className="text-right text-[11px] font-bold text-emerald-600">
                        বকেয়া/পাওনা: {formatBDT(c.currentDue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Party Summary Pill */}
            {selectedPartyInfo && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>✓ নির্বাচিত:</span>
                    <span>{selectedPartyInfo.name}</span>
                    <span className="text-[10px] font-normal text-slate-500">({selectedPartyInfo.typeLabel})</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{selectedPartyInfo.sub}</div>
                </div>
                <div className="text-right">
                  {selectedPartyInfo.currentPayable > 0 && (
                    <div className="text-[11px] font-bold text-rose-600">
                      বর্তমান দেনা: {formatBDT(selectedPartyInfo.currentPayable)}
                    </div>
                  )}
                  {selectedPartyInfo.currentReceivable > 0 && (
                    <div className="text-[11px] font-bold text-emerald-600">
                      বর্তমান পাওনা: {formatBDT(selectedPartyInfo.currentReceivable)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amount, Source Account & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                টাকার পরিমাণ (Amount ৳) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="৳ 0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {txType === 'borrow' ? 'জমার অ্যাকাউন্ট (Deposit In)' : 'প্রদানের অ্যাকাউন্ট (Paid From)'}
              </label>
              <select
                value={accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (ব্যালেন্স: ৳{acc.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                পরিশোধের মাধ্যম (Payment Method)
              </label>
              <select
                value={paymentMethodId}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Installment Options (User explicitly requested!) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => setIsInstallment(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  📅 কিস্তিতে পরিশোধযোগ্য হিসাব (Installment Schedule Setup)?
                </span>
              </label>

              {isInstallment && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                  স্বয়ংক্রিয় রিমাইন্ডার সক্রিয়
                </span>
              )}
            </div>

            {isInstallment ? (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      কিস্তির ধরন (Frequency)
                    </span>
                    <select
                      value={installmentFrequency}
                      onChange={(e) => setInstallmentFrequency(e.target.value as InstallmentFrequency)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      <option value="weekly">সাপ্তাহিক কিস্তি (Weekly)</option>
                      <option value="monthly">মাসিক কিস্তি (Monthly)</option>
                      <option value="semi_annual">৬ মাসের কিস্তি (Semi-Annual)</option>
                      <option value="yearly">বাৎসরিক কিস্তি (Yearly)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      মোট কিস্তির সংখ্যা
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      প্রথম কিস্তির শুরুর তারিখ
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Schedule Calculation Strip */}
                {amount > 0 && totalInstallments > 0 && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">প্রতি কিস্তির সম্ভাব্য টাকা:</span>{' '}
                      <strong className="text-amber-600 dark:text-amber-400 font-black">
                        ৳ {Math.round(amount / totalInstallments).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">সর্বশেষ কিস্তির মেয়াদ:</span>{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {installmentSchedule[installmentSchedule.length - 1]?.dueDate || 'N/A'}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Generated Schedule Preview (First 4 Installments preview) */}
                {installmentSchedule.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      কিস্তির সময়সূচি প্রিভিউ ({installmentSchedule.length} টি কিস্তি):
                    </span>
                    <div className="max-h-24 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-[11px]">
                      {installmentSchedule.map((inst) => (
                        <div key={inst.installmentNo} className="px-3 py-1 flex items-center justify-between">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            কিস্তি #{inst.installmentNo} ({inst.dueDate})
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ৳ {inst.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  পরিশোধের শেষ তারিখ (Lump-sum Due Date):
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Notes & Agreement */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              নোট বা চেকের বিবরণ (Notes & Remarks):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="উদা: চেকের নম্বর, চুক্তির বিবরণ বা জামানত সম্পর্কিত তথ্য"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              বাতিল (Cancel)
            </button>

            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${
                txType === 'borrow'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              }`}
            >
              {txType === 'borrow' ? (
                <>
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{language === 'bn' ? 'লোন গ্রহণ নিশ্চিত করুন' : 'Confirm Borrow'}</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ধার প্রদান নিশ্চিত করুন' : 'Confirm Lend'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
