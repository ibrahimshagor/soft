import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Download,
  Coins,
  FileText,
  Send,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Building,
  X,
  Edit,
  Trash2,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import {
  formatBDT,
  exportToCSV,
  sanitizePhoneNumber,
} from '../../utils/formatters';
import { CollectDueModal } from './CollectDueModal';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { BulkDueReminderModal } from './BulkDueReminderModal';

export const CustomerList: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, businessProfile, t, language } = useApp();

  const [search, setSearch] = useState('');
  const [filterDueOnly, setFilterDueOnly] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmCust, setDeleteConfirmCust] = useState<Customer | null>(null);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [collectPaymentCustomerId, setCollectPaymentCustomerId] = useState<string | null>(null);
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState(false);

  // New customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<Customer['customerType']>('Retail');
  const [creditLimit, setCreditLimit] = useState<number>(20000);
  const [paymentTerms, setPaymentTerms] = useState<Customer['paymentTerms']>('Credit');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editType, setEditType] = useState<Customer['customerType']>('Retail');
  const [editCreditLimit, setEditCreditLimit] = useState<number>(20000);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q));

      const matchDue = filterDueOnly ? c.currentDue > 0 : true;
      return matchSearch && matchDue;
    });
  }, [customers, search, filterDueOnly]);

  const totalReceivable = useMemo(
    () => customers.reduce((sum, c) => sum + c.currentDue, 0),
    [customers]
  );
  const totalPurchases = useMemo(
    () => customers.reduce((sum, c) => sum + c.totalPurchased, 0),
    [customers]
  );

  const handleExportCSV = () => {
    const rows = [
      ['Customer Name', 'Phone', 'WhatsApp', 'Type', 'Address', 'Credit Limit', 'Total Purchased', 'Total Paid', 'Current Due'],
      ...filteredCustomers.map((c) => [
        c.name,
        c.phone,
        c.whatsappNumber || '',
        c.customerType,
        c.address || '',
        c.creditLimit,
        c.totalPurchased,
        c.totalPaid,
        c.currentDue,
      ]),
    ];
    exportToCSV(`RM_Customers_Ledger_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      whatsappNumber: (whatsappNumber || phone).trim(),
      email: email.trim() || '',
      address: address.trim() || '',
      customerType,
      creditLimit,
      paymentTerms,
      openingBalance,
      totalPurchased: 0,
      totalPaid: 0,
      currentDue: openingBalance,
    });

    setIsAddOpen(false);
    setName('');
    setPhone('');
    setWhatsappNumber('');
    setEmail('');
    setAddress('');
    setOpeningBalance(0);
  };

  const handleStartEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditName(cust.name);
    setEditPhone(cust.phone);
    setEditWhatsapp(cust.whatsappNumber || cust.phone);
    setEditAddress(cust.address || '');
    setEditType(cust.customerType || 'Retail');
    setEditCreditLimit(cust.creditLimit || 20000);
  };

  const handleUpdateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName.trim() || !editPhone.trim()) return;

    updateCustomer(editingCustomer.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      whatsappNumber: editWhatsapp.trim() || editPhone.trim(),
      address: editAddress.trim(),
      customerType: editType,
      creditLimit: editCreditLimit,
    });

    setEditingCustomer(null);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmCust) {
      deleteCustomer(deleteConfirmCust.id);
      setDeleteConfirmCust(null);
    }
  };

  const handleSendReminder = (c: Customer) => {
    const cleanPhone = sanitizePhoneNumber(c.whatsappNumber || c.phone);
    if (!cleanPhone) {
      alert('No valid WhatsApp phone number found.');
      return;
    }

    const message = `Assalamu Alaikum *${c.name}*,\nThis is a friendly reminder from *${businessProfile.businessName}* regarding your pending balance of *${formatBDT(c.currentDue)}*.\nKindly arrange payment at your earliest convenience.\nThank you!\n📞 ${businessProfile.phone}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('customers')} & Due Khata (বাকীর খাতা)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Workshops, fleet accounts, retail customer ledger, and direct WhatsApp payment reminders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkReminderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            title="সকল বকেয়া কাস্টমারদের এক ক্লিকে হোয়াটসঅ্যাপে তাগাদা পাঠান"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>হোয়াটসঅ্যাপ তাগাদা</span>
            {customers.filter((c) => (c.currentDue || 0) > 0).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-800 text-[10px] font-mono">
                {customers.filter((c) => (c.currentDue || 0) > 0).length}
              </span>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportCsv')}</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('addNewCustomer')}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Registered Customers
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {customers.length} Accounts
            </span>
          </div>
          <Users className="w-5 h-5 text-indigo-500 opacity-60" />
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Lifetime Sales Volume
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatBDT(totalPurchases)}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-60" />
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Customer Due (Receivable)
            </span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              {formatBDT(totalReceivable)}
            </span>
          </div>
          <AlertTriangle className="w-5 h-5 text-rose-500 opacity-60" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name, phone, or workshop address..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilterDueOnly(!filterDueOnly)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filterDueOnly
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Show Only With Pending Dues</span>
          </button>
        </div>
      </div>

      {/* Customers Table (Desktop View) */}
      <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5">Customer & Contact</th>
                <th className="py-3 px-3.5">Type & Terms</th>
                <th className="py-3 px-3.5">Address / Workshop</th>
                <th className="py-3 px-3.5 text-right">{t('totalPurchased')}</th>
                <th className="py-3 px-3.5 text-right">{t('totalPaid')}</th>
                <th className="py-3 px-3.5 text-right">{t('currentDue')}</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No customers match the current search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-3.5">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {cust.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>📞 {cust.phone}</span>
                        {cust.whatsappNumber && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            • WA: {cust.whatsappNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {cust.customerType}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Limit: {formatBDT(cust.creditLimit)}
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {cust.address || '—'}
                    </td>

                    <td className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                      {formatBDT(cust.totalPurchased)}
                    </td>

                    <td className="py-3 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(cust.totalPaid)}
                    </td>

                    <td className="py-3 px-3.5 text-right font-black">
                      <span
                        className={
                          cust.currentDue > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-400'
                        }
                      >
                        {formatBDT(cust.currentDue)}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp reminder button */}
                        {cust.currentDue > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSendReminder(cust)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                            title="Send WhatsApp Due Reminder"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Collect payment */}
                        <button
                          type="button"
                          onClick={() => setCollectPaymentCustomerId(cust.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-all active:scale-95"
                          title="Collect Due Payment"
                        >
                          <Coins className="w-3 h-3" />
                          <span>{t('collectPayment')}</span>
                        </button>

                        {/* View Ledger */}
                        <button
                          type="button"
                          onClick={() => setSelectedLedgerCustomer(cust)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="View Ledger Statement"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Customer */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cust)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Customer */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmCust(cust)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customers Cards (Mobile View - No horizontal scroll!) */}
      <div className="block md:hidden space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No customers match the current search filters.</p>
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
            >
              {/* Header: Name, Type, Actions */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {cust.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {cust.customerType}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Limit: {formatBDT(cust.creditLimit)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(cust)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Edit Customer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmCust(cust)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${cust.phone}`} className="hover:underline font-medium text-slate-800 dark:text-slate-200">
                    {cust.phone}
                  </a>
                  {cust.whatsappNumber && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      (WA: {cust.whatsappNumber})
                    </span>
                  )}
                </div>
                {cust.address && (
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.address}</span>
                  </div>
                )}
              </div>

              {/* Stats in 3 columns */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                    {t('totalPurchased')}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {formatBDT(cust.totalPurchased)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                    {t('totalPaid')}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBDT(cust.totalPaid)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                    {t('currentDue')}
                  </span>
                  <span
                    className={`text-xs font-black ${
                      cust.currentDue > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatBDT(cust.currentDue)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {cust.currentDue > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSendReminder(cust)}
                    className="p-2 rounded-xl text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-colors"
                    title="Send WhatsApp Due Reminder"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCollectPaymentCustomerId(cust.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{t('collectPayment')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLedgerCustomer(cust)}
                  className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('ledger')}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Collect Due Modal */}
      {collectPaymentCustomerId && (
        <CollectDueModal
          isOpen={true}
          preSelectedCustomerId={collectPaymentCustomerId}
          onClose={() => setCollectPaymentCustomerId(null)}
        />
      )}

      {/* Customer Ledger Statement Modal */}
      {selectedLedgerCustomer && (
        <CustomerLedgerModal
          customer={selectedLedgerCustomer}
          onClose={() => setSelectedLedgerCustomer(null)}
        />
      )}

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <span>{t('addNewCustomer')}</span>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer / Workshop Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Master Motors / Md. Rafiqul Islam"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Customer Type
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as Customer['customerType'])}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Retail">Retail (খুচরা)</option>
                    <option value="Wholesale">Wholesale (পাইকারি)</option>
                    <option value="Workshop">Workshop / Garage (ওয়ার্কশপ)</option>
                    <option value="Fleet">Fleet Operator (ফ্লিট)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Credit Limit (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Address / Workshop Location
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Tejgaon Industrial Area, Dhaka"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Opening Due Balance (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-sm"
                >
                  Save Customer
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                <Edit className="w-5 h-5 text-indigo-500" />
                <span>{t('editCustomer')}</span>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomerSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer / Workshop Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Customer Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as Customer['customerType'])}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Retail">Retail (খুচরা)</option>
                    <option value="Wholesale">Wholesale (পাইকারি)</option>
                    <option value="Workshop">Workshop / Garage (ওয়ার্কশপ)</option>
                    <option value="Fleet">Fleet Operator (ফ্লিট)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Credit Limit (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Address / Workshop Location
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-sm"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {t('confirmDelete')}
                </h4>
                <p className="text-xs text-slate-500">
                  {deleteConfirmCust.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              আপনি কি নিশ্চিত এই গ্রাহকের একাউন্ট ডিলিট করতে চান?
              {deleteConfirmCust.currentDue > 0 && (
                <span className="block mt-1 font-bold text-rose-600">
                  সতর্কতা: এই গ্রাহকের এখনও ৳{deleteConfirmCust.currentDue.toLocaleString()} বকেয়া পাওনা রয়েছে!
                </span>
              )}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                হ্যাঁ, মুছে ফেলুন (Delete)
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmCust(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-xs"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Due Reminder Modal */}
      <BulkDueReminderModal
        isOpen={isBulkReminderOpen}
        onClose={() => setIsBulkReminderOpen(false)}
      />
    </div>
  );
};
