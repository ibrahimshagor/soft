import React, { useState, useMemo } from 'react';
import {
  X,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Tag,
  Package,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Wallet,
  Receipt,
  Check,
  PackagePlus,
  Truck,
  User,
  Building2,
  CreditCard,
  Coins,
  Car,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, SaleItem, Sale } from '../../types';
import { formatBDT } from '../../utils/formatters';
import {
  getMatchingAccountForPaymentMethod,
  getMatchingPaymentMethodForAccount,
} from '../../utils/paymentAccountLink';
import { PaymentMethodsManager } from '../settings/PaymentMethodsManager';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted?: (sale: Sale) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSaleCompleted }) => {
  const {
    products,
    categories,
    brands,
    countries,
    customers,
    addCustomer,
    suppliers,
    addSupplier,
    createPurchase,
    accounts,
    paymentMethods,
    createSale,
    adjustStock,
    businessProfile,
    currentUser,
    setSelectedInvoice,
    t,
    language,
  } = useApp();

  // Mobile App Dual-Tab State: 'menu' (Parts Catalog) vs 'cart' (Order Cart)
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

  // Quick Emergency Restock & Procurement Dialog State
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockSupplierId, setQuickStockSupplierId] = useState<string>('');
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState<boolean>(false);
  const [newSupName, setNewSupName] = useState<string>('');
  const [newSupCompany, setNewSupCompany] = useState<string>('');
  const [newSupPhone, setNewSupPhone] = useState<string>('');
  const [quickStockQtyToAdd, setQuickStockQtyToAdd] = useState<number>(5);
  const [quickStockUnitCost, setQuickStockUnitCost] = useState<number>(0);
  const [quickStockPaymentType, setQuickStockPaymentType] = useState<'cash' | 'due' | 'partial'>('cash');
  const [quickStockPaidAmount, setQuickStockPaidAmount] = useState<number>(0);
  const [quickStockAccountId, setQuickStockAccountId] = useState<string>('');
  const [quickDeliverQty, setQuickDeliverQty] = useState<number>(1);
  const [quickStockError, setQuickStockError] = useState<string>('');

  // Helper to open emergency restock with prepopulated values
  const openQuickRestock = (product: Product, neededQty: number = 1) => {
    const defaultQty = Math.max(1, neededQty);
    const unitPrice = product.purchasePrice || 0;
    const total = defaultQty * unitPrice;

    setQuickStockProduct(product);
    setQuickStockSupplierId(suppliers[0]?.id || '');
    setIsAddingNewSupplier(false);
    setNewSupName('');
    setNewSupCompany('');
    setNewSupPhone('');
    setQuickStockQtyToAdd(defaultQty);
    setQuickStockUnitCost(unitPrice);
    setQuickStockPaymentType('cash');
    setQuickStockPaidAmount(total);
    setQuickStockAccountId(accounts[0]?.id || 'acc-1');
    setQuickDeliverQty(defaultQty);
    setQuickStockError('');
  };

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Category & Product Search
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountPercentVal, setDiscountPercentVal] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);

  // Payment state
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id || 'pm-1');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + (businessProfile.defaultDueDays || 15));
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isManagePaymentMethodsOpen, setIsManagePaymentMethodsOpen] = useState(false);

  // Selected customer object
  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'walk-in') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered Customers based on quick search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 20);
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.whatsappNumber && c.whatsappNumber.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [customers, customerSearch]);

  // Filtered Products by Category + Text Search
  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      // Category match
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) {
        return false;
      }
      // Query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchProductCode = (p.productCode || '').toLowerCase().includes(q);
        const matchBarcode = p.barcode.includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchCondition = p.condition.toLowerCase().includes(q);
        const matchOrigin = (p.countryOfOrigin || '').toLowerCase().includes(q);
        return matchName || matchSku || matchProductCode || matchBarcode || matchBrand || matchCondition || matchOrigin;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalCartQty = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      setErrorMsg(
        language === 'bn'
          ? `আপনার এই প্রোডাক্টটি আর স্টকে নেই। জরুরি অবস্থায় প্রোডাক্ট যোগ করুন স্টকে।`
          : `This product is out of stock! Add emergency stock.`
      );
      openQuickRestock(product, 1);
      return;
    }

    const existing = cart.find((item) => item.productId === product.id);
    if (existing && existing.quantity >= product.currentStock) {
      setErrorMsg(
        language === 'bn'
          ? `আপনার এই প্রোডাক্টটি আর স্টকে নেই (সব ${product.currentStock} ${product.unit} কার্টে যুক্ত)। জরুরি অবস্থায় প্রোডাক্ট যোগ করুন স্টকে।`
          : `All available stock (${product.currentStock} ${product.unit}) is already in cart. Add emergency stock.`
      );
      openQuickRestock(product, 1);
      return;
    }

    const brandObj = brands.find((b) => b.id === product.brandId);
    const countryObj = countries.find((c) => c.id === product.originCountryId);
    const catObj = categories.find((c) => c.id === product.categoryId);
    const vehicleModelStr =
      product.vehicleCompatibilities && product.vehicleCompatibilities.length > 0
        ? product.vehicleCompatibilities.map((v) => `${v.brand} ${v.model}`).join(', ')
        : '';

    setCart((prev) => {
      const match = prev.find((item) => item.productId === product.id);
      if (match) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.sellingPrice - item.discount,
              }
            : item
        );
      } else {
        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          productCode: product.productCode || '',
          quantity: 1,
          unit: product.unit,
          costPrice: product.purchasePrice,
          defaultSellingPrice: product.defaultSellingPrice,
          sellingPrice: product.defaultSellingPrice,
          discount: 0,
          total: product.defaultSellingPrice,
          brand: brandObj?.name || product.brand || '',
          condition: product.condition || 'New',
          origin: countryObj?.name || product.countryOfOrigin || '',
          category: catObj?.name || '',
          vehicleModel: vehicleModelStr,
          image: product.image,
        };
        return [...prev, newItem];
      }
    });
    setErrorMsg('');
  };

  const updateCartItemQty = (productId: string, qty: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (qty > product.currentStock) {
      setErrorMsg(
        language === 'bn'
          ? `আপনার এই প্রোডাক্টটি আর স্টকে নেই (স্টক: ${product.currentStock} ${product.unit})। জরুরি অবস্থায় প্রোডাক্ট যোগ করুন স্টকে।`
          : `Maximum available stock is ${product.currentStock} ${product.unit}! Restock.`
      );
      openQuickRestock(product, Math.max(1, qty - product.currentStock));
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: qty,
              total: qty * item.sellingPrice - item.discount,
            }
          : item
      )
    );
    setErrorMsg('');
  };

  const updateCartItemPrice = (productId: string, newPrice: number) => {
    const validPrice = isNaN(newPrice) ? 0 : Math.max(0, newPrice);
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              sellingPrice: validPrice,
              total: item.quantity * validPrice - item.discount,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Comprehensive Quick Restock Handler: Records genuine Purchase in ledger & accounts, then delivers to POS cart
  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStockProduct) return;

    if (quickStockQtyToAdd <= 0) {
      setQuickStockError(language === 'bn' ? 'সঠিক আমদানি কোয়ান্টিটি দিন' : 'Please specify valid quantity to add');
      return;
    }

    let resolvedSupplierId = quickStockSupplierId;

    // If creating a new supplier inline
    if (isAddingNewSupplier) {
      if (!newSupName.trim() && !newSupCompany.trim()) {
        setQuickStockError(language === 'bn' ? 'সাপ্লায়ারের নাম বা প্রতিষ্ঠানের নাম লিখুন' : 'Please enter supplier or company name');
        return;
      }
      const createdSup = addSupplier({
        name: newSupName.trim() || newSupCompany.trim(),
        companyName: newSupCompany.trim() || newSupName.trim(),
        phone: newSupPhone.trim() || '01XXXXXXXXX',
        email: '',
        address: 'Local Sourcing',
        supplierCategory: 'local_supplier',
        openingBalance: 0,
        totalPurchased: 0,
        totalPaid: 0,
        currentPayable: 0,
      });
      resolvedSupplierId = createdSup.id;
    } else if (!resolvedSupplierId) {
      resolvedSupplierId = suppliers[0]?.id || 'sup-walk-in';
    }

    const unitCost = Math.max(0, isNaN(quickStockUnitCost) ? 0 : quickStockUnitCost);
    const totalCost = quickStockQtyToAdd * unitCost;

    let finalPaid = 0;
    if (quickStockPaymentType === 'cash') {
      finalPaid = totalCost;
    } else if (quickStockPaymentType === 'due') {
      finalPaid = 0;
    } else {
      finalPaid = Math.min(totalCost, Math.max(0, quickStockPaidAmount));
    }
    const finalDue = Math.max(0, totalCost - finalPaid);

    const targetCustomerName = selectedCustomerObj ? selectedCustomerObj.name : 'Walk-in Customer';

    // 1. Create Purchase Entry in Ledger (Updates Stock, Supplier Payable, Accounts Cashbook & Audit Log!)
    createPurchase({
      supplierId: resolvedSupplierId,
      supplierInvoiceNo: `EMERG-${Date.now().toString().slice(-6)}`,
      items: [
        {
          productId: quickStockProduct.id,
          productName: quickStockProduct.name,
          sku: quickStockProduct.sku,
          quantity: quickStockQtyToAdd,
          unit: quickStockProduct.unit,
          unitCost: unitCost,
          total: totalCost,
          brand: quickStockProduct.brand,
        },
      ],
      subtotal: totalCost,
      discountTotal: 0,
      additionalCosts: 0,
      grandTotal: totalCost,
      paidAmount: finalPaid,
      paymentMethodId: paymentMethods[0]?.id || 'pm-1',
      accountId: quickStockAccountId || accounts[0]?.id || 'acc-1',
      notes: `ইমার্জেন্সি কাউন্টার ক্রয় • কাস্টমার: ${targetCustomerName} (পেইড: ৳${finalPaid}, ডিউ: ৳${finalDue})`,
    });

    // 2. Deliver requested quantity to the Customer Cart
    const deliverQty = Math.max(1, Math.min(quickStockQtyToAdd, quickDeliverQty));

    const brandObj = brands.find((b) => b.id === quickStockProduct.brandId);
    const countryObj = countries.find((c) => c.id === quickStockProduct.originCountryId);
    const catObj = categories.find((c) => c.id === quickStockProduct.categoryId);
    const vehicleModelStr =
      quickStockProduct.vehicleCompatibilities && quickStockProduct.vehicleCompatibilities.length > 0
        ? quickStockProduct.vehicleCompatibilities.map((v) => `${v.brand} ${v.model}`).join(', ')
        : '';

    setCart((prev) => {
      const existing = prev.find((it) => it.productId === quickStockProduct.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === quickStockProduct.id
            ? {
                ...it,
                quantity: it.quantity + deliverQty,
                total: (it.quantity + deliverQty) * it.sellingPrice - it.discount,
              }
            : it
        );
      } else {
        const newItem: SaleItem = {
          productId: quickStockProduct.id,
          productName: quickStockProduct.name,
          sku: quickStockProduct.sku,
          productCode: quickStockProduct.productCode || '',
          quantity: deliverQty,
          unit: quickStockProduct.unit,
          costPrice: unitCost,
          defaultSellingPrice: quickStockProduct.defaultSellingPrice,
          sellingPrice: quickStockProduct.defaultSellingPrice,
          discount: 0,
          total: deliverQty * quickStockProduct.defaultSellingPrice,
          brand: brandObj?.name || quickStockProduct.brand || '',
          condition: quickStockProduct.condition || 'New',
          origin: countryObj?.name || quickStockProduct.countryOfOrigin || '',
          category: catObj?.name || '',
          vehicleModel: vehicleModelStr,
          image: quickStockProduct.image,
        };
        return [...prev, newItem];
      }
    });

    setQuickStockProduct(null);
    setErrorMsg('');
    setMobileTab('cart');
  };

  // Financial calculations
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);

  const calculatedDiscount = useMemo(() => {
    if (discountType === 'percent') {
      return (subtotal * discountPercentVal) / 100;
    }
    return discountTotal;
  }, [discountType, discountPercentVal, discountTotal, subtotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - calculatedDiscount + taxAmount + (deliveryCharge || 0));
  }, [subtotal, calculatedDiscount, taxAmount, deliveryCharge]);

  const dueAmount = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  const handleSetFullPay = () => {
    setPaidAmount(grandTotal);
  };

  const handleCreateCustomerInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setErrorMsg('Customer name and phone number are required');
      return;
    }

    const newCust = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim() || undefined,
      customerType: 'Garage / Workshop',
      openingBalance: 0,
      totalPurchased: 0,
      totalPaid: 0,
      currentDue: 0,
      creditLimit: 50000,
      paymentTerms: 'Credit',
    });

    setSelectedCustomerId(newCust.id);
    setShowAddCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      setErrorMsg('Please add at least one automobile part to the cart.');
      return;
    }

    try {
      const newSale = createSale({
        customerId: selectedCustomerId,
        items: cart,
        subtotal,
        discountTotal: calculatedDiscount,
        deliveryCharge: deliveryCharge || 0,
        taxAmount,
        grandTotal,
        paidAmount: Math.min(paidAmount, grandTotal),
        dueDate: dueAmount > 0 ? dueDate : undefined,
        paymentMethodId,
        accountId,
        notes: notes.trim() || undefined,
      });

      // Clear & close
      setCart([]);
      setPaidAmount(0);
      setDiscountTotal(0);
      setDeliveryCharge(0);
      setCustomerSearch('');
      setSelectedCustomerId('walk-in');
      setNotes('');
      setErrorMsg('');
      onClose();
      setSelectedInvoice(newSale);
      onSaleCompleted?.(newSale);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete sale');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto no-scrollbar">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Navigation Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {t('pos')} - {language === 'bn' ? 'পার্টস বিক্রয় কাউন্টার' : 'Automobile Spare Parts Sale'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                {language === 'bn'
                  ? 'দ্রুত প্রোডাক্ট নির্বাচন, এডিটেবল প্রাইস এবং ইন্সট্যান্ট ক্যাশ মেমো'
                  : 'Fast parts selection, inline price editing & instant cash memo generation'}
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

        {/* Mobile Dual-Tab Bar (Matching the uploaded Android POS screenshot) */}
        <div className="lg:hidden px-3 pt-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('menu')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              mobileTab === 'menu'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
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
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{language === 'bn' ? 'অর্ডার কার্ট' : 'Order Cart'}</span>
            {totalCartQty > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-black bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center">
                {totalCartQty}
              </span>
            )}
          </button>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
            
            {/* Left Column (Catalog / Parts Menu): Displayed if mobileTab === 'menu' or on large screens */}
            <div className={`space-y-3.5 lg:col-span-7 ${mobileTab === 'menu' ? 'block' : 'hidden lg:block'}`}>
              
              {/* Search Bar (Android POS Style) */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'পার্টসের নাম, SKU, ব্র্যান্ড বা গাড়ির মডেল খুঁজুন...'
                      : 'Search parts by name, SKU, brand, vehicle model...'
                  }
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                />
              </div>

              {/* Horizontal Category Chips (Matching Screenshot) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedCategory === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {language === 'bn' ? `সব পণ্য (${products.length})` : `All Items (${products.length})`}
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
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat.name} ({countInCat})
                    </button>
                  );
                })}
              </div>

              {/* Product Catalog Grid (2-Column Android App Style matching Screenshot) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 max-h-[58vh] lg:max-h-[64vh] overflow-y-auto no-scrollbar pb-16 lg:pb-2">
                {displayedProducts.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                    {language === 'bn' ? 'কোনো পার্টস পাওয়া যায়নি।' : 'No products found matching criteria.'}
                  </div>
                ) : (
                  displayedProducts.map((p) => {
                    const cartItem = cart.find((item) => item.productId === p.id);
                    const isOutOfStock = p.currentStock <= 0;
                    const catName = categories.find((c) => c.id === p.categoryId)?.name || 'Auto Parts';
                    const brandName = brands.find((b) => b.id === p.brandId)?.name || (p as any).brand || '';
                    const originCountry = countries.find((c) => c.id === p.originCountryId)?.name || (p as any).countryOfOrigin || '';
                    const conditionText = p.condition || 'New';
                    const compatModels =
                      p.vehicleCompatibilities && p.vehicleCompatibilities.length > 0
                        ? p.vehicleCompatibilities.map((v) => `${v.brand} ${v.model}`).join(', ')
                        : '';

                    return (
                      <div
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className={`group bg-white dark:bg-slate-900 rounded-2xl border transition-all p-2 sm:p-2.5 flex flex-col justify-between select-none relative shadow-xs cursor-pointer active:scale-[0.98] ${
                          cartItem && cartItem.quantity > 0
                            ? 'border-amber-500/70 bg-amber-500/5 shadow-xs'
                            : isOutOfStock
                            ? 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/20 hover:border-rose-400'
                            : 'border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-md'
                        }`}
                      >
                        {/* Image Container with Badge and Cart Multiplier */}
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

                          {/* Top-Right Orange Cart Multiplier Badge */}
                          {cartItem && cartItem.quantity > 0 && (
                            <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-md animate-in zoom-in-75">
                              x{cartItem.quantity}
                            </span>
                          )}

                          {/* Bottom-Left subtle condition badge */}
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider">
                            {conditionText}
                          </span>
                        </div>

                        {/* Title and Detailed Product Specifications (Category, Condition, Brand, Origin, Model) */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                            {p.name}
                          </h4>

                          {/* Attribute Badges: Product Code, Category, Brand, Condition, Origin */}
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {p.productCode && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-mono font-bold text-[9px] border border-amber-300/60 dark:border-amber-700/60">
                                কোড: {p.productCode}
                              </span>
                            )}

                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-semibold">
                              {catName}
                            </span>

                            {brandName && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[9px] font-bold">
                                {brandName}
                              </span>
                            )}

                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              conditionText.toLowerCase() === 'new'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}>
                              {conditionText}
                            </span>

                            {originCountry && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[9px] font-medium">
                                🌐 {originCountry}
                              </span>
                            )}
                          </div>

                          {/* Vehicle Compatibility Model */}
                          {compatModels && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
                              <Car className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{compatModels}</span>
                            </div>
                          )}

                          <div className="text-[10px] pt-0.5 font-semibold flex items-center justify-between">
                            <span className={isOutOfStock ? 'text-rose-500 font-bold' : 'text-emerald-600 dark:text-emerald-400'}>
                              {isOutOfStock ? 'স্টক নেই' : `স্টক: ${p.currentStock} ${p.unit}`}
                            </span>
                            <span className="text-slate-400 font-mono text-[9px]">
                              {p.sku}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Price and Plus / Restock Button */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {formatBDT(p.defaultSellingPrice)}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Instant Inline stock addition button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuickRestock(p, 1);
                              }}
                              className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-amber-950 dark:hover:text-amber-300 flex items-center gap-1 text-[10px] font-bold shadow-xs active:scale-95 transition-all"
                              title={language === 'bn' ? 'জরুরি স্টক আমদানি ও পারচেজ' : 'Instant Restock'}
                            >
                              <PackagePlus className="w-3.5 h-3.5 text-amber-500" />
                              <span className="hidden sm:inline">{language === 'bn' ? '+স্টক' : '+Stock'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(p);
                              }}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs active:scale-95 transition-all ${
                                isOutOfStock || (cartItem && cartItem.quantity >= p.currentStock)
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900'
                              }`}
                              title={
                                isOutOfStock || (cartItem && cartItem.quantity >= p.currentStock)
                                  ? 'স্টক শেষ - জরুরি স্টক যোগ করুন'
                                  : 'Add to cart'
                              }
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Order Cart & Checkout Panel (Displayed if mobileTab === 'cart' or on large screens) */}
            <div className={`lg:col-span-5 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex flex-col justify-between ${mobileTab === 'cart' ? 'block' : 'hidden lg:block'}`}>
              
              <div className="space-y-3.5">
                
                {/* Mobile Back to Parts Menu button */}
                <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setMobileTab('menu')}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{language === 'bn' ? 'আরও পণ্য যোগ করুন (মেনু)' : '← Add More Parts (Menu)'}</span>
                  </button>

                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {cart.length} {language === 'bn' ? 'আইটেম নির্বাচিত' : 'items'}
                  </span>
                </div>

                {/* Customer Selector & Quick Add */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{t('selectCustomer')}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({customers.length} {language === 'bn' ? 'নিবন্ধিত' : 'saved'})
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(!showAddCustomer)}
                      className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{showAddCustomer ? 'Cancel' : t('addNewCustomer')}</span>
                    </button>
                  </div>

                  {showAddCustomer ? (
                    <form onSubmit={handleCreateCustomerInline} className="space-y-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Workshop / Customer Name *"
                          required
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Mobile / WhatsApp *"
                          required
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Address / Location"
                          value={newCustAddress}
                          onChange={(e) => setNewCustAddress(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      {/* Checkbox for Walk-in Customer */}
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedCustomerId === 'walk-in'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomerId('walk-in');
                                setCustomerSearch('');
                                setIsCustomerSearchOpen(false);
                              } else {
                                setSelectedCustomerId('');
                                setIsCustomerSearchOpen(true);
                              }
                            }}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-700"
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            🛒 {language === 'bn' ? 'ওয়াক-ইন কাস্টমার (Walk-in Customer)' : 'Walk-in Customer'}
                          </span>
                        </label>

                        {selectedCustomerId === 'walk-in' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                            {language === 'bn' ? 'নগদ ক্রেতা' : 'Instant Cash'}
                          </span>
                        )}
                      </div>

                      {/* Search Bar & Selected Customer Indicator */}
                      {selectedCustomerId === 'walk-in' ? (
                        <div className="text-[11px] text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                          {language === 'bn'
                            ? 'ওয়াক-ইন কাস্টমার হিসেবে বিক্রয় হচ্ছে। নির্দিষ্ট কোনো কাস্টমার খুঁজতে উপরের টিক তুলে সার্চ করুন।'
                            : 'Selling to Walk-in customer. Uncheck above to search registered customers.'}
                        </div>
                      ) : (
                        <div className="relative">
                          {/* If a registered customer is currently selected, display their badge */}
                          {selectedCustomerObj ? (
                            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                  <User className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{selectedCustomerObj.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{selectedCustomerObj.phone}</span>
                                  {selectedCustomerObj.currentDue > 0 && (
                                    <span className="text-rose-600 font-bold">
                                      বকেয়া: {formatBDT(selectedCustomerObj.currentDue)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomerId('walk-in');
                                  setCustomerSearch('');
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Remove selected customer"
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
                                  placeholder={language === 'bn' ? 'কাস্টমারের নাম বা মোবাইল নম্বর লিখে খুঁজুন...' : 'Search customer by name or mobile...'}
                                  value={customerSearch}
                                  onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    setIsCustomerSearchOpen(true);
                                  }}
                                  onFocus={() => setIsCustomerSearchOpen(true)}
                                  className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500"
                                />
                                {customerSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setCustomerSearch('')}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Filtered Dropdown Popover */}
                              {isCustomerSearchOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 divide-y divide-slate-100 dark:divide-slate-800">
                                  {filteredCustomers.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-slate-400">
                                      {language === 'bn' ? 'কোনো কাস্টমার পাওয়া যায়নি।' : 'No matching customer found.'}
                                    </div>
                                  ) : (
                                    filteredCustomers.map((c) => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedCustomerId(c.id);
                                          setIsCustomerSearchOpen(false);
                                          setCustomerSearch('');
                                        }}
                                        className="w-full text-left p-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center justify-between text-xs transition-colors"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                                          <div className="text-[10px] text-slate-400">{c.phone} {c.address ? `• ${c.address}` : ''}</div>
                                        </div>
                                        {c.currentDue > 0 && (
                                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                                            দেনা: {formatBDT(c.currentDue)}
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
                    </div>
                  )}
                </div>

                {/* Cart Items List Header */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-amber-500" />
                    <span>{language === 'bn' ? 'অর্ডার কার্টের তালিকা' : 'Order Cart Items'}</span>
                    <span className="text-[11px] font-normal text-slate-400">({cart.length})</span>
                  </span>

                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-xs text-rose-500 hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Cart Items List with INLINE PRICE EDITING */}
                <div className="max-h-[220px] overflow-y-auto no-scrollbar divide-y divide-slate-200 dark:divide-slate-700/60 pr-1">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      {language === 'bn'
                        ? 'কার্ট খালি। বাম পাশের মেনু থেকে পার্টসে ক্লিক করুন।'
                        : 'Cart is empty. Select parts from the menu.'}
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.productId} className="py-2 space-y-1.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {item.productName}
                            </div>
                            <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                              {item.productCode && (
                                <span className="font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-[9px]">
                                  কোড: {item.productCode}
                                </span>
                              )}
                              <span className="font-mono">{item.sku}</span>
                              {item.brand && <span className="font-bold text-blue-600 dark:text-blue-400">• {item.brand}</span>}
                              {item.condition && (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  [{item.condition}]
                                </span>
                              )}
                              {item.origin && <span>• {item.origin}</span>}
                              {item.vehicleModel && <span className="italic">• {item.vehicleModel}</span>}
                            </div>
                          </div>

                          <div className="text-right font-black text-slate-900 dark:text-white shrink-0 text-xs sm:text-sm">
                            {formatBDT(item.total)}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Editable Price & Quantity Control Strip */}
                        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          {/* Inline Editable Selling Price (User requested feature!) */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-500">দর ৳:</span>
                            <input
                              type="number"
                              min="0"
                              value={item.sellingPrice}
                              onChange={(e) => updateCartItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-amber-600 dark:text-amber-400 text-right focus:ring-1 focus:ring-amber-500"
                              title="দর পরিবর্তন করতে এখানে লিখুন"
                            />
                            <span className="text-[10px] text-slate-400">/{item.unit}</span>
                          </div>

                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(item.productId, item.quantity - 1)}
                              className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(item.productId, item.quantity + 1)}
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

                {/* Financial Summary Calculation */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('subtotal')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatBDT(subtotal)}</span>
                  </div>

                  {/* Discount input */}
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

                  {/* Delivery / Shipping Charge Input */}
                  <div className="p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                        <span>{language === 'bn' ? 'ডেলিভারি খরচ (৳)' : 'Delivery Charge (৳)'}</span>
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={deliveryCharge || ''}
                        onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-24 px-2 py-1 text-right text-xs font-black border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {/* Quick Preset Buttons */}
                    <div className="flex items-center justify-end gap-1 text-[10px] flex-wrap">
                      <span className="text-[10px] text-slate-400 mr-0.5">{language === 'bn' ? 'কুইক:' : 'Quick:'}</span>
                      {[50, 100, 150, 200, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDeliveryCharge(amt)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            deliveryCharge === amt
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          ৳{amt}
                        </button>
                      ))}
                      {deliveryCharge > 0 && (
                        <button
                          type="button"
                          onClick={() => setDeliveryCharge(0)}
                          className="text-rose-500 hover:text-rose-700 font-bold text-[10px] ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                    <span className="font-black text-sm text-slate-900 dark:text-white">{t('total')}</span>
                    <span className="font-black text-lg text-amber-600 dark:text-amber-400">
                      {formatBDT(grandTotal)}
                    </span>
                  </div>

                  {/* Payment Method & Deposit Account */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] font-bold text-slate-500 block">
                          {t('paymentMethod')}
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsManagePaymentMethodsOpen(true)}
                          className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
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
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
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
                        {language === 'bn' ? 'জমা একাউন্ট' : 'Account'}
                      </label>
                      <select
                        value={accountId}
                        onChange={(e) => {
                          const newAccId = e.target.value;
                          setAccountId(newAccId);
                          const matchedPmId = getMatchingPaymentMethodForAccount(newAccId, accounts, paymentMethods);
                          if (matchedPmId) setPaymentMethodId(matchedPmId);
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
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
                        {t('paidAmount')} (৳)
                      </label>
                      <button
                        type="button"
                        onClick={handleSetFullPay}
                        className="text-[10px] text-amber-600 dark:text-amber-400 font-bold underline"
                      >
                        Full Paid (100%)
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

                  {/* Due Alert & Due Date */}
                  {dueAmount > 0 && (
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-1">
                      <div className="flex justify-between font-bold text-rose-700 dark:text-rose-400 text-xs">
                        <span>{language === 'bn' ? 'বকেয়া পরিমাণ' : 'Due Amount'}:</span>
                        <span>{formatBDT(dueAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">পরিশোধের তারিখ:</span>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-[10px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={language === 'bn' ? 'ক্যাশ মেমো নোট বা ওয়ারেন্টি...' : 'Cash memo note or warranty terms...'}
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

              {/* Complete Sale Action Button */}
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t('completeSale')} ({formatBDT(grandTotal)})</span>
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

        {/* Sticky Bottom Bar on Mobile when on 'menu' tab (Matching Screenshot 2026-09-s143514.png) */}
        {mobileTab === 'menu' && totalCartQty > 0 && (
          <div className="lg:hidden sticky bottom-0 left-0 right-0 z-30 p-2.5 sm:p-3 bg-slate-950 text-white flex items-center justify-between shadow-2xl border-t border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                {totalCartQty}
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-semibold leading-none">Current Total:</div>
                <div className="text-sm font-black text-white leading-tight">{formatBDT(grandTotal)}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{language === 'bn' ? 'অর্ডার কার্ট দেখুন →' : 'Checkout Cart →'}</span>
            </button>
          </div>
        )}

        {/* INLINE EMERGENCY RESTOCK & SUPPLIER PROCUREMENT DIALOG */}
        {quickStockProduct && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-500/50 p-4 sm:p-5 w-full max-w-lg max-h-[92vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-150 flex flex-col justify-between">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <PackagePlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                      {language === 'bn' ? 'জরুরি স্টক আমদানি ও পারচেজ' : 'Emergency Stock-in & Procurement'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {language === 'bn'
                        ? 'সাপ্লায়ার থেকে মাল এনে হিসাব সংরক্ষণ করুন এবং সরাসরি কাস্টমারকে দিন'
                        : 'Source from supplier, reconcile purchase ledger & accounts, and deliver to customer'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickStockProduct(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickRestockSubmit} className="mt-3.5 space-y-3.5 text-xs">
                
                {/* Stock Out Alert Notice matching user description */}
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? 'আপনার এই প্রোডাক্টটি আর স্টকে নেই। আপনার জরুরি অবস্থায় প্রোডাক্ট যোগ করুন স্টকে।'
                      : 'This product is out of stock! Please restock under emergency procurement.'}
                  </span>
                </div>

                {/* Product & Customer Details Banner */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                        {quickStockProduct.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        SKU: {quickStockProduct.sku} {quickStockProduct.brand ? `• ${quickStockProduct.brand}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'বর্তমান স্টক' : 'Current Stock'}</span>
                      <span className={`font-black text-xs px-2 py-0.5 rounded-md ${quickStockProduct.currentStock <= 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                        {quickStockProduct.currentStock <= 0 ? (language === 'bn' ? 'স্টক শেষ (০)' : '0 (Out)') : `${quickStockProduct.currentStock} ${quickStockProduct.unit}`}
                      </span>
                    </div>
                  </div>

                  {/* Customer context */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <User className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-bold">{language === 'bn' ? 'ক্রেতা / কাস্টমার:' : 'Customer:'}</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {selectedCustomerObj ? selectedCustomerObj.name : (language === 'bn' ? 'কাউন্টার / ওয়াক-ইন কাস্টমার' : 'Walk-in Customer')}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      {selectedCustomerObj?.phone ? selectedCustomerObj.phone : ''}
                    </div>
                  </div>
                </div>

                {/* Section 1: Supplier / মহাজন নির্বাচন */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>{language === 'bn' ? 'কার থেকে কিনে আনলেন? (সাপ্লায়ার / মহাজন)' : 'Source Supplier / Vendor:'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewSupplier(!isAddingNewSupplier)}
                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                      {isAddingNewSupplier
                        ? (language === 'bn' ? 'পূর্বের তালিকা দেখুন' : 'Select Existing')
                        : (language === 'bn' ? '+ নতুন সাপ্লায়ার' : '+ New Supplier')}
                    </button>
                  </div>

                  {isAddingNewSupplier ? (
                    <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            {language === 'bn' ? 'দোকান বা প্রতিষ্ঠানের নাম *' : 'Company / Shop Name *'}
                          </label>
                          <input
                            type="text"
                            value={newSupCompany}
                            onChange={(e) => setNewSupCompany(e.target.value)}
                            placeholder="e.g. Dhaka Auto Spares / ধোলাইখাল"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            {language === 'bn' ? 'সাপ্লায়ারের মোবাইল নম্বর' : 'Phone Number'}
                          </label>
                          <input
                            type="text"
                            value={newSupPhone}
                            onChange={(e) => setNewSupPhone(e.target.value)}
                            placeholder="017XXXXXXXX"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={quickStockSupplierId}
                      onChange={(e) => setQuickStockSupplierId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName || s.name} ({s.phone}) {s.currentPayable > 0 ? `• পূর্বের দেনা: ৳${s.currentPayable}` : ''}
                        </option>
                      ))}
                      {suppliers.length === 0 && (
                        <option value="sup-walk-in">
                          {language === 'bn' ? 'সাধারণ পাইকারি সাপ্লায়ার (Local Market)' : 'Local Market Supplier'}
                        </option>
                      )}
                    </select>
                  )}
                </div>

                {/* Section 2: Quantity & Purchase Price (কেনা দাম ও পিস) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      {language === 'bn' ? 'কত পিস কিনে আনলেন? *' : 'Quantity Purchased: *'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={quickStockQtyToAdd}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setQuickStockQtyToAdd(val);
                          if (quickDeliverQty > val) {
                            setQuickDeliverQty(val);
                          }
                          if (quickStockPaymentType === 'cash') {
                            setQuickStockPaidAmount(val * quickStockUnitCost);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm font-black border border-amber-400 dark:border-amber-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="font-bold text-slate-500 text-xs shrink-0">
                        {quickStockProduct.unit}
                      </span>
                    </div>
                    {/* Quick Presets */}
                    <div className="flex gap-1 mt-1.5">
                      {[1, 2, 5, 10].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setQuickStockQtyToAdd(preset);
                            if (quickDeliverQty > preset) {
                              setQuickDeliverQty(preset);
                            }
                            if (quickStockPaymentType === 'cash') {
                              setQuickStockPaidAmount(preset * quickStockUnitCost);
                            }
                          }}
                          className={`flex-1 py-0.5 rounded-lg border text-[10px] font-bold ${
                            quickStockQtyToAdd === preset
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      {language === 'bn' ? 'প্রতি পিসের কেনা দাম (৳) *' : 'Unit Purchase Price (৳): *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quickStockUnitCost}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setQuickStockUnitCost(val);
                        if (quickStockPaymentType === 'cash') {
                          setQuickStockPaidAmount(quickStockQtyToAdd * val);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm font-black border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">
                      {language === 'bn' ? 'আগের রেট: ৳' : 'Previous Cost: ৳'}{quickStockProduct.purchasePrice || 0}
                    </div>
                  </div>
                </div>

                {/* Total Purchase Bill Calculation Banner */}
                {(() => {
                  const totalCost = quickStockQtyToAdd * Math.max(0, quickStockUnitCost);
                  let paid = 0;
                  if (quickStockPaymentType === 'cash') {
                    paid = totalCost;
                  } else if (quickStockPaymentType === 'due') {
                    paid = 0;
                  } else {
                    paid = Math.min(totalCost, Math.max(0, quickStockPaidAmount));
                  }
                  const due = Math.max(0, totalCost - paid);

                  return (
                    <div className="space-y-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                      
                      {/* Section 3: Payment Type (ক্যাশ নাকি বাকি?) */}
                      <div>
                        <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>{language === 'bn' ? 'মহাজনকে কীভাবে দিচ্ছেন? (পেমেন্ট স্ট্যাটাস)' : 'Payment Status to Supplier:'}</span>
                          </span>
                          <span className="font-black text-amber-600 dark:text-amber-400">
                            {language === 'bn' ? 'মোট ক্রয় বিল:' : 'Total Cost:'} ৳{totalCost.toLocaleString()}
                          </span>
                        </label>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickStockPaymentType('cash');
                              setQuickStockPaidAmount(totalCost);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                              quickStockPaymentType === 'cash'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            ✓ {language === 'bn' ? 'নগদ ক্যাশ' : 'Full Cash'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setQuickStockPaymentType('due');
                              setQuickStockPaidAmount(0);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                              quickStockPaymentType === 'due'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            ⏳ {language === 'bn' ? 'পুরোটা বাকি' : 'Full Due'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setQuickStockPaymentType('partial');
                              setQuickStockPaidAmount(Math.round(totalCost / 2));
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                              quickStockPaymentType === 'partial'
                                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            ⚖ {language === 'bn' ? 'আংশিক জমা' : 'Partial'}
                          </button>
                        </div>
                      </div>

                      {/* If partial, input for paid amount */}
                      {quickStockPaymentType === 'partial' && (
                        <div className="pt-1 animate-in fade-in-50">
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            {language === 'bn' ? 'এখন মহাজনকে কত টাকা পেইড করলেন?' : 'Amount Paid to Supplier Now (৳):'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={totalCost}
                            value={quickStockPaidAmount}
                            onChange={(e) => setQuickStockPaidAmount(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 text-xs font-black border border-amber-400 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                      )}

                      {/* Payment Account selector (if paid > 0) */}
                      {paid > 0 && (
                        <div className="pt-1">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-slate-400" />
                            <span>{language === 'bn' ? 'টাকা প্রদানের অ্যাকাউন্ট (ক্যাশ বাক্স / ব্যাংক):' : 'Paid From Account:'}</span>
                          </label>
                          <select
                            value={quickStockAccountId}
                            onChange={(e) => setQuickStockAccountId(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} (ব্যালেন্স: ৳{acc.balance.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Live Calculation summary pill */}
                      <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs font-bold">
                        <div className="text-emerald-700 dark:text-emerald-400">
                          {language === 'bn' ? 'পেইড:' : 'Paid:'} <span className="font-black">৳{paid.toLocaleString()}</span>
                        </div>
                        <div className={`${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                          {language === 'bn' ? 'সাপ্লায়ার বাকি (দেনা):' : 'Supplier Due:'} <span className="font-black">৳{due.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Section 4: Deliver to Customer Cart */}
                <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      {language === 'bn' ? 'কাস্টমারকে মেমোতে কত পিস দেবেন?' : 'Quantity to Deliver to Customer:'}
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {language === 'bn'
                        ? `(বাকি ${Math.max(0, quickStockQtyToAdd - quickDeliverQty)} ${quickStockProduct.unit} আপনার দোকানে স্টক থাকবে)`
                        : `(${Math.max(0, quickStockQtyToAdd - quickDeliverQty)} ${quickStockProduct.unit} will remain in your stock)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuickDeliverQty((prev) => Math.max(1, prev - 1))}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={quickStockQtyToAdd}
                      value={quickDeliverQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setQuickDeliverQty(Math.min(quickStockQtyToAdd, Math.max(1, val)));
                      }}
                      className="w-12 text-center py-1 text-xs font-black border border-amber-400 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickDeliverQty((prev) => Math.min(quickStockQtyToAdd, prev + 1))}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                {quickStockError && (
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{quickStockError}</span>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setQuickStockProduct(null)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-all"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 active:scale-95 text-xs transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>{language === 'bn' ? 'অ্যাড স্টক করে কাস্টমারকে দিন' : 'Add Stock & Deliver to Customer'}</span>
                  </button>
                </div>
              </form>
            </div>
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
