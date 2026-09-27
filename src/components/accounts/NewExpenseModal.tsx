import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense } from '../../types';
import { formatBDT } from '../../utils/formatters';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAccountId?: string;
  editingExpense?: Expense | null;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  initialAccountId,
  editingExpense,
}) => {
  const { accounts, expenseCategories, recordExpense, updateExpense, language, t } = useApp();

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>(expenseCategories[0]?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState<string>(initialAccountId || accounts[0]?.id || '');
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [payee, setPayee] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date.slice(0, 10));
      setCategoryId(editingExpense.categoryId || expenseCategories[0]?.id || '');
      setAmount(editingExpense.amount || 0);
      setAccountId(editingExpense.accountId || initialAccountId || accounts[0]?.id || '');
      setVoucherNo(editingExpense.voucherNo || '');
      setPayee(editingExpense.payee || '');
      setDescription(editingExpense.description || '');
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId(expenseCategories[0]?.id || '');
      setAmount(0);
      setAccountId(initialAccountId || accounts[0]?.id || '');
      setVoucherNo('');
      setPayee('');
      setDescription('');
    }
    setErrorMsg('');
  }, [editingExpense, initialAccountId, isOpen, expenseCategories, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg(
        language === 'bn'
          ? 'অনুগ্রহ করে ০ টাকার বেশি খরচের পরিমাণ লিখুন।'
          : 'Please enter an expense amount greater than 0.'
      );
      return;
    }

    if (!description.trim()) {
      setErrorMsg(
        language === 'bn'
          ? 'খরচের বিবরণ বা কারণ লিখুন।'
          : 'Please enter expense particulars/description.'
      );
      return;
    }

    try {
      if (editingExpense) {
        // Edit existing expense
        updateExpense(editingExpense.id, {
          date: date ? new Date(date).toISOString() : editingExpense.date,
          categoryId,
          amount,
          accountId,
          voucherNo: voucherNo.trim() || undefined,
          payee: payee.trim() || undefined,
          description: description.trim(),
        });
      } else {
        // Record new expense
        recordExpense({
          categoryId,
          amount,
          accountId,
          voucherNo: voucherNo.trim() || undefined,
          payee: payee.trim() || undefined,
          description: description.trim(),
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save expense.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
            <Receipt className="w-5 h-5" />
            <span>
              {editingExpense
                ? (language === 'bn' ? 'খরচ ভাউচার সম্পাদন (Edit Expense)' : 'Edit Expense Voucher')
                : (language === 'bn' ? 'নতুন খরচ এন্ট্রি (Record Expense)' : 'Record Expense Voucher')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Date & Category in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {language === 'bn' ? 'খরচের তারিখ *' : 'Expense Date *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {language === 'bn' ? 'খরচের খাত / ক্যাটাগরি *' : 'Expense Category *'}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {language === 'bn' ? 'খরচের পরিমাণ (৳) *' : 'Expense Amount (৳) *'}
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {language === 'bn' ? 'পরিশোধিত একাউন্ট / ব্যাংক *' : 'Paid From Account *'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatBDT(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {language === 'bn' ? 'প্রাপক / ব্যক্তি' : 'Recipient / Payee'}
              </label>
              <input
                type="text"
                placeholder={language === 'bn' ? 'যেমন: বাড়িওয়ালা / স্টাফ' : 'e.g. Landlord / Staff'}
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {language === 'bn' ? 'ভাউচার / বিল নং' : 'Voucher / Bill #'}
              </label>
              <input
                type="text"
                placeholder="e.g. EXP-882"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {language === 'bn' ? 'খরচের বিবরণ / উদ্দেশ্য *' : 'Particulars / Description *'}
            </label>
            <input
              type="text"
              required
              placeholder={language === 'bn' ? 'যেমন: দোকানের জেনারেটর ডিজেল ও নাস্তা খরচ' : 'e.g. Monthly shop generator diesel & tea refreshments'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {editingExpense
                  ? (language === 'bn' ? `আপডেট করুন (${formatBDT(amount)})` : `Update Expense (${formatBDT(amount)})`)
                  : (language === 'bn' ? `খরচ সংরক্ষণ (${formatBDT(amount)})` : `Record Expense (${formatBDT(amount)})`)}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
