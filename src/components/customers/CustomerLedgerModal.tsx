import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Send,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { Customer, Transaction } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatBDT, formatDate, sanitizePhoneNumber } from '../../utils/formatters';
import {
  printHtmlViaIframe,
  downloadElementAsPdf,
  downloadElementAsImage,
} from '../../utils/pdfGenerator';

interface CustomerLedgerModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customer,
  onClose,
}) => {
  const { sales, transactions, businessProfile, language } = useApp();

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const printableLedgerRef = useRef<HTMLDivElement>(null);

  if (!customer) return null;

  // Filter sales & transactions for this customer
  const custSales = sales.filter((s) => s.customerId === customer.id);
  const custTx = transactions.filter((t: Transaction) => t.relatedEntityId === customer.id);

  // Construct combined statement rows
  type LedgerRow = {
    date: string;
    type: 'INVOICE' | 'PAYMENT' | 'RETURN';
    ref: string;
    debit: number; // Invoiced (+)
    credit: number; // Paid (-)
    description: string;
  };

  const rows: LedgerRow[] = [];

  custSales.forEach((s) => {
    rows.push({
      date: s.date,
      type: 'INVOICE',
      ref: s.invoiceNo,
      debit: s.grandTotal,
      credit: 0,
      description: `Sales Invoice #${s.invoiceNo} (${s.items.length} items)`,
    });
    if (s.paidAmount > 0) {
      rows.push({
        date: s.date,
        type: 'PAYMENT',
        ref: `PAY-${s.invoiceNo}`,
        debit: 0,
        credit: s.paidAmount,
        description: `Payment received for Invoice #${s.invoiceNo}`,
      });
    }
  });

  // Additional standalone payment collections
  custTx
    .filter((tx: Transaction) => tx.type === 'customer_due_collection')
    .forEach((tx: Transaction) => {
      rows.push({
        date: tx.date,
        type: 'PAYMENT',
        ref: tx.id,
        debit: 0,
        credit: tx.amount,
        description: tx.description || 'Due balance payment received',
      });
    });

  // Sort by date ascending
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  let running = customer.openingBalance || 0;
  const ledgerWithBalance = rows.map((r) => {
    running = running + r.debit - r.credit;
    return { ...r, runningBalance: running };
  });

  const handlePrint = () => {
    try {
      const owner = businessProfile.ownerName || 'আব্দুর রহিম রনি';
      const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Customer_Ledger_${customer.name.replace(/[^a-zA-Z0-9_-]/g, '_')}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 14px; background: #fff; font-size: 11px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 18px; font-weight: 900; }
    .sub { font-size: 10px; color: #475569; margin-top: 2px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 14px; }
    .summary-item { font-size: 10px; color: #64748b; }
    .summary-val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .due-val { color: #dc2626; font-size: 14px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
    .text-right { text-align: right; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
    .badge-invoice { background: #dbeafe; color: #1e40af; }
    .badge-payment { background: #dcfce7; color: #15803d; }
    .footer { margin-top: 25px; padding-top: 15px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
    .signature-area { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; }
    .signature-box { text-align: center; border-top: 1px dashed #64748b; width: 160px; padding-top: 5px; font-size: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${businessProfile.businessName}</div>
      <div class="sub">${businessProfile.address || ''} • Phone: ${businessProfile.phone}</div>
      <div class="sub" style="font-weight: 700; color: #b45309;">স্বত্বাধিকারী: ${owner}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; font-weight: 800; color: #b45309; text-transform: uppercase;">Customer Statement of Account</div>
      <div class="sub">Generated: ${formatDate(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-item">
      <div>Customer Info</div>
      <div class="summary-val">${customer.name}</div>
      <div style="font-size: 9px; color: #64748b;">${customer.phone || 'No phone'}</div>
    </div>
    <div class="summary-item">
      <div>Total Purchases</div>
      <div class="summary-val">${formatBDT(customer.totalPurchased)}</div>
    </div>
    <div class="summary-item">
      <div>Total Paid</div>
      <div class="summary-val" style="color: #15803d;">${formatBDT(customer.totalPaid)}</div>
    </div>
    <div class="summary-item">
      <div>Current Outstanding Due</div>
      <div class="due-val">${formatBDT(customer.currentDue)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Particulars / Reference</th>
        <th class="text-right">Debit (৳)</th>
        <th class="text-right">Credit (৳)</th>
        <th class="text-right">Balance (৳)</th>
      </tr>
    </thead>
    <tbody>
      ${ledgerWithBalance.length === 0 ? `
        <tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No transactions found.</td></tr>
      ` : ledgerWithBalance.map(r => `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td><span class="badge ${r.type === 'INVOICE' ? 'badge-invoice' : 'badge-payment'}">${r.type}</span></td>
          <td>${r.description}</td>
          <td class="text-right" style="font-weight: 700;">${r.debit > 0 ? formatBDT(r.debit) : '—'}</td>
          <td class="text-right" style="font-weight: 700; color: #15803d;">${r.credit > 0 ? formatBDT(r.credit) : '—'}</td>
          <td class="text-right" style="font-weight: 900; color: #dc2626;">${formatBDT(r.runningBalance)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signature-area">
    <div class="signature-box">গ্রাহকের স্বাক্ষর (Customer)</div>
    <div class="signature-box">কর্তৃপক্ষের স্বাক্ষর (Authorized)</div>
  </div>

  <div class="footer">
    <div>Software: RM AutoManage • Developed by Md. Ibrahim Hossain</div>
    <div>স্বত্বাধিকারী: ${owner} • ${businessProfile.businessName}</div>
  </div>
</body>
</html>`;
      printHtmlViaIframe(printHtml);
    } catch (e) {
      console.error('Customer ledger print failed:', e);
      window.print();
    }
  };

  const handleShareWhatsApp = () => {
    const phone = sanitizePhoneNumber(customer.whatsappNumber || customer.phone);
    if (!phone) {
      alert('No WhatsApp phone number registered for this customer.');
      return;
    }

    const message = `*ACCOUNT STATEMENT - ${businessProfile.businessName}*\nCustomer: ${customer.name}\nTotal Purchases: ${formatBDT(customer.totalPurchased)}\nTotal Paid: ${formatBDT(customer.totalPaid)}\n*Current Outstanding Balance: ${formatBDT(customer.currentDue)}*\nKindly contact us for any query.\n📞 ${businessProfile.phone}`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPdf = async () => {
    if (!printableLedgerRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadElementAsPdf(
        printableLedgerRef.current,
        `Customer_Ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`,
        { format: 'a4', quality: 0.9 }
      );
    } catch (err) {
      console.error('Customer ledger PDF export error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!printableLedgerRef.current) return;
    setIsDownloadingImage(true);
    try {
      const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadElementAsImage(
        printableLedgerRef.current,
        `Customer_Ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.jpg`,
        { quality: 0.9 }
      );
    } catch (err) {
      console.error('Customer ledger image export error:', err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Controls */}
        <div className="no-print px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold shrink-0 flex items-center gap-1"
              title="Close / Back"
            >
              <ArrowLeft className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">← পিছনে</span>
            </button>
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {customer.name}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate sm:hidden">
                {customer.phone || 'কাস্টমার লেজার খতিয়ান'}
              </p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
              title="Share Statement via WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
              title="Download Statement as PDF"
            >
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>PDF</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isDownloadingImage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
              title="Download Statement as JPG Image"
            >
              {isDownloadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              <span>ছবি (JPG)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
              title="Print Customer Ledger"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0 ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Header Right */}
          <div className="sm:hidden flex items-center shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ledger Content */}
        <div ref={printableLedgerRef} className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 sm:pb-6 space-y-4 sm:space-y-6 text-xs print:p-0 print:m-0 bg-white dark:bg-slate-900">
          {/* Business & Customer Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {businessProfile.businessName}
              </h2>
              <p className="text-slate-500">{businessProfile.address}</p>
              <p className="text-slate-500">Phone: {businessProfile.phone} • WA: {businessProfile.whatsappNumber}</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                CUSTOMER STATEMENT OF ACCOUNT
              </div>
              <div className="text-slate-500 mt-1">Generated: {formatDate(new Date().toISOString())}</div>
            </div>
          </div>

          {/* Customer Profile & KPI Bar - 2x2 on mobile, 4-col on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer Details</span>
              <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5 truncate">{customer.name}</div>
              <div className="text-slate-500 mt-0.5">{customer.phone}</div>
              <div className="text-slate-400 text-[10px] truncate">{customer.address || 'Dhaka, Bangladesh'}</div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Purchases</span>
              <div className="font-black text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">{formatBDT(customer.totalPurchased)}</div>
              <span className="text-[9px] sm:text-[10px] text-slate-500">Lifetime volume</span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Paid</span>
              <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base mt-0.5">{formatBDT(customer.totalPaid)}</div>
              <span className="text-[9px] sm:text-[10px] text-slate-500">Cleared receipts</span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">Current Due (মোট দেনা)</span>
              <div className="font-black text-rose-600 dark:text-rose-400 text-base sm:text-lg mt-0.5">{formatBDT(customer.currentDue)}</div>
              <span className="text-[9px] sm:text-[10px] text-slate-500">Pending receivable</span>
            </div>
          </div>

          {/* Mobile Card List View (sm:hidden) - fits 100% within mobile viewport */}
          <div className="sm:hidden space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px]">
              <span>লেনদেন ইতিহাস ({ledgerWithBalance.length})</span>
              <span className="text-slate-400 text-[10px]">খতিয়ান রেকর্ড</span>
            </div>

            {ledgerWithBalance.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                কোনো লেনদেন পাওয়া যায়নি।
              </div>
            ) : (
              ledgerWithBalance.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatDate(item.date)}
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        item.type === 'INVOICE'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {item.type === 'INVOICE' ? 'ইনভয়েস বিল' : 'পেমেন্ট জমা'}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-snug">
                    {item.description}
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-left">
                      <span className="text-[9px] text-slate-400 block">বিল (Debit)</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.debit > 0 ? formatBDT(item.debit) : '—'}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 block">জমা (Credit)</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {item.credit > 0 ? formatBDT(item.credit) : '—'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-rose-500 block">জের (Balance)</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {formatBDT(item.runningBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop & Print Ledger Table (hidden on mobile, visible on sm+) */}
          <div className="hidden sm:block border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-black uppercase text-[10px] text-slate-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference / Description</th>
                  <th className="py-2.5 px-3 text-right">Debit (৳)</th>
                  <th className="py-2.5 px-3 text-right">Credit (৳)</th>
                  <th className="py-2.5 px-3 text-right">Balance (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ledgerWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No transaction entries found for this customer.
                    </td>
                  </tr>
                ) : (
                  ledgerWithBalance.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            item.type === 'INVOICE'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {item.debit > 0 ? formatBDT(item.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.credit > 0 ? formatBDT(item.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                        {formatBDT(item.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
            <div>Software: RM AutoManage • Developed by Md. Ibrahim Hossain</div>
            <div>Powered by TIKMERK IT (https://tikmerk.com)</div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Action Bar - 100% Guaranteed On-Screen at All Times on Phones */}
        <div className="sm:hidden no-print p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-1.5 shrink-0 z-30 shadow-2xl">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="py-2 px-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 transition-all disabled:opacity-50"
          >
            {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>PDF ফাইল</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloadingImage}
            className="py-2 px-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 transition-all disabled:opacity-50"
          >
            {isDownloadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            <span>ছবি (JPG)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2 px-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white font-bold text-[10px] flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
