import React, { useState, useMemo } from 'react';
import {
  X,
  PackagePlus,
  Search,
  Plus,
  Minus,
  Trash2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Tag,
  Package,
  ArrowLeft,
  DollarSign,
  Wallet,
  Receipt,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, PurchaseItem } from '../../types';
import { formatBDT } from '../../utils/formatters';
import {
  getMatchingAccountForPaymentMethod,
  getMatchingPaymentMethodForAccount,
} from '../../utils/paymentAccountLink';
import { PaymentMethodsManager } from '../settings/PaymentMethodsManager';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({ isOpen, onClose }) => {
  const {
    suppliers,
    addSupplier,
    products,
    categories,
    accounts,
    paymentMethods,
    createPurchase,
    businessProfile,
    t,
    language,
  } = useApp();

  // Mobile App Dual-Tab State: 'menu' (Parts Catalog) vs 'cart' (Purchase Bill / Order Cart)
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

  // Supplier State
  const [supplierId, setSupplierId] = useState<string>('walk-in-supplier');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');

  // Inline supplier addition
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupCompany, setNewSupCompany] = useState('');

  // Category & Product Search
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase Bill Items
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // Financials
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [additionalCosts, setAdditionalCosts] = useState<number>(0); // Transport/labor
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id || 'pm-1');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isManagePaymentMethodsOpen, setIsManagePaymentMethodsOpen] = useState(false);

  // Selected supplier object
  const selectedSupplierObj = useMemo(() => {
    if (!supplierId || supplierId === 'walk-in-supplier') return null;
    return suppliers.find((s) => s.id === supplierId) || null;
  }, [suppliers, supplierId]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers.slice(0, 20);
    const q = supplierSearch.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [suppliers, supplierSearch]);

  // Filter existing products by category & search
  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBarcode = p.barcode.includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchCondition = p.condition.toLowerCase().includes(q);
        const matchOrigin = (p.countryOfOrigin || '').toLowerCase().includes(q);
        return matchName || matchSku || matchBarcode || matchBrand || matchCondition || matchOrigin;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalItemsQty = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  const addItemToPurchase = (prod: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === prod.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitCost,
              }
            : item
        );
      } else {
        const newItem: PurchaseItem = {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: 1,
          unit: prod.unit,
          unitCost: prod.purchasePrice,
          total: prod.purchasePrice,
        };
        return [...prev, newItem];
      }
    });
    setErrorMsg('');
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: qty,
              total: qty * item.unitCost,
            }
          : item
      )
    );
  };

  const updateItemCost = (productId: string, unitCost: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              unitCost: Math.max(0, unitCost),
              total: item.quantity * Math.max(0, unitCost),
            }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Financial totals
  const itemsSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.total, 0),
    [items]
  );

  const grandTotal = Math.max(0, itemsSubtotal - discountTotal + additionalCosts);
  const payableAmount = Math.max(0, grandTotal - paidAmount);

  const handleCreateSupplierInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    const newSup = addSupplier({
      name: newSupName.trim(),
      companyName: newSupCompany.trim() || newSupName.trim(),
      phone: newSupPhone.trim(),
      email: '',
      address: '',
      openingBalance: 0,
      totalPurchased: 0,
      totalPaid: 0,
      currentPayable: 0,
      paymentTerms: 'Credit',
    });

    setSupplierId(newSup.id);
    setShowAddSupplier(false);
    setNewSupName('');
    setNewSupPhone('');
    setNewSupCompany('');
  };

  const handleCompletePurchase = () => {
    if (!supplierId) {
      setErrorMsg('Please select a supplier / vendor.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Please add at least one product to the purchase bill.');
      return;
    }

    try {
      createPurchase({
        supplierId,
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        items,
        subtotal: itemsSubtotal,
        discountTotal,
        additionalCosts,
        grandTotal,
        paidAmount: Math.min(paidAmount, grandTotal),
        dueDate: payableAmount > 0 ? dueDate : undefined,
        paymentMethodId,
        accountId,
        notes: notes.trim() || undefined,
      });

      // Clear & close
      setItems([]);
      setPaidAmount(0);
      setDiscountTotal(0);
      setAdditionalCosts(0);
      setNotes('');
      setErrorMsg('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record purchase');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto no-scrollbar">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white font-bold shadow-xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {language === 'bn' ? 'পার্টস ক্রয় ভাউচার (Buyer POS)' : 'New Parts Purchase Bill'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                {language === 'bn'
                  ? 'সাপ্লায়ার থেকে পার্টস সংগ্রহ, ইনভেন্টরি স্টক বৃদ্ধি এবং বিল সমন্বয়'
                  : 'Fast parts restock, unit cost updating & supplier payable management'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-white dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Dual-Tab Bar (Android POS Style matching user request) */}
        <div className="lg:hidden px-3 pt-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('menu')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              mobileTab === 'menu'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{language === 'bn' ? `পার্টস মেনু (${displayedProducts.length})` : `Parts Menu (${displayedProducts.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all relative ${
              mobileTab === 'cart'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>{language === 'bn' ? 'পারচেজ কার্ট' : 'Purchase Bill'}</span>
            {totalItemsQty > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-black bg-white text-blue-600 dark:bg-white dark:text-blue-600 flex items-center justify-center shadow-xs">
                {totalItemsQty}
              </span>
            )}
          </button>
        </div>

        {/* Content Workspace */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
            
            {/* Left Column (Parts Catalog): Displayed if mobileTab === 'menu' or on large screens */}
            <div className={`space-y-3.5 lg:col-span-7 ${mobileTab === 'menu' ? 'block' : 'hidden lg:block'}`}>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'পার্টসের নাম, SKU বা ব্র্যান্ড দিয়ে খুঁজুন...'
                      : 'Search parts to purchase by name, SKU or brand...'
                  }
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedCategory === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {language === 'bn' ? `সব পণ্য (${products.length})` : `All Parts (${products.length})`}
                </button>
                {categories.map((cat) => {
                  const countInCat = products.filter((p) => p.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat.name} ({countInCat})
                    </button>
                  );
                })}
              </div>

              {/* 2-Column Product Grid for Purchase */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 max-h-[58vh] lg:max-h-[64vh] overflow-y-auto no-scrollbar pb-16 lg:pb-2">
                {displayedProducts.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                    {language === 'bn' ? 'কোনো পার্টস পাওয়া যায়নি।' : 'No products found.'}
                  </div>
                ) : (
                  displayedProducts.map((p) => {
                    const purchaseItem = items.find((item) => item.productId === p.id);

                    return (
                      <div
                        key={p.id}
                        onClick={() => addItemToPurchase(p)}
                        className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md cursor-pointer transition-all p-2 sm:p-2.5 flex flex-col justify-between select-none relative shadow-xs active:scale-[0.98]"
                      >
                        {/* Image Container with Multiplier Badge */}
                        <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2 border border-slate-100 dark:border-slate-800">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                              <Tag className="w-6 h-6 opacity-40" />
                            </div>
                          )}

                          {/* Purchase Cart Multiplier Badge */}
                          {purchaseItem && purchaseItem.quantity > 0 && (
                            <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-blue-600 text-white font-black text-xs shadow-md animate-in zoom-in-75">
                              x{purchaseItem.quantity}
                            </span>
                          )}

                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider">
                            {p.condition || 'NEW'}
                          </span>
                        </div>

                        {/* Title and details */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                            {p.name}
                          </h4>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            SKU: {p.sku} {p.brand ? `• ${p.brand}` : ''}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                            বর্তমান স্টক: {p.currentStock} {p.unit}
                          </div>
                        </div>

                        {/* Cost & Plus Button */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-slate-400">ক্রয়মূল্য:</div>
                            <div className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
                              {formatBDT(p.purchasePrice)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItemToPurchase(p);
                            }}
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 flex items-center justify-center font-bold text-sm shadow-xs active:scale-95 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Purchase Bill & Payment Settlement Panel */}
            <div className={`lg:col-span-5 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex flex-col justify-between ${mobileTab === 'cart' ? 'block' : 'hidden lg:block'}`}>
              
              <div className="space-y-3.5">
                {/* Mobile Back button */}
                <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setMobileTab('menu')}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{language === 'bn' ? '← আরও পার্টস বাছাই করুন' : '← Add More Parts (Menu)'}</span>
                  </button>

                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {items.length} {language === 'bn' ? 'টি আইটেম' : 'items'}
                  </span>
                </div>

                {/* Supplier Selection & Quick Add */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{language === 'bn' ? 'সাপ্লায়ার / আমদানিকারক *' : 'Select Supplier *'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(!showAddSupplier)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      {showAddSupplier ? 'Cancel' : '+ New Supplier'}
                    </button>
                  </div>

                  {showAddSupplier ? (
                    <form onSubmit={handleCreateSupplierInline} className="space-y-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Contact Person *"
                          required
                          value={newSupName}
                          onChange={(e) => setNewSupName(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Company Name"
                          value={newSupCompany}
                          onChange={(e) => setNewSupCompany(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Phone / WhatsApp"
                          value={newSupPhone}
                          onChange={(e) => setNewSupPhone(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      {/* Checkbox for Walk-in / Local Supplier */}
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={supplierId === 'walk-in-supplier'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSupplierId('walk-in-supplier');
                                setSupplierSearch('');
                                setIsSupplierSearchOpen(false);
                              } else {
                                setSupplierId('');
                                setIsSupplierSearchOpen(true);
                              }
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {language === 'bn' ? 'ওয়াক-ইন / লোকাল সাপ্লায়ার (Walk-in Supplier)' : 'Walk-in / Local Supplier'}
                          </span>
                        </label>

                        {supplierId === 'walk-in-supplier' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                            {language === 'bn' ? 'নগদ কেনাকাটা' : 'Spot Cash'}
                          </span>
                        )}
                      </div>

                      {/* Search Bar & Selected Supplier */}
                      {supplierId === 'walk-in-supplier' ? (
                        <div className="text-[11px] text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                          {language === 'bn'
                            ? 'ওয়াক-ইন সাপ্লায়ার হিসেবে ক্রয়। নির্দিষ্ট সরবরাহকারী খুঁজতে উপরের টিক তুলে সার্চ করুন।'
                            : 'Purchasing from Walk-in vendor. Uncheck above to search registered suppliers.'}
                        </div>
                      ) : (
                        <div className="relative">
                          {selectedSupplierObj ? (
                            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{selectedSupplierObj.companyName || selectedSupplierObj.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{selectedSupplierObj.name} • {selectedSupplierObj.phone}</span>
                                  {selectedSupplierObj.currentPayable > 0 && (
                                    <span className="text-rose-600 font-bold">
                                      {language === 'bn' ? 'দেনা: ' : 'Payable: '}{formatBDT(selectedSupplierObj.currentPayable)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSupplierId('walk-in-supplier');
                                  setSupplierSearch('');
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Remove selected supplier"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder={language === 'bn' ? 'সাপ্লায়ারের নাম, কোম্পানি বা মোবাইল নম্বর লিখুন...' : 'Search supplier by name, company, or phone...'}
                                  value={supplierSearch}
                                  onChange={(e) => {
                                    setSupplierSearch(e.target.value);
                                    setIsSupplierSearchOpen(true);
                                  }}
                                  onFocus={() => setIsSupplierSearchOpen(true)}
                                  className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                                />
                                {supplierSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setSupplierSearch('')}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {isSupplierSearchOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 divide-y divide-slate-100 dark:divide-slate-800">
                                  {filteredSuppliers.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-slate-400">
                                      {language === 'bn' ? 'কোনো সাপ্লায়ার পাওয়া যায়নি।' : 'No matching supplier found.'}
                                    </div>
                                  ) : (
                                    filteredSuppliers.map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                          setSupplierId(s.id);
                                          setIsSupplierSearchOpen(false);
                                          setSupplierSearch('');
                                        }}
                                        className="w-full text-left p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-between text-xs transition-colors"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-900 dark:text-white">
                                            {s.companyName ? `${s.companyName} (${s.name})` : s.name}
                                          </div>
                                          <div className="text-[10px] text-slate-400">
                                            {s.phone} {s.address ? `• ${s.address}` : ''}
                                          </div>
                                        </div>
                                        {s.currentPayable > 0 && (
                                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                                            {language === 'bn' ? 'দেনা: ' : 'Payable: '}{formatBDT(s.currentPayable)}
                                          </span>
                                        )}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        type="text"
                        placeholder="Supplier Bill / Challan No. (e.g. CH-9082)"
                        value={supplierInvoiceNo}
                        onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Purchase Items List Header */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4 text-blue-600" />
                    <span>{language === 'bn' ? 'ক্রয়কৃত পার্টসের তালিকা' : 'Bill Items'}</span>
                    <span className="text-[11px] font-normal text-slate-400">({items.length})</span>
                  </span>

                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setItems([])}
                      className="text-xs text-rose-500 hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Purchase Items with INLINE UNIT COST EDITING */}
                <div className="max-h-[200px] overflow-y-auto no-scrollbar divide-y divide-slate-200 dark:divide-slate-700/60 pr-1">
                  {items.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      {language === 'bn'
                        ? 'কোনো পার্টস যোগ করা হয়নি। বাম পাশ থেকে পার্টসে ক্লিক করুন।'
                        : 'No parts added to bill yet.'}
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.productId} className="py-2 space-y-1.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {item.productName}
                            </div>
                            <div className="text-[10px] text-slate-400">SKU: {item.sku}</div>
                          </div>

                          <div className="text-right font-black text-slate-900 dark:text-white shrink-0 text-xs sm:text-sm">
                            {formatBDT(item.total)}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Editable Unit Cost & Qty */}
                        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-500">
                              {language === 'bn' ? 'ক্রয়মূল্য ৳:' : 'Cost ৳:'}
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={item.unitCost}
                              onChange={(e) => updateItemCost(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-blue-600 dark:text-blue-400 text-right focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-slate-400">/{item.unit}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.productId, item.quantity - 1)}
                              className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.productId, item.quantity + 1)}
                              className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bill Financial Calculations */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('subtotal')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatBDT(itemsSubtotal)}</span>
                  </div>

                  {/* Additional Transport Cost */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'bn' ? 'পরিবহন / লেবার খরচ (৳)' : 'Transport / Labor Cost (৳)'}</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={additionalCosts}
                      onChange={(e) => setAdditionalCosts(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Supplier Discount */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">{t('discount')} (৳)</span>
                    <input
                      type="number"
                      min="0"
                      value={discountTotal}
                      onChange={(e) => setDiscountTotal(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Grand Bill Total */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {language === 'bn' ? 'মোট বিল (Grand Total)' : 'Grand Total'}
                    </span>
                    <span className="font-black text-lg text-blue-600 dark:text-blue-400">
                      {formatBDT(grandTotal)}
                    </span>
                  </div>

                  {/* Payment Channel & Account with Smart Auto-Linking */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] font-bold text-slate-500 block">
                          {language === 'bn' ? 'পরিশোধের মাধ্যম' : 'Payment Method'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsManagePaymentMethodsOpen(true)}
                          className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          title="নতুন পেমেন্ট মেথড তৈরি বা পরিবর্তন করুন"
                        >
                          + {language === 'bn' ? 'পরিবর্তন/লিংক' : 'Manage'}
                        </button>
                      </div>
                      <select
                        value={paymentMethodId}
                        onChange={(e) => {
                          const newPmId = e.target.value;
                          setPaymentMethodId(newPmId);
                          const matchedAccId = getMatchingAccountForPaymentMethod(newPmId, paymentMethods, accounts);
                          if (matchedAccId) setAccountId(matchedAccId);
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      >
                        {paymentMethods.map((pm) => (
                          <option key={pm.id} value={pm.id}>
                            {language === 'bn' ? (pm.nameBn || pm.name) : pm.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        {language === 'bn' ? 'উৎস একাউন্ট' : 'Source Account'}
                      </label>
                      <select
                        value={accountId}
                        onChange={(e) => {
                          const newAccId = e.target.value;
                          setAccountId(newAccId);
                          const matchedPmId = getMatchingPaymentMethodForAccount(newAccId, accounts, paymentMethods);
                          if (matchedPmId) setPaymentMethodId(matchedPmId);
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({formatBDT(acc.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Paid Amount */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        {language === 'bn' ? 'সাপ্লায়ারকে তাৎক্ষণিক পরিশোধ (৳)' : 'Immediate Paid Amount (৳)'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setPaidAmount(grandTotal)}
                        className="text-[10px] text-blue-600 dark:text-blue-400 font-bold underline"
                      >
                        {language === 'bn' ? 'সম্পূর্ণ পরিশোধ (100%)' : 'Full Paid (100%)'}
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-black text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Payable Balance */}
                  {payableAmount > 0 && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-1">
                      <div className="flex justify-between font-bold text-amber-800 dark:text-amber-300 text-xs">
                        <span>{language === 'bn' ? 'সাপ্লায়ারের কাছে বাকি (Payable):' : 'Supplier Due (Payable):'}</span>
                        <span>{formatBDT(payableAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">
                          {language === 'bn' ? 'পরিশোধের শেষ তারিখ:' : 'Due Date:'}
                        </span>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-[10px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bill Notes */}
                  <div>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={language === 'bn' ? 'পারচেজ নোট বা বিশেষ মন্তব্য...' : 'Purchase notes or remarks...'}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="my-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Complete Purchase Button */}
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCompletePurchase}
                  disabled={items.length === 0 || !supplierId}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm Purchase ({formatBDT(grandTotal)})</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Sticky Bottom Bar on Mobile when on 'menu' tab */}
        {mobileTab === 'menu' && totalItemsQty > 0 && (
          <div className="lg:hidden sticky bottom-0 left-0 right-0 z-30 p-2.5 sm:p-3 bg-slate-950 text-white flex items-center justify-between shadow-2xl border-t border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                {totalItemsQty}
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-semibold leading-none">Bill Total:</div>
                <div className="text-sm font-black text-white leading-tight">{formatBDT(grandTotal)}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{language === 'bn' ? 'পারচেজ বিল দেখুন →' : 'Proceed to Bill →'}</span>
            </button>
          </div>
        )}

        {/* Quick Payment Methods & Accounts Mapping Manager Modal */}
        {isManagePaymentMethodsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {language === 'bn' ? 'পেমেন্ট মেথড তৈরি ও একাউন্ট ম্যাপিং' : 'Manage Payment Channels & Linked Accounts'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsManagePaymentMethodsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                <PaymentMethodsManager />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
