import React, { useState } from 'react';
import { X, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../utils/formatters';

interface FundTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FundTransferModal: React.FC<FundTransferModalProps> = ({ isOpen, onClose }) => {
  const { accounts, transferFunds } = useApp();

  const [fromAccountId, setFromAccountId] = useState<string>(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Cash deposit to bank account');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const fromAcc = accounts.find((a) => a.id === fromAccountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromAccountId === toAccountId) {
      setErrorMsg('Source and destination accounts must be different.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Please enter a transfer amount greater than 0.');
      return;
    }
    if (fromAcc && fromAcc.balance < amount) {
      setErrorMsg(`Insufficient funds in ${fromAcc.name}. Available: ${formatBDT(fromAcc.balance)}`);
      return;
    }

    try {
      transferFunds(fromAccountId, toAccountId, amount, notes.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to transfer funds.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-sm text-slate-900 dark:text-white">
            <ArrowRightLeft className="w-5 h-5" />
            <span>Internal Fund Transfer (তহবিল স্থানান্তর)</span>
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
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Source Account (From) *
            </label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Balance: {formatBDT(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Destination Account (To) *
            </label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Balance: {formatBDT(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Transfer Amount (৳) *
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
              Transfer Note
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Transfer ({formatBDT(amount)})</span>
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
