import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare, Building2, Smartphone, Coins, User, Phone, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Account } from '../../types';

interface ShareAccountWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

export const ShareAccountWhatsAppModal: React.FC<ShareAccountWhatsAppModalProps> = ({
  isOpen,
  onClose,
  account,
}) => {
  const { businessProfile, customers, language } = useApp();
  const [copied, setCopied] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  if (!isOpen || !account) return null;

  // Generate formatted text message based on account type
  const generateMessage = (): string => {
    const company = businessProfile.businessName || 'RM Automobiles';
    const companyPhone = businessProfile.whatsappNumber || businessProfile.phone || '';

    if (account.type === 'bank') {
      return `🏛️ *ব্যাংক একাউন্ট বিবরণী (Bank Account Details)*\n━━━━━━━━━━━━━━━━━━━━\n🏦 *ব্যাংকের নাম:* ${account.bankName || account.name}\n🏷️ *একাউন্টের নাম:* ${account.name}\n${account.accountHolder ? `👤 *হোল্ডার:* ${account.accountHolder}\n` : ''}🔢 *একাউন্ট নাম্বার:* ${account.accountNumber || 'N/A'}\n${account.bankBranch || account.branch ? `📍 *শাখা / ব্রাঞ্চ:* ${account.bankBranch || account.branch}\n` : ''}${account.routingNumber ? `🌐 *রাউটিং নাম্বার:* ${account.routingNumber}\n` : ''}━━━━━━━━━━━━━━━━━━━━\n📌 *প্রতিষ্ঠান:* ${company}${companyPhone ? `\n📞 *যোগাযোগ:* ${companyPhone}` : ''}`;
    }

    if (account.type === 'mobile_banking' || account.type === 'mfs') {
      return `📱 *মোবাইল ব্যাংকিং বিবরণী (bKash / Nagad / Rocket)*\n━━━━━━━━━━━━━━━━━━━━\n🏷️ *একাউন্টের নাম:* ${account.name}\n${account.accountHolder ? `👤 *একাউন্ট হোল্ডার:* ${account.accountHolder}\n` : ''}📞 *মোবাইল / ওয়ালেট:* ${account.accountNumber || 'N/A'}\n${account.bankBranch || account.branch ? `💼 *টাইপ / সেবা:* ${account.bankBranch || account.branch}\n` : ''}━━━━━━━━━━━━━━━━━━━━\n📌 *প্রতিষ্ঠান:* ${company}${companyPhone ? `\n📞 *যোগাযোগ:* ${companyPhone}` : ''}`;
    }

    // Cash
    return `💵 *ক্যাশ একাউন্ট বিবরণী*\n━━━━━━━━━━━━━━━━━━━━\n🏷️ *একাউন্টের নাম:* ${account.name}\n📌 *প্রতিষ্ঠান:* ${company}${companyPhone ? `\n📞 *যোগাযোগ:* ${companyPhone}` : ''}`;
  };

  const messageText = generateMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = (targetPhone?: string) => {
    const phoneToUse = targetPhone || recipientPhone;
    let cleanPhone = phoneToUse.replace(/[^0-9]/g, '');

    if (cleanPhone) {
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '88' + cleanPhone;
      } else if (!cleanPhone.startsWith('88') && cleanPhone.length === 10) {
        cleanPhone = '880' + cleanPhone;
      }
    }

    const encodedText = encodeURIComponent(messageText);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setRecipientPhone(cust.whatsappNumber || cust.phone || '');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {language === 'bn' ? 'একাউন্ট তথ্য শেয়ার ও হোয়াটসঅ্যাপ' : 'Share Account & WhatsApp'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'bn'
                  ? 'গ্রাহক বা পার্টির কাছে একাউন্ট নাম্বার ও ব্যাংক ডিটেইলস পাঠান'
                  : 'Send or copy bank/MFS payment account details'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          {/* Account Snapshot */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl text-white ${
                account.type === 'bank' ? 'bg-blue-600' : account.type === 'cash' ? 'bg-amber-600' : 'bg-pink-600'
              }`}>
                {account.type === 'bank' ? (
                  <Building2 className="w-4 h-4" />
                ) : account.type === 'cash' ? (
                  <Coins className="w-4 h-4" />
                ) : (
                  <Smartphone className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {account.name}
                </h4>
                <div className="text-[11px] font-mono text-slate-500">
                  {account.accountNumber ? `A/C: ${account.accountNumber}` : account.type.toUpperCase()}
                  {account.bankBranch && ` • ${account.bankBranch}`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (language === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (language === 'bn' ? 'কপি করুন' : 'Copy')}</span>
            </button>
          </div>

          {/* Formatted Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                {language === 'bn' ? 'মেসেজ প্রিভিউ (Message Preview)' : 'Message Preview'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{language === 'bn' ? 'সম্পূর্ণ মেসেজ কপি' : 'Copy All Text'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-[11px] sm:text-xs leading-relaxed whitespace-pre-line border border-slate-800 shadow-inner">
              {messageText}
            </div>
          </div>

          {/* Customer / Phone Selection */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2.5">
            <span className="font-bold text-slate-900 dark:text-white block text-xs">
              {language === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান (WhatsApp Direct Send)' : 'Send to WhatsApp'}
            </span>

            {/* Quick Customer Select */}
            {customers && customers.length > 0 && (
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  {language === 'bn' ? 'কাস্টমার তালিকা থেকে নির্বাচন (ঐচ্ছিক):' : 'Select from customer list (optional):'}
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
                >
                  <option value="">{language === 'bn' ? '-- কাস্টমার বাছাই করুন --' : '-- Choose Customer --'}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.whatsappNumber || 'No Phone'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Direct Phone Number */}
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                {language === 'bn' ? 'অথবা যেকোনো মোবাইল নম্বর লিখুন:' : 'Or enter custom mobile number:'}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'পাঠান' : 'Send'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-50 flex items-center gap-1.5 text-xs shadow-xs"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-600" />
            <span>{copied ? (language === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (language === 'bn' ? 'মেসেজ কপি করুন' : 'Copy Message')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendWhatsApp()}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান' : 'Open in WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
