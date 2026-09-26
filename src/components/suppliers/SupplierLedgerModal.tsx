import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Send,
  Building2,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { Supplier, Transaction } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatBDT, formatDate, sanitizePhoneNumber } from '../../utils/formatters';
import {
  printHtmlViaIframe,
  downloadElementAsPdf,
  downloadElementAsImage,
} from '../../utils/pdfGenerator';

interface SupplierLedgerModalProps {
  supplier: Supplier | null;
  onClose: () => void;
}

export const SupplierLedgerModal: React.FC<SupplierLedgerModalProps> = ({
  supplier,
  onClose,
}) => {
  const { purchases, transactions, businessProfile, language } = useApp();

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const printableLedgerRef = useRef<HTMLDivElement>(null);

  if (!supplier) return null;

  const supPurchases = purchases.filter((p) => p.supplierId === supplier.id);
  const supTx = transactions.filter((t: Transaction) => t.relatedEntityId === supplier.id);

  type LedgerRow = {
    date: string;
    type: 'BILL' | 'PAYMENT' | 'RETURN';
    ref: string;
    payable: number; // Purchase bill (+)
    paid: number; // Disbursed (-)
    description: string;
  };

  const rows: LedgerRow[] = [];

  supPurchases.forEach((p) => {
    rows.push({
      date: p.date,
      type: 'BILL',
      ref: p.purchaseNo,
      payable: p.grandTotal,
      paid: 0,
      description: `Purchase Bill #${p.purchaseNo} (${p.items.length} parts)`,
    });
    if (p.paidAmount > 0) {
      rows.push({
        date: p.date,
        type: 'PAYMENT',
        ref: `PAY-${p.purchaseNo}`,
        payable: 0,
        paid: p.paidAmount,
        description: `Disbursement on Purchase #${p.purchaseNo}`,
      });
    }
  });

  supTx
    .filter((tx: Transaction) => tx.type === 'supplier_payment')
    .forEach((tx: Transaction) => {
      rows.push({
        date: tx.date,
        type: 'PAYMENT',
        ref: tx.id,
        payable: 0,
        paid: tx.amount,
        description: tx.description || 'Supplier balance settlement voucher',
      });
    });

  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = supplier.openingBalance || 0;
  const ledgerWithBalance = rows.map((r) => {
    running = running + r.payable - r.paid;
    return { ...r, runningBalance: running };
  });

  const handleShareWhatsApp = () => {
    const rawPhone = supplier.whatsappNumber || supplier.phone;
    const phone = sanitizePhoneNumber(rawPhone);
    if (!phone) {
      alert(language === 'bn' ? 'সাপ্লায়ারের কোনো ফোন বা হোয়াটসঅ্যাপ নম্বর নেই।' : 'No phone number registered for this supplier.');
      return;
    }

    const message = `*সাপ্লায়ার স্টেটমেন্ট / SUPPLIER STATEMENT - ${businessProfile.businessName}*\nসাপ্লায়ার: ${supplier.companyName || supplier.name}\nমোট ক্রয় (Total Procured): ${formatBDT(supplier.totalPurchased)}\nমোট পরিশোধ (Total Paid): ${formatBDT(supplier.totalPaid)}\n*বর্তমান দেনা (Our Payable Balance): ${formatBDT(supplier.currentPayable)}*\nকোনো জিজ্ঞাসায় যোগাযোগ করুন: ${businessProfile.phone}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    try {
      const owner = businessProfile.ownerName || 'আব্দুর রহিম রনি';
      const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Supplier_Ledger_${(supplier.companyName || supplier.name).replace(/[^a-zA-Z0-9_-]/g, '_')}</title>
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
    .badge-bill { background: #dbeafe; color: #1e40af; }
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
      <div class="sub" style="font-weight: 700; color: #4338ca;">স্বত্বাধিকারী: ${owner}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; font-weight: 800; color: #4338ca; text-transform: uppercase;">Supplier Khatian & Account Statement</div>
      <div class="sub">Generated: ${formatDate(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-item">
      <div>Supplier / Vendor</div>
      <div class="summary-val">${supplier.companyName || supplier.name}</div>
      <div style="font-size: 9px; color: #64748b;">${supplier.phone || ''}</div>
    </div>
    <div class="summary-item">
      <div>Total Procured</div>
      <div class="summary-val">${formatBDT(supplier.totalPurchased)}</div>
    </div>
    <div class="summary-item">
      <div>Total Paid</div>
      <div class="summary-val" style="color: #15803d;">${formatBDT(supplier.totalPaid)}</div>
    </div>
    <div class="summary-item">
      <div>Current Payable (Our Debt)</div>
      <div class="due-val">${formatBDT(supplier.currentPayable)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Reference / Description</th>
        <th class="text-right">Bill (Payable) (৳)</th>
        <th class="text-right">Paid (Disbursed) (৳)</th>
        <th class="text-right">Net Payable Balance (৳)</th>
      </tr>
    </thead>
    <tbody>
      ${ledgerWithBalance.length === 0 ? `
        <tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No transaction entries found for this supplier.</td></tr>
      ` : ledgerWithBalance.map(r => `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td><span class="badge ${r.type === 'BILL' ? 'badge-bill' : 'badge-payment'}">${r.type}</span></td>
          <td>${r.description}</td>
          <td class="text-right" style="font-weight: 700;">${r.payable > 0 ? formatBDT(r.payable) : '—'}</td>
          <td class="text-right" style="font-weight: 700; color: #15803d;">${r.paid > 0 ? formatBDT(r.paid) : '—'}</td>
          <td class="text-right" style="font-weight: 900; color: #dc2626;">${formatBDT(r.runningBalance)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signature-area">
    <div class="signature-box">সরবরাহকারীর স্বাক্ষর</div>
    <div class="signature-box">অনুমোদিত স্বাক্ষর (RM Auto)</div>
  </div>

  <div class="footer">
    <div>Software: RM AutoManage • Developed by Md. Ibrahim Hossain</div>
    <div>স্বত্বাধিকারী: ${owner} • ${businessProfile.businessName}</div>
  </div>
</body>
</html>`;
      printHtmlViaIframe(printHtml);
    } catch (e) {
      console.error('Supplier ledger print failed:', e);
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!printableLedgerRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const safeName = (supplier.companyName || supplier.name || 'Supplier').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadElementAsPdf(
        printableLedgerRef.current,
        `Supplier_Ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`,
        { format: 'a4', quality: 0.9 }
      );
    } catch (err) {
      console.error('Supplier ledger PDF export error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!printableLedgerRef.current) return;
    setIsDownloadingImage(true);
    try {
      const safeName = (supplier.companyName || supplier.name || 'Supplier').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadElementAsImage(
        printableLedgerRef.current,
        `Supplier_Ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.jpg`,
        { quality: 0.9 }
      );
    } catch (err) {
      console.error('Supplier ledger image export error:', err);
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
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {supplier.companyName || supplier.name}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate sm:hidden">
                {supplier.phone || 'সাপ্লায়ার খতিয়ান'}
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
              title="Print Supplier Statement"
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

        <div ref={printableLedgerRef} className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 sm:pb-6 space-y-4 sm:space-y-6 text-xs print:p-0 bg-white dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {businessProfile.businessName}
              </h2>
              <p className="text-slate-500">{businessProfile.address}</p>
              <p className="text-slate-500">Phone: {businessProfile.phone} • স্বত্বাধিকারী: {businessProfile.ownerName || 'আব্দুর রহিম রনি'}</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                SUPPLIER KHATIAN & ACCOUNT STATEMENT
              </div>
              <div className="text-slate-500 mt-1">Date: {formatDate(new Date().toISOString())}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Supplier Company</span>
              <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5 truncate">
                {supplier.companyName || supplier.name}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">{supplier.phone}</div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Procured</span>
              <div className="font-black text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                {formatBDT(supplier.totalPurchased)}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Disbursed</span>
              <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base mt-0.5">
                {formatBDT(supplier.totalPaid)}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">
                Current Payable (Our Debt)
              </span>
              <div className="font-black text-rose-600 dark:text-rose-400 text-base sm:text-lg mt-0.5">
                {formatBDT(supplier.currentPayable)}
              </div>
            </div>
          </div>

          {/* Mobile Card List View (sm:hidden) - fits nicely within screen */}
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
                        item.type === 'BILL'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {item.type === 'BILL' ? 'বিল (ক্রয়)' : 'পেমেন্ট (পরিশোধ)'}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-snug">
                    {item.description}
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-left">
                      <span className="text-[9px] text-slate-400 block">বিল (Payable)</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.payable > 0 ? formatBDT(item.payable) : '—'}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 block">পরিশোধ (Paid)</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {item.paid > 0 ? formatBDT(item.paid) : '—'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-rose-500 block">দেনা জের</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {formatBDT(item.runningBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop & Print Table (hidden on mobile, visible on sm+) */}
          <div className="hidden sm:block border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-black uppercase text-[10px] text-slate-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference / Description</th>
                  <th className="py-2.5 px-3 text-right">Bill Amount (৳)</th>
                  <th className="py-2.5 px-3 text-right">Paid Amount (৳)</th>
                  <th className="py-2.5 px-3 text-right">Net Payable Balance (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ledgerWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No transaction entries found for this supplier.
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
                            item.type === 'BILL'
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
                        {item.payable > 0 ? formatBDT(item.payable) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.paid > 0 ? formatBDT(item.paid) : '—'}
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
            <div>স্বত্বাধিকারী: {businessProfile.ownerName || 'আব্দুর রহিম রনি'} • Powered by TIKMERK IT</div>
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
