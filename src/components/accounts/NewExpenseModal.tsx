import React, { useState } from 'react';
import { X, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory } from '../../types';
import { formatBDT } from '../../utils/formatters';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAccountId?: string;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose, initialAccountId }) => {
  const { accounts, expenseCategories, recordExpense, t } = useApp();

  const [categoryId, setCategoryId] = useState<string>(expenseCategories[0]?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState<string>(initialAccountId || accounts[0]?.id || '');
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [payee, setPayee] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  React.useEffect(() => {
    if (initialAccountId) {
      setAccountId(initialAccountId);
    }
  }, [initialAccountId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Please enter an expense amount greater than 0.');
      return;
    }

    try {
      recordExpense({
        categoryId,
        amount,
        accountId,
        voucherNo: voucherNo.trim() || undefined,
        payee: payee.trim() || undefined,
        description: description.trim(),
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record expense.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-sm text-slate-900 dark:text-white">
            <Receipt className="w-5 h-5" />
            <span>{t('recordExpense')} / Debit Voucher</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Expense Category *
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

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Expense Amount (৳) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Disburse From Account *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Current: {formatBDT(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Recipient / Payee
              </label>
              <input
                type="text"
                placeholder="e.g. Landlord / Staff / Electrician"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Voucher / Bill #
              </label>
              <input
                type="text"
                placeholder="e.g. EXP-882"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Expense Particulars / Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Monthly shop generator diesel & tea refreshments"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Expense ({formatBDT(amount)})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
