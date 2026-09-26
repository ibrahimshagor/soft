import React, { useState, useMemo } from 'react';
import { X, Coins, CheckCircle2, AlertCircle, Send, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT, sanitizePhoneNumber } from '../../utils/formatters';

interface CollectDueModalProps {
  isOpen: boolean;
  preSelectedCustomerId?: string;
  refInvoiceNo?: string;
  onClose: () => void;
}

export const CollectDueModal: React.FC<CollectDueModalProps> = ({
  isOpen,
  preSelectedCustomerId,
  refInvoiceNo,
  onClose,
}) => {
  const {
    customers,
    accounts,
    paymentMethods,
    sales,
    recordCustomerPayment,
    businessProfile,
    t,
  } = useApp();

  const [customerId, setCustomerId] = useState<string>(
    preSelectedCustomerId || customers.find((c) => c.currentDue > 0)?.id || customers[0]?.id || ''
  );
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [invoiceNo, setInvoiceNo] = useState<string>(refInvoiceNo || '');
  const [notes, setNotes] = useState<string>('Cash memo due payment collection');
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedCust = customers.find((c) => c.id === customerId);

  // Unpaid invoices for this customer
  const customerUnpaidInvoices = useMemo(() => {
    if (!customerId) return [];
    return sales.filter((s) => s.customerId === customerId && s.dueAmount > 0);
  }, [sales, customerId]);

  if (!isOpen) return null;

  const handleSelectInvoice = (invNum: string) => {
    setInvoiceNo(invNum);
    if (!invNum) return;
    const inv = customerUnpaidInvoices.find((s) => s.invoiceNo === invNum);
    if (inv) {
      setAmount(inv.dueAmount);
      setNotes(`Payment collection against memo #${inv.invoiceNo}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg('Please select a customer.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Please enter a valid collection amount greater than 0.');
      return;
    }

    try {
      recordCustomerPayment({
        customerId,
        amount,
        paymentMethodId,
        accountId,
        refInvoiceNo: invoiceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Send WhatsApp payment acknowledgment if requested
      if (sendWhatsApp && selectedCust) {
        const phone = sanitizePhoneNumber(selectedCust.whatsappNumber || selectedCust.phone);
        if (phone) {
          const remainingDue = Math.max(0, selectedCust.currentDue - amount);
          const msg = `Assalamu Alaikum *${selectedCust.name}*,\nWe received your payment of *${formatBDT(amount)}* for *${businessProfile.businessName}*.\nYour current outstanding balance is: *${formatBDT(remainingDue)}*.\nThank you!\n📞 ${businessProfile.phone}`;
          const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
          window.open(url, '_blank');
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record customer payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="sticky top-0 z-10 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Coins className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {t('collectDue')} (বকেয়া আদায় ভাউচার)
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
              {t('selectCustomer')} *
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setInvoiceNo('');
                const cust = customers.find((c) => c.id === e.target.value);
                if (cust && cust.currentDue > 0) {
                  setAmount(cust.currentDue);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) {c.currentDue > 0 ? `• Due: ${formatBDT(c.currentDue)}` : '• Clear'}
                </option>
              ))}
            </select>
          </div>

          {selectedCust && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Current Outstanding Due (মোট বকেয়া পাওনা)
                </span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">
                  {formatBDT(selectedCust.currentDue)}
                </span>
              </div>
              {selectedCust.currentDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(selectedCust.currentDue)}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold"
                >
                  Pay Full Due
                </button>
              )}
            </div>
          )}

          {/* Invoice-Specific Allocation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                নির্দিষ্ট মেমো / ইনভয়েস নির্বাচন (Invoice Allocation)
              </label>
              <span className="text-[10px] text-slate-400">ঐচ্ছিক</span>
            </div>

            {customerUnpaidInvoices.length > 0 ? (
              <select
                value={invoiceNo}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- সাধারণ বকেয়া / খাতা থেকে আদায় (General Due Khata) --</option>
                {customerUnpaidInvoices.map((inv) => (
                  <option key={inv.id} value={inv.invoiceNo}>
                    ইনভয়েস #{inv.invoiceNo} — বকেয়া: {formatBDT(inv.dueAmount)} (তারিখ: {new Date(inv.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. RM-INV-1048 (অথবা সাধারণ জমার জন্য খালি রাখুন)"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            )}
            <p className="text-[10px] text-slate-400">
              নির্দিষ্ট ইনভয়েস সিলেক্ট করলে ওই ইনভয়েসের বকেয়া স্বয়ংক্রিয়ভাবে পরিশোধিত হবে।
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Collected Amount (আদায়কৃত টাকার পরিমাণ) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black text-slate-900 dark:text-white"
            />

            {/* Quick partial payment buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[500, 1000, 2000, 5000, 10000].map((quickAmt) => (
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
                পেমেন্ট মাধ্যম (Payment Channel)
              </label>
              <p className="text-[10px] text-slate-500 mb-1.5">
                গ্রাহক যেভাবে টাকা দিয়েছেন (যেমনঃ Cash, bKash, Bank)
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
                জমা হিসাব (Deposit Into Account)
              </label>
              <p className="text-[10px] text-slate-500 mb-1.5">
                দোকানের কোন ড্রয়ার বা ব্যাংক একাউন্টে জমা হবে
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

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sendWhatsAppAck"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="sendWhatsAppAck" className="text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1">
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>Send WhatsApp payment receipt to customer</span>
            </label>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Collection ({formatBDT(amount)})</span>
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
