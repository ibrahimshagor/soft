import React, { useState, useRef } from 'react';
import {
  X,
  Send,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  Wrench,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sale } from '../../types';
import {
  formatBDT,
  formatDate,
  formatDateTime,
  getWhatsAppInvoiceText,
  generateWhatsAppInvoiceUrl,
  resolveCustomerWhatsApp,
  sanitizePhoneNumber,
} from '../../utils/formatters';
import {
  generateElementAsPdfFile,
  generateElementAsImageFile,
  downloadFileDirectly,
} from '../../utils/pdfGenerator';
import { computeCustomerReconciledTotals } from '../../utils/customerReconciliation';

interface WhatsAppShareModalProps {
  sale: Sale;
  onClose: () => void;
  onOpenFullInvoice?: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  sale: saleProp,
  onClose,
  onOpenFullInvoice,
}) => {
  const { businessProfile, customers, language, t, sales, products, paymentRecords, loanRecords } = useApp();
  const sale = (sales || []).find((s) => s.id === saleProp.id) || saleProp;

  // Resolve best initial WhatsApp number
  const resolvedTarget = resolveCustomerWhatsApp(sale, customers);
  const [targetPhone, setTargetPhone] = useState(resolvedTarget.number);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Hidden offscreen container reference for snapshotting invoice
  const offscreenInvoiceRef = useRef<HTMLDivElement>(null);

  const cleanPhone = sanitizePhoneNumber(targetPhone);
  const invoiceFileName = `RM_Invoice_${sale.invoiceNo}`;

  // Resilient customer matching
  const matchedCustomerObj = (customers || []).find((c) => {
    if (sale.customerId && sale.customerId !== 'walk-in' && c.id === sale.customerId) return true;
    if (sale.customerPhone && c.phone && sanitizePhoneNumber(sale.customerPhone) === sanitizePhoneNumber(c.phone)) return true;
    if (sale.customerName && c.name && sale.customerName.trim().toLowerCase() === c.name.trim().toLowerCase()) return true;
    return false;
  });

  const customerObj = matchedCustomerObj || customers.find((c) => c.id === sale.customerId);

  const isCustomerMatch = (s: Sale) => {
    if (!s) return false;
    if (sale.customerId && sale.customerId !== 'walk-in' && s.customerId === sale.customerId) return true;
    if (customerObj && s.customerId && s.customerId === customerObj.id) return true;
    const curPhone = sanitizePhoneNumber(sale.customerPhone || customerObj?.phone || '');
    const itemPhone = sanitizePhoneNumber(s.customerPhone || '');
    if (curPhone && itemPhone && curPhone === itemPhone) return true;
    const curName = (sale.customerName || customerObj?.name || '').trim().toLowerCase();
    const itemName = (s.customerName || '').trim().toLowerCase();
    const isWalkIn = !curName || curName === 'walk-in' || curName === 'walk-in customer' || curName === 'ওয়াক-ইন কাস্টমার' || curName === 'ওয়াক-ইন কাস্টমার';
    if (!isWalkIn && itemName && curName === itemName) return true;
    return false;
  };

  const previousSalesWithDue = (sales || [])
    .filter((s) => s.id !== sale.id && isCustomerMatch(s) && (s.dueAmount || 0) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalPreviousDueFromSales = previousSalesWithDue.reduce(
    (sum, s) => sum + (s.dueAmount || 0),
    0
  );

  const customerTotalDueInDirectory = customerObj
    ? computeCustomerReconciledTotals(customerObj, sales, paymentRecords, loanRecords).currentDue
    : 0;
  const currentMemoDue = sale.dueAmount || 0;

  const totalCustomerDueCombined = Math.max(
    customerTotalDueInDirectory,
    currentMemoDue + totalPreviousDueFromSales
  );

  const totalPreviousDueCombined = Math.max(0, totalCustomerDueCombined - currentMemoDue);
  const openingBalanceDue = Math.max(0, totalPreviousDueCombined - totalPreviousDueFromSales);
  const originalOpeningBalance = openingBalanceDue > 0
    ? Math.max(customerObj?.openingBalance || 0, openingBalanceDue)
    : 0;
  const openingBalancePaid = Math.max(0, originalOpeningBalance - openingBalanceDue);

  const previousDuesSummaryList = [
    ...previousSalesWithDue.map((p) => ({
      invoiceNo: p.invoiceNo,
      date: p.date,
      grandTotal: p.grandTotal,
      paidAmount: p.paidAmount,
      dueAmount: p.dueAmount,
    })),
    ...(openingBalanceDue > 0
      ? [
          {
            invoiceNo: 'পূর্ববর্তী হিসাবের জের',
            date: customerObj?.createdAt || sale.date,
            grandTotal: originalOpeningBalance,
            paidAmount: openingBalancePaid,
            dueAmount: openingBalanceDue,
          },
        ]
      : []),
  ];

  const getMessageText = () => {
    return getWhatsAppInvoiceText(
      businessProfile.businessName,
      sale.invoiceNo,
      sale.date,
      sale.customerName,
      sale.items,
      sale.grandTotal,
      sale.paidAmount,
      sale.dueAmount,
      businessProfile.phone,
      businessProfile.address,
      sale.deliveryCharge || 0,
      undefined,
      totalCustomerDueCombined,
      previousDuesSummaryList
    );
  };

  // Option 1: Send Text Only directly to customer's WhatsApp chat
  const handleSendTextOnly = () => {
    const url = generateWhatsAppInvoiceUrl(
      targetPhone,
      businessProfile.businessName,
      sale.invoiceNo,
      sale.date,
      sale.customerName,
      sale.items,
      sale.grandTotal,
      sale.paidAmount,
      sale.dueAmount,
      businessProfile.phone,
      businessProfile.address,
      sale.deliveryCharge || 0,
      undefined,
      totalCustomerDueCombined,
      previousDuesSummaryList
    );
    window.open(url, '_blank');
    onClose();
  };

  // Download PDF locally only when user explicitly clicks the Download button
  const handleDownloadPdfOnly = async () => {
    if (!offscreenInvoiceRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const pdfFile = await generateElementAsPdfFile(offscreenInvoiceRef.current, invoiceFileName, {
        format: 'a4',
      });
      if (pdfFile) {
        downloadFileDirectly(pdfFile, `${invoiceFileName}.pdf`);
        setStatusNotice(language === 'bn' ? 'পিডিএফ ফাইল ডিভাইসে ডাউনলোড সম্পন্ন হয়েছে!' : 'PDF downloaded to device!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Option 2: Send PDF Directly WITHOUT saving/downloading to device storage
  const handlePdfDirectSend = async () => {
    if (!offscreenInvoiceRef.current) return;
    setIsGeneratingPdf(true);
    setStatusNotice(language === 'bn' ? 'মেমো প্রস্তুত হচ্ছে...' : 'Preparing Memo...');

    try {
      const pdfFile = await generateElementAsPdfFile(offscreenInvoiceRef.current, invoiceFileName, {
        format: 'a4',
      });

      if (!pdfFile) {
        throw new Error('Failed to generate PDF');
      }

      const text = getMessageText();

      // Mobile: Native share attaches the file directly to WhatsApp without downloading to local disk
      if (
        navigator.canShare &&
        navigator.canShare({ files: [pdfFile] }) &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          files: [pdfFile],
          title: `Invoice #${sale.invoiceNo}`,
          text,
        });
        setStatusNotice(language === 'bn' ? 'মেমো শেয়ার উইন্ডো খোলা হয়েছে।' : 'Share sheet opened.');
      } else {
        // Desktop / Fallback: open WhatsApp directly without saving file to storage
        const directUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(directUrl, '_blank');
        setStatusNotice(language === 'bn' ? 'হোয়াটসঅ্যাপে চ্যাট খোলা হয়েছে।' : 'WhatsApp chat opened.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Download Image locally only when user explicitly clicks Download
  const handleDownloadImageOnly = async () => {
    if (!offscreenInvoiceRef.current) return;
    setIsGeneratingImage(true);
    try {
      const imgFile = await generateElementAsImageFile(offscreenInvoiceRef.current, invoiceFileName, {
        format: 'a4',
      });
      if (imgFile) {
        downloadFileDirectly(imgFile, `${invoiceFileName}.jpg`);
        setStatusNotice(language === 'bn' ? 'মেমোর ছবি ডিভাইসে ডাউনলোড সম্পন্ন হয়েছে!' : 'Memo image downloaded to device!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Option 3: Send Image Directly WITHOUT saving/downloading to device storage
  const handleImageDirectSend = async () => {
    if (!offscreenInvoiceRef.current) return;
    setIsGeneratingImage(true);
    setStatusNotice(language === 'bn' ? 'ছবির মেমো প্রস্তুত হচ্ছে...' : 'Preparing Image Memo...');

    try {
      const imgFile = await generateElementAsImageFile(offscreenInvoiceRef.current, invoiceFileName, {
        format: 'a4',
      });

      if (!imgFile) throw new Error('Image failed');

      const text = getMessageText();

      // Mobile: Native share attaches the image directly to WhatsApp without saving to local downloads
      if (
        navigator.canShare &&
        navigator.canShare({ files: [imgFile] }) &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          files: [imgFile],
          title: `Invoice #${sale.invoiceNo}`,
          text,
        });
        setStatusNotice(language === 'bn' ? 'শেয়ার উইন্ডো খোলা হয়েছে।' : 'Share sheet opened.');
      } else {
        // Desktop: Try copying image to clipboard for Ctrl+V paste into WhatsApp Web, then open chat
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                [imgFile.type]: imgFile,
              }),
            ]);
          } catch {
            // fallback
          }
        }
        const directUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(directUrl, '_blank');
        setStatusNotice(language === 'bn' ? 'হোয়াটসঅ্যাপে চ্যাট খোলা হয়েছে।' : 'WhatsApp chat opened.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyText = async () => {
    const text = getMessageText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <>
      {/* ================= MODAL DIALOG ================= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 dark:text-white">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">
                  {language === 'bn' ? 'হোয়াটসঅ্যাপে ইনভয়েস পাঠান' : 'Send Invoice via WhatsApp'}
                </h3>
                <p className="text-xs text-emerald-100 font-medium">
                  {language === 'bn' ? `মেমো #${sale.invoiceNo} • ${sale.customerName}` : `Invoice #${sale.invoiceNo} • ${sale.customerName}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Target Phone Number Box */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  {language === 'bn' ? 'গ্রাহকের হোয়াটসঅ্যাপ নম্বর:' : 'Target WhatsApp Number:'}
                </span>
                {resolvedTarget.isSpecificWhatsApp && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {language === 'bn' ? 'ডিরেক্টরি থেকে সংযুক্ত' : 'Linked from Directory'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {cleanPhone
                  ? language === 'bn'
                    ? `সরাসরি +${cleanPhone} নম্বরে চ্যাট খুলে যাবে`
                    : `Direct chat will open for +${cleanPhone}`
                  : language === 'bn'
                  ? 'কোনো নম্বর দেওয়া না থাকলে হোয়াটসঅ্যাপের কন্টাক্ট লিস্ট খুলবে'
                  : 'WhatsApp contact picker will open if empty'}
              </p>
            </div>

            {/* Notification / Status Message */}
            {statusNotice && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="font-semibold">{statusNotice}</div>
              </div>
            )}

            {/* Options List */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === 'bn' ? 'পাঠানোর মাধ্যম বেছে নিন:' : 'Choose Sending Method:'}
              </div>

              {/* OPTION 1: TEXT ONLY */}
              <div className="p-3.5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{language === 'bn' ? '১. শুধুই টেক্সট (দ্রুততম)' : '1. Text Only (Fastest)'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold">Direct</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'কোনো ফাইল ছাড়া তাৎক্ষণিক মেমো মেসেজ সরাসরি চ্যাটে ঢুকে যাবে।'
                        : 'Instant memo summary typed directly into customer chat.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSendTextOnly}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সরাসরি পাঠান' : 'Send Text'}</span>
                </button>
              </div>

              {/* OPTION 2: TEXT WITH PDF */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 bg-white dark:bg-slate-800/40 transition-all space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {language === 'bn' ? '২. টেক্সট সহ পিডিএফ (PDF File)' : '2. Text with PDF File'}
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                        ~180 KB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'সরাসরি সেন্ড করলে মোবাইলে আলাদা ডাউনলোড হবে না। মেমো সেভ করতে চাইলে ডাউনলোড চাপুন।'
                        : 'Sending directly does not save duplicate files. Click Download if you want a copy.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handlePdfDirectSend}
                    disabled={isGeneratingPdf}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {language === 'bn'
                        ? 'কাস্টমারকে সরাসরি পাঠান'
                        : 'Send Directly to Customer'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdfOnly}
                    disabled={isGeneratingPdf}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    title={language === 'bn' ? 'ডিভাইসে পিডিএফ ডাউনলোড করুন' : 'Download PDF file'}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>

              {/* OPTION 3: TEXT WITH IMAGE */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/60 bg-white dark:bg-slate-800/40 transition-all space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {language === 'bn' ? '৩. টেক্সট সহ মেমো ছবি (Memo Image)' : '3. Text with Memo Image'}
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                        ~150 KB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'মেমোর ঝকঝকে ছবি। সরাসরি পাঠাতে সেন্ড চাপুন, অথবা নিজের জন্য মেমোর ছবি সেভ করুন।'
                        : 'Clean memo image. Send directly without saving, or click Download to keep a copy.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleImageDirectSend}
                    disabled={isGeneratingImage}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {language === 'bn'
                        ? 'কাস্টমারকে সরাসরি পাঠান'
                        : 'Send Directly to Customer'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadImageOnly}
                    disabled={isGeneratingImage}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    title={language === 'bn' ? 'ডিভাইসে ছবি ডাউনলোড করুন' : 'Download Memo Image'}
                  >
                    <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Utilities: Copy Text & Open Full Invoice */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">{language === 'bn' ? 'টেক্সট কপি হয়েছে!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'bn' ? 'মেমো টেক্সট কপি' : 'Copy Text'}</span>
                  </>
                )}
              </button>

              {onOpenFullInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullInvoice();
                  }}
                  className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'পূর্ণ রসিদ দেখুন' : 'View Memo'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= HIDDEN OFFSCREEN INVOICE CONTAINER ================= */}
      {/* This clean container is snapshot by html2canvas-pro even when called from sales list or dashboard */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '780px',
          background: '#ffffff',
          color: '#0f172a',
          zIndex: -100,
          pointerEvents: 'none',
        }}
      >
        <div ref={offscreenInvoiceRef} className="bg-white text-black p-5">
          {/* Header: Shop Branding */}
          <div className="flex items-start justify-between pb-3 border-b-2 border-black">
            <div className="flex items-start gap-3">
              {businessProfile.logoUrl ? (
                <img
                  src={businessProfile.logoUrl}
                  alt={businessProfile.businessName}
                  className="w-12 h-12 object-contain rounded-lg border border-black shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-500 flex items-center justify-center font-black shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-black tracking-tight text-black leading-tight">
                  {businessProfile.businessName}
                </h1>
                <div className="text-[13px] font-bold text-black mt-0.5">
                  {businessProfile.proprietorTitle || 'স্বত্বাধিকারী'}: {businessProfile.ownerName || 'আব্দুর রহিম রনি'}
                </div>
                <p className="text-[11px] text-black max-w-md mt-0.5 leading-snug">
                  {businessProfile.address}
                </p>
                <div className="text-[10.5px] text-black font-medium mt-0.5 flex flex-wrap gap-x-3">
                  <span>📞 {businessProfile.phone}</span>
                  <span>💬 WA: {businessProfile.whatsappNumber}</span>
                  {businessProfile.email && <span>✉️ {businessProfile.email}</span>}
                </div>
                {businessProfile.binVat && (
                  <div className="text-[10px] text-black mt-0.5">
                    BIN/VAT: {businessProfile.binVat} • Trade: {businessProfile.tradeLicense}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs font-extrabold uppercase tracking-widest text-amber-700">
                CASH MEMO / INVOICE
              </div>
              <div className="text-lg font-black font-mono mt-0.5 text-black">
                #{sale.invoiceNo}
              </div>
              <div className="text-[11px] text-black font-semibold mt-0.5">
                Date: {formatDateTime(sale.date)}
              </div>
              <div className="mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-black border border-black">
                  {sale.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-black text-xs">
            <div>
              <span className="text-[10px] font-extrabold text-black uppercase tracking-wider block mb-0.5">
                Billed To (Customer):
              </span>
              <div className="font-black text-lg text-black leading-tight">{sale.customerName}</div>
              {sale.customerPhone && (
                <div className="text-black font-semibold mt-0.5">Phone: {sale.customerPhone}</div>
              )}
              {customerObj?.address && (
                <div className="text-black mt-0.5">{customerObj.address}</div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold text-black uppercase tracking-wider block mb-0.5">
                Vehicle & Details:
              </span>
              <div className="font-bold text-black">{sale.vehicleInfo || 'General / Walk-in'}</div>
              <div className="text-black font-medium mt-0.5">
                Sold By: {sale.sellerName === 'Engr. Rezaul Karim' ? (businessProfile.ownerName || 'আব্দুর রহিম রনি') : (sale.sellerName || 'আব্দুর রহিম রনি')}
              </div>
              {sale.notes && <div className="text-black font-medium mt-0.5 italic">"{sale.notes}"</div>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-xs my-2">
            <thead>
              <tr className="border-b-2 border-black text-black uppercase tracking-wider text-[10.5px] font-black">
                <th className="py-1.5 px-1 text-center w-7">#</th>
                <th className="py-1.5 px-2">Item / Spare Part</th>
                <th className="py-1.5 px-2 text-center w-16">Qty</th>
                <th className="py-1.5 px-2 text-right w-24">Rate (Tk)</th>
                <th className="py-1.5 px-2 text-right w-24">Total (Tk)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {sale.items.map((it, idx) => {
                const prod = (products || []).find((p) => p.id === it.productId);
                const code = it.productCode || prod?.productCode;
                const brand = it.brand || prod?.brand;
                const origin = it.origin || prod?.countryOfOrigin;
                const condition = it.condition || prod?.condition || 'New';

                return (
                  <tr key={idx}>
                    <td className="py-1.5 px-1 text-center text-black font-bold align-top">{idx + 1}</td>
                    <td className="py-1.5 px-2 align-top">
                      <div className="font-bold text-black leading-snug">{it.productName}</div>
                      <div className="text-[9.5px] text-black flex flex-wrap items-center gap-1 mt-0.5 leading-tight">
                        {code && (
                          <span className="font-mono font-bold text-blue-800 bg-blue-50 px-1 rounded border border-blue-300">
                            কোড: {code}
                          </span>
                        )}
                        {brand && (
                          <span className="bg-white font-semibold text-black px-1 rounded border border-black">
                            ব্র্যান্ড: {brand}
                          </span>
                        )}
                        {origin && (
                          <span className="bg-white font-semibold text-black px-1 rounded border border-black">
                            অরিজিন: {origin}
                          </span>
                        )}
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-1 rounded border border-black uppercase">
                          [{condition}]
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-black align-top">{it.quantity} {it.unit || ''}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-medium text-black align-top">{Math.round(it.sellingPrice).toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-black align-top">{Math.round(it.total).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Financial Summary & Previous Dues: Left = Previous Dues + Notes/Terms, Right = Totals */}
          <div className="grid grid-cols-12 gap-3 pt-2.5 border-t-2 border-black text-xs items-start">
            <div className="col-span-7 space-y-2 min-w-0">
              {/* Dedicated Previous Dues Breakdown Box on Left Side */}
              <div className="p-2 rounded-lg border-2 border-rose-400 bg-rose-50/40 text-[11px] space-y-1">
                <div className="flex items-center justify-between pb-1 border-b border-rose-300 font-bold text-rose-950 text-[10.5px]">
                  <span>কাস্টমারের পূর্বের বকেয়া ইনভয়েসের তালিকা (Previous Due Invoices)</span>
                  <span className="text-[10px] text-rose-700 font-extrabold shrink-0 ml-1">
                    {previousSalesWithDue.length > 0 || openingBalanceDue > 0
                      ? `${previousSalesWithDue.length + (openingBalanceDue > 0 ? 1 : 0)}টি বকেয়া মেমো`
                      : 'পরিশোধিত'}
                  </span>
                </div>

                {previousSalesWithDue.length > 0 || openingBalanceDue > 0 ? (
                  <>
                    <table className="w-full text-left text-[9.5px] text-black">
                      <thead>
                        <tr className="border-b border-rose-300 text-black uppercase font-bold">
                          <th className="py-0.5">তারিখ</th>
                          <th className="py-0.5 px-1">ইনভয়েস #</th>
                          <th className="py-0.5 px-1 text-right">মোট বিল</th>
                          <th className="py-0.5 px-1 text-right">পরিশোধ</th>
                          <th className="py-0.5 text-right">বকেয়া</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-200">
                        {previousSalesWithDue.map((prev) => (
                          <tr key={prev.id} className="text-black">
                            <td className="py-0.5 text-black font-mono">
                              {formatDate(prev.date)}
                            </td>
                            <td className="py-0.5 px-1 font-mono font-bold text-black">
                              #{prev.invoiceNo}
                            </td>
                            <td className="py-0.5 px-1 text-right text-black font-mono">
                              {formatBDT(prev.grandTotal)}
                            </td>
                            <td className="py-0.5 px-1 text-right text-emerald-800 font-mono font-semibold">
                              {formatBDT(prev.paidAmount)}
                            </td>
                            <td className="py-0.5 text-right font-bold text-rose-700 font-mono">
                              {formatBDT(prev.dueAmount)}
                            </td>
                          </tr>
                        ))}
                        {openingBalanceDue > 0 && (
                          <tr className="text-black">
                            <td className="py-0.5 text-black font-mono">
                              {customerObj?.createdAt ? formatDate(customerObj.createdAt) : 'প্রারম্ভিক'}
                            </td>
                            <td className="py-0.5 px-1 text-black font-bold">
                              পূর্বের হিসাব (Opening)
                            </td>
                            <td className="py-0.5 px-1 text-right text-black font-mono">
                              {formatBDT(originalOpeningBalance)}
                            </td>
                            <td className="py-0.5 px-1 text-right text-emerald-800 font-mono font-semibold">
                              {formatBDT(openingBalancePaid)}
                            </td>
                            <td className="py-0.5 text-right font-bold text-rose-700 font-mono">
                              {formatBDT(openingBalanceDue)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="pt-1 border-t border-rose-300 flex justify-between text-[10.5px] text-black font-bold">
                      <span>পূর্বের মোট বকেয়া:</span>
                      <span className="text-rose-800 font-extrabold">
                        {formatBDT(totalPreviousDueFromSales + openingBalanceDue)}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10.5px] text-black font-bold">
                      <span>চলতি মেমোর বকেয়া:</span>
                      <span className="text-rose-800 font-extrabold">
                        {formatBDT(sale.dueAmount)}
                      </span>
                    </div>

                    <div className="pt-1 border-t-2 border-rose-400 flex justify-between text-[11px] font-black text-rose-800">
                      <span>সর্বমোট বকেয়া (চলতি + পূর্বের):</span>
                      <span className="text-xs font-mono">
                        {formatBDT(totalCustomerDueCombined)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-0.5 text-center text-[10.5px] font-bold text-emerald-800">
                    ✓ কাস্টমারের পূর্বের কোনো বকেয়া নেই (No Previous Due)
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-5 space-y-1 text-black">
              <div className="flex justify-between text-black font-medium">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">Tk. {Math.round(sale.subtotal).toLocaleString()}</span>
              </div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>Discount:</span>
                  <span className="font-mono">- Tk. {Math.round(sale.discountTotal).toLocaleString()}</span>
                </div>
              )}
              {sale.deliveryCharge !== undefined && sale.deliveryCharge > 0 && (
                <div className="flex justify-between text-blue-800 font-bold">
                  <span>Delivery / Transport:</span>
                  <span className="font-mono">+ Tk. {Math.round(sale.deliveryCharge).toLocaleString()}</span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-black font-medium">
                  <span>VAT / Tax:</span>
                  <span className="font-mono font-bold">+ Tk. {Math.round(sale.taxAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1.5 pb-1 border-t-2 border-b-2 border-black text-black">
                <span>Grand Total:</span>
                <span className="font-mono">Tk. {Math.round(sale.grandTotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-extrabold pt-0.5">
                <span>Paid Amount:</span>
                <span className="font-mono">Tk. {Math.round(sale.paidAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 text-rose-700">
                <span>Due Balance (চলতি বকেয়া):</span>
                <span className="font-mono">Tk. {Math.round(sale.dueAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Full-width Terms & Conditions */}
          <div className="mt-2.5 p-2 rounded-lg border border-black bg-white text-[9.5px] text-black leading-snug w-full">
            <span className="font-bold text-black">শর্তাবলী (Terms & Conditions): </span>
            <span>
              {businessProfile.invoiceNotes ||
                'Sold goods are non-refundable after 7 days and must be accompanied by the original cash memo. Electrical & sensor parts carry no replacement warranty once installed. (বিক্রিত মাল মূল অক্ষত প্যাকেটে ক্যাশ মেমোসহ ৭ দিনের মধ্যে পরিবর্তনযোগ্য। ইলেকট্রিক ও সেন্সর পার্টস ফিটিং করার পর কোনো ওয়ারেন্টি বা ফেরত প্রযোজ্য নয়।)'}
            </span>
          </div>

          {/* Signatures & Footer Credits */}
          <div className="pt-7 mt-3 border-t border-black flex flex-row items-end justify-between text-xs text-black">
            <div className="text-center">
              <div className="w-36 border-b border-black pb-0.5 mb-0.5 font-bold text-black text-xs">
                Customer Acceptance (গ্রাহক স্বাক্ষর)
              </div>
              <span className="text-[10px] text-black font-medium block">Received Goods in Order</span>
            </div>

            <div className="text-center">
              {businessProfile.showSignatureOnInvoice !== false && businessProfile.signatureUrl ? (
                <img
                  src={businessProfile.signatureUrl}
                  alt="Authorized Signature"
                  className="h-9 mx-auto object-contain mb-0.5"
                />
              ) : null}
              <div className="w-44 border-b border-black pb-0.5 mb-0.5 font-bold text-black text-xs">
                {businessProfile.ownerName
                  ? `${businessProfile.proprietorTitle || 'স্বত্বাধিকারী'}: ${businessProfile.ownerName}`
                  : (businessProfile.invoiceSignatureLabel || 'স্বত্বাধিকারী: আব্দুর রহিম রনি')}
              </div>
              <span className="text-[10px] font-bold text-black block">
                {businessProfile.businessName}
              </span>
            </div>
          </div>

          {/* Software Branding Footer */}
          <div className="mt-4 pt-2 border-t border-black text-center text-[9.5px] font-medium text-black">
            <span>Software: RM AutoManage • Developed by Md. Ibrahim Hossain • Powered by TIKMERK IT (https://tikmerk.com)</span>
          </div>
        </div>
      </div>
    </>
  );
};
