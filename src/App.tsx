import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

// Module Components
import { Dashboard } from './components/dashboard/Dashboard';
import { SalesList } from './components/sales/SalesList';
import { PurchasesList } from './components/purchases/PurchasesList';
import { ProductList } from './components/inventory/ProductList';
import { CustomerList } from './components/customers/CustomerList';
import { SupplierList } from './components/suppliers/SupplierList';
import { AccountsManager } from './components/accounts/AccountsManager';
import { ExpenseTrackerView } from './components/accounts/ExpenseTrackerView';
import { FinancialReports } from './components/reports/FinancialReports';
import { SettingsView } from './components/settings/SettingsView';
import { ReceivablesPayablesView } from './components/dues/ReceivablesPayablesView';
import { LoanManagementView } from './components/dues/LoanManagementView';

// Global Quick Action Modals
import { NewSaleModal } from './components/sales/NewSaleModal';
import { NewPurchaseModal } from './components/purchases/NewPurchaseModal';
import { ProductFormModal } from './components/inventory/ProductFormModal';
import { NewExpenseModal } from './components/accounts/NewExpenseModal';
import { CollectDueModal } from './components/customers/CollectDueModal';
import { PaySupplierModal } from './components/suppliers/PaySupplierModal';
import { InvoiceViewModal } from './components/sales/InvoiceViewModal';
import { LoginView } from './components/auth/LoginView';

const AppContent: React.FC = () => {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <LoginView />;
  }

  return <AuthenticatedApp />;
};

const AuthenticatedApp: React.FC = () => {
  const { activeTab, setActiveTab, selectedInvoice, setSelectedInvoice } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Quick Action Modal States
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isCollectDueOpen, setIsCollectDueOpen] = useState(false);
  const [isPaySupplierOpen, setIsPaySupplierOpen] = useState(false);

  // Pre-selected parameters from due reminders
  const [dueCustomerId, setDueCustomerId] = useState<string | undefined>();
  const [dueInvoiceNo, setDueInvoiceNo] = useState<string | undefined>();
  const [paySupplierId, setPaySupplierId] = useState<string | undefined>();
  const [payPurchaseNo, setPayPurchaseNo] = useState<string | undefined>();

  // If user clicks "POS / New Sale" on sidebar, open the NewSaleModal automatically
  useEffect(() => {
    if (activeTab === 'pos') {
      setIsNewSaleOpen(true);
    }
  }, [activeTab]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200 overflow-hidden">
      {/* Top Application Bar */}
      <Header
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenNewSale={() => setIsNewSaleOpen(true)}
        onOpenNewPurchase={() => setIsNewPurchaseOpen(true)}
        onOpenNewProduct={() => setIsNewProductOpen(true)}
        onOpenExpense={() => setIsNewExpenseOpen(true)}
        onOpenCollectDue={() => {
          setDueCustomerId(undefined);
          setDueInvoiceNo(undefined);
          setIsCollectDueOpen(true);
        }}
      />

      {/* Main Workspace with Fixed Sidebar */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto overflow-hidden relative min-h-0">
        <Sidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Content Panel */}
        <main className="flex-1 flex flex-col overflow-y-auto no-scrollbar overflow-x-hidden min-w-0 min-h-0 pb-16 md:pb-0">
          <div className="flex-1 p-3 sm:p-5 lg:p-6">
            {activeTab === 'dashboard' && (
              <Dashboard
                onOpenNewSale={() => setIsNewSaleOpen(true)}
                onOpenNewPurchase={() => setIsNewPurchaseOpen(true)}
                onOpenNewProduct={() => setIsNewProductOpen(true)}
                onOpenExpense={() => setIsNewExpenseOpen(true)}
                onOpenCollectDue={(customerId, refInvoiceNo) => {
                  setDueCustomerId(customerId);
                  setDueInvoiceNo(refInvoiceNo);
                  setIsCollectDueOpen(true);
                }}
                onOpenPaySupplier={(supplierId, refPurchaseNo) => {
                  setPaySupplierId(supplierId);
                  setPayPurchaseNo(refPurchaseNo);
                  setIsPaySupplierOpen(true);
                }}
              />
            )}
            {(activeTab === 'invoices' || activeTab === 'pos') && (
              <SalesList onOpenNewSale={() => setIsNewSaleOpen(true)} />
            )}
            {activeTab === 'purchases' && (
              <PurchasesList onOpenNewPurchase={() => setIsNewPurchaseOpen(true)} />
            )}
            {activeTab === 'inventory' && <ProductList />}
            {activeTab === 'customers' && <CustomerList />}
            {activeTab === 'suppliers' && <SupplierList />}
            {activeTab === 'dues_ledger' && (
              <ReceivablesPayablesView
                onOpenCollectDue={(customerId, refInvoiceNo) => {
                  setDueCustomerId(customerId);
                  setDueInvoiceNo(refInvoiceNo);
                  setIsCollectDueOpen(true);
                }}
                onOpenPaySupplier={(supplierId, refPurchaseNo) => {
                  setPaySupplierId(supplierId);
                  setPayPurchaseNo(refPurchaseNo);
                  setIsPaySupplierOpen(true);
                }}
              />
            )}
            {activeTab === 'loan_directory' && <LoanManagementView />}
            {activeTab === 'accounts' && <AccountsManager />}
            {activeTab === 'expenses' && <ExpenseTrackerView />}
            {activeTab === 'reports' && <FinancialReports />}
            {activeTab === 'settings' && <SettingsView />}
          </div>

          {/* Global Footer */}
          <Footer />
        </main>
      </div>

      {/* Mobile Fixed Bottom Quick Action Bar (Android App Experience) */}
      <MobileBottomNav
        onOpenNewSale={() => setIsNewSaleOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Global Modals Triggerable From Header, Dashboard & Shortcut Buttons */}
      {isNewSaleOpen && (
        <NewSaleModal
          isOpen={isNewSaleOpen}
          onClose={() => {
            setIsNewSaleOpen(false);
            if (activeTab === 'pos') {
              setActiveTab('invoices');
            }
          }}
          onSaleCompleted={(newSale) => {
            setSelectedInvoice(newSale);
          }}
        />
      )}

      {isNewPurchaseOpen && (
        <NewPurchaseModal
          isOpen={isNewPurchaseOpen}
          onClose={() => setIsNewPurchaseOpen(false)}
        />
      )}

      {isNewProductOpen && (
        <ProductFormModal
          isOpen={isNewProductOpen}
          productToEdit={null}
          onClose={() => setIsNewProductOpen(false)}
        />
      )}

      {isNewExpenseOpen && (
        <NewExpenseModal
          isOpen={isNewExpenseOpen}
          onClose={() => setIsNewExpenseOpen(false)}
        />
      )}

      {isCollectDueOpen && (
        <CollectDueModal
          isOpen={isCollectDueOpen}
          preSelectedCustomerId={dueCustomerId}
          refInvoiceNo={dueInvoiceNo}
          onClose={() => {
            setIsCollectDueOpen(false);
            setDueCustomerId(undefined);
            setDueInvoiceNo(undefined);
          }}
        />
      )}

      {isPaySupplierOpen && (
        <PaySupplierModal
          isOpen={isPaySupplierOpen}
          preSelectedSupplierId={paySupplierId}
          refPurchaseNo={payPurchaseNo}
          onClose={() => {
            setIsPaySupplierOpen(false);
            setPaySupplierId(undefined);
            setPayPurchaseNo(undefined);
          }}
        />
      )}

      {/* Cash Memo / Invoice Modal */}
      {selectedInvoice && (
        <InvoiceViewModal
          sale={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
