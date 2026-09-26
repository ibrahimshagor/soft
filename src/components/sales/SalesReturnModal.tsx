import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Sale } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../utils/formatters';

interface SalesReturnModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({ sale, onClose }) => {
  const { createSalesReturn, accounts } = useApp();

  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [refundType, setRefundType] = useState<'adjust_due' | 'cash_refund'>('adjust_due');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [reason, setReason] = useState<string>('Customer returned part - defective / incompatible');
  const [errorMsg, setErrorMsg] = useState('');

  if (!sale) return null;

  const handleQtyChange = (productId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(qty, maxQty));
    setReturnItems((prev) => ({
      ...prev,
      [productId]: validQty,
    }));
  };

  // Calculate total return amount
  let totalReturnAmount = 0;
  const itemsToReturn: {
    productId: string;
    productName: string;
    quantity: number;
    unitRefundPrice: number;
    total: number;
  }[] = [];

  sale.items.forEach((item) => {
    const qty = returnItems[item.productId] || 0;
    if (qty > 0) {
      const lineTotal = qty * item.sellingPrice;
      totalReturnAmount += lineTotal;
      itemsToReturn.push({
        productId: item.productId,
        productName: item.productName,
        quantity: qty,
        unitRefundPrice: item.sellingPrice,
        total: lineTotal,
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsToReturn.length === 0) {
      setErrorMsg('Please select at least one item to return.');
      return;
    }

    try {
      createSalesReturn(
        sale.id,
        itemsToReturn,
        refundType,
        refundType === 'cash_refund' ? accountId : undefined,
        reason
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process sales return.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <RotateCcw className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Sales Return - Invoice #{sale.invoiceNo}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="font-bold text-slate-900 dark:text-white">{sale.customerName}</div>
            <div className="text-slate-500">Invoice Total: {formatBDT(sale.grandTotal)} • Paid: {formatBDT(sale.paidAmount)} • Due: {formatBDT(sale.dueAmount)}</div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Select Quantities to Restock & Refund:
            </label>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sale.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white">{item.productName}</div>
                    <div className="text-[10px] text-slate-400">Sold: {item.quantity} {item.unit} @ {formatBDT(item.sellingPrice)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">Return Qty:</span>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={returnItems[item.productId] || 0}
                      onChange={(e) =>
                        handleQtyChange(item.productId, parseInt(e.target.value) || 0, item.quantity)
                      }
                      className="w-16 px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex justify-between items-center font-bold">
            <span className="text-slate-700 dark:text-slate-300">Total Refund / Return Value:</span>
            <span className="text-base text-amber-600 dark:text-amber-400">{formatBDT(totalReturnAmount)}</span>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Refund Settlement Action:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundType('adjust_due')}
                className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                  refundType === 'adjust_due'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Adjust Customer Due
              </button>
              <button
                type="button"
                onClick={() => setRefundType('cash_refund')}
                className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                  refundType === 'cash_refund'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Cash / Bank Refund
              </button>
            </div>
          </div>

          {refundType === 'cash_refund' && (
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Disburse Refund From Account:
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Balance: {formatBDT(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Return Reason / Notes:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {errorMsg && (
            <div className="p-2 rounded bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={totalReturnAmount <= 0}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs"
            >
              Confirm Return & Restock ({formatBDT(totalReturnAmount)})
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
