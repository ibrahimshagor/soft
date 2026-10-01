import React, { useState } from 'react';
import {
  X,
  Phone,
  Building2,
  Calendar,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Landmark,
  Coins,
  FileText,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { LoanParty, LoanRecord, LoanEntityType, InstallmentScheduleItem } from '../../types';
import { formatBDT, formatDate, sanitizePhoneNumber, exportToCSV } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';

interface LoanPartyLedgerModalProps {
  party: LoanParty | null;
  onClose: () => void;
  onOpenTransaction: (type: 'borrow' | 'lend' | 'repay_borrow' | 'collect_lend', partyId: string) => void;
  onOpenInstallmentSchedule?: (record: LoanRecord) => void;
}

export const LoanPartyLedgerModal: React.FC<LoanPartyLedgerModalProps> = ({
  party,
  onClose,
  onOpenTransaction,
  onOpenInstallmentSchedule,
}) => {
  const { loanRecords, businessProfile, language } = useApp();

  if (!party) return null;

  // Filter all records related to this party
  const partyRecords = (loanRecords || [])
    .filter((r) => r && r.partyId === party.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSendWhatsApp = () => {
    const phone = sanitizePhoneNumber(party.phone);
    if (!phone) {
      alert(language === 'bn' ? 'কোনো সঠিক হোয়াটসঅ্যাপ নম্বর পাওয়া যায়নি।' : 'No valid WhatsApp number found.');
      return;
    }

    let text = '';
    if (party.currentReceivable > 0) {
      text = `আসসালামু আলাইকুম ${party.name} সাহেব, ${businessProfile.businessName} হতে বিনীতভাবে জানানো যাচ্ছে যে, আপনার কাছে আমাদের প্রদত্ত ধার/হাওলাত বাবদ ${formatBDT(party.currentReceivable)} পাওনা রয়েছে। অনুগ্রহপূর্বক পরিশোধের সম্ভাব্য তারিখ জানালে কৃতজ্ঞ থাকব। ধন্যবাদ। যোগাযোগ: ${businessProfile.phone}`;
    } else if (party.currentPayable > 0) {
      text = `সম্মানিত ${party.name} (${party.companyName || 'ঋণদাতা'}), ${businessProfile.businessName} থেকে জানানো যাচ্ছে যে, আপনাদের নিকট আমাদের গৃহীত লোন/ধারের অবশিষ্ট দেনা ${formatBDT(party.currentPayable)}। আমরা দ্রুত পরিশোধের ব্যবস্থা নিচ্ছি। যোগাযোগ: ${businessProfile.phone}`;
    } else {
      text = `আসসালামু আলাইকুম ${party.name} সাহেব, ${businessProfile.businessName} থেকে যোগাযোগ করা হচ্ছে। আপনার সাথে আমাদের বর্তমান লোন/হাওলাত হিসাব সম্পূর্ণ নিষ্পন্ন রয়েছে। ধন্যবাদ।`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportCSV = () => {
    const rows = [
      ['Voucher No', 'Date', 'Type', 'Amount (BDT)', 'Account', 'Due Date', 'Notes'],
      ...partyRecords.map((r) => [
        r.voucherNo,
        formatDate(r.date),
        r.type,
        r.amount,
        r.accountName,
        r.dueDate ? formatDate(r.dueDate) : '',
        r.notes || '',
      ]),
    ];
    exportToCSV(`RM_Loan_Ledger_${party.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const getEntityBadge = (type: LoanEntityType) => {
    switch (type) {
      case 'bank':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">ব্যাংক (Bank)</span>;
      case 'cooperative':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">সমিতি (Co-op)</span>;
      case 'person':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">ব্যক্তি / বন্ধু (Person)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">অন্যান্য</span>;
    }
  };

  const getTxTypeBadge = (type: LoanRecord['type']) => {
    switch (type) {
      case 'borrow':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 w-fit">
            <ArrowDownLeft className="w-3 h-3 text-rose-600" />
            <span>{language === 'bn' ? 'ঋণ গ্রহণ (In)' : 'Borrow (In)'}</span>
          </span>
        );
      case 'lend':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-fit">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            <span>{language === 'bn' ? 'ধার প্রদান (Out)' : 'Lend (Out)'}</span>
          </span>
        );
      case 'repay_borrow':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>{language === 'bn' ? 'ঋণ পরিশোধ' : 'Repaid'}</span>
          </span>
        );
      case 'collect_lend':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 flex items-center gap-1 w-fit">
            <Coins className="w-3 h-3 text-teal-600" />
            <span>{language === 'bn' ? 'ধার আদায়' : 'Collected'}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in-50 zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-lg shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {party.name}
                </h3>
                {getEntityBadge(party.entityType)}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                {party.companyName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{party.companyName}</span>
                  </span>
                )}
                {party.phone && (
                  <a
                    href={`tel:${party.phone}`}
                    className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-mono font-bold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{party.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* 4 Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block uppercase">
                {language === 'bn' ? 'বর্তমান দেনা (Payable)' : 'Current Debt'}
              </span>
              <span className="text-base font-black text-rose-700 dark:text-rose-300 mt-1 block">
                {formatBDT(party.currentPayable)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                {language === 'bn' ? 'বর্তমান পাওনা (Receivable)' : 'Current Lent'}
              </span>
              <span className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
                {formatBDT(party.currentReceivable)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                {language === 'bn' ? 'মোট ঋণ গ্রহণ' : 'Lifetime Borrowed'}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                {formatBDT(party.totalBorrowed)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                {language === 'bn' ? 'মোট ধার প্রদান' : 'Lifetime Lent'}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                {formatBDT(party.totalLent)}
              </span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            {party.phone && (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="py-1.5 px-3 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'তাগাদা মেসেজ (WhatsApp)' : 'WhatsApp'}</span>
              </button>
            )}

            {party.currentPayable > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTransaction('repay_borrow', party.id);
                }}
                className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-xs active:scale-95 transition-all"
              >
                {language === 'bn' ? 'দেনা শোধ করুন (Pay Bill)' : 'Pay Debt'}
              </button>
            )}

            {party.currentReceivable > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTransaction('collect_lend', party.id);
                }}
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs active:scale-95 transition-all"
              >
                {language === 'bn' ? 'ধার আদায় করুন (Collect)' : 'Collect'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTransaction('borrow', party.id);
              }}
              className="py-1.5 px-3 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
            >
              {language === 'bn' ? '+ ঋণ গ্রহণ' : '+ Borrow'}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTransaction('lend', party.id);
              }}
              className="py-1.5 px-3 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all"
            >
              {language === 'bn' ? '+ ধার প্রদান' : '+ Lend'}
            </button>
          </div>

          {/* Ledger Transactions Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {language === 'bn' ? 'সম্পূর্ণ লেনদেন লেজার ও ইতিহাস' : 'Transaction History & Ledger'} ({partyRecords.length})
              </h4>
            </div>

            {partyRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                {language === 'bn' ? 'এই ব্যক্তির কোনো লেনদেন রেকর্ড পাওয়া যায়নি।' : 'No transaction records found for this party.'}
              </div>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="sm:hidden space-y-2.5">
                  {partyRecords.map((r) => (
                    <div key={r.id} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {getTxTypeBadge(r.type)}
                          <span className="font-mono text-[10px] text-slate-400">{r.voucherNo}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDate(r.date)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block">একাউন্ট: {r.accountName}</span>
                          {r.dueDate && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(r.dueDate)}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-sm font-black ${
                              r.type === 'borrow' || r.type === 'collect_lend'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {r.type === 'borrow' || r.type === 'collect_lend' ? '+' : '-'} {formatBDT(r.amount)}
                          </span>
                        </div>
                      </div>

                      {r.notes && (
                        <div className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded-lg truncate">
                          {r.notes}
                        </div>
                      )}

                      {r.isInstallment && r.schedule && r.schedule.length > 0 && onOpenInstallmentSchedule && (
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenInstallmentSchedule(r);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all"
                          >
                            {language === 'bn' ? 'কিস্তি শিডিউল' : 'Installments'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop & Tablet Table */}
                <div className="hidden sm:block rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">ভাউচার / তারিখ</th>
                        <th className="p-3">ধরণ</th>
                        <th className="p-3 text-right">টাকা (৳)</th>
                        <th className="p-3">একাউন্ট</th>
                        <th className="p-3">মেয়াদ / মন্তব্য</th>
                        <th className="p-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {partyRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">{r.voucherNo}</div>
                            <div className="text-[10px] text-slate-400">{formatDate(r.date)}</div>
                          </td>
                          <td className="p-3">{getTxTypeBadge(r.type)}</td>
                          <td className="p-3 text-right font-black text-sm">
                            <span
                              className={
                                r.type === 'borrow' || r.type === 'collect_lend'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {r.type === 'borrow' || r.type === 'collect_lend' ? '+' : '-'} {formatBDT(r.amount)}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {r.accountName}
                          </td>
                          <td className="p-3 text-slate-500">
                            {r.dueDate && (
                              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(r.dueDate)}</span>
                              </div>
                            )}
                            <div className="text-[11px] truncate max-w-xs">{r.notes || '—'}</div>
                          </td>
                          <td className="p-3 text-right">
                            {r.isInstallment && r.schedule && r.schedule.length > 0 && onOpenInstallmentSchedule && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenInstallmentSchedule(r);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all"
                              >
                                {language === 'bn' ? 'কিস্তি শিডিউল' : 'Installments'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
