import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Send,
  RotateCcw,
  Receipt,
  Car,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Phone,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sale } from '../../types';
import {
  formatBDT,
  formatDate,
  formatDateTime,
  generateWhatsAppInvoiceUrl,
  resolveCustomerWhatsApp,
  exportToCSV,
} from '../../utils/formatters';
import { SalesReturnModal } from './SalesReturnModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface SalesListProps {
  onOpenNewSale: () => void;
}

export const SalesList: React.FC<SalesListProps> = ({ onOpenNewSale }) => {
  const { sales, businessProfile, setSelectedInvoice, deleteSale, language, t, customers } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID'>('ALL');
  const [returnModalSale, setReturnModalSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [confirmDeleteSaleId, setConfirmDeleteSaleId] = useState<string | null>(null);
  const [shareModalSale, setShareModalSale] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => {
        const matchSearch =
          s.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
          s.customerName.toLowerCase().includes(search.toLowerCase()) ||
          (s.customerPhone && s.customerPhone.includes(search)) ||
          (s.vehicleInfo && s.vehicleInfo.toLowerCase().includes(search.toLowerCase()));

        const matchStatus = statusFilter === 'ALL' || s.paymentStatus === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime() || 0;
        const timeB = new Date(b.createdAt || b.date).getTime() || 0;
        return timeB - timeA;
      });
  }, [sales, search, statusFilter]);

  const totalInvoiced = useMemo(() => filteredSales.reduce((sum, s) => sum + s.grandTotal, 0), [filteredSales]);
  const totalCollected = useMemo(() => filteredSales.reduce((sum, s) => sum + s.paidAmount, 0), [filteredSales]);
  const totalDue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.dueAmount, 0), [filteredSales]);

  const handleExportCSV = () => {
    const rows = [
      ['Invoice No', 'Date', 'Customer', 'Phone', 'Vehicle', 'Grand Total', 'Paid', 'Due', 'Status', 'Seller'],
      ...filteredSales.map((s) => [
        s.invoiceNo,
        formatDate(s.date),
        s.customerName,
        s.customerPhone || '',
        s.vehicleInfo || '',
        s.grandTotal,
        s.paidAmount,
        s.dueAmount,
        s.paymentStatus,
        s.sellerName,
      ]),
    ];
    exportToCSV(`RM_Sales_Invoices_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleSendWhatsApp = (sale: Sale) => {
    setShareModalSale(sale);
  };

  const handleDeleteConfirm = (saleId: string) => {
    deleteSale(saleId);
    setConfirmDeleteSaleId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-16">
      {/* Top Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'bn' ? 'বিক্রয় ও ইনভয়েস রসিদ' : `${t('invoices')} & Cash Memos`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'bn'
              ? 'ইনভয়েস অনুসন্ধান, সম্পাদনা, হোয়াটসঅ্যাপে প্রেরণ, ফেরত ও প্রিন্ট করুন'
              : 'Search, edit, print, share via WhatsApp, and manage customer sales transactions'}
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
            onClick={onOpenNewSale}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('quickSale')}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'bn' ? 'ফিল্টারকৃত মোট বিক্রয়' : 'Total Invoiced Volume'}
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {formatBDT(totalInvoiced)}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            {filteredSales.length} {language === 'bn' ? 'টি বিল' : 'Invoices'}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'bn' ? 'মোট সংগৃহীত নগদ' : 'Total Cash Collected'}
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatBDT(totalCollected)}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-60" />
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'bn' ? 'গ্রাহকদের মোট বাকি' : 'Pending Customer Dues'}
            </span>
            <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
              {formatBDT(totalDue)}
            </span>
          </div>
          <AlertTriangle className="w-5 h-5 text-rose-500 opacity-60" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'ইনভয়েস #, গ্রাহক, ফোন, বা গাড়ি খুঁজুন...'
                : 'Search invoice #, customer, phone, or vehicle...'
            }
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar text-xs">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>

          {(['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {st === 'ALL'
                ? language === 'bn' ? 'সব' : 'All'
                : st === 'PAID'
                ? language === 'bn' ? 'পরিশোধিত' : 'Paid'
                : st === 'PARTIALLY_PAID'
                ? language === 'bn' ? 'আংশিক' : 'Partial'
                : language === 'bn' ? 'বাকি' : 'Unpaid'}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE-FIRST VIEW: Responsive Cards on Mobile (No Horizontal Scrolling!), Table on Large Screens */}
      {/* 1. Mobile Cards (< md screens) */}
      <div className="md:hidden space-y-3">
        {filteredSales.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{language === 'bn' ? 'কোনো ইনভয়েস পাওয়া যায়নি।' : 'No invoices match the current search filters.'}</p>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-3.5 space-y-3 shadow-xs hover:border-amber-400 transition-all"
            >
              {/* Card Header: Invoice # & Status */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-black text-xs">
                    #{sale.invoiceNo}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(sale.date)}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    sale.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : sale.paymentStatus === 'PARTIALLY_PAID'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {sale.paymentStatus === 'PAID'
                    ? language === 'bn' ? 'পরিশোধিত' : 'PAID'
                    : sale.paymentStatus === 'PARTIALLY_PAID'
                    ? language === 'bn' ? 'আংশিক' : 'PARTIAL'
                    : language === 'bn' ? 'বাকি' : 'DUE'}
                </span>
              </div>

              {/* Customer & Vehicle Info */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {sale.customerName}
                  </span>
                  {sale.customerPhone && (
                    <a
                      href={`tel:${sale.customerPhone}`}
                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 hover:text-amber-600"
                    >
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{sale.customerPhone}</span>
                    </a>
                  )}
                </div>

                {sale.vehicleInfo && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded-lg">
                    <Car className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{sale.vehicleInfo}</span>
                  </div>
                )}
              </div>

              {/* Line Items Count & Financial Breakup */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'bn' ? 'মোট বিল' : 'Total'}
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {formatBDT(sale.grandTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'bn' ? 'জমা' : 'Paid'}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBDT(sale.paidAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'bn' ? 'বাকি' : 'Due'}
                  </span>
                  <span className={`font-black ${sale.dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                    {sale.dueAmount > 0 ? formatBDT(sale.dueAmount) : '—'}
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                <span>{sale.items.length} {language === 'bn' ? 'টি আইটেম/পার্টস' : 'parts items'}</span>
                {sale.notes && <span className="truncate max-w-[150px] italic">"{sale.notes}"</span>}
              </div>

              {/* Card Action Buttons (Mobile-optimized touch targets) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(sale)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'রসিদ দেখুন' : 'View'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingSale(sale)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  title="Edit Invoice"
                >
                  <Edit className="w-3.5 h-3.5 text-blue-500" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(sale)}
                  className="p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                  title={sale.customerWhatsapp || sale.customerPhone ? "Send via WhatsApp" : "Share via WhatsApp (Walk-in)"}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setReturnModalSale(sale)}
                  className="p-2 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                  title="Sales Return"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDeleteSaleId(sale.id)}
                  className="p-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                  title="Delete Invoice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 2. Desktop Table (>= md screens) */}
      <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5">Invoice #</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3.5">Vehicle Reg / Info</th>
                <th className="py-3 px-3.5 text-center">Items</th>
                <th className="py-3 px-3.5 text-right">Grand Total</th>
                <th className="py-3 px-3.5 text-right">Paid</th>
                <th className="py-3 px-3.5 text-right">Due</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No invoices match the current search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {sale.invoiceNo}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(sale.date)}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {sale.customerName}
                      </div>
                      {sale.customerPhone && (
                        <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {sale.vehicleInfo || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">
                      {sale.items.length} parts
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-slate-900 dark:text-white">
                      {formatBDT(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(sale.paidAmount)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                      {sale.dueAmount > 0 ? formatBDT(sale.dueAmount) : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sale.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : sale.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {sale.paymentStatus === 'PAID'
                          ? 'PAID'
                          : sale.paymentStatus === 'PARTIALLY_PAID'
                          ? 'PARTIAL'
                          : 'DUE'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendWhatsApp(sale)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                          title={sale.customerWhatsapp || sale.customerPhone ? "Send via WhatsApp" : "Share via WhatsApp (Walk-in)"}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedInvoice(sale)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="View & Print Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingSale(sale)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setReturnModalSale(sale)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                          title="Sales Return"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSaleId(sale.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                          title="Delete Invoice"
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

      {/* WhatsApp Share 3-Options Modal */}
      {shareModalSale && (
        <WhatsAppShareModal
          sale={shareModalSale}
          onClose={() => setShareModalSale(null)}
          onOpenFullInvoice={() => setSelectedInvoice(shareModalSale)}
        />
      )}

      {/* Return Modal */}
      {returnModalSale && (
        <SalesReturnModal
          sale={returnModalSale}
          onClose={() => setReturnModalSale(null)}
        />
      )}

      {/* Edit Invoice Modal */}
      {editingSale && (
        <EditInvoiceModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteSaleId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full border border-rose-500/40 shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-black text-sm">
                {language === 'bn' ? 'ইনভয়েস মুছে ফেলতে চান?' : 'Delete Invoice?'}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              {language === 'bn'
                ? 'এই ইনভয়েসটি মুছে দিলে এর সমস্ত পার্টসের স্টক স্বয়ংক্রিয়ভাবে পুনরায় গোডাউনে ফেরত আসবে এবং কাস্টমারের বাকি সমন্বয় হয়ে যাবে।'
                : 'Deleting this sale will automatically restore product inventory levels and rollback customer dues and account balance.'}
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteSaleId(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {language === 'bn' ? 'না' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(confirmDeleteSaleId)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                {language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
