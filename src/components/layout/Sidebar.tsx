import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  PackagePlus,
  Boxes,
  Users,
  Building2,
  Landmark,
  Wallet,
  Coins,
  BarChart3,
  Settings,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const { activeTab, setActiveTab, t, lowStockProducts, dueReminders } = useApp();

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'pos', label: t('pos'), icon: ShoppingCart },
    { id: 'invoices', label: t('invoices'), icon: ReceiptText },
    { id: 'purchases', label: t('purchases'), icon: PackagePlus },
    {
      id: 'inventory',
      label: t('inventory'),
      icon: Boxes,
      badge: lowStockProducts.length > 0 ? lowStockProducts.length : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'customers', label: t('customerDirectory'), icon: Users },
    { id: 'suppliers', label: t('supplierDirectory'), icon: Building2 },
    { id: 'loan_directory', label: t('loanDirectory'), icon: Landmark },
    {
      id: 'dues_ledger',
      label: t('duesLedger'),
      icon: Coins,
      badge: dueReminders.length > 0 ? dueReminders.length : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'accounts', label: t('accounts'), icon: Wallet },
    { id: 'expenses', label: t('expenses'), icon: ReceiptText },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden no-print"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`no-print fixed lg:relative inset-y-0 left-0 z-40 lg:z-10 w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out shrink-0 h-full overflow-hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
            <span>RM AutoManage</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-slate-950' : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-slate-950 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          {/* Operational Alerts Widget inside scrollable menu so it is never cut off or obscured on mobile */}
          <div className="pt-3 pb-8">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Operational Alerts</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span>Low Stock Items:</span>
                  <span className="font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px]">
                    {lowStockProducts.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Dues:</span>
                  <span className="font-black px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px]">
                    {dueReminders.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
