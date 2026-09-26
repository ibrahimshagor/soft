import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  Share2,
  FileText,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  Wrench,
  Download,
  Loader2,
  Copy,
  Check,
  Phone,
  ArrowLeft,
  MessageSquare,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { Sale } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  formatBDT,
  formatDate,
  formatDateTime,
  generateWhatsAppInvoiceUrl,
  getWhatsAppInvoiceText,
  resolveCustomerWhatsApp,
  sanitizePhoneNumber,
} from '../../utils/formatters';
import {
  downloadElementAsPdf,
  downloadElementAsImage,
  generateElementAsPdfFile,
  generateElementAsImageFile,
  downloadFileDirectly,
} from '../../utils/pdfGenerator';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface InvoiceViewModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  return <InvoiceViewModalContent key={sale.id} sale={sale} onClose={onClose} />;
};

const InvoiceViewModalContent: React.FC<{ sale: Sale; onClose: () => void }> = ({ sale, onClose }) => {
  const { businessProfile, t, customers, language, sales, products } = useApp();
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activePhone, setActivePhone] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const printableInvoiceRef = useRef<HTMLDivElement>(null);

  // Resilient customer matching
  const matchedCustomerObj = (customers || []).find((c) => {
    if (sale.customerId && sale.customerId !== 'walk-in' && c.id === sale.customerId) return true;
    if (sale.customerPhone && c.phone && sanitizePhoneNumber(sale.customerPhone) === sanitizePhoneNumber(c.phone)) return true;
    if (sale.customerName && c.name && sale.customerName.trim().toLowerCase() === c.name.trim().toLowerCase()) return true;
    return false;
  });

  const customerObj = matchedCustomerObj || (customers || []).find((c) => c.id === sale.customerId);
  const { number: targetPhone, isSpecificWhatsApp } = resolveCustomerWhatsApp(sale, customers);

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
    if (!isWalkIn && itemName && (curName === itemName || (curName.length >= 4 && itemName.includes(curName)) || (itemName.length >= 4 && curName.includes(itemName)))) return true;
    return false;
  };

  // Outstanding previous sales for this customer
  const previousSalesWithDue = (sales || [])
    .filter((s) => s.id !== sale.id && isCustomerMatch(s) && (s.dueAmount || 0) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalPreviousDueFromSales = previousSalesWithDue.reduce(
    (sum, s) => sum + (s.dueAmount || 0),
    0
  );

  // Customer's total outstanding balance across their account (from Customer Directory)
  const customerTotalDueInDirectory = customerObj ? (customerObj.currentDue || 0) : 0;
  const currentMemoDue = sale.dueAmount || 0;

  // The Grand Total Due of this customer across all accounts (guaranteed to match Customer Directory)
  const totalCustomerDueCombined = Math.max(
    customerTotalDueInDirectory,
    currentMemoDue + totalPreviousDueFromSales
  );

  // Total previous due balance of the customer before this current invoice
  const totalPreviousDueCombined = Math.max(0, totalCustomerDueCombined - currentMemoDue);

  // Earlier balance / opening balance remaining prior to the recorded previous invoices
  const openingBalanceDue = Math.max(0, totalPreviousDueCombined - totalPreviousDueFromSales);

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
            grandTotal: openingBalanceDue,
            paidAmount: 0,
            dueAmount: openingBalanceDue,
          },
        ]
      : []),
  ];

  // Synchronize active phone with latest resolved customer phone
  useEffect(() => {
    if (targetPhone) {
      setActivePhone(targetPhone);
    }
  }, [targetPhone]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.error('window.print error', e);
    }
  };

  const handleOpenShareModal = () => {
    setActivePhone(targetPhone || '');
    setShareNotice(null);
    setShowShareModal(true);
  };

  // 1. Text Only WhatsApp Share
  const handleSendTextOnly = () => {
    const phone = activePhone.trim() || targetPhone;
    const url = generateWhatsAppInvoiceUrl(
      phone,
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
      sale.isAdjustedAfterReturn
        ? {
            isAdjusted: true,
            originalTotal: sale.originalGrandTotal,
            returnedAmount: sale.returnedAmount,
            reason: sale.returnNotes,
          }
        : undefined,
      totalCustomerDueCombined,
      previousDuesSummaryList
    );
    window.open(url, '_blank');
    setShowShareModal(false);
  };

  // 2. Text with PDF File Share
  const handleSendWithPdf = async () => {
    if (!printableInvoiceRef.current) return;
    setIsSharingPdf(true);
    setShareNotice(null);

    const safeBusinessName = businessProfile.businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `CashMemo_${sale.invoiceNo}_${safeBusinessName}.pdf`;

    try {
      const pdfFile = await generateElementAsPdfFile(printableInvoiceRef.current, filename, {
        format: printFormat,
      });

      const messageText = getWhatsAppInvoiceText(
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
        sale.isAdjustedAfterReturn
          ? {
              isAdjusted: true,
              originalTotal: sale.originalGrandTotal,
              returnedAmount: sale.returnedAmount,
              reason: sale.returnNotes,
            }
          : undefined,
        totalCustomerDueCombined
      );

      // Check native Web Share API with files support
      if (pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Cash Memo #${sale.invoiceNo} - ${businessProfile.businessName}`,
          text: messageText,
        });
        setShowShareModal(false);
      } else {
        // Fallback: download PDF and launch WhatsApp with message
        if (pdfFile) {
          downloadFileDirectly(pdfFile, filename);
        }
        const phone = activePhone.trim() || targetPhone;
        const url = generateWhatsAppInvoiceUrl(
          phone,
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
          sale.deliveryCharge || 0
        );
        window.open(url, '_blank');
        setShareNotice(
          language === 'bn'
            ? 'পিডিএফ ফাইলটি ডাউনলোড হয়েছে! হোয়াটসঅ্যাপ চ্যাটে ফাইলটি এটাচ করে পাঠিয়ে দিন।'
            : 'PDF memo downloaded! Please attach it into the WhatsApp chat.'
        );
      }
    } catch (err) {
      console.error('Error sharing PDF:', err);
    } finally {
      setIsSharingPdf(false);
    }
  };

  // 3. Text with Memo Image Share
  const handleSendWithImage = async () => {
    if (!printableInvoiceRef.current) return;
    setIsSharingImage(true);
    setShareNotice(null);

    const safeBusinessName = businessProfile.businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `CashMemo_${sale.invoiceNo}_${safeBusinessName}.png`;

    try {
      const imageFile = await generateElementAsImageFile(printableInvoiceRef.current, filename, {
        format: printFormat,
      });

      const messageText = getWhatsAppInvoiceText(
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
        totalCustomerDueCombined
      );

      // Check native Web Share API with image file support
      if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        await navigator.share({
          files: [imageFile],
          title: `Cash Memo #${sale.invoiceNo} - ${businessProfile.businessName}`,
          text: messageText,
        });
        setShowShareModal(false);
      } else {
        // Fallback: download Image and launch WhatsApp with message
        if (imageFile) {
          downloadFileDirectly(imageFile, filename);
        }
        const phone = activePhone.trim() || targetPhone;
        const url = generateWhatsAppInvoiceUrl(
          phone,
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
          totalCustomerDueCombined
        );
        window.open(url, '_blank');
        setShareNotice(
          language === 'bn'
            ? 'মেমোর ছবিটি সেভ হয়েছে! হোয়াটসঅ্যাপ চ্যাটে ছবিটি এটাচ করে পাঠিয়ে দিন।'
            : 'Invoice image downloaded! Please attach it into the WhatsApp chat.'
        );
      }
    } catch (err) {
      console.error('Error sharing image:', err);
    } finally {
      setIsSharingImage(false);
    }
  };

  const handleShareDirect = async () => {
    const text = getWhatsAppInvoiceText(
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
      sale.isAdjustedAfterReturn
        ? {
            isAdjusted: true,
            originalTotal: sale.originalGrandTotal,
            returnedAmount: sale.returnedAmount,
            reason: sale.returnNotes,
          }
        : undefined,
      totalCustomerDueCombined
    );

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cash Memo #${sale.invoiceNo} - ${businessProfile.businessName}`,
          text,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Navigator share error, showing fallback modal', err);
        }
      }
    }

    setShowShareModal(true);
  };

  const handleCopyInvoiceText = () => {
    const text = getWhatsAppInvoiceText(
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
      sale.isAdjustedAfterReturn
        ? {
            isAdjusted: true,
            originalTotal: sale.originalGrandTotal,
            returnedAmount: sale.returnedAmount,
            reason: sale.returnNotes,
          }
        : undefined,
      totalCustomerDueCombined
    );
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleDownloadPdf = async () => {
    if (!printableInvoiceRef.current) return;
    setIsDownloadingPdf(true);

    const safeBusinessName = businessProfile.businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `CashMemo_${sale.invoiceNo}_${safeBusinessName}.pdf`;

    try {
      const success = await downloadElementAsPdf(printableInvoiceRef.current, filename, {
        format: printFormat,
      });

      if (!success) {
        alert(
          language === 'bn'
            ? 'পিডিএফ তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে প্রিন্ট বাটনে ক্লিক করে "Save as PDF" নির্বাচন করুন।'
            : 'PDF generation failed. Please use Print button and choose "Save as PDF".'
        );
      }
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Could not download PDF. Please use the Print option.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!printableInvoiceRef.current) return;
    setIsDownloadingImage(true);

    const safeBusinessName = businessProfile.businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `CashMemo_${sale.invoiceNo}_${safeBusinessName}.jpg`;

    try {
      const success = await downloadElementAsImage(printableInvoiceRef.current, filename, {
        format: printFormat,
      });

      if (!success) {
        alert(
          language === 'bn'
            ? 'ছবি তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
            : 'Image generation failed. Please try again.'
        );
      }
    } catch (err) {
      console.error('Image download error:', err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const generateFullInvoiceHtml = () => {
    if (printFormat === 'thermal') {
      return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt_${sale.invoiceNo}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    body { font-family: monospace; font-size: 11px; padding: 4px; color: #000; background: #fff; width: 72mm; margin: 0 auto; line-height: 1.3; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dashed-line { border-bottom: 1px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { border-bottom: 1px solid #000; padding: 3px 0; text-align: left; }
    td { padding: 3px 0; vertical-align: top; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .grand { font-size: 13px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin-top: 2px; }
    @media print {
      body { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div style="font-size: 14px; font-weight: 900;">${businessProfile.businessName}</div>
    ${businessProfile.ownerName ? `<div style="font-size: 10px; font-weight: bold;">${businessProfile.proprietorTitle || 'স্বত্বাধিকারী'}: ${businessProfile.ownerName}</div>` : ''}
    <div style="font-size: 10px;">${businessProfile.address}</div>
    <div style="font-size: 10px;">Tel: ${businessProfile.phone}</div>
    ${businessProfile.binVat ? `<div style="font-size: 9px;">BIN: ${businessProfile.binVat}</div>` : ''}
    <div class="bold" style="margin-top: 3px;">*** CASH RECEIPT (ক্যাশ মেমো) ***</div>
  </div>

  <div class="dashed-line"></div>

  <div style="font-size: 10px;">
    <div>Inv: #${sale.invoiceNo}</div>
    <div>Date: ${new Date(sale.date).toLocaleString('en-GB')}</div>
    <div>Cust: ${sale.customerName}</div>
    ${sale.customerPhone ? `<div>Phone: ${sale.customerPhone}</div>` : ''}
    ${sale.vehicleInfo ? `<div>Vehicle: ${sale.vehicleInfo}</div>` : ''}
  </div>

  <div class="dashed-line"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Price</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items
        .map((item) => {
          const prod = (products || []).find((p) => p.id === item.productId);
          const partCode = item.productCode || prod?.productCode;
          const brandName = item.brand || prod?.brand;
          const originName = item.origin || prod?.countryOfOrigin;
          const conditionName = item.condition || prod?.condition || 'New';

          return `
        <tr>
          <td>
            <div style="font-weight: bold;">${item.productName}</div>
            <div style="font-size: 9px; color: #444;">
              ${[
                partCode ? `Code: ${partCode}` : '',
                brandName ? `Brand: ${brandName}` : '',
                originName ? `Origin: ${originName}` : '',
                `[${conditionName}]`,
                item.sku ? `SKU: ${item.sku}` : '',
              ]
                .filter(Boolean)
                .join(' | ')}
            </div>
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">৳${item.sellingPrice}</td>
          <td class="text-right">৳${item.total}</td>
        </tr>
      `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="dashed-line"></div>

  <div>
    <div class="totals-row"><span>Subtotal (মোট বিল):</span><span>৳ ${sale.subtotal.toLocaleString()}</span></div>
    ${sale.discountTotal > 0 ? `<div class="totals-row"><span>Discount (ছাড়):</span><span>-৳ ${sale.discountTotal.toLocaleString()}</span></div>` : ''}
    ${sale.deliveryCharge && sale.deliveryCharge > 0 ? `<div class="totals-row"><span>Delivery (ডেলিভারি খরচ):</span><span>+৳ ${sale.deliveryCharge.toLocaleString()}</span></div>` : ''}
    ${sale.taxAmount > 0 ? `<div class="totals-row"><span>VAT (ভ্যাট):</span><span>+৳ ${sale.taxAmount.toLocaleString()}</span></div>` : ''}
    <div class="totals-row grand"><span>TOTAL (সর্বমোট বিল):</span><span>৳ ${sale.grandTotal.toLocaleString()}</span></div>
    <div class="totals-row bold"><span>PAID (পরিশোধ):</span><span>৳ ${sale.paidAmount.toLocaleString()}</span></div>
    <div class="totals-row bold"><span>CURRENT DUE (চলতি বকেয়া):</span><span>৳ ${sale.dueAmount.toLocaleString()}</span></div>
  </div>

  ${previousSalesWithDue.length > 0 || openingBalanceDue > 0 ? `
    <div style="border: 1px dashed #000; padding: 4px; margin-top: 6px; font-size: 9px;">
      <div class="bold" style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 2px;">*** পূর্বের বকেয়া মেমোসমূহের তালিকা ***</div>
      ${previousSalesWithDue.map(prev => `
        <div style="display: flex; justify-content: space-between; padding: 1px 0;">
          <span>${new Date(prev.date).toLocaleDateString('en-GB')} #${prev.invoiceNo} (মোট: ৳${prev.grandTotal.toLocaleString()})</span>
          <span class="bold">৳${prev.dueAmount.toLocaleString()}</span>
        </div>
      `).join('')}
      ${openingBalanceDue > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 1px 0;">
          <span>প্রারম্ভিক হিসাবের বকেয়া</span>
          <span class="bold">৳${openingBalanceDue.toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="dashed-line" style="margin: 3px 0;"></div>
      <div style="display: flex; justify-content: space-between;">
        <span>পূর্বের মোট বকেয়া:</span>
        <span class="bold">৳${(totalPreviousDueFromSales + openingBalanceDue).toLocaleString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>চলতি মেমোর বকেয়া:</span>
        <span class="bold">৳${sale.dueAmount.toLocaleString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between;" class="bold grand">
        <span>সর্বমোট বকেয়া (চলতি+পূর্বের):</span>
        <span>৳${totalCustomerDueCombined.toLocaleString()}</span>
      </div>
    </div>
  ` : ''}

  <div class="dashed-line"></div>

  <div class="center" style="font-size: 9px; margin-top: 6px;">
    <p>Thank you for your business!<br>আমাদের সাথে কেনাকাটার জন্য আন্তরিক ধন্যবাদ!</p>
    <p>${businessProfile.invoiceNotes || 'Goods returnable within 7 days in original packaging with cash memo. (বিক্রিত মাল মূল প্যাকেটে ৭ দিনের মধ্যে পরিবর্তনযোগ্য)'}</p>
    <p style="margin-top: 4px; color: #555;">Powered by TIKMERK IT</p>
  </div>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cash_Memo_${sale.invoiceNo}_${businessProfile.businessName}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 820px; margin: 0 auto; background: #fff; font-size: 13px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; gap: 16px; }
    .logo-box { display: flex; align-items: center; gap: 12px; }
    .logo-img { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; }
    .title { font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1.1; }
    .tagline { font-size: 12px; color: #64748b; margin-top: 2px; }
    .contact-info { font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4; }
    .memo-badge { text-align: right; }
    .memo-tag { font-size: 13px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px; }
    .invoice-num { font-size: 20px; font-weight: 900; font-family: monospace; color: #0f172a; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; margin-top: 4px; text-transform: uppercase; border: 1px solid currentColor; }
    .status-paid { color: #059669; background: #ecfdf5; border-color: #a7f3d0; }
    .status-due { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
    .status-part { color: #d97706; background: #fffbeb; border-color: #fde68a; }
    .info-grid { display: flex; justify-content: space-between; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-top: 16px; font-size: 12px; }
    .info-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .table-wrapper { width: 100%; overflow-x: auto; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; }
    td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-area { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-top: 16px; }
    .remarks-box { flex: 1; font-size: 11px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
    .totals-card { width: 280px; font-size: 12px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; color: #475569; }
    .totals-grand { font-size: 15px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 6px 0; margin: 4px 0; }
    .totals-paid { font-weight: 700; color: #059669; }
    .totals-due { font-weight: 800; color: #dc2626; }
    .footer-signatures { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 12px; font-size: 11px; color: #64748b; }
    .sig-block { text-align: center; width: 180px; border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 600; color: #1e293b; }
    .terms-text { margin-top: 20px; font-size: 10px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 8px; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print-area { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">
      ${businessProfile.logoUrl ? `<img src="${businessProfile.logoUrl}" class="logo-img" alt="Logo" />` : ''}
      <div>
        <div class="title">${businessProfile.businessName}</div>
        ${businessProfile.ownerName ? `<div style="font-size: 13px; font-weight: bold; color: #1e293b; margin-top: 1px;">${businessProfile.proprietorTitle || 'স্বত্বাধিকারী'}: ${businessProfile.ownerName}</div>` : ''}
        <div class="tagline">${businessProfile.tagline || 'Automobile Parts & Engine Spares'}</div>
        <div class="contact-info">
          📍 ${businessProfile.address}<br>
          📞 Phone: ${businessProfile.phone} | WA: ${businessProfile.whatsappNumber}
          ${businessProfile.email ? ` | ✉️ ${businessProfile.email}` : ''}
          ${businessProfile.binVat ? `<br>BIN / VAT: ${businessProfile.binVat}` : ''}
          ${businessProfile.tradeLicense ? ` • Trade License: ${businessProfile.tradeLicense}` : ''}
        </div>
      </div>
    </div>
    <div class="memo-badge">
      <div class="memo-tag">ক্যাশ মেমো / CASH MEMO</div>
      <div class="invoice-num">#${sale.invoiceNo}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${new Date(sale.date).toLocaleDateString('en-GB')}</div>
      <div class="status-badge ${sale.paymentStatus === 'PAID' ? 'status-paid' : sale.paymentStatus === 'PARTIALLY_PAID' ? 'status-part' : 'status-due'}">
        ${sale.paymentStatus}
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div class="info-label">Customer / Billed To:</div>
      <strong style="font-size: 13px; color: #0f172a;">${sale.customerName}</strong><br>
      ${sale.customerPhone ? `<span>Phone: ${sale.customerPhone}</span><br>` : ''}
      ${customerObj?.address ? `<span>Address: ${customerObj.address}</span>` : ''}
    </div>
    <div style="text-align: right;">
      <div class="info-label">Vehicle & Served By:</div>
      ${sale.vehicleInfo ? `<strong>Vehicle: ${sale.vehicleInfo}</strong><br>` : '<span>Over the counter sale</span><br>'}
      <span>Served By: ${sale.sellerName === 'Engr. Rezaul Karim' ? (businessProfile.ownerName || 'আব্দুর রহিম রনি') : (sale.sellerName || 'আব্দুর রহিম রনি')}</span>
      ${sale.dueDate && sale.dueAmount > 0 ? `<br><strong style="color: #dc2626;">Payment Due Date: ${new Date(sale.dueDate).toLocaleDateString('en-GB')}</strong>` : ''}
    </div>
  </div>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th style="width: 32px;" class="text-center">#</th>
          <th>Part Description & Details</th>
          <th style="width: 100px;">SKU</th>
          <th style="width: 65px;" class="text-center">Qty</th>
          <th style="width: 95px;" class="text-right">Unit Price</th>
          <th style="width: 105px;" class="text-right">Total (৳)</th>
        </tr>
      </thead>
      <tbody>
        ${sale.items
          .map((it, idx) => {
            const prod = (products || []).find((p) => p.id === it.productId);
            const partCode = it.productCode || prod?.productCode;
            const brandName = it.brand || prod?.brand;
            const originName = it.origin || prod?.countryOfOrigin;
            const conditionName = it.condition || prod?.condition || 'New';

            return `
          <tr>
            <td class="text-center" style="color: #64748b;">${idx + 1}</td>
            <td>
              <strong style="font-size: 13px;">${it.productName}</strong>
              <div style="font-size: 11px; color: #334155; margin-top: 3px; display: flex; flex-wrap: wrap; gap: 6px;">
                ${partCode ? `<span style="background: #eff6ff; color: #1d4ed8; padding: 1px 6px; border-radius: 4px; font-weight: 700; border: 1px solid #bfdbfe;">কোড: ${partCode}</span>` : ''}
                ${brandName ? `<span style="background: #f8fafc; color: #0f172a; padding: 1px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">ব্র্যান্ড: <strong>${brandName}</strong></span>` : ''}
                ${originName ? `<span style="background: #f8fafc; color: #0f172a; padding: 1px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">অরিজিন: <strong>${originName}</strong></span>` : ''}
                <span style="font-weight: 700; color: ${conditionName.toLowerCase() === 'new' ? '#047857' : '#b45309'}; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; border: 1px solid #e2e8f0; text-transform: uppercase;">কন্ডিশন: [${conditionName}]</span>
                ${it.category ? `<span style="color: #64748b; padding: 1px 4px;">(${it.category})</span>` : ''}
                ${it.vehicleModel ? `<span style="color: #64748b; font-style: italic;">• ${it.vehicleModel}</span>` : ''}
              </div>
            </td>
            <td style="font-family: monospace; color: #64748b; font-weight: 600;">${it.sku}</td>
            <td class="text-center" style="font-weight: 600;">${it.quantity} ${it.unit}</td>
            <td class="text-right">৳ ${(it.sellingPrice ?? it.unitPrice ?? 0).toLocaleString()}</td>
            <td class="text-right"><strong>৳ ${it.total.toLocaleString()}</strong></td>
          </tr>
        `;
          })
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="totals-area">
    <div class="remarks-box">
      ${sale.notes ? `<strong>Notes / Remarks (মন্তব্য):</strong> ${sale.notes}<br><br>` : ''}
      <strong>Terms & Conditions (বিক্রয় ও ওয়ারেন্টি শর্তাবলী):</strong><br>
      ${businessProfile.invoiceNotes || 'Sold goods are non-refundable after 7 days and must be accompanied by the original cash memo. Electrical & sensor parts carry no replacement warranty once installed. (বিক্রিত মাল মূল অক্ষত প্যাকেটে ক্যাশ মেমোসহ ৭ দিনের মধ্যে পরিবর্তনযোগ্য। ইলেকট্রিক ও সেন্সর পার্টস ফিটিং করার পর কোনো ওয়ারেন্টি বা ফেরত প্রযোজ্য নয়।)'}
    </div>

    <div class="totals-card">
      <div class="totals-row"><span>Subtotal (মোট বিল):</span> <span>৳ ${sale.subtotal.toLocaleString()}</span></div>
      ${sale.discountTotal > 0 ? `<div class="totals-row" style="color: #059669;"><span>Discount (ছাড়):</span> <span>- ৳ ${sale.discountTotal.toLocaleString()}</span></div>` : ''}
      ${sale.deliveryCharge && sale.deliveryCharge > 0 ? `<div class="totals-row" style="color: #2563eb;"><span>Delivery (ডেলিভারি খরচ):</span> <span>+ ৳ ${sale.deliveryCharge.toLocaleString()}</span></div>` : ''}
      ${sale.taxAmount > 0 ? `<div class="totals-row"><span>Tax / VAT (ভ্যাট):</span> <span>+ ৳ ${sale.taxAmount.toLocaleString()}</span></div>` : ''}
      ${sale.isAdjustedAfterReturn ? `
        <div class="totals-row" style="color: #64748b; font-size: 11px;"><span>Original Total (পূর্ববর্তী মোট):</span> <span>৳ ${(sale.originalGrandTotal || sale.grandTotal).toLocaleString()}</span></div>
        <div class="totals-row" style="color: #dc2626; font-weight: bold; font-size: 11px;"><span>Return Deductions (পণ্য ফেরত সমন্বয়):</span> <span>- ৳ ${(sale.returnedAmount || 0).toLocaleString()}</span></div>
      ` : ''}
      <div class="totals-grand totals-row"><span>${sale.isAdjustedAfterReturn ? 'Adjusted Net Bill (সমন্বিত মোট):' : 'Grand Total (সর্বমোট বিল):'}</span> <span>৳ ${sale.grandTotal.toLocaleString()}</span></div>
      <div class="totals-row totals-paid"><span>Paid Amount (পরিশোধ):</span> <span>৳ ${sale.paidAmount.toLocaleString()}</span></div>
      <div class="totals-row totals-due" style="font-size: 13px;"><span>Remaining Due (চলতি মেমোর বকেয়া):</span> <span>৳ ${sale.dueAmount.toLocaleString()}</span></div>

      <!-- Space and Previous Dues Ledger Breakdown Box -->
      <div style="margin-top: 14px; border: 1.5px solid #f87171; background: #fffaf0; border-radius: 8px; padding: 8px 10px; font-size: 11px;">
        <div style="font-weight: 800; color: #991b1b; border-bottom: 1px dashed #fca5a5; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>কাস্টমারের পূর্বের বকেয়া ইনভয়েসের তালিকা (Previous Due Invoices)</span>
          <span>${previousSalesWithDue.length > 0 || openingBalanceDue > 0 ? `${previousSalesWithDue.length + (openingBalanceDue > 0 ? 1 : 0)}টি বকেয়া মেমো` : ''}</span>
        </div>

        ${previousSalesWithDue.length > 0 || openingBalanceDue > 0 ? `
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 6px;">
            <thead>
              <tr style="border-bottom: 1px solid #fecaca; color: #7f1d1d; text-align: left;">
                <th style="padding: 2px 0;">তারিখ (Date)</th>
                <th style="padding: 2px 4px;">ইনভয়েস নং (Invoice #)</th>
                <th style="padding: 2px 4px; text-align: right;">মোট বিল</th>
                <th style="padding: 2px 4px; text-align: right;">পরিশোধ</th>
                <th style="padding: 2px 0; text-align: right;">বকেয়া (Due)</th>
              </tr>
            </thead>
            <tbody>
              ${previousSalesWithDue.map(prev => `
                <tr style="border-bottom: 1px dotted #fee2e2; color: #374151;">
                  <td style="padding: 3px 0;">${new Date(prev.date).toLocaleDateString('en-GB')}</td>
                  <td style="padding: 3px 4px; font-family: monospace; font-weight: bold;">#${prev.invoiceNo}</td>
                  <td style="padding: 3px 4px; text-align: right; color: #4b5563;">৳ ${prev.grandTotal.toLocaleString()}</td>
                  <td style="padding: 3px 4px; text-align: right; color: #15803d;">৳ ${prev.paidAmount.toLocaleString()}</td>
                  <td style="padding: 3px 0; text-align: right; font-weight: bold; color: #dc2626;">৳ ${prev.dueAmount.toLocaleString()}</td>
                </tr>
              `).join('')}
              ${openingBalanceDue > 0 ? `
                <tr style="border-bottom: 1px dotted #fee2e2; color: #374151;">
                  <td style="padding: 3px 0;">প্রারম্ভিক হিসাব</td>
                  <td style="padding: 3px 4px;" colspan="3">প্রারম্ভিক হিসাবের বকেয়া (Account Opening Due)</td>
                  <td style="padding: 3px 0; text-align: right; font-weight: bold; color: #dc2626;">৳ ${openingBalanceDue.toLocaleString()}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
          <div style="display: flex; justify-content: space-between; font-weight: 700; color: #991b1b; padding-top: 2px;">
            <span>পূর্বের মোট বকেয়া:</span>
            <span>৳ ${(totalPreviousDueFromSales + openingBalanceDue).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; color: #991b1b; padding-top: 2px;">
            <span>চলতি মেমোর বকেয়া:</span>
            <span>৳ ${sale.dueAmount.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 12px; color: #b91c1c; border-top: 1.5px solid #f87171; margin-top: 4px; padding-top: 4px;">
            <span>সর্বমোট বকেয়া (চলতি + পূর্বের বকেয়া):</span>
            <span>৳ ${totalCustomerDueCombined.toLocaleString()}</span>
          </div>
        ` : `
          <div style="color: #15803d; font-weight: 600; text-align: center; padding: 4px 0;">
            ✓ পূর্বে কোনো বকেয়া নেই (No Previous Due)
          </div>
        `}
      </div>
    </div>
  </div>

  <div class="footer-signatures">
    <div class="sig-block">
      Customer Acceptance (গ্রাহক স্বাক্ষর)<br>
      <span style="font-size: 9px; font-weight: normal; color: #94a3b8;">Received goods in good order</span>
    </div>
    <div class="sig-block">
      ${businessProfile.showSignatureOnInvoice !== false && businessProfile.signatureUrl ? `<img src="${businessProfile.signatureUrl}" style="height: 38px; max-width: 140px; margin: 0 auto 2px; display: block; object-fit: contain;" alt="Signature" />` : ''}
      <div style="font-size: 11px; font-weight: bold; color: #0f172a;">${businessProfile.ownerName ? `${businessProfile.proprietorTitle || 'স্বত্বাধিকারী'}: ${businessProfile.ownerName}` : (businessProfile.invoiceSignatureLabel || 'স্বত্বাধিকারী / Authorized Signature')}</div>
      <span style="font-size: 10px; font-weight: bold; color: #475569;">${businessProfile.businessName}</span>
    </div>
  </div>

  <div class="terms-text">
    Software: RM AutoManage • Developed by Md. Ibrahim Hossain • Powered by TIKMERK IT (https://tikmerk.com)
  </div>
</body>
</html>`;
  };

  const handleDownloadInvoice = () => {
    try {
      const htmlContent = generateFullInvoiceHtml();
      const filename = `CashMemo_${sale.invoiceNo}_${businessProfile.businessName.replace(/\s+/g, '_')}.html`;
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 300);
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not download file. Please use Print -> Save as PDF.');
    }
  };

  const handlePrintPopout = () => {
    try {
      const htmlContent = generateFullInvoiceHtml();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 400);
        return;
      }
    } catch (e) {
      console.warn('Popout window blocked, falling back to window.print', e);
    }
    window.print();
  };

  const getStatusBadge = (status: Sale['paymentStatus']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PAID
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
            <Clock className="w-3.5 h-3.5" />
            PARTIALLY PAID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            UNPAID / DUE
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print px-3 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            {/* Prominent Back Button (Critical for Mobile view) */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all shrink-0 active:scale-95"
              title={language === 'bn' ? 'ফিরে যান / ইনভয়েস বন্ধ করুন' : 'Back / Close Invoice'}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'পিছনে' : 'Back'}</span>
            </button>

            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              #{sale.invoiceNo}
            </span>
            {getStatusBadge(sale.paymentStatus)}
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  printFormat === 'a4'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  printFormat === 'thermal'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Thermal POS
              </button>
            </div>

            {/* Dedicated WhatsApp / Share Button (Opens 3 sharing options) */}
            <button
              type="button"
              onClick={handleOpenShareModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
              title={language === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান (টেক্সট / পিডিএফ / ইমেজ)' : 'Send to WhatsApp'}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {language === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}
              </span>
            </button>

            {/* General Share Button (Works for any channel) */}
            <button
              type="button"
              onClick={handleShareDirect}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold shadow-xs active:scale-95 transition-all"
              title={language === 'bn' ? 'ইনভয়েস শেয়ার করুন' : 'Share Invoice'}
            >
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden md:inline">{language === 'bn' ? 'শেয়ার' : 'Share'}</span>
            </button>

            {/* Image Download Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloadingImage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
              title={language === 'bn' ? 'মেমোর ছবি ডাউনলোড করুন (JPG)' : 'Download Memo Image (JPG)'}
            >
              {isDownloadingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden sm:inline">
                {isDownloadingImage
                  ? language === 'bn' ? 'ছবি হচ্ছে...' : 'Saving...'
                  : language === 'bn' ? 'ছবি' : 'Image'}
              </span>
            </button>

            {/* PDF Download Button (Generates real PDF) */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
              title="Download Cash Memo as PDF document"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="hidden sm:inline">
                {isDownloadingPdf
                  ? language === 'bn' ? 'পিডিএফ হচ্ছে...' : 'Generating...'
                  : 'PDF'}
              </span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrintPopout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xs active:scale-95 transition-colors"
              title="Print Cash Memo"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('print')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-slate-100/60 dark:bg-slate-950/60 print:p-0 print:bg-white">
          <div ref={printableInvoiceRef} className="bg-white text-slate-900 rounded-xl shadow-xs print:shadow-none print:rounded-none">
          {printFormat === 'a4' ? (
            /* ================= STANDARD A4 INVOICE FORMAT ================= */
            <div className="max-w-2xl mx-auto bg-white text-slate-900 p-3 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 print:border-none print:shadow-none print:p-0">
              {/* Header: Shop Branding */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  {businessProfile.logoUrl ? (
                    <img
                      src={businessProfile.logoUrl}
                      alt={businessProfile.businessName}
                      className="w-10 h-10 sm:w-14 sm:h-14 object-contain rounded-lg border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-amber-500 flex items-center justify-center font-black shrink-0">
                      <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {businessProfile.businessName}
                    </h1>
                    {businessProfile.ownerName && (
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {businessProfile.proprietorTitle || 'স্বত্বাধিকারী'}: {businessProfile.ownerName}
                      </p>
                    )}
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5">
                      {businessProfile.address}
                    </p>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-2 sm:gap-x-3">
                      <span>📞 {businessProfile.phone}</span>
                      <span>💬 WA: {businessProfile.whatsappNumber}</span>
                      {businessProfile.email && <span>✉️ {businessProfile.email}</span>}
                    </div>
                    {businessProfile.binVat && (
                      <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">
                        BIN / VAT: {businessProfile.binVat} • Trade Lic: {businessProfile.tradeLicense}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${
                    sale.isAdjustedAfterReturn ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {sale.isAdjustedAfterReturn
                      ? (language === 'bn' ? 'সংশোধিত ইনভয়েস (ফেরত সমন্বিত)' : 'ADJUSTED CASH MEMO')
                      : 'CASH MEMO / INVOICE'}
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono mt-0.5 text-slate-900 dark:text-white">
                    #{sale.invoiceNo}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                    Date: {formatDateTime(sale.date)}
                  </div>
                  <div className="mt-1.5">{getStatusBadge(sale.paymentStatus)}</div>
                </div>
              </div>

              {/* Return Adjustment Banner if adjusted */}
              {sale.isAdjustedAfterReturn && (
                <div className="my-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                    <RotateCcw className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>
                      {language === 'bn'
                        ? `পণ্য ফেরত সমন্বয় সম্পন্ন: -${formatBDT(sale.returnedAmount || 0)} টাকা বিল থেকে বাদ দেওয়া হয়েছে`
                        : `Adjusted after return: -${formatBDT(sale.returnedAmount || 0)} deducted from bill`}
                    </span>
                  </div>
                  {sale.lastAdjustedAt && (
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatDate(sale.lastAdjustedAt)}
                    </span>
                  )}
                </div>
              )}

              {/* Customer & Vehicle Info Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Billed To (Customer):
                  </span>
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {sale.customerName}
                  </div>
                  {sale.customerPhone && (
                    <div className="text-slate-500 mt-0.5">Phone: {sale.customerPhone}</div>
                  )}
                  {customerObj?.address && (
                    <div className="text-slate-400 mt-0.5">{customerObj.address}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Vehicle Details & Salesman:
                  </span>
                  {sale.vehicleInfo ? (
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-amber-500" />
                      <span>{sale.vehicleInfo}</span>
                    </div>
                  ) : (
                    <div className="text-slate-400">General Automobile Over-the-counter</div>
                  )}
                  <div className="text-slate-500 mt-0.5">
                    Served By: {sale.sellerName === 'Engr. Rezaul Karim' ? (businessProfile.ownerName || 'আব্দুর রহিম রনি') : (sale.sellerName || 'আব্দুর রহিম রনি')}
                  </div>
                  {sale.dueDate && sale.dueAmount > 0 && (
                    <div className="text-rose-600 font-bold mt-1">
                      Due Payment Date: {formatDate(sale.dueDate)}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Table - responsive container */}
              <div className="py-3 sm:py-4 overflow-x-auto">
                <table className="w-full min-w-[340px] text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-900 dark:border-slate-100 text-[10px] sm:text-[11px] font-black uppercase">
                      <th className="py-2 px-1">#</th>
                      <th className="py-2 px-2">Part Description</th>
                      <th className="py-2 px-1 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Unit Price</th>
                      <th className="py-2 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sale.items.map((item, idx) => {
                      const prod = (products || []).find((p) => p.id === item.productId);
                      const partCode = item.productCode || prod?.productCode;
                      const brandName = item.brand || prod?.brand;
                      const originName = item.origin || prod?.countryOfOrigin;
                      const conditionName = item.condition || prod?.condition || 'New';

                      return (
                        <tr key={idx} className="py-2">
                          <td className="py-2 px-1 text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-2">
                            <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs">
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                              {partCode && (
                                <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  কোড: {partCode}
                                </span>
                              )}
                              {brandName && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                  ব্র্যান্ড: {brandName}
                                </span>
                              )}
                              {originName && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                  অরিজিন: {originName}
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold uppercase border ${
                                  conditionName.toLowerCase() === 'new'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                [{conditionName}]
                              </span>
                              <span className="font-mono text-slate-400">SKU: {item.sku}</span>
                              {item.category && (
                                <span className="text-slate-400 italic">({item.category})</span>
                              )}
                              {item.vehicleModel && (
                                <span className="italic text-slate-400">• {item.vehicleModel}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-1 text-center font-semibold text-[11px] whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap">
                            {formatBDT(item.sellingPrice)}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-white text-[11px] whitespace-nowrap">
                            {formatBDT(item.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary & Calculations */}
              <div className="pt-4 border-t-2 border-slate-900 dark:border-slate-100 flex flex-col sm:flex-row justify-between gap-6 text-xs">
                <div className="space-y-2 sm:max-w-xs">
                  {sale.notes && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">
                        Remarks / মন্তব্য:
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">{sale.notes}</span>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                      শর্তাবলী (Terms & Conditions):
                    </span>
                    <span>
                      {businessProfile.invoiceNotes ||
                        'Sold goods are non-refundable after 7 days and must be accompanied by the original cash memo. Electrical & sensor parts carry no replacement warranty once installed. (বিক্রিত মাল মূল অক্ষত প্যাকেটে ক্যাশ মেমোসহ ৭ দিনের মধ্যে পরিবর্তনযোগ্য। ইলেকট্রিক ও সেন্সর পার্টস ফিটিং করার পর কোনো ওয়ারেন্টি বা ফেরত প্রযোজ্য নয়।)'}
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-72 space-y-1.5">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatBDT(sale.subtotal)}
                    </span>
                  </div>

                  {sale.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Discount:</span>
                      <span className="font-semibold">- {formatBDT(sale.discountTotal)}</span>
                    </div>
                  )}

                  {sale.deliveryCharge && sale.deliveryCharge > 0 ? (
                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                      <span>Delivery Charge:</span>
                      <span className="font-semibold">+ {formatBDT(sale.deliveryCharge)}</span>
                    </div>
                  ) : null}

                  {sale.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>VAT / Tax:</span>
                      <span className="font-semibold">+ {formatBDT(sale.taxAmount)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                    <span>Grand Total:</span>
                    <span className="text-base text-amber-600 dark:text-amber-400">
                      {formatBDT(sale.grandTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>Paid Amount:</span>
                    <span>{formatBDT(sale.paidAmount)}</span>
                  </div>

                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-black">
                    <span>Remaining Due (চলতি বকেয়া):</span>
                    <span>{formatBDT(sale.dueAmount)}</span>
                  </div>

                  {/* Space and Dedicated Previous Dues Breakdown Box */}
                  <div className="mt-4 p-3 rounded-xl border-2 border-rose-300 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/20 text-xs space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-rose-200 dark:border-rose-800 font-bold text-rose-900 dark:text-rose-200 text-[11px]">
                      <span>কাস্টমারের পূর্বের বকেয়া ইনভয়েসের তালিকা (Previous Due Invoices)</span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                        {previousSalesWithDue.length > 0 || openingBalanceDue > 0
                          ? `${previousSalesWithDue.length + (openingBalanceDue > 0 ? 1 : 0)}টি বকেয়া মেমো`
                          : 'পরিশোধিত'}
                      </span>
                    </div>

                    {previousSalesWithDue.length > 0 || openingBalanceDue > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[10px]">
                            <thead>
                              <tr className="border-b border-rose-200 dark:border-rose-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                                <th className="py-1">তারিখ (Date)</th>
                                <th className="py-1 px-1">ইনভয়েস #</th>
                                <th className="py-1 px-1 text-right">মোট বিল</th>
                                <th className="py-1 px-1 text-right">পরিশোধ</th>
                                <th className="py-1 text-right">বকেয়া (Due)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-100 dark:divide-rose-900/30">
                              {previousSalesWithDue.map((prev) => (
                                <tr key={prev.id} className="py-1 text-slate-800 dark:text-slate-200">
                                  <td className="py-1 text-slate-600 dark:text-slate-400 font-mono">
                                    {formatDate(prev.date)}
                                  </td>
                                  <td className="py-1 px-1 font-mono font-bold text-slate-900 dark:text-white">
                                    #{prev.invoiceNo}
                                  </td>
                                  <td className="py-1 px-1 text-right text-slate-600 dark:text-slate-400 font-mono">
                                    {formatBDT(prev.grandTotal)}
                                  </td>
                                  <td className="py-1 px-1 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                                    {formatBDT(prev.paidAmount)}
                                  </td>
                                  <td className="py-1 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                                    {formatBDT(prev.dueAmount)}
                                  </td>
                                </tr>
                              ))}
                              {openingBalanceDue > 0 && (
                                <tr className="py-1 text-slate-800 dark:text-slate-200">
                                  <td className="py-1 text-slate-600 dark:text-slate-400 font-mono">
                                    {customerObj?.createdAt ? formatDate(customerObj.createdAt) : 'প্রারম্ভিক'}
                                  </td>
                                  <td className="py-1 px-1 font-semibold text-slate-700 dark:text-slate-300" colSpan={3}>
                                    প্রারম্ভিক হিসাবের বকেয়া (Account Opening Due)
                                  </td>
                                  <td className="py-1 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                                    {formatBDT(openingBalanceDue)}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-1.5 border-t border-rose-200 dark:border-rose-800/80 flex justify-between text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                          <span>পূর্বের মোট বকেয়া:</span>
                          <span className="text-rose-700 dark:text-rose-300 font-bold">
                            {formatBDT(totalPreviousDueFromSales + openingBalanceDue)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                          <span>চলতি মেমোর বকেয়া:</span>
                          <span className="text-rose-700 dark:text-rose-300 font-bold">
                            {formatBDT(sale.dueAmount)}
                          </span>
                        </div>

                        <div className="pt-1.5 border-t-2 border-rose-300 dark:border-rose-700 flex justify-between text-xs font-black text-rose-700 dark:text-rose-300">
                          <span>সর্বমোট বকেয়া (চলতি + পূর্বের):</span>
                          <span className="text-sm font-mono">
                            {formatBDT(totalCustomerDueCombined)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="py-1 text-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        ✓ কাস্টমারের পূর্বের কোনো বকেয়া নেই (No Previous Due)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Signatures & Footer Credits */}
              <div className="pt-8 sm:pt-12 mt-4 sm:mt-6 border-t border-slate-200 dark:border-slate-800 flex flex-row items-end justify-between text-xs text-slate-500 gap-4">
                <div className="text-center">
                  <div className="w-28 sm:w-36 border-b border-slate-400 dark:border-slate-600 pb-1 mb-1 font-medium text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">
                    Customer Acceptance (গ্রাহক স্বাক্ষর)
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 block">Received Goods in Order</span>
                </div>

                <div className="text-center">
                  {businessProfile.showSignatureOnInvoice !== false && businessProfile.signatureUrl ? (
                    <img
                      src={businessProfile.signatureUrl}
                      alt="Authorized Signature"
                      className="h-8 sm:h-10 mx-auto object-contain mb-1"
                    />
                  ) : null}
                  <div className="w-32 sm:w-44 border-b border-slate-400 dark:border-slate-600 pb-1 mb-1 font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs">
                    {businessProfile.ownerName
                      ? `${businessProfile.proprietorTitle || 'স্বত্বাধিকারী'}: ${businessProfile.ownerName}`
                      : (businessProfile.invoiceSignatureLabel || 'স্বত্বাধিকারী')}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 dark:text-slate-300 block">
                    {businessProfile.businessName}
                  </span>
                </div>
              </div>

              {/* Exact required credits inside printed invoice */}
              <div className="mt-8 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
                <span>Software: RM AutoManage • Developed by Md. Ibrahim Hossain • Powered by TIKMERK IT (https://tikmerk.com)</span>
              </div>
            </div>
          ) : (
            /* ================= THERMAL POS 80MM COMPACT RECEIPT ================= */
            <div className="max-w-[320px] mx-auto bg-white text-slate-950 p-4 rounded shadow-sm text-xs font-mono print:p-0 print:shadow-none">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="text-sm font-black uppercase tracking-tight">
                  {businessProfile.businessName}
                </h2>
                {businessProfile.ownerName && (
                  <p className="text-[11px] font-bold text-slate-700">
                    {businessProfile.proprietorTitle || 'স্বত্বাধিকারী'}: {businessProfile.ownerName}
                  </p>
                )}
                <p className="text-[10px] text-slate-600">{businessProfile.address}</p>
                <p className="text-[10px] text-slate-600">Tel: {businessProfile.phone}</p>
                {businessProfile.binVat && <p className="text-[9px] text-slate-500">BIN: {businessProfile.binVat}</p>}
                <p className="text-[10px] font-bold mt-1 uppercase">*** CASH RECEIPT (ক্যাশ মেমো) ***</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
                <div>Inv: #{sale.invoiceNo}</div>
                <div>Date: {formatDateTime(sale.date)}</div>
                <div>Cust: {sale.customerName}</div>
                {sale.customerPhone && <div>Phone: {sale.customerPhone}</div>}
                {sale.vehicleInfo && <div>Vehicle: {sale.vehicleInfo}</div>}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th>Item</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, i) => {
                      const prod = (products || []).find((p) => p.id === item.productId);
                      const partCode = item.productCode || prod?.productCode;
                      const brandName = item.brand || prod?.brand;
                      const originName = item.origin || prod?.countryOfOrigin;
                      const conditionName = item.condition || prod?.condition || 'New';

                      return (
                        <tr key={i}>
                          <td className="py-1 pr-1">
                            <div className="font-bold line-clamp-1">{item.productName}</div>
                            <div className="text-[9px] text-slate-600 flex flex-wrap gap-1 mt-0.5">
                              {partCode && <span className="font-bold text-blue-700">কোড: {partCode}</span>}
                              {brandName && <span>• {brandName}</span>}
                              {originName && <span>• {originName}</span>}
                              <span className="font-bold">[{conditionName}]</span>
                              <span className="font-mono text-slate-400">SKU: {item.sku}</span>
                            </div>
                          </td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-right">{item.sellingPrice}</td>
                          <td className="text-right font-bold">{item.total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatBDT(sale.subtotal)}</span>
                </div>
                {sale.discountTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatBDT(sale.discountTotal)}</span>
                  </div>
                )}
                {sale.deliveryCharge && sale.deliveryCharge > 0 ? (
                  <div className="flex justify-between text-blue-600">
                    <span>Delivery:</span>
                    <span>+{formatBDT(sale.deliveryCharge)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-black text-xs border-t border-slate-300 pt-1">
                  <span>TOTAL:</span>
                  <span>{formatBDT(sale.grandTotal)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>PAID:</span>
                  <span>{formatBDT(sale.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600">
                  <span>DUE (চলতি বকেয়া):</span>
                  <span>{formatBDT(sale.dueAmount)}</span>
                </div>

                {previousSalesWithDue.length > 0 || openingBalanceDue > 0 ? (
                  <div className="border border-dashed border-red-400 p-2 mt-2 rounded space-y-1 bg-red-50/50 text-[10px]">
                    <div className="font-bold text-red-900 border-b border-dashed border-red-300 pb-1 text-center">
                      *** পূর্বের বকেয়া মেমোসমূহের তালিকা ***
                    </div>
                    {previousSalesWithDue.map((prev) => (
                      <div key={prev.id} className="flex justify-between text-slate-700">
                        <span>{formatDate(prev.date)} #{prev.invoiceNo} (মোট: ৳{Math.round(prev.grandTotal).toLocaleString()})</span>
                        <span className="font-bold text-red-600">{formatBDT(prev.dueAmount)}</span>
                      </div>
                    ))}
                    {openingBalanceDue > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>প্রারম্ভিক হিসাবের বকেয়া</span>
                        <span className="font-bold text-red-600">{formatBDT(openingBalanceDue)}</span>
                      </div>
                    )}
                    <div className="border-t border-dashed border-red-300 pt-1 flex justify-between font-bold text-slate-800">
                      <span>পূর্বের মোট বকেয়া:</span>
                      <span>{formatBDT(totalPreviousDueFromSales + openingBalanceDue)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>চলতি মেমোর বকেয়া:</span>
                      <span>{formatBDT(sale.dueAmount)}</span>
                    </div>
                    <div className="border-t border-red-400 pt-1 flex justify-between font-black text-red-700 text-[11px]">
                      <span>সর্বমোট বকেয়া (চলতি+পূর্বের):</span>
                      <span>{formatBDT(totalCustomerDueCombined)}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-600 space-y-1">
                <p>Thank you for choosing {businessProfile.businessName}!</p>
                <p>{businessProfile.invoiceNotes || 'Goods returnable within 7 days in original packaging with cash memo.'}</p>
                <p className="text-[9px] text-slate-400 pt-1">
                  Powered by TIKMERK IT (https://tikmerk.com)
                </p>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Mobile Fixed Bottom Action Bar (Ensures back/cancel is always accessible on phones) */}
        <div className="sm:hidden no-print p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenShareModal}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান' : 'Send Memo'}</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Send Options Modal */}
      {showShareModal && (
        <WhatsAppShareModal
          sale={sale}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
