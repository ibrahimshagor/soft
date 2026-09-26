import React, { useState, useEffect } from 'react';
import { X, Building2, Coins, Smartphone, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Account } from '../../types';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount?: Account | null;
}

const COMMON_BANKS = [
  'United Commercial Bank',
  'IFIC Bank',
  'Dutch-Bangla Bank',
  'Islami Bank',
  'Brac Bank',
];

const MFS_PROVIDERS = [
  'বিকাশ (bKash)',
  'নগদ (Nagad)',
  'রকেট (Rocket)',
  'উপায় (Upay)',
  'সেলফিন (CellFin)',
];

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  onClose,
  editingAccount,
}) => {
  const { addAccount, updateAccount, language } = useApp();

  const isEdit = !!editingAccount;

  // Account Type
  const [accType, setAccType] = useState<Account['type']>('bank');
  
  // Bank & Common fields
  const [accName, setAccName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  
  // Common
  const [balance, setBalance] = useState<number>(0);
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingAccount) {
      setAccType(editingAccount.type || 'bank');
      setAccName(editingAccount.name || '');
      setBankName(editingAccount.bankName || '');
      setAccNumber(editingAccount.accountNumber || '');
      setBankBranch(editingAccount.bankBranch || editingAccount.branch || '');
      setBalance(editingAccount.balance || 0);
      setIsDefault(!!editingAccount.isDefault);
      setNotes(editingAccount.notes || '');
      setErrorMsg('');
    } else {
      // Default new account state
      setAccType('bank');
      setAccName('');
      setBankName('');
      setAccNumber('');
      setBankBranch('');
      setBalance(0);
      setIsDefault(false);
      setNotes('');
      setErrorMsg('');
    }
  }, [editingAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!accName.trim()) {
      setErrorMsg(language === 'bn' ? 'অনুগ্রহ করে একাউন্টের নাম লিখুন।' : 'Please enter account name.');
      return;
    }

    if (accType === 'bank' && !bankName.trim()) {
      setErrorMsg(language === 'bn' ? 'ব্যাংকের নাম আবশ্যক।' : 'Bank name is required.');
      return;
    }

    if (accType === 'bank' && !accNumber.trim()) {
      setErrorMsg(language === 'bn' ? 'ব্যাংক একাউন্ট নাম্বার আবশ্যক।' : 'Bank account number is required.');
      return;
    }

    if ((accType === 'mobile_banking' || accType === 'mfs') && !accNumber.trim()) {
      setErrorMsg(language === 'bn' ? 'মোবাইল / ওয়ালেট নাম্বার আবশ্যক।' : 'Mobile / Wallet number is required.');
      return;
    }

    const accountData: Omit<Account, 'id'> = {
      name: accName.trim(),
      type: accType,
      bankName: accType === 'bank' ? bankName.trim() : undefined,
      accountNumber: accNumber.trim() || undefined,
      bankBranch: bankBranch.trim() || undefined,
      branch: bankBranch.trim() || undefined,
      balance: Number(balance) || 0,
      isDefault,
      notes: notes.trim() || undefined,
    };

    if (isEdit && editingAccount) {
      updateAccount(editingAccount.id, accountData);
    } else {
      addAccount(accountData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white font-bold ${
              accType === 'bank'
                ? 'bg-blue-600'
                : accType === 'cash'
                ? 'bg-amber-600'
                : 'bg-pink-600'
            }`}>
              {accType === 'bank' ? (
                <Building2 className="w-5 h-5" />
              ) : accType === 'cash' ? (
                <Coins className="w-5 h-5" />
              ) : (
                <Smartphone className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {isEdit
                  ? (language === 'bn' ? 'একাউন্ট তথ্য সম্পাদনা' : 'Edit Account Details')
                  : (language === 'bn' ? 'নতুন একাউন্ট যোগ করুন' : 'Add New Account')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'bn'
                  ? 'ব্যাংক, ক্যাশ ড্রয়ার বা মোবাইল ব্যাংকিং একাউন্ট সেটআপ করুন'
                  : 'Configure bank, cash drawer or mobile financial services'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-130px)] text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs font-semibold animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Account Type Selector */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              {language === 'bn' ? 'একাউন্টের ধরণ নির্ধারণ করুন *' : 'Select Account Type *'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAccType('bank');
                  if (!accName || accName.includes('ক্যাশ') || accName.includes('বিকাশ')) {
                    setAccName('');
                  }
                }}
                className={`py-2.5 px-3 rounded-2xl border text-center font-bold flex flex-col items-center gap-1.5 transition-all ${
                  accType === 'bank'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="text-[11px]">{language === 'bn' ? 'ব্যাংক একাউন্ট' : 'Bank A/C'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccType('cash');
                  if (!accName) setAccName(language === 'bn' ? 'দোকানের ক্যাশ' : 'Cash Drawer');
                }}
                className={`py-2.5 px-3 rounded-2xl border text-center font-bold flex flex-col items-center gap-1.5 transition-all ${
                  accType === 'cash'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span className="text-[11px]">{language === 'bn' ? 'ক্যাশ / ড্রয়ার' : 'Cash Drawer'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccType('mobile_banking');
                  if (!accName || accName.includes('ক্যাশ')) {
                    setAccName(language === 'bn' ? 'বিকাশ একাউন্ট' : 'bKash Account');
                  }
                }}
                className={`py-2.5 px-3 rounded-2xl border text-center font-bold flex flex-col items-center gap-1.5 transition-all ${
                  accType === 'mobile_banking' || accType === 'mfs'
                    ? 'border-pink-600 bg-pink-50/80 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-500 shadow-xs ring-2 ring-pink-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-[11px]">{language === 'bn' ? 'বিকাশ / নগদ' : 'bKash / Nagad'}</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC FORM FIELDS */}

          {/* 1. BANK ACCOUNT FIELDS */}
          {accType === 'bank' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/40">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'একাউন্টের নাম / হোল্ডার নেম *' : 'Account Name / Holder Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'bn' ? 'যেমন: আর এম অটোমোবাইলস / মো: রহিম' : 'e.g. RM Automobiles / Md. Rahim'}
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {language === 'bn' ? 'ব্যাংকের নাম (Bank Name) *' : 'Bank Name *'}
                  </label>
                  <span className="text-[10px] text-slate-400">{language === 'bn' ? 'নিচে ক্লিক করে সিলেক্ট করুন' : 'Click to select'}</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder={language === 'bn' ? 'যেমন: Islami Bank / Dutch-Bangla Bank' : 'e.g. Islami Bank'}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                {/* Specific 5 bank suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COMMON_BANKS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBankName(b)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                        bankName === b
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      + {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'একাউন্ট নাম্বার (A/C No) *' : 'Account Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 205012345678"
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ব্রাঞ্চ নেম (Branch Name)' : 'Branch Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'bn' ? 'যেমন: মতিঝিল শাখা / তেজগাঁও' : 'e.g. Motijheel Branch'}
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. CASH DRAWER FIELDS */}
          {accType === 'cash' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'ক্যাশ নেম / শিরোনাম *' : 'Cash Account Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'bn' ? 'যেমন: প্রধান ক্যাশ ড্রয়ার / কাউন্টার ক্যাশ' : 'e.g. Main Cash Drawer / Register'}
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'প্রধান ক্যাশ (Main Cash)',
                  'দোকানের ক্যাশবক্স',
                  'কাউন্টার ক্যাশ-১',
                  'জরুরি ক্যাশ ড্রয়ার',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAccName(preset.split(' (')[0])}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-700"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. MOBILE BANKING (MFS) FIELDS */}
          {(accType === 'mobile_banking' || accType === 'mfs') && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-pink-50/30 dark:bg-pink-950/10 border border-pink-100 dark:border-pink-900/40">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'একাউন্ট নেম / শিরোনাম *' : 'Account Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'bn' ? 'যেমন: বিকাশ মার্চেন্ট / নগদ পার্সোনাল' : 'e.g. bKash Merchant / Nagad'}
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-pink-500 outline-hidden"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {MFS_PROVIDERS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setAccName(p.split(' (')[0] + ' একাউন্ট');
                        setBankBranch(p.split(' (')[0] + ' সার্ভিস');
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-pink-500 hover:text-pink-600"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'মোবাইল / একাউন্ট নাম্বার *' : 'Mobile / Account Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="017XXXXXXXX"
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-pink-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ব্রাঞ্চ / সার্ভিসের ধরণ (Branch / Type)' : 'Branch / Service Type'}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'bn' ? 'যেমন: মার্চেন্ট / পার্সোনাল / এজেন্ট' : 'e.g. Merchant / Personal / Agent'}
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-pink-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BALANCE & COMMON SETTINGS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isEdit
                  ? (language === 'bn' ? 'বর্তমান ব্যালেন্স (৳)' : 'Current Balance (৳)')
                  : (language === 'bn' ? 'ওপেনিং ব্যালেন্স (৳)' : 'Opening Balance (৳)')}
              </label>
              <input
                type="number"
                step="any"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {language === 'bn' ? 'ডিফল্ট একাউন্ট নির্ধারণ করুন' : 'Set as Default Account'}
                </span>
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2.5">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isEdit ? (language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes') : (language === 'bn' ? 'একাউন্ট সংরক্ষণ করুন' : 'Create Account')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
