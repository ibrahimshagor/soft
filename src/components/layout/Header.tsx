import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wrench,
  PlusCircle,
  Sun,
  Moon,
  Globe,
  UserCheck,
  ChevronDown,
  ShoppingBag,
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Menu,
  Search,
  Tag,
  Boxes,
  Users,
  Building2,
  X,
  LogOut,
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../utils/formatters';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenNewSale: () => void;
  onOpenNewPurchase: () => void;
  onOpenNewProduct: () => void;
  onOpenExpense: () => void;
  onOpenCollectDue: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenNewSale,
  onOpenNewPurchase,
  onOpenNewProduct,
  onOpenExpense,
  onOpenCollectDue,
}) => {
  const {
    businessProfile,
    language,
    setLanguage,
    t,
    theme,
    toggleTheme,
    currentUser,
    users,
    setCurrentUser,
    logout,
    products,
    customers,
    suppliers,
    dueReminders,
    lowStockProducts,
    outOfStockProducts,
    setActiveTab,
  } = useApp();

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'dues' | 'stock'>('all');
  const notificationRef = useRef<HTMLDivElement>(null);

  // Global Quick Search State
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchPopover, setShowSearchPopover] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search & notifications on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchPopover(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalUrgentNotifications = useMemo(() => {
    const urgentDues = (dueReminders || []).filter(
      (d) => d.status === 'overdue' || d.status === 'today'
    );
    const urgentStock = (lowStockProducts || []).length + (outOfStockProducts || []).length;
    return urgentDues.length + urgentStock;
  }, [dueReminders, lowStockProducts, outOfStockProducts]);

  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return { products: [], customers: [], suppliers: [] };
    const q = globalSearch.toLowerCase();

    const matchedProducts = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          (p.brand || '').toLowerCase().includes(q)
      )
      .slice(0, 5);

    const matchedCustomers = customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 3);

    const matchedSuppliers = suppliers
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.companyName && s.companyName.toLowerCase().includes(q))
      )
      .slice(0, 3);

    return {
      products: matchedProducts,
      customers: matchedCustomers,
      suppliers: matchedSuppliers,
    };
  }, [globalSearch, products, customers, suppliers]);

  const hasAnyResults =
    searchResults.products.length > 0 ||
    searchResults.customers.length > 0 ||
    searchResults.suppliers.length > 0;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300';
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'super_admin') return t('superAdmin');
    if (role === 'manager') return t('manager');
    return t('staff');
  };

  if (!currentUser) return null;

  return (
    <header className="no-print sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus:outline-none shrink-0"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {businessProfile.logoUrl ? (
              <img
                src={businessProfile.logoUrl}
                alt={businessProfile.businessName}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-white truncate">
                  {businessProfile.businessName}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wider hidden sm:inline-block shrink-0">
                  AutoManage
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 hidden md:block">
                {businessProfile.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Quick Price / Product / Contact Search */}
        <div ref={searchRef} className="relative flex-1 max-w-xs sm:max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onFocus={() => setShowSearchPopover(true)}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setShowSearchPopover(true);
              }}
              placeholder={
                language === 'bn'
                  ? 'পার্টসের নাম, দাম বা কাস্টমার খুঁজুন...'
                  : 'Search part price, customer or supplier...'
              }
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => {
                  setGlobalSearch('');
                  setShowSearchPopover(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Search Live Popover */}
          {showSearchPopover && globalSearch.trim() && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
              {!hasAnyResults ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {language === 'bn' ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No matches found.'}
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto">
                  {/* Products Section */}
                  {searchResults.products.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Boxes className="w-3 h-3" />
                        <span>{language === 'bn' ? 'পার্টসের নাম ও বিক্রয় মূল্য' : 'Products & Pricing'}</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {searchResults.products.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 hover:bg-amber-50/60 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>SKU: {p.sku}</span>
                                <span>•</span>
                                <span className="capitalize">{p.condition}</span>
                                {p.countryOfOrigin && <span>• {p.countryOfOrigin}</span>}
                                <span>• স্টক: {p.currentStock} {p.unit}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                {formatBDT(p.defaultSellingPrice)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                ক্রয়: {formatBDT(p.purchasePrice)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers Section */}
                  {searchResults.customers.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1 border-t border-slate-100 dark:border-slate-700 pt-2">
                        <Users className="w-3 h-3" />
                        <span>{language === 'bn' ? 'গ্রাহক তথ্য ও বকেয়া' : 'Customers & Dues'}</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {searchResults.customers.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {c.name}
                              </div>
                              <div className="text-[10px] text-slate-400">📞 {c.phone}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-red-600 dark:text-red-400">
                                {formatBDT(c.currentDue)}
                              </div>
                              <div className="text-[10px] text-slate-400">বকেয়া</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suppliers Section */}
                  {searchResults.suppliers.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1 border-t border-slate-100 dark:border-slate-700 pt-2">
                        <Building2 className="w-3 h-3" />
                        <span>{language === 'bn' ? 'সাপ্লায়ার তথ্য ও দেনা' : 'Suppliers & Payables'}</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {searchResults.suppliers.map((s) => (
                          <div
                            key={s.id}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {s.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {s.companyName || s.phone}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                {formatBDT(s.currentPayable ?? s.currentBalance ?? 0)}
                              </div>
                              <div className="text-[10px] text-slate-400">দেনা</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Action, Theme Switcher, Language Switcher, User */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Action Button */}
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs shadow-xs transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Action</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {showQuickActions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowQuickActions(false)}
                />
                <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-24px)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Create New
                  </div>
                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      onOpenNewSale();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700/60 rounded-xl text-left"
                  >
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                    <span>{t('quickSale')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      onOpenNewPurchase();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700/60 rounded-xl text-left"
                  >
                    <PackagePlus className="w-4 h-4 text-blue-500" />
                    <span>{t('quickPurchase')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      onOpenNewProduct();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700/60 rounded-xl text-left"
                  >
                    <Wrench className="w-4 h-4 text-purple-500" />
                    <span>{t('newProduct')}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      onOpenCollectDue();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700/60 rounded-xl text-left"
                  >
                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    <span>{t('collectDue')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      onOpenExpense();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700/60 rounded-xl text-left"
                  >
                    <Receipt className="w-4 h-4 text-red-500" />
                    <span>{t('recordExpense')}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Notifications & Urgent Alerts Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
              title={language === 'bn' ? 'জরুরি বিজ্ঞপ্তি ও সতর্কবার্তা' : 'Notifications & Alerts'}
            >
              <Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              {totalUrgentNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {totalUrgentNotifications > 9 ? '9+' : totalUrgentNotifications}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Dropdown Header */}
                  <div className="px-3.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {language === 'bn' ? 'বিজ্ঞপ্তি ও সতর্কবার্তা' : 'Notifications & Alerts'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {totalUrgentNotifications > 0
                            ? (language === 'bn'
                                ? `${totalUrgentNotifications} টি জরুরি বিষয় রয়েছে`
                                : `${totalUrgentNotifications} urgent items requiring attention`)
                            : (language === 'bn' ? 'সবকিছু আপ-টু-ডেট আছে' : 'All caught up')}
                        </p>
                      </div>
                    </div>
                    {totalUrgentNotifications > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {totalUrgentNotifications}
                      </span>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 px-3 pt-2 pb-1 text-[11px] font-bold border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        notificationFilter === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'সকল' : 'All'} ({totalUrgentNotifications})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('dues')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        notificationFilter === 'dues'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'বাকি তাগাদা' : 'Dues'} ({dueReminders?.filter((d) => d.status === 'overdue' || d.status === 'today').length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('stock')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        notificationFilter === 'stock'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'স্টক অ্যালার্ট' : 'Stock'} ({(lowStockProducts?.length || 0) + (outOfStockProducts?.length || 0)})
                    </button>
                  </div>

                  {/* Notification Items List */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                    {/* Dues Notifications */}
                    {(notificationFilter === 'all' || notificationFilter === 'dues') &&
                      dueReminders
                        ?.filter((d) => d.status === 'overdue' || d.status === 'today')
                        .map((due) => (
                          <div
                            key={due.id}
                            onClick={() => {
                              setActiveTab('dues_ledger');
                              setShowNotifications(false);
                            }}
                            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors flex items-start gap-2.5"
                          >
                            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                              {due.status === 'overdue' ? (
                                <AlertTriangle className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {due.partyName}
                                </span>
                                <span className="font-black text-xs text-rose-600 dark:text-rose-400 shrink-0">
                                  {formatBDT(due.amount)}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.2 rounded font-bold uppercase bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                                  {due.status === 'overdue'
                                    ? (language === 'bn' ? `${Math.abs(due.daysDiff)} দিন মেয়াদোত্তীর্ণ` : `${Math.abs(due.daysDiff)}d overdue`)
                                    : (language === 'bn' ? 'আজই পরিশোধের শেষ দিন' : 'Due today')}
                                </span>
                                <span>{due.refNo}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                    {/* Stock Notifications */}
                    {(notificationFilter === 'all' || notificationFilter === 'stock') &&
                      [...(outOfStockProducts || []), ...(lowStockProducts || [])].map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            setActiveTab('inventory');
                            setShowNotifications(false);
                          }}
                          className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors flex items-start gap-2.5"
                        >
                          <div
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              prod.currentStock === 0
                                ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {prod.name}
                              </span>
                              <span
                                className={`text-[11px] font-black shrink-0 ${
                                  prod.currentStock === 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {prod.currentStock} {prod.unit}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono">{prod.sku}</span>
                              <span>•</span>
                              <span>
                                {prod.currentStock === 0
                                  ? (language === 'bn' ? 'স্টক শেষ (Out of Stock)' : 'Out of stock')
                                  : (language === 'bn'
                                      ? `ন্যূনতম সীমা: ${prod.minStockLevel} ${prod.unit}`
                                      : `Min alert: ${prod.minStockLevel} ${prod.unit}`)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Empty State */}
                    {totalUrgentNotifications === 0 && (
                      <div className="py-8 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 text-emerald-500 opacity-60" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {language === 'bn' ? 'কোনো জরুরি তাগাদা বা স্টক সংকট নেই' : 'No urgent alerts'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {language === 'bn' ? 'সবকিছু স্বাভাবিক নিয়মে চলছে' : 'Everything is running smoothly'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer Actions */}
                  <div className="px-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('dues_ledger');
                        setShowNotifications(false);
                      }}
                      className="text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      {language === 'bn' ? 'বাকি ও লোন খাতা →' : 'View Dues & Loans →'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('inventory');
                        setShowNotifications(false);
                      }}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline"
                    >
                      {language === 'bn' ? 'ইনভেন্টরি →' : 'Inventory →'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Language Switcher - Desktop only (on mobile it lives inside Profile menu) */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Switch Language (বাংলা / English)"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
          </button>

          {/* Theme Toggle Button - Desktop only (on mobile it lives inside Profile menu) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden md:flex p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* User Profile & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {getRoleLabel(currentUser.role)}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-20px)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {currentUser.email}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadge(
                          currentUser.role
                        )}`}
                      >
                        {getRoleLabel(currentUser.role)}
                      </span>
                    </div>
                  </div>

                  {/* Theme & Language Quick Toggles (Inside Profile Menu for Clean Mobile Header) */}
                  <div className="p-1 space-y-1 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-slate-800 dark:text-slate-200 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {theme === 'light' ? (
                          <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-medium">
                          {language === 'bn' ? 'থিম পরিবর্তন' : 'Theme Mode'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {theme === 'light' ? (language === 'bn' ? 'হোয়াইট (Light)' : 'Light (White)') : (language === 'bn' ? 'ডার্ক (Dark)' : 'Dark')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-slate-800 dark:text-slate-200 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span className="font-medium">
                          {language === 'bn' ? 'ভাষা পরিবর্তন' : 'Switch Language'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {language === 'en' ? 'বাংলা' : 'English'}
                      </span>
                    </button>
                  </div>

                  {/* Switch User List - Only accessible to super_admin */}
                  {currentUser.role === 'super_admin' ? (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {t('switchUser')}
                      </div>

                      <div className="space-y-1">
                        {users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setCurrentUser(u);
                              setShowUserDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition-colors ${
                              currentUser.id === u.id
                                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                            }`}
                          >
                            <div>
                              <div>{u.name}</div>
                              <div className="text-[10px] opacity-70">
                                {getRoleLabel(u.role)}
                              </div>
                            </div>
                            {currentUser.id === u.id && (
                              <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'bn' ? 'ইউজার পরিবর্তন কেবল সুপার এডমিন করতে পারবেন।' : 'User switching is restricted to Super Admin only.'}
                    </div>
                  )}

                  {/* Logout Button */}
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
