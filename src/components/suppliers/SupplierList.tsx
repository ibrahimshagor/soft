import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Download,
  Coins,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Globe,
  X,
  Edit,
  Trash2,
  MapPin,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Supplier } from '../../types';
import { formatBDT, exportToCSV } from '../../utils/formatters';
import { PaySupplierModal } from './PaySupplierModal';
import { SupplierLedgerModal } from './SupplierLedgerModal';

export const SupplierList: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, t, language } = useApp();

  const [search, setSearch] = useState('');
  const [filterPayableOnly, setFilterPayableOnly] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmSup, setDeleteConfirmSup] = useState<Supplier | null>(null);
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState<Supplier | null>(null);
  const [paySupplierId, setPaySupplierId] = useState<string | null>(null);

  // New Supplier form state
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Japan');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  // Edit Supplier form state
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCountry, setEditCountry] = useState('Japan');

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.country && s.country.toLowerCase().includes(q));

      const matchPayable = filterPayableOnly ? s.currentPayable > 0 : true;
      return matchSearch && matchPayable;
    });
  }, [suppliers, search, filterPayableOnly]);

  const totalPayable = useMemo(
    () => suppliers.reduce((sum, s) => sum + s.currentPayable, 0),
    [suppliers]
  );
  const totalPurchases = useMemo(
    () => suppliers.reduce((sum, s) => sum + s.totalPurchased, 0),
    [suppliers]
  );

  const handleStartEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setEditCompanyName(sup.companyName || sup.name);
    setEditContactPerson(sup.contactPerson || sup.name);
    setEditPhone(sup.phone);
    setEditWhatsapp(sup.whatsappNumber || sup.phone);
    setEditAddress(sup.address || '');
    setEditCountry(sup.country || 'Japan');
  };

  const handleUpdateSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editCompanyName.trim() || !editPhone.trim()) return;

    updateSupplier(editingSupplier.id, {
      companyName: editCompanyName.trim(),
      name: editCompanyName.trim(),
      contactPerson: editContactPerson.trim(),
      phone: editPhone.trim(),
      whatsappNumber: editWhatsapp.trim() || editPhone.trim(),
      address: editAddress.trim(),
      country: editCountry.trim(),
    });

    setEditingSupplier(null);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmSup) {
      deleteSupplier(deleteConfirmSup.id);
      setDeleteConfirmSup(null);
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ['Company Name', 'Contact Person', 'Phone', 'Country', 'Address', 'Total Purchased', 'Total Paid', 'Current Payable'],
      ...filteredSuppliers.map((s) => [
        s.companyName || s.name,
        s.contactPerson || s.name,
        s.phone,
        s.country || '',
        s.address || '',
        s.totalPurchased,
        s.totalPaid,
        s.currentPayable,
      ]),
    ];
    exportToCSV(`RM_Suppliers_Ledger_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !phone.trim()) return;

    addSupplier({
      name: (name || contactPerson || companyName).trim(),
      companyName: companyName.trim(),
      contactPerson: (contactPerson || name).trim(),
      phone: phone.trim(),
      whatsappNumber: (whatsappNumber || phone).trim(),
      email: email.trim() || '',
      address: address.trim() || '',
      country: country.trim() || 'Japan',
      openingBalance,
      totalPurchased: 0,
      totalPaid: 0,
      currentPayable: openingBalance,
    });

    setIsAddOpen(false);
    setName('');
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setWhatsappNumber('');
    setEmail('');
    setAddress('');
    setOpeningBalance(0);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('suppliers')} & Parts Importers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Wholesale suppliers, OEM importers, local distributors, and payable settlement tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportCsv')}</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Suppliers & Importers
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {suppliers.length} Vendors
            </span>
          </div>
          <Building2 className="w-5 h-5 text-indigo-500 opacity-60" />
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('totalProcured')} (Procured)
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatBDT(totalPurchases)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              সাপ্লায়ার থেকে মোট ক্রয়কৃত পণ্য
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-60" />
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('payableBalance')} (Payable)
            </span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              {formatBDT(totalPayable)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              সাপ্লায়ারকে পরিশোধযোগ্য বকেয়া দেনা
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
            placeholder="Search supplier, contact, company, or country..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilterPayableOnly(!filterPayableOnly)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filterPayableOnly
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Show Only With Pending Payables</span>
          </button>
        </div>
      </div>

      {/* Suppliers Table (Desktop View) */}
      <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5">Company & Contact</th>
                <th className="py-3 px-3.5">Origin Country</th>
                <th className="py-3 px-3.5">Address</th>
                <th className="py-3 px-3.5 text-right">{t('totalProcured')}</th>
                <th className="py-3 px-3.5 text-right">{t('totalDisbursed')}</th>
                <th className="py-3 px-3.5 text-right">{t('payableBalance')}</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No suppliers match the current search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup) => (
                  <tr
                    key={sup.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-3.5">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {sup.companyName || sup.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Attn: {sup.contactPerson || sup.name}</span>
                        <span>• 📞 {sup.phone}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 w-fit">
                        <Globe className="w-3 h-3" />
                        <span>{sup.country || 'Local'}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {sup.address || '—'}
                    </td>

                    <td className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                      {formatBDT(sup.totalPurchased)}
                    </td>

                    <td className="py-3 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(sup.totalPaid)}
                    </td>

                    <td className="py-3 px-3.5 text-right font-black">
                      <span
                        className={
                          sup.currentPayable > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-400'
                        }
                      >
                        {formatBDT(sup.currentPayable)}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Pay Supplier */}
                        <button
                          type="button"
                          onClick={() => setPaySupplierId(sup.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-all active:scale-95"
                          title="Pay Supplier Bill"
                        >
                          <Coins className="w-3 h-3" />
                          <span>{t('disbursePayment')}</span>
                        </button>

                        {/* View Ledger */}
                        <button
                          type="button"
                          onClick={() => setSelectedLedgerSupplier(sup)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="View Supplier Ledger"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Supplier */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(sup)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Supplier */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmSup(sup)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                          title="Delete Supplier"
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

      {/* Suppliers Cards (Mobile View - No horizontal scroll!) */}
      <div className="block md:hidden space-y-3">
        {filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No suppliers match the current search filters.</p>
          </div>
        ) : (
          filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
            >
              {/* Header: Company, Contact, Actions */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {sup.companyName || sup.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>{sup.country || 'Local'}</span>
                    </span>
                    {sup.contactPerson && (
                      <span className="text-[10px] text-slate-400">
                        Attn: {sup.contactPerson}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(sup)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Edit Supplier"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmSup(sup)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                    title="Delete Supplier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${sup.phone}`} className="hover:underline font-medium text-slate-800 dark:text-slate-200">
                    {sup.phone}
                  </a>
                  {sup.whatsappNumber && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      (WA: {sup.whatsappNumber})
                    </span>
                  )}
                </div>
                {sup.address && (
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{sup.address}</span>
                  </div>
                )}
              </div>

              {/* Stats in 3 columns */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block truncate" title="সাপ্লায়ার থেকে মোট ক্রয়">
                    {t('totalProcured')}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {formatBDT(sup.totalPurchased)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block truncate" title="মোট পরিশোধিত">
                    {t('totalDisbursed')}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBDT(sup.totalPaid)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block truncate" title="সাপ্লায়ারের অবশিষ্ট বকেয়া দেনা">
                    {t('payableBalance')}
                  </span>
                  <span
                    className={`text-xs font-black ${
                      sup.currentPayable > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatBDT(sup.currentPayable)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPaySupplierId(sup.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{t('disbursePayment')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLedgerSupplier(sup)}
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

      {/* Pay Supplier Modal */}
      {paySupplierId && (
        <PaySupplierModal
          isOpen={true}
          preSelectedSupplierId={paySupplierId}
          onClose={() => setPaySupplierId(null)}
        />
      )}

      {/* Supplier Ledger Modal */}
      {selectedLedgerSupplier && (
        <SupplierLedgerModal
          supplier={selectedLedgerSupplier}
          onClose={() => setSelectedLedgerSupplier(null)}
        />
      )}

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <span>Add New Supplier / Importer</span>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Company / Agency Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Nippon Auto Parts Import Ltd."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Md. Tariqul Islam"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Japan, India, China"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
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
                    placeholder="018XXXXXXXX"
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
                    placeholder="018XXXXXXXX"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Office / Warehouse Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Dholaikhal Auto Market, Dhaka"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Opening Payable Balance (৳)
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
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-sm"
                >
                  Save Supplier
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
      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                <Edit className="w-5 h-5 text-indigo-500" />
                <span>{t('editSupplier')}</span>
              </div>
              <button onClick={() => setEditingSupplier(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupplierSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Company / Agency Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
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

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Office / Warehouse Address
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
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {deleteConfirmSup && (
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
                  {deleteConfirmSup.companyName || deleteConfirmSup.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              আপনি কি নিশ্চিত এই সাপ্লায়ারকে তালিকা থেকে ডিলিট করতে চান?
              {deleteConfirmSup.currentPayable > 0 && (
                <span className="block mt-1 font-bold text-rose-600">
                  সতর্কতা: এই সাপ্লায়ারের এখনও ৳{deleteConfirmSup.currentPayable.toLocaleString()} দেনা বকেয়া রয়েছে!
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
                onClick={() => setDeleteConfirmSup(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-xs"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
