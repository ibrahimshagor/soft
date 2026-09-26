import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Users,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Customer } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatBDT, sanitizePhoneNumber } from '../../utils/formatters';

interface BulkDueReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkDueReminderModal: React.FC<BulkDueReminderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { customers, businessProfile, language } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [copiedAll, setCopiedAll] = useState(false);
  const [customGreeting, setCustomGreeting] = useState('');

  // Filter customers who have active dues
  const dueCustomers = useMemo(() => {
    return customers
      .filter((c) => (c.currentDue || 0) > 0)
      .sort((a, b) => (b.currentDue || 0) - (a.currentDue || 0));
  }, [customers]);

  const filteredDueCustomers = useMemo(() => {
    if (!searchTerm.trim()) return dueCustomers;
    const q = searchTerm.toLowerCase();
    return dueCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsappNumber && c.whatsappNumber.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [dueCustomers, searchTerm]);

  const totalDueAmount = useMemo(() => {
    return dueCustomers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  }, [dueCustomers]);

  const sentCount = useMemo(() => {
    return Object.values(sentMap).filter(Boolean).length;
  }, [sentMap]);

  if (!isOpen) return null;

  // Build polite personalized message in Bengali
  const generateReminderMessage = (customer: Customer) => {
    const shopName = businessProfile.businessName || 'আমাদের প্রতিষ্ঠান';
    const dueFormatted = formatBDT(customer.currentDue || 0);
    const shopPhone = businessProfile.phone ? `\n📞 যোগাযোগ: ${businessProfile.phone}` : '';

    return `সম্মানিত গ্রাহক *${customer.name}*,
আসসালামু আলাইকুম।

*${shopName}*-এ আপনার কাছে সর্বমোট *${dueFormatted}* বকেয়া রয়েছে।

দয়া করে এই টাকাগুলো দ্রুত ফেরত/পরিশোধ দিলে আমরা বিশেষভাবে উপকৃত হব। ব্যবসার স্বাভাবিক লেনদেন চালু রাখতে আপনার আন্তরিক সহযোগিতা একান্ত কাম্য। হিসাব সংক্রান্ত কোনো তথ্য বা প্রশ্ন থাকলে অনুগ্রহ করে আমাদের জানান।${shopPhone}

ধন্যবাদান্তে,
*${shopName}*`;
  };

  const handleSendSingle = (customer: Customer) => {
    const rawPhone = customer.whatsappNumber || customer.phone || '';
    const phone = sanitizePhoneNumber(rawPhone);
    if (!phone) {
      alert(`কাস্টমার ${customer.name}-এর কোনো বৈধ ফোন/হোয়াটসঅ্যাপ নম্বর নেই!`);
      return;
    }

    const message = generateReminderMessage(customer);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    setSentMap((prev) => ({
      ...prev,
      [customer.id]: true,
    }));
  };

  const handleOpenWhatsAppMultiSelect = () => {
    const shopName = businessProfile.businessName || 'আমাদের প্রতিষ্ঠান';
    const broadcastMsg = `সম্মানিত গ্রাহক,
আসসালামু আলাইকুম।

${shopName}-এ আপনার বকেয়া হিসাব দ্রুত পরিশোধ করার জন্য বিনীত অনুরোধ জানাচ্ছি। কোনো হিসাব সংক্রান্ত তথ্য জানার থাকলে অনুগ্রহ করে আমাদের জানান।${businessProfile.phone ? `\n📞 যোগাযোগ: ${businessProfile.phone}` : ''}

ধন্যবাদান্তে,
${shopName}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(broadcastMsg)}`;
    window.open(url, '_blank');
  };

  // Find next pending customer to send reminder
  const nextPendingCustomer = dueCustomers.find((c) => !sentMap[c.id]);

  const handleSendNext = () => {
    if (nextPendingCustomer) {
      handleSendSingle(nextPendingCustomer);
    }
  };

  const handleCopyAllPhoneNumbers = () => {
    const numbers = dueCustomers
      .map((c) => c.whatsappNumber || c.phone)
      .filter(Boolean)
      .map((p) => sanitizePhoneNumber(p))
      .filter((p) => p && p.length >= 10);

    const uniqueNumbers = Array.from(new Set(numbers));
    navigator.clipboard.writeText(uniqueNumbers.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/20 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {language === 'bn'
                  ? 'হোয়াটসঅ্যাপ বকেয়া তাগাদা মেসেজ (Due Reminder)'
                  : 'WhatsApp Bulk Due Payment Reminder'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                {language === 'bn'
                  ? 'যাদের কাছে পাওনা টাকা রয়েছে তাদের কাছে এক ক্লিকে স্বয়ংক্রিয় হিসাবসহ তাগাদা পাঠান'
                  : 'Send individual polite reminder messages with exact due balance'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 shrink-0 text-center">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-bold block">
              মোট বকেয়া কাস্টমার
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
              {dueCustomers.length} জন
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-rose-600 dark:text-rose-400 font-bold block">
              সর্বমোট পাওনা টাকা
            </span>
            <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 font-mono">
              {formatBDT(totalDueAmount)}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
              তাগাদা পাঠানো হয়েছে
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {sentCount} / {dueCustomers.length}
            </span>
          </div>
        </div>

        {/* Action Controls & Stepper */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="কাস্টমার নাম বা নম্বর দিয়ে খুঁজুন..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {nextPendingCustomer ? (
              <button
                type="button"
                onClick={handleSendNext}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                title="সিরিয়ালের পরবর্তী বকেয়া কাস্টমারকে হোয়াটসঅ্যাপ মেসেজ পাঠান"
              >
                <Send className="w-3.5 h-3.5" />
                <span>পরবর্তী কাস্টমারকে পাঠান</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-700 text-[10px] font-mono truncate max-w-[90px]">
                  {nextPendingCustomer.name}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>সকল কাস্টমারকে তাগাদা পাঠানো সম্পন্ন!</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleOpenWhatsAppMultiSelect}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold"
              title="হোয়াটসঅ্যাপ খুলে কন্টাক্ট সিলেক্ট করে পাঠান"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">হোয়াটসঅ্যাপ সিলেক্ট</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAllPhoneNumbers}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold"
              title="সকল বকেয়া কাস্টমারদের ফোন নম্বর কপি করুন"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedAll ? 'কপি হয়েছে' : 'নম্বরগুলো কপি'}</span>
            </button>
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="px-4 sm:px-6 py-2 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold shrink-0">মেসেজ ফরম্যাট:</span>
            <span className="text-[11px] text-amber-800 dark:text-amber-400 truncate italic">
              "সম্মানিত গ্রাহক [নাম], [দোকান]-এ আপনার সর্বমোট বকেয়া [টাকা]। দ্রুত পরিশোধের বিনীত অনুরোধ রইল..."
            </span>
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold shrink-0">
            ✓ প্রতিটি মেসেজে স্বয়ংক্রিয় সঠিক বকেয়া যোগ হবে
          </span>
        </div>

        {/* Customer Due List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredDueCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>কোনো বকেয়া কাস্টমার পাওয়া যায়নি।</p>
            </div>
          ) : (
            filteredDueCustomers.map((cust, idx) => {
              const isSent = !!sentMap[cust.id];
              const phone = cust.whatsappNumber || cust.phone || '';

              return (
                <div
                  key={cust.id}
                  className={`py-3 flex items-center justify-between gap-3 transition-colors ${
                    isSent
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/10'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className="w-6 text-[11px] font-mono text-slate-400 font-bold text-center shrink-0">
                      {idx + 1}.
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {cust.name}
                        </span>
                        {isSent && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                            <Check className="w-3 h-3" />
                            <span>পাঠানো হয়েছে</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                        <span>📞 {phone || 'নম্বর নেই'}</span>
                        {cust.address && <span className="truncate">• {cust.address}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        মোট বকেয়া
                      </span>
                      <span className="font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-mono">
                        {formatBDT(cust.currentDue)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendSingle(cust)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all ${
                        isSent
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSent ? 'আবার পাঠান' : 'হোয়াটসঅ্যাপ'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            টিপস: প্রতিটি কাস্টমারের বাটনে ক্লিক করলে স্বয়ংক্রিয়ভাবে তার ব্যক্তিগত নাম ও সঠিক বকেয়াসহ হোয়াটসঅ্যাপ খুলে যাবে।
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
