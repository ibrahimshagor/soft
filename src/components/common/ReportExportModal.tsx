import React, { useState } from 'react';
import {
  X,
  Printer,
  FileDown,
  Image as ImageIcon,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { downloadElementAsPdf, downloadElementAsImage, printHtmlViaIframe } from '../../utils/pdfGenerator';
import { useApp } from '../../context/AppContext';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  defaultFilename: string;
  targetElementRef: React.RefObject<HTMLDivElement | null>;
  onExportCSV?: () => void;
  getPrintHtml?: () => string;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  defaultFilename,
  targetElementRef,
  onExportCSV,
  getPrintHtml,
}) => {
  const { language } = useApp();
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    if (!targetElementRef.current) return;
    setIsProcessingPdf(true);
    setStatusMessage(language === 'bn' ? 'পিডিএফ তৈরি হচ্ছে...' : 'Generating optimized PDF...');

    try {
      const cleanName = defaultFilename.endsWith('.pdf') ? defaultFilename : `${defaultFilename}.pdf`;
      const ok = await downloadElementAsPdf(targetElementRef.current, cleanName, {
        format: 'a4',
        quality: 0.85, // Optimized compression: ~150KB size instead of 6MB!
      });

      if (ok) {
        setStatusMessage(language === 'bn' ? 'পিডিএফ ডাউনলোড সফল হয়েছে!' : 'PDF downloaded successfully!');
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 1200);
      } else {
        setStatusMessage(language === 'bn' ? 'পিডিএফ তৈরিতে সমস্যা হয়েছে।' : 'Failed to generate PDF.');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setStatusMessage('Error creating PDF');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!targetElementRef.current) return;
    setIsProcessingImg(true);
    setStatusMessage(language === 'bn' ? 'ইমেজ তৈরি হচ্ছে...' : 'Generating image file...');

    try {
      const cleanName = defaultFilename.replace(/\.pdf$/i, '');
      const ok = await downloadElementAsImage(targetElementRef.current, `${cleanName}.jpg`, {
        format: 'a4',
        quality: 0.88,
      });

      if (ok) {
        setStatusMessage(language === 'bn' ? 'ছবি সেভ সফল হয়েছে!' : 'Image saved successfully!');
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 1200);
      } else {
        setStatusMessage(language === 'bn' ? 'ছবি তৈরিতে সমস্যা হয়েছে।' : 'Failed to generate image.');
      }
    } catch (err) {
      console.error('Image generation error:', err);
      setStatusMessage('Error creating image');
    } finally {
      setIsProcessingImg(false);
    }
  };

  const handlePrint = () => {
    if (getPrintHtml) {
      const html = getPrintHtml();
      printHtmlViaIframe(html);
      onClose();
      return;
    }

    if (targetElementRef.current) {
      const innerHtml = targetElementRef.current.innerHTML;
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 6px 8px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${innerHtml}
</body>
</html>`;
      printHtmlViaIframe(fullHtml);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-500" />
              <span>{language === 'bn' ? 'প্রিন্ট ও রিপোর্ট ডাউনলোড' : 'Print & Export Report'}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {language === 'bn'
              ? 'রিপোর্টটি আপনি কীভাবে সংরক্ষণ বা প্রিন্ট করতে চান নির্বাচন করুন:'
              : 'Choose your preferred export or print format:'}
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Option 1: PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isProcessingPdf || isProcessingImg}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/20 text-left transition-all group disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isProcessingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{language === 'bn' ? 'পিডিএফ (PDF) ডাউনলোড করুন' : 'Download PDF Document'}</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    {language === 'bn' ? 'হালকা সাইজ (~180KB)' : 'Lightweight'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? 'প্রিন্ট বা ডকুমেন্টে শেয়ারযোগ্য এ৪ সাইজ অপ্টিমাইজড পিডিএফ'
                    : 'A4 optimized PDF document for archiving or printing'}
                </p>
              </div>
            </button>

            {/* Option 2: Image (JPG) */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isProcessingPdf || isProcessingImg}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/20 text-left transition-all group disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isProcessingImg ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{language === 'bn' ? 'ইমেজ (ছবি) আকারে সেভ করুন' : 'Save as Image (JPG)'}</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    JPG
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? 'মোবাইল বা হোয়াটসঅ্যাপে ছবি আকারে পাঠাতে সরাসরি ছবি ডাউনলোড'
                    : 'Clear high-res photo for WhatsApp and mobile viewing'}
                </p>
              </div>
            </button>

            {/* Option 3: Direct Print */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isProcessingPdf || isProcessingImg}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/20 text-left transition-all group disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {language === 'bn' ? 'সরাসরি প্রিন্ট প্রিভিউ (Print Dialog)' : 'Direct Print Preview'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? 'ক্লিন এ৪ ফরম্যাটে প্রিন্টারের মাধ্যমে প্রিন্ট করুন'
                    : 'Send cleanly formatted report directly to your printer'}
                </p>
              </div>
            </button>

            {/* Option 4: CSV / Excel (if provided) */}
            {onExportCSV && (
              <button
                type="button"
                onClick={() => {
                  onExportCSV();
                  onClose();
                }}
                disabled={isProcessingPdf || isProcessingImg}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/20 text-left transition-all group disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{language === 'bn' ? 'এক্সেল / CSV ফাইল নামান' : 'Download Excel / CSV'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'মাইক্রোসফট এক্সেলে হিসাব মেলানোর জন্য স্প্রেডশীট'
                      : 'Raw tabular spreadsheet for Microsoft Excel / Sheets'}
                  </p>
                </div>
              </button>
            )}
          </div>

          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
