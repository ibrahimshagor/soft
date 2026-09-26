import React from 'react';
import { LayoutDashboard, ShoppingBag, Plus, Boxes, Menu } from 'lucide-react';
import { ActiveTab } from '../../types';
import { useApp } from '../../context/AppContext';

interface MobileBottomNavProps {
  onOpenNewSale: () => void;
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenNewSale,
  onOpenMobileMenu,
}) => {
  const { activeTab, setActiveTab, language } = useApp();

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:hidden px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'dashboard'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-none">
            {language === 'bn' ? 'ড্যাশবোর্ড' : 'Home'}
          </span>
        </button>

        {/* 2. Sales / Invoices */}
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'invoices'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-none">
            {language === 'bn' ? 'বিক্রয়' : 'Sales'}
          </span>
        </button>

        {/* 3. Center Elevated + New Sale Action */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-4">
          <button
            type="button"
            onClick={onOpenNewSale}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-500/40 flex items-center justify-center border-2 border-white dark:border-slate-900 active:scale-95 transition-transform"
            title="New Sale / নতুন বিক্রি"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-1 leading-none">
            {language === 'bn' ? '+ বিক্রি' : '+ Sale'}
          </span>
        </div>

        {/* 4. Products / Inventory */}
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'inventory'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-none">
            {language === 'bn' ? 'স্টক' : 'Stock'}
          </span>
        </button>

        {/* 5. Mobile Menu Drawer */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-none">
            {language === 'bn' ? 'মেনু' : 'Menu'}
          </span>
        </button>
      </div>
    </nav>
  );
};
