import React, { useState } from 'react';
import {
  CalendarClock,
  Clock,
  AlertCircle,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT, formatDate, sanitizePhoneNumber } from '../../utils/formatters';

interface DueAlertsProps {
  onCollectPayment: (customerId: string, refInvoiceNo?: string) => void;
  onPaySupplier: (supplierId: string, refPurchaseNo?: string) => void;
}

export const DueAlerts: React.FC<DueAlertsProps> = ({ onCollectPayment, onPaySupplier }) => {
  const { dueReminders, businessProfile, t } = useApp();
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming'>('all');

  const filteredAlerts = dueReminders.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const sendWhatsAppReminder = (item: typeof dueReminders[0]) => {
    const cleanPhone = sanitizePhoneNumber(item.phone || item.whatsappNumber);
    if (!cleanPhone) {
      alert('No valid WhatsApp phone number found for this customer.');
      return;
    }

    const message = `Assalamu Alaikum *${item.partyName}*,\nThis is a gentle reminder from *${businessProfile.businessName}* regarding your pending bill for Invoice #${item.refNo} of *${formatBDT(item.amount)}*.\nDue Date: ${formatDate(item.dueDate)}.\nKindly arrange payment at your earliest convenience. Thank you!\n📞 ${businessProfile.phone}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const todayCount = dueReminders.filter((d) => d.status === 'today').length;
  const overdueCount = dueReminders.filter((d) => d.status === 'overdue').length;
  const upcomingCount = dueReminders.filter((d) => d.status === 'upcoming').length;

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Due Date & Payment Reminders
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customer collections & supplier commitments
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({dueReminders.length})
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filter === 'today'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{t('dueToday')}</span>
            {todayCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-950/20 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                {todayCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filter === 'overdue'
                ? 'bg-red-500 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{t('overdue')}</span>
            {overdueCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/25 text-white flex items-center justify-center text-[10px] font-bold">
                {overdueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filter === 'upcoming'
                ? 'bg-blue-500 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t('upcomingDue')} ({upcomingCount})
          </button>
        </div>
      </div>

      {/* Reminder List */}
      {filteredAlerts.length === 0 ? (
        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>{t('noDueAlerts')}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredAlerts.map((item) => {
            const isCustomer = item.partyType === 'customer';

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      item.status === 'overdue'
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                        : item.status === 'today'
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.partyName}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isCustomer
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {isCustomer ? 'Customer Receivable' : 'Supplier Payable'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Ref: #{item.refNo}</span>
                      <span>•</span>
                      <span>Due: {formatDate(item.dueDate)}</span>
                      <span>•</span>
                      <span
                        className={`font-semibold ${
                          item.status === 'overdue'
                            ? 'text-red-600 dark:text-red-400'
                            : item.status === 'today'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {item.status === 'overdue'
                          ? `Overdue by ${Math.abs(item.daysDiff)} days`
                          : item.status === 'today'
                          ? 'DUE TODAY'
                          : `Due in ${item.daysDiff} days`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-700">
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {formatBDT(item.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Pending Balance</span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                    {/* WhatsApp button for customer */}
                    {isCustomer && (item.phone || item.whatsappNumber) && (
                      <button
                        onClick={() => sendWhatsAppReminder(item)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isCustomer ? (
                      <button
                        onClick={() => onCollectPayment(item.partyId, item.refNo)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-all active:scale-95"
                      >
                        <ArrowDownLeft className="w-3 h-3" />
                        <span>Collect</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onPaySupplier(item.partyId, item.refNo)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-all active:scale-95"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Pay</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
