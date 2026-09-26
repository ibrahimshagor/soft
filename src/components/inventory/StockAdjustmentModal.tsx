import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { Product, StockAdjustment } from '../../types';
import { useApp } from '../../context/AppContext';

interface StockAdjustmentModalProps {
  product: Product | null;
  onClose: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  onClose,
}) => {
  const { adjustStock } = useApp();

  const [newStock, setNewStock] = useState<number>(product?.currentStock || 0);
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustment['type']>('count_audit');
  const [reason, setReason] = useState<string>('Physical physical count verification');

  if (!product) return null;

  const diff = newStock - product.currentStock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustStock(product.id, newStock, adjustmentType, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <SlidersHorizontal className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Stock Adjustment & Audit
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="font-bold text-slate-900 dark:text-white">{product.name}</div>
            <div className="text-slate-500 font-mono mt-0.5">
              SKU: {product.sku} • Location: {product.rackLocation || 'General'}
            </div>
            <div className="mt-2 text-sm font-black text-slate-800 dark:text-slate-200">
              Current System Stock: {product.currentStock} {product.unit}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              New Physical Count (Quantity) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={newStock}
              onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
            />
            <div className="text-[11px] font-semibold mt-1">
              Adjustment Difference:{' '}
              <span
                className={
                  diff > 0
                    ? 'text-emerald-600'
                    : diff < 0
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }
              >
                {diff > 0 ? `+${diff}` : diff} {product.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Adjustment Reason Type *
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as StockAdjustment['type'])}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="count_audit">Physical Stock Count Audit (নিয়মিত গণনা)</option>
              <option value="damage">Damaged in Shop / Godown (ভেঙে গেছে / ত্রুটিযুক্ত)</option>
              <option value="lost">Lost / Missing Item (হারিয়ে গেছে)</option>
              <option value="found">Found Extra Stock (অতিরিক্ত পাওয়া গেছে)</option>
              <option value="addition">Direct Manual Addition (যোগ)</option>
              <option value="reduction">Direct Manual Reduction (বিয়োগ)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Detailed Audit Note / Reason *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Broken packaging found during shelf cleanup"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm"
            >
              Save Stock Adjustment
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
