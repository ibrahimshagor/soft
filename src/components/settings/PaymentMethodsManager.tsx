import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Building2,
  Smartphone,
  Coins,
  ArrowRight,
  Info,
  X,
  Save,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, Account } from '../../types';
import { formatBDT } from '../../utils/formatters';

export const PaymentMethodsManager: React.FC = () => {
  const { paymentMethods, accounts, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, language } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [type, setType] = useState<PaymentMethod['type']>('mfs');
  const [defaultAccountId, setDefaultAccountId] = useState(accounts[0]?.id || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleOpenAdd = () => {
    setEditingMethod(null);
    setName('');
    setNameBn('');
    setType('mfs');
    setDefaultAccountId(accounts[0]?.id || '');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (pm: PaymentMethod) => {
    setEditingMethod(pm);
    setName(pm.name);
    setNameBn(pm.nameBn || '');
    setType(pm.type);
    setDefaultAccountId(pm.defaultAccountId || accounts[0]?.id || '');
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingMethod) {
      updatePaymentMethod(editingMethod.id, {
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        type,
        defaultAccountId,
      });
    } else {
      addPaymentMethod({
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        type,
        defaultAccountId,
        isActive: true,
      });
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsAddModalOpen(false);
    }, 800);
  };

  const handleQuickAccountChange = (paymentMethodId: string, newAccountId: string) => {
    updatePaymentMethod(paymentMethodId, { defaultAccountId: newAccountId });
  };

  const getTypeIcon = (mType: PaymentMethod['type']) => {
    switch (mType) {
      case 'cash':
        return <Coins className="w-4 h-4 text-amber-500" />;
      case 'bank':
        return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'mfs':
        return <Smartphone className="w-4 h-4 text-pink-500" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Explanation */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-700 dark:text-slate-300">
          <p className="font-extrabold text-slate-900 dark:text-white">
            {language === 'bn'
              ? 'পেমেন্ট মেথড ও ব্যাংক/ক্যাশ একাউন্ট সরাসরি ম্যাপিং'
              : 'Direct Payment Method to Financial Account Mapping'}
          </p>
          <p>
            {language === 'bn'
              ? 'এখানে আপনি যেকোনো নতুন পেমেন্ট মেথড তৈরি করতে পারেন (যেমন নগদ, ইসলামী ব্যাংক, সিটি ব্যাংক, রকেট) এবং নির্ধারণ করতে পারেন সেল বা পারচেজে সেই মেথড সিলেক্ট করলে টাকা সরাসরি কোন একাউন্টে জমা বা খরচ হবে। যেমন: নগদ সিলেক্ট করলে বিকাশ একাউন্টে না গিয়ে সরাসরি নির্দিষ্ট নগদ একাউন্টেই জমা হবে।'
              : 'Define custom payment channels and bind each to an exact Cash, Bank, or MFS account. Selecting a method in POS/Purchases routes transaction funds directly to its connected account.'}
          </p>
        </div>
      </div>

      {/* Top Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
            {language === 'bn' ? 'সকল পেমেন্ট মেথড ও সংযুক্ত একাউন্ট' : 'Registered Payment Channels & Accounts'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'bn' ? 'মোট পেমেন্ট মেথড:' : 'Total methods:'} {paymentMethods.length}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'bn' ? 'নতুন পেমেন্ট মেথড তৈরি করুন' : 'Add Payment Method'}</span>
        </button>
      </div>

      {/* Payment Methods Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((pm) => {
          const connectedAccount = accounts.find((a) => a.id === pm.defaultAccountId);

          return (
            <div
              key={pm.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/50 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 shrink-0">
                    {getTypeIcon(pm.type)}
                  </div>
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      {pm.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {pm.nameBn || pm.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(pm)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-amber-500 transition-colors"
                    title={language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {paymentMethods.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete payment method "${pm.name}"?`)) {
                          deletePaymentMethod(pm.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                      title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Connected Account Selector */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/70 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-amber-500" />
                    <span>{language === 'bn' ? 'টাকা জমা হবে যে একাউন্টে:' : 'Connected Account:'}</span>
                  </span>
                  {connectedAccount && (
                    <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {formatBDT(connectedAccount.balance)}
                    </span>
                  )}
                </div>

                <select
                  value={pm.defaultAccountId || ''}
                  onChange={(e) => handleQuickAccountChange(pm.id, e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:border-amber-500"
                >
                  <option value="" disabled>
                    {language === 'bn' ? '-- একাউন্ট সিলেক্ট করুন --' : '-- Select Target Account --'}
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <span>
                  {editingMethod
                    ? language === 'bn'
                      ? 'পেমেন্ট মেথড সম্পাদনা'
                      : 'Edit Payment Method'
                    : language === 'bn'
                    ? 'নতুন পেমেন্ট মেথড তৈরি'
                    : 'Create New Payment Method'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {language === 'bn' ? 'পেমেন্ট মেথডের নাম (English)' : 'Method Name (English)'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nagad (01711223344) or Pubali Bank A/C"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {language === 'bn' ? 'বাংলায় নাম (বাংলা ক্যাশ মেমোর জন্য)' : 'Method Name (Bengali)'}
                </label>
                <input
                  type="text"
                  placeholder="যেমন: নগদ ওয়ালেট বা পূবালী ব্যাংক হিসাব"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {language === 'bn' ? 'পেমেন্টের ধরন' : 'Channel Type'} *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['mfs', 'bank', 'cash', 'card'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-2 rounded-xl border font-bold uppercase text-[10px] flex flex-col items-center gap-1 transition-all ${
                        type === t
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {getTypeIcon(t)}
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {language === 'bn'
                    ? 'টাকা যে ব্যাংক বা ক্যাশ একাউন্টে জমা হবে *'
                    : 'Target Financial Deposit Account *'}
                </label>
                <select
                  required
                  value={defaultAccountId}
                  onChange={(e) => setDefaultAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-hidden focus:border-amber-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.toUpperCase()}) - {formatBDT(acc.balance)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'bn'
                    ? 'সেলস বা পারচেজে এই মেথড সিলেক্ট করলে এই একাউন্টে ব্যালেন্স আপডেট হবে।'
                    : 'Transaction collections via this method will immediately balance in this account.'}
                </p>
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'bn' ? 'সফলভাবে সংরক্ষিত হয়েছে!' : 'Saved successfully!'}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Method'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
