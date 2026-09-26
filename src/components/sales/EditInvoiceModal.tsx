import React, { useState, useMemo } from 'react';
import {
  X,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Car,
  PackagePlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sale, SaleItem } from '../../types';
import { formatBDT } from '../../utils/formatters';

interface EditInvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
  onSaved?: (updatedSale: Sale) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  sale,
  onClose,
  onSaved,
}) => {
  if (!sale) return null;

  return (
    <EditInvoiceModalContent
      key={sale.id}
      sale={sale}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
};

const EditInvoiceModalContent: React.FC<{
  sale: Sale;
  onClose: () => void;
  onSaved?: (updatedSale: Sale) => void;
}> = ({
  sale,
  onClose,
  onSaved,
}) => {
  const { products, categories, brands, countries, updateSale, t, language } = useApp();

  // Local state initialized with current invoice data
  const [items, setItems] = useState<SaleItem[]>(() => [...sale.items]);
  const [discountTotal, setDiscountTotal] = useState<number>(sale.discountTotal || 0);
  const [taxAmount, setTaxAmount] = useState<number>(sale.taxAmount || 0);
  const [paidAmount, setPaidAmount] = useState<number>(sale.paidAmount || 0);
  const [vehicleInfo, setVehicleInfo] = useState<string>(sale.vehicleInfo || '');
  const [dueDate, setDueDate] = useState<string>(sale.dueDate || '');
  const [notes, setNotes] = useState<string>(sale.notes || '');
  const [searchPart, setSearchPart] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Calculations
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.total, 0),
    [items]
  );

  const grandTotal = useMemo(
    () => Math.max(0, subtotal - discountTotal + taxAmount),
    [subtotal, discountTotal, taxAmount]
  );

  const dueAmount = useMemo(
    () => Math.max(0, grandTotal - paidAmount),
    [grandTotal, paidAmount]
  );

  // Available catalog search for adding new items to invoice
  const matchingProducts = useMemo(() => {
    if (!searchPart.trim()) return [];
    const q = searchPart.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [products, searchPart]);

  const handleUpdateItemQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const lineTotal = newQty * it.sellingPrice - (it.discount || 0);
          return {
            ...it,
            quantity: newQty,
            total: Math.max(0, lineTotal),
          };
        }
        return it;
      })
    );
  };

  const handleUpdateItemPrice = (productId: string, newPrice: number) => {
    const validPrice = Math.max(0, isNaN(newPrice) ? 0 : newPrice);
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const lineTotal = it.quantity * validPrice - (it.discount || 0);
          return {
            ...it,
            sellingPrice: validPrice,
            total: Math.max(0, lineTotal),
          };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    if (items.length <= 1) {
      setErrorMsg(
        language === 'bn'
          ? 'ইনভয়েসে কমপক্ষে একটি আইটেম থাকতে হবে।'
          : 'Invoice must contain at least one line item.'
      );
      return;
    }
    setItems((prev) => prev.filter((it) => it.productId !== productId));
    setErrorMsg('');
  };

  const handleAddItemToInvoice = (p: typeof products[0]) => {
    const existing = items.find((it) => it.productId === p.id);
    if (existing) {
      handleUpdateItemQty(p.id, existing.quantity + 1);
    } else {
      const brandObj = brands.find((b) => b.id === p.brandId);
      const countryObj = countries.find((c) => c.id === p.originCountryId);
      const catObj = categories.find((c) => c.id === p.categoryId);
      const vehicleModelStr =
        p.vehicleCompatibilities && p.vehicleCompatibilities.length > 0
          ? p.vehicleCompatibilities.map((v) => `${v.brand} ${v.model}`).join(', ')
          : '';

      const newItem: SaleItem = {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantity: 1,
        unit: p.unit,
        costPrice: p.purchasePrice,
        defaultSellingPrice: p.defaultSellingPrice,
        sellingPrice: p.defaultSellingPrice,
        discount: 0,
        total: p.defaultSellingPrice,
        brand: brandObj?.name || p.brand || '',
        condition: p.condition || 'New',
        origin: countryObj?.name || p.countryOfOrigin || '',
        category: catObj?.name || '',
        vehicleModel: vehicleModelStr,
        image: p.image,
      };

      setItems((prev) => [...prev, newItem]);
    }
    setSearchPart('');
    setErrorMsg('');
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg('No items in invoice.');
      return;
    }

    try {
      const result = updateSale(sale.id, {
        items,
        subtotal,
        discountTotal,
        taxAmount,
        grandTotal,
        paidAmount,
        dueDate: dueDate || undefined,
        vehicleInfo: vehicleInfo || undefined,
        notes: notes || undefined,
      });

      if (result) {
        setSuccessMsg(language === 'bn' ? 'ইনভয়েস সফলভাবে আপডেট হয়েছে!' : 'Invoice updated successfully!');
        if (onSaved) onSaved(result);
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update invoice.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'bn' ? 'ইনভয়েস সম্পাদনা করুন' : 'Edit Cash Memo / Invoice'}</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">#{sale.invoiceNo}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {language === 'bn'
                ? `গ্রাহক: ${sale.customerName} • তারিখ: ${new Date(sale.date).toLocaleDateString('en-GB')}`
                : `Customer: ${sale.customerName} • Date: ${new Date(sale.date).toLocaleDateString('en-GB')}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveInvoice} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Add Product to Existing Invoice */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <PackagePlus className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'bn' ? 'ইনভয়েসে নতুন পার্টস যোগ করুন' : 'Add New Item to This Invoice'}</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPart}
                onChange={(e) => setSearchPart(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'যোগ করতে পার্টসের নাম বা SKU টাইপ করুন...'
                    : 'Search part by name or SKU to add...'
                }
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {matchingProducts.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 max-h-36 overflow-y-auto">
                {matchingProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddItemToInvoice(p)}
                    className="p-2 flex items-center justify-between hover:bg-amber-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{p.name}</div>
                      <div className="text-[10px] text-slate-400">SKU: {p.sku} • স্টক: {p.currentStock} {p.unit}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-600 dark:text-amber-400">{formatBDT(p.defaultSellingPrice)}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px]">+ Add</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
              <span>{language === 'bn' ? 'বিলভুক্ত পার্টস তালিকা' : 'Invoice Line Items'} ({items.length})</span>
              <span className="text-[11px] text-slate-400">
                {language === 'bn' ? 'পরিমাণ ও রেট পরিবর্তন করতে পারবেন' : 'You can edit qty and selling price'}
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, idx) => (
                <div
                  key={item.productId + '-' + idx}
                  className="pt-2 pb-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {item.productName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      SKU: {item.sku} {item.brand ? `• ${item.brand}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Unit Price */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">৳:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.sellingPrice}
                        onChange={(e) => handleUpdateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                        className="w-20 px-1.5 py-1 text-right font-black border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    {/* Qty Stepper */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemQty(item.productId, parseInt(e.target.value) || 1)}
                        className="w-10 text-center font-bold text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Total */}
                    <div className="w-20 text-right font-black text-slate-900 dark:text-white">
                      {formatBDT(item.total)}
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {language === 'bn' ? 'গাড়ির নম্বর / মডেল' : 'Vehicle Reg / Model'}
              </label>
              <input
                type="text"
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                placeholder="e.g. Dhaka Metro GA 11-2233"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {language === 'bn' ? 'পরিশোধের শেষ তারিখ (বাকির জন্য)' : 'Payment Due Date'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {language === 'bn' ? 'নোট / ওয়ারেন্টি বিবরণ' : 'Invoice Notes / Warranty Terms'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 6 Months warranty on alternator"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Financial Calculation Area */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatBDT(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Discount (৳):</span>
              <input
                type="number"
                min="0"
                value={discountTotal}
                onChange={(e) => setDiscountTotal(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-0.5 text-right font-bold border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Tax / VAT (৳):</span>
              <input
                type="number"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-0.5 text-right font-bold border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline font-black">
              <span className="text-sm text-slate-900 dark:text-white">Grand Total:</span>
              <span className="text-base text-amber-600 dark:text-amber-400">{formatBDT(grandTotal)}</span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Paid Amount (৳):</span>
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-28 px-2 py-1 text-right font-black border border-emerald-300 dark:border-emerald-700 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs"
              />
            </div>

            <div className="flex justify-between items-center pt-1 font-black text-rose-600 dark:text-rose-400">
              <span>Remaining Due:</span>
              <span>{formatBDT(dueAmount)}</span>
            </div>
          </div>

          {/* Footer action buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-sm active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
