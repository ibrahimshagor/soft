import React, { useState, useMemo } from 'react';
import { X, Building2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../utils/formatters';

interface PaySupplierModalProps {
  isOpen: boolean;
  preSelectedSupplierId?: string;
  refPurchaseNo?: string;
  onClose: () => void;
}

export const PaySupplierModal: React.FC<PaySupplierModalProps> = ({
  isOpen,
  preSelectedSupplierId,
  refPurchaseNo,
  onClose,
}) => {
  const { suppliers, accounts, paymentMethods, purchases, recordSupplierPayment } = useApp();

  const [supplierId, setSupplierId] = useState<string>(
    preSelectedSupplierId || suppliers.find((s) => s.currentPayable > 0)?.id || suppliers[0]?.id || ''
  );
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [refNo, setRefNo] = useState<string>(refPurchaseNo || '');
  const [notes, setNotes] = useState<string>('Parts procurement bill settlement');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedSup = suppliers.find((s) => s.id === supplierId);

  // Unpaid purchases/bills from this supplier
  const supplierUnpaidPurchases = useMemo(() => {
    if (!supplierId) return [];
    return purchases.filter((p) => p.supplierId === supplierId && p.payableAmount > 0);
  }, [purchases, supplierId]);

  if (!isOpen) return null;

  const handleSelectPurchase = (billNo: string) => {
    setRefNo(billNo);
    if (!billNo) return;
    const pur = supplierUnpaidPurchases.find((p) => p.purchaseNo === billNo);
    if (pur) {
      setAmount(pur.payableAmount);
      setNotes(`Payment against purchase bill #${pur.purchaseNo}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg('Please select a supplier.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Please enter a valid disbursement amount greater than 0.');
      return;
    }

    try {
      recordSupplierPayment({
        supplierId,
        amount,
        paymentMethodId,
        accountId,
        refPurchaseNo: refNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record supplier payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="sticky top-0 z-10 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Supplier Payment Voucher (সাপ্লায়ারকে দেনা পরিশোধ)
            </h3>
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
              Select Supplier / Wholesaler *
            </label>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setRefNo('');
                const sup = suppliers.find((s) => s.id === e.target.value);
                if (sup && sup.currentPayable > 0) {
                  setAmount(sup.currentPayable);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName || s.name} ({s.phone}) {s.currentPayable > 0 ? `• দেনা: ${formatBDT(s.currentPayable)}` : '• পরিশোধিত'}
                </option>
              ))}
            </select>
          </div>

          {selectedSup && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Current Payable Balance (সাপ্লায়ারের কাছে মোট দেনা)
                </span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">
                  {formatBDT(selectedSup.currentPayable)}
                </span>
              </div>
              {selectedSup.currentPayable > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(selectedSup.currentPayable)}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold transition-transform active:scale-95"
                >
                  সম্পূর্ণ দেনা পরিশোধ ({formatBDT(selectedSup.currentPayable)})
                </button>
              )}
            </div>
          )}

          {/* Bill-Specific Allocation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                নির্দিষ্ট পারচেজ বিল নির্বাচন (Bill Allocation)
              </label>
              <span className="text-[10px] text-slate-400">ঐচ্ছিক</span>
            </div>

            {supplierUnpaidPurchases.length > 0 ? (
              <select
                value={refNo}
                onChange={(e) => handleSelectPurchase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- সাধারণ লেজার হিসাব (General Balance Khata) --</option>
                {supplierUnpaidPurchases.map((pur) => (
                  <option key={pur.id} value={pur.purchaseNo}>
                    বিল #{pur.purchaseNo} — দেনা: {formatBDT(pur.payableAmount)} (তারিখ: {new Date(pur.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. RM-PUR-1010 (অথবা সাধারণ জমার জন্য খালি রাখুন)"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            )}
            <p className="text-[10px] text-slate-400">
              নির্দিষ্ট বিল সিলেক্ট করলে সেই পারচেজ ভাউচারের বকেয়া স্বয়ংক্রিয়ভাবে সমন্বয় হবে।
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Disbursed Amount (পরিশোধিত টাকার পরিমাণ) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-black text-indigo-600 dark:text-indigo-400"
            />

            {/* Quick partial payment buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[1000, 2000, 5000, 10000, 20000, 50000].map((quickAmt) => (
                <button
                  key={quickAmt}
                  type="button"
                  onClick={() => setAmount(quickAmt)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                >
                  +৳{quickAmt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                পরিশোধের মাধ্যম (Disbursement Channel)
              </label>
              <p className="text-[10px] text-slate-500 mb-1.5">
                সাপ্লায়ারকে যে মাধ্যমে দিচ্ছেন (Cash, bKash, Bank, Cheque ইত্যাদি)
              </p>
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                উৎস একাউন্ট (Deduct From Account)
              </label>
              <p className="text-[10px] text-slate-500 mb-1.5">
                দোকানের যে ক্যাশ বাক্স বা ব্যাংক একাউন্ট থেকে টাকা কাটা হবে
              </p>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatBDT(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Voucher Notes
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
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Disbursement ({formatBDT(amount)})</span>
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
