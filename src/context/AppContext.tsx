import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  ActiveTab,
  BusinessProfile,
  User,
  Category,
  Brand,
  Country,
  PaymentMethod,
  ExpenseCategory,
  Product,
  Customer,
  Supplier,
  Account,
  Sale,
  Purchase,
  PaymentRecord,
  Expense,
  Income,
  StockAdjustment,
  SalesReturn,
  PurchaseReturn,
  DailyClosing,
  AuditLog,
  Transaction,
  LoanParty,
  LoanRecord,
  InstallmentFrequency,
  InstallmentScheduleItem,
} from '../types';
import {
  initialBusinessProfile,
  initialUsers,
  initialCategories,
  initialBrands,
  initialCountries,
  initialPaymentMethods,
  initialExpenseCategories,
  initialAccounts,
  initialProducts,
  initialCustomers,
  initialSuppliers,
  initialSales,
  initialPurchases,
  initialExpenses,
  initialAuditLogs,
  initialLoanParties,
  initialLoanRecords,
} from '../data/initialData';
import { Language, translations } from '../utils/translations';
import {
  setFirestoreDoc,
  deleteFirestoreDoc,
  subscribeToCollection,
  subscribeToDoc,
  syncAllToFirestore as bulkSyncFirestore,
  testFirestoreConnection,
  subscribeToAuthStatus,
} from '../services/firebase';

interface DueReminder {
  id: string;
  partyType: 'customer' | 'supplier' | 'loan';
  partyId: string;
  partyName: string;
  phone: string;
  whatsappNumber: string;
  refNo: string;
  amount: number;
  dueDate: string;
  daysDiff: number; // 0 = today, negative = overdue, positive = upcoming
  status: 'today' | 'overdue' | 'upcoming';
}

interface AppContextType {
  // Navigation & Preferences
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Business & Users
  businessProfile: BusinessProfile;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => void;
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (updatedUser: User) => void;
  deleteUser: (userId: string) => void;
  updateUserPermissions: (userId: string, permissions: User['permissions']) => void;
  logout: () => void;
  login: (usernameOrPhone: string, password?: string) => { success: boolean; error?: string };

  // Master Data
  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  brands: Brand[];
  addBrand: (brand: Omit<Brand, 'id'>) => void;
  countries: Country[];
  addCountry: (country: Omit<Country, 'id'>) => void;
  expenseCategories: ExpenseCategory[];
  addExpenseCategory: (cat: Omit<ExpenseCategory, 'id'>) => void;
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => PaymentMethod;
  updatePaymentMethod: (id: string, updates: Partial<PaymentMethod>) => void;
  deletePaymentMethod: (id: string) => void;

  // Inventory / Products
  products: Product[];
  addProduct: (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, newStock: number, type: StockAdjustment['type'], reason: string) => void;
  lowStockProducts: Product[];
  outOfStockProducts: Product[];

  // Customers & Receivables
  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  recordCustomerPayment: (data: {
    customerId: string;
    amount: number;
    paymentMethodId: string;
    accountId: string;
    refInvoiceNo?: string;
    notes?: string;
  }) => PaymentRecord;

  // Suppliers & Payables
  suppliers: Supplier[];
  addSupplier: (sup: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  recordSupplierPayment: (data: {
    supplierId: string;
    amount: number;
    paymentMethodId: string;
    accountId: string;
    refPurchaseNo?: string;
    notes?: string;
  }) => PaymentRecord;

  // Accounts & Cash
  accounts: Account[];
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  transferFunds: (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => void;
  dailyClosings: DailyClosing[];
  recordDailyClosing: (closing: Omit<DailyClosing, 'closedBy' | 'closedAt'>) => void;

  // Sales & Invoicing
  sales: Sale[];
  createSale: (saleData: {
    customerId: string;
    items: Sale['items'];
    subtotal: number;
    discountTotal: number;
    deliveryCharge?: number;
    taxAmount: number;
    grandTotal: number;
    paidAmount: number;
    dueDate?: string;
    paymentMethodId: string;
    accountId: string;
    vehicleInfo?: string;
    notes?: string;
  }) => Sale;
  updateSale: (saleId: string, updatedData: {
    items: Sale['items'];
    subtotal: number;
    discountTotal: number;
    deliveryCharge?: number;
    taxAmount: number;
    grandTotal: number;
    paidAmount: number;
    dueDate?: string;
    vehicleInfo?: string;
    notes?: string;
  }) => Sale | null;
  deleteSale: (saleId: string) => void;
  selectedInvoice: Sale | null;
  setSelectedInvoice: (sale: Sale | null) => void;
  salesReturns: SalesReturn[];
  createSalesReturn: (saleId: string, items: SalesReturn['items'], refundType: 'cash_refund' | 'adjust_due', accountId?: string, reason?: string) => void;

  // Purchases
  purchases: Purchase[];
  createPurchase: (purchaseData: {
    supplierId: string;
    supplierInvoiceNo?: string;
    items: Purchase['items'];
    subtotal: number;
    discountTotal: number;
    additionalCosts: number;
    grandTotal: number;
    paidAmount: number;
    dueDate?: string;
    paymentMethodId: string;
    accountId: string;
    notes?: string;
  }) => Purchase;
  selectedPurchase: Purchase | null;
  setSelectedPurchase: (pur: Purchase | null) => void;

  // Payments & Receipts
  paymentRecords: PaymentRecord[];
  selectedReceipt: PaymentRecord | null;
  setSelectedReceipt: (receipt: PaymentRecord | null) => void;

  // Expenses & Income
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'accountName' | 'enteredBy' | 'createdAt'>) => void;
  recordExpense: (data: { categoryId: string; amount: number; accountId: string; voucherNo?: string; payee?: string; description: string; }) => void;
  incomes: Income[];
  addIncome: (income: Omit<Income, 'id' | 'accountName' | 'enteredBy' | 'createdAt'>) => void;

  // Transactions Journal
  transactions: Transaction[];

  // Stock Adjustments
  stockAdjustments: StockAdjustment[];

  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (action: string, module: string, details: string) => void;

  // Reminders & Metrics
  dueReminders: DueReminder[];
  metrics: {
    todaySales: number;
    todayPurchases: number;
    todayCollection: number;
    todayExpenses: number;
    todayGrossProfit: number;
    totalReceivable: number;
    totalPayable: number;
    inventoryValuation: number;
  };

  // Loans & Borrowing
  loanParties: LoanParty[];
  loanRecords: LoanRecord[];
  addLoanParty: (party: Omit<LoanParty, 'id' | 'createdAt' | 'totalBorrowed' | 'totalLent' | 'currentPayable' | 'currentReceivable'>) => LoanParty;
  recordLoanTransaction: (data: {
    type: 'borrow' | 'lend' | 'repay_borrow' | 'collect_lend';
    partyId: string;
    partyName: string;
    partyType: LoanParty['entityType'];
    customerId?: string;
    supplierId?: string;
    loanPartyId?: string;
    amount: number;
    accountId: string;
    paymentMethodId?: string;
    dueDate?: string;
    isInstallment?: boolean;
    installmentFrequency?: InstallmentFrequency;
    totalInstallments?: number;
    perInstallmentAmount?: number;
    schedule?: InstallmentScheduleItem[];
    notes?: string;
  }) => LoanRecord;
  payLoanInstallment: (
    loanRecordId: string,
    installmentNo: number,
    accountId: string,
    paymentMethodId?: string,
    notes?: string
  ) => boolean;

  // Backup & Reset
  exportFullBackup: () => void;
  importBackup: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
  resetToSeedData: () => void;
  resetToCleanFreshData: () => void;

  // Firebase Cloud Sync
  isCloudSyncing: boolean;
  cloudSyncStatus: {
    isConnected: boolean;
    isAuthenticated: boolean;
    userUid?: string;
    lastSynced?: string;
    error?: string | null;
  };
  syncAllToFirestore: () => Promise<void>;
  testFirestore: () => Promise<{ success: boolean; message: string; isAuth: boolean; userUid?: string }>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'RM_AUTOMANAGE_STORAGE_V1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation & Display State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('RM_LANG') as Language) || 'en';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('RM_THEME');
    if (saved === 'dark') return 'dark';
    return 'light'; // Clean light theme as default
  });

  useEffect(() => {
    localStorage.setItem('RM_THEME', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('RM_THEME', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Business Profile & User State
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_profile`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const resolvedOwner =
          parsed.ownerName && parsed.ownerName !== 'Engr. Rezaul Karim'
            ? parsed.ownerName
            : initialBusinessProfile.ownerName; // 'আব্দুর রহিম রনি'
        return {
          ...initialBusinessProfile,
          ...parsed,
          ownerName: resolvedOwner,
          proprietorTitle: parsed.proprietorTitle || initialBusinessProfile.proprietorTitle,
          invoiceNotes: parsed.invoiceNotes || initialBusinessProfile.invoiceNotes,
          invoiceSignatureLabel: parsed.invoiceSignatureLabel || initialBusinessProfile.invoiceSignatureLabel,
        };
      } catch (e) {
        return initialBusinessProfile;
      }
    }
    return initialBusinessProfile;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    const list: User[] = saved ? JSON.parse(saved) : initialUsers;
    return list.map((u) => {
      if (u.id === 'user-1' || u.name === 'Engr. Rezaul Karim') {
        return { ...u, name: 'আব্দুর রহিম রনি' };
      }
      return u;
    });
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUserId = localStorage.getItem(`${STORAGE_KEY}_current_user_id`);
    if (savedUserId === 'LOGGED_OUT') return null;
    if (savedUserId) {
      const found = users.find((u) => u.id === savedUserId);
      if (found) return found;
    }
    return users[0] || initialUsers[0] || null;
  });

  // Master Data State
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((cat: Category) => {
            if (!cat.skuPrefix) {
              const init = initialCategories.find((c) => c.id === cat.id);
              return {
                ...cat,
                skuPrefix: init?.skuPrefix || cat.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN',
              };
            }
            return cat;
          });
        }
      } catch (e) {
        return initialCategories;
      }
    }
    return initialCategories;
  });
  const [brands, setBrands] = useState<Brand[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_brands`);
    return saved ? JSON.parse(saved) : initialBrands;
  });
  const [countries, setCountries] = useState<Country[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_countries`);
    return saved ? JSON.parse(saved) : initialCountries;
  });
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_exp_cats`);
    return saved ? JSON.parse(saved) : initialExpenseCategories;
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_payment_methods`);
    if (saved) {
      try {
        const parsed: PaymentMethod[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure default account mappings exist and are accurate for known methods
          const list = parsed.map((pm) => {
            const nameLower = ((pm.name || '') + ' ' + (pm.nameBn || '')).toLowerCase();

            // Crucial fix: If method is Nagad / নগদ, ensure it points to Nagad account (acc-5) not bKash
            if (nameLower.includes('nagad') || (nameLower.includes('নগদ') && !nameLower.includes('ক্যাশ') && !nameLower.includes('cash'))) {
              return { ...pm, defaultAccountId: 'acc-5', isActive: true };
            }
            if (nameLower.includes('bkash') || nameLower.includes('বিকাশ')) {
              return { ...pm, defaultAccountId: 'acc-4', isActive: true };
            }
            if (nameLower.includes('islami') || nameLower.includes('ইসলামী')) {
              return { ...pm, defaultAccountId: 'acc-2', isActive: true };
            }
            if (nameLower.includes('city') || nameLower.includes('সিটি')) {
              return { ...pm, defaultAccountId: 'acc-3', isActive: true };
            }
            if (pm.type === 'cash') {
              return { ...pm, defaultAccountId: 'acc-1', isActive: true };
            }
            return { ...pm, isActive: pm.isActive !== false };
          });

          // Ensure Nagad exists if missing from list
          if (!list.some((m) => m.id === 'pm-5' || m.name.toLowerCase().includes('nagad') || (m.nameBn && m.nameBn.includes('নগদ')))) {
            list.push({
              id: 'pm-5',
              name: 'Nagad (01711223344)',
              nameBn: 'নগদ ওয়ালেট',
              type: 'mfs',
              defaultAccountId: 'acc-5',
              isActive: true,
            });
          }
          return list;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return initialPaymentMethods;
  });

  // Entities State
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
    const list: Product[] = saved ? JSON.parse(saved) : initialProducts;
    return list.map((p) => {
      if (!p.productCode || p.productCode.trim() === '') {
        const init = initialProducts.find((ip) => ip.id === p.id);
        const defaultCode = init?.productCode || (p.sku ? p.sku.replace(/^[A-Z]+-/, '') : `PC-${p.id.slice(-4)}`);
        return { ...p, productCode: defaultCode };
      }
      return p;
    });
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_customers`);
    return saved ? JSON.parse(saved) : initialCustomers;
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_suppliers`);
    return saved ? JSON.parse(saved) : initialSuppliers;
  });
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
    let list: Account[] = saved ? JSON.parse(saved) : initialAccounts;
    // Guarantee Nagad account exists
    if (!list.some((a) => a.id === 'acc-5' || a.name.toLowerCase().includes('nagad') || a.name.toLowerCase().includes('নগদ'))) {
      const nagadAcc: Account = {
        id: 'acc-5',
        name: 'Nagad Account (01711223344)',
        type: 'mfs',
        accountNumber: '01711-223344',
        accountHolder: 'RM Automobiles Nagad',
        balance: 24500,
      };
      list = [...list, nagadAcc];
    }
    return list;
  });

  // Transactions State
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
    const list: Sale[] = saved ? JSON.parse(saved) : initialSales;
    return list.map((s) => {
      if (s.sellerName === 'Engr. Rezaul Karim') {
        return { ...s, sellerName: 'আব্দুর রহিম রনি' };
      }
      return s;
    });
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_purchases`);
    return saved ? JSON.parse(saved) : initialPurchases;
  });
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_payments`);
    return saved ? JSON.parse(saved) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
    return saved ? JSON.parse(saved) : initialExpenses;
  });
  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_incomes`);
    return saved ? JSON.parse(saved) : [];
  });
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stock_adj`);
    return saved ? JSON.parse(saved) : [];
  });
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_audit`);
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });
  const [loanParties, setLoanParties] = useState<LoanParty[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_loan_parties`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return initialLoanParties;
  });
  const [loanRecords, setLoanRecords] = useState<LoanRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_loan_records`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return initialLoanRecords;
  });

  // Modals / View States
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<{
    isConnected: boolean;
    isAuthenticated: boolean;
    userUid?: string;
    lastSynced?: string;
    error?: string | null;
  }>({
    isConnected: true,
    isAuthenticated: false,
    error: null,
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubAuth = subscribeToAuthStatus((user, err) => {
      setCloudSyncStatus((prev) => ({
        ...prev,
        isAuthenticated: !!user,
        userUid: user?.uid,
        error: err || null,
      }));
    });
    return unsubAuth;
  }, []);

  const testFirestore = async () => {
    setIsCloudSyncing(true);
    try {
      const res = await testFirestoreConnection();
      setCloudSyncStatus((prev) => ({
        ...prev,
        isConnected: res.success,
        isAuthenticated: res.isAuth,
        userUid: res.userUid,
        error: res.success ? null : res.message,
        lastSynced: res.success ? new Date().toLocaleTimeString() : prev.lastSynced,
      }));
      return res;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Real-time Firestore synchronization across all devices & mobile
  useEffect(() => {
    let isMounted = true;

    // Listen to Products in real-time
    const unsubProducts = subscribeToCollection<Product>('products', (cloudProducts) => {
      if (isMounted && Array.isArray(cloudProducts) && cloudProducts.length > 0) {
        setProducts(cloudProducts);
      }
    });

    // Listen to Sales in real-time
    const unsubSales = subscribeToCollection<Sale>('sales', (cloudSales) => {
      if (isMounted && Array.isArray(cloudSales) && cloudSales.length > 0) {
        const sorted = [...cloudSales].sort((a, b) => {
          const timeA = new Date(a.createdAt || a.date).getTime() || 0;
          const timeB = new Date(b.createdAt || b.date).getTime() || 0;
          return timeB - timeA;
        });
        setSales(sorted);
      }
    });

    // Listen to Purchases in real-time
    const unsubPurchases = subscribeToCollection<Purchase>('purchases', (cloudPurchases) => {
      if (isMounted && Array.isArray(cloudPurchases) && cloudPurchases.length > 0) {
        const sorted = [...cloudPurchases].sort((a, b) => {
          const timeA = new Date(a.createdAt || a.date).getTime() || 0;
          const timeB = new Date(b.createdAt || b.date).getTime() || 0;
          return timeB - timeA;
        });
        setPurchases(sorted);
      }
    });

    // Listen to Customers in real-time
    const unsubCustomers = subscribeToCollection<Customer>('customers', (cloudCustomers) => {
      if (isMounted && Array.isArray(cloudCustomers) && cloudCustomers.length > 0) {
        setCustomers(cloudCustomers);
      }
    });

    // Listen to Suppliers in real-time
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', (cloudSuppliers) => {
      if (isMounted && Array.isArray(cloudSuppliers) && cloudSuppliers.length > 0) {
        setSuppliers(cloudSuppliers);
      }
    });

    // Listen to Accounts in real-time
    const unsubAccounts = subscribeToCollection<Account>('accounts', (cloudAccounts) => {
      if (isMounted && Array.isArray(cloudAccounts) && cloudAccounts.length > 0) {
        setAccounts(cloudAccounts);
      }
    });

    // Listen to Expenses in real-time
    const unsubExpenses = subscribeToCollection<Expense>('expenses', (cloudExpenses) => {
      if (isMounted && Array.isArray(cloudExpenses) && cloudExpenses.length > 0) {
        setExpenses(cloudExpenses);
      }
    });

    // Listen to Loan Parties in real-time
    const unsubLoanParties = subscribeToCollection<LoanParty>('loanParties', (cloudLoanParties) => {
      if (isMounted && Array.isArray(cloudLoanParties) && cloudLoanParties.length > 0) {
        setLoanParties(cloudLoanParties);
      }
    });

    // Listen to Loan Records in real-time
    const unsubLoanRecords = subscribeToCollection<LoanRecord>('loanRecords', (cloudLoanRecords) => {
      if (isMounted && Array.isArray(cloudLoanRecords) && cloudLoanRecords.length > 0) {
        setLoanRecords(cloudLoanRecords);
      }
    });

    // Listen to Payment Records in real-time
    const unsubPayments = subscribeToCollection<PaymentRecord>('paymentRecords', (cloudPayments) => {
      if (isMounted && Array.isArray(cloudPayments) && cloudPayments.length > 0) {
        setPaymentRecords(cloudPayments);
      }
    });

    // Listen to Business Profile in real-time
    const unsubProfile = subscribeToDoc<BusinessProfile>('settings', 'businessProfile', (cloudProfile) => {
      if (isMounted && cloudProfile && cloudProfile.businessName) {
        setBusinessProfile((prev) => ({ ...prev, ...cloudProfile }));
      }
    });

    return () => {
      isMounted = false;
      unsubProducts();
      unsubSales();
      unsubPurchases();
      unsubCustomers();
      unsubSuppliers();
      unsubAccounts();
      unsubExpenses();
      unsubLoanParties();
      unsubLoanRecords();
      unsubPayments();
      unsubProfile();
    };
  }, []);

  const syncAllToFirestore = async () => {
    setIsCloudSyncing(true);
    try {
      await bulkSyncFirestore({
        products,
        customers,
        suppliers,
        accounts,
        sales,
        purchases,
        expenses,
        incomes,
        stockAdjustments,
        loanParties,
        loanRecords,
        paymentRecords,
        businessProfile,
        users,
        categories,
        brands,
        paymentMethods,
        expenseCategories,
        countries,
      });
      localStorage.setItem('RM_FIRESTORE_INITIAL_SYNCED', 'true');
      setCloudSyncStatus((prev) => ({
        ...prev,
        isConnected: true,
        lastSynced: new Date().toLocaleTimeString(),
        error: null,
      }));
      addAuditLog('FIREBASE_SYNCED', 'Cloud Sync', 'Synchronized all business records with Firebase Firestore');
    } catch (e: any) {
      console.warn('Sync to firestore error:', e);
      setCloudSyncStatus((prev) => ({
        ...prev,
        error: e.message || 'Sync failed',
      }));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Background auto-seeding to Firestore on first launch
  useEffect(() => {
    const hasSynced = localStorage.getItem('RM_FIRESTORE_INITIAL_SYNCED');
    if (!hasSynced) {
      const timer = setTimeout(() => {
        syncAllToFirestore();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('RM_LANG', language);
  }, [language]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_profile`, JSON.stringify(businessProfile));
  }, [businessProfile]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_brands`, JSON.stringify(brands));
  }, [brands]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_countries`, JSON.stringify(countries));
  }, [countries]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_exp_cats`, JSON.stringify(expenseCategories));
  }, [expenseCategories]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_payment_methods`, JSON.stringify(paymentMethods));
  }, [paymentMethods]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(customers));
  }, [customers]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
  }, [suppliers]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
  }, [accounts]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
  }, [sales]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_purchases`, JSON.stringify(purchases));
  }, [purchases]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_payments`, JSON.stringify(paymentRecords));
  }, [paymentRecords]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_incomes`, JSON.stringify(incomes));
  }, [incomes]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_stock_adj`, JSON.stringify(stockAdjustments));
  }, [stockAdjustments]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_loan_parties`, JSON.stringify(loanParties));
  }, [loanParties]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_loan_records`, JSON.stringify(loanRecords));
  }, [loanRecords]);

  // Translation helper
  const t = (key: keyof typeof translations['en']): string => {
    const dict = translations[language] || translations['en'];
    return dict[key] || translations['en'][key] || String(key);
  };

  const addAuditLog = (action: string, module: string, details: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'System / Guest',
      action,
      module,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const updateBusinessProfile = (updates: Partial<BusinessProfile>) => {
    setBusinessProfile((prev) => {
      const next = { ...prev, ...updates };
      setFirestoreDoc('settings', 'businessProfile', next);
      return next;
    });
    addAuditLog('PROFILE_UPDATED', 'Settings', 'Updated business profile information');
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: 'user-' + Date.now(),
    };
    setUsers((prev) => [...prev, newUser]);
    setFirestoreDoc('users', newUser.id, newUser);
    addAuditLog('USER_ADDED', 'User Management', `Added user ${newUser.name} with role ${newUser.role}`);
  };

  const updateUserPermissions = (userId: string, permissions: User['permissions']) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, permissions };
          setFirestoreDoc('users', userId, updated);
          return updated;
        }
        return u;
      })
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, permissions } : null));
    }
    addAuditLog('PERMISSION_UPDATED', 'User Management', `Updated permissions for user ID ${userId}`);
  };

  const syncAppMastersToFirestore = (updatedCats = categories, updatedBrands = brands, updatedMethods = paymentMethods) => {
    setFirestoreDoc('settings', 'appMasters', {
      categories: updatedCats,
      brands: updatedBrands,
      paymentMethods: updatedMethods,
      expenseCategories,
      countries,
    });
  };

  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = { ...cat, id: 'cat-' + Date.now() };
    const list = [...categories, newCat];
    setCategories(list);
    syncAppMastersToFirestore(list, brands, paymentMethods);
    addAuditLog('CATEGORY_ADDED', 'Inventory Masters', `Added category ${newCat.name}`);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const list = categories.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setCategories(list);
    syncAppMastersToFirestore(list, brands, paymentMethods);
    addAuditLog('CATEGORY_UPDATED', 'Inventory Masters', `Updated category ID ${id}`);
  };

  const deleteCategory = (id: string) => {
    const list = categories.filter((c) => c.id !== id);
    setCategories(list);
    syncAppMastersToFirestore(list, brands, paymentMethods);
    addAuditLog('CATEGORY_DELETED', 'Inventory Masters', `Deleted category ID ${id}`);
  };

  const addBrand = (brand: Omit<Brand, 'id'>) => {
    const newBrand: Brand = { ...brand, id: 'br-' + Date.now() };
    const list = [...brands, newBrand];
    setBrands(list);
    syncAppMastersToFirestore(categories, list, paymentMethods);
    addAuditLog('BRAND_ADDED', 'Inventory Masters', `Added brand ${newBrand.name}`);
  };

  const addCountry = (country: Omit<Country, 'id'>) => {
    const newCountry: Country = { ...country, id: 'cnt-' + Date.now() };
    setCountries((prev) => [...prev, newCountry]);
    addAuditLog('COUNTRY_ADDED', 'Inventory Masters', `Added origin country ${newCountry.name}`);
  };

  const addExpenseCategory = (cat: Omit<ExpenseCategory, 'id'>) => {
    const newCat: ExpenseCategory = { ...cat, id: 'exp-cat-' + Date.now() };
    setExpenseCategories((prev) => [...prev, newCat]);
  };

  const addPaymentMethod = (methodData: Omit<PaymentMethod, 'id'>): PaymentMethod => {
    const newMethod: PaymentMethod = {
      ...methodData,
      id: 'pm-' + Date.now(),
      isActive: true,
    };
    const list = [...paymentMethods, newMethod];
    setPaymentMethods(list);
    syncAppMastersToFirestore(categories, brands, list);
    addAuditLog('PAYMENT_METHOD_ADDED', 'Settings', `Added payment method: ${newMethod.name}`);
    return newMethod;
  };

  const updatePaymentMethod = (id: string, updates: Partial<PaymentMethod>) => {
    const list = paymentMethods.map((pm) => (pm.id === id ? { ...pm, ...updates } : pm));
    setPaymentMethods(list);
    syncAppMastersToFirestore(categories, brands, list);
    addAuditLog('PAYMENT_METHOD_UPDATED', 'Settings', `Updated payment method ID: ${id}`);
  };

  const deletePaymentMethod = (id: string) => {
    if (paymentMethods.length <= 1) return;
    const list = paymentMethods.filter((pm) => pm.id !== id);
    setPaymentMethods(list);
    syncAppMastersToFirestore(categories, brands, list);
    addAuditLog('PAYMENT_METHOD_DELETED', 'Settings', `Deleted payment method ID: ${id}`);
  };

  // Products
  const addProduct = (prodData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...prodData,
      id: 'prod-' + Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    setProducts((prev) => [newProduct, ...prev]);
    setFirestoreDoc('products', newProduct.id, newProduct);
    addAuditLog('PRODUCT_CREATED', 'Inventory', `Added product ${newProduct.name} (SKU: ${newProduct.sku})`);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    let updatedProductObj: Product | null = null;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          updatedProductObj = { ...p, ...updates, updatedAt: new Date().toISOString() };
          return updatedProductObj;
        }
        return p;
      })
    );
    if (updatedProductObj) {
      setFirestoreDoc('products', id, updatedProductObj);
    }
    addAuditLog('PRODUCT_UPDATED', 'Inventory', `Updated product ID: ${id}`);
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteFirestoreDoc('products', id);
    addAuditLog('PRODUCT_DELETED', 'Inventory', `Deleted product ${prod?.name || id}`);
  };

  const adjustStock = (productId: string, newStock: number, type: StockAdjustment['type'], reason: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const previousStock = product.currentStock;
    const diff = newStock - previousStock;

    // Update product stock
    updateProduct(productId, { currentStock: newStock });

    const operatorName = currentUser?.name || 'Administrator';
    const operatorId = currentUser?.id || 'admin-1';
    const adjustment: StockAdjustment = {
      id: 'adj-' + Date.now(),
      date: new Date().toISOString(),
      productId,
      productName: product.name,
      sku: product.sku,
      type,
      quantity: Math.abs(diff),
      previousStock,
      newStock,
      reason,
      adjustedBy: operatorName,
      createdAt: new Date().toISOString(),
    };
    setStockAdjustments((prev) => [adjustment, ...prev]);
    setFirestoreDoc('stockAdjustments', adjustment.id, adjustment);

    addAuditLog(
      'STOCK_ADJUSTED',
      'Inventory',
      `Adjusted stock for ${product.name}: ${previousStock} -> ${newStock} (${type}: ${reason})`
    );
  };

  // Customers
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCust: Customer = {
      ...custData,
      id: 'cust-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    setFirestoreDoc('customers', newCust.id, newCust);
    addAuditLog('CUSTOMER_CREATED', 'Customers', `Added customer ${newCust.name} (${newCust.phone})`);
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    let updatedCust: Customer | null = null;
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          updatedCust = { ...c, ...updates };
          return updatedCust;
        }
        return c;
      })
    );
    if (updatedCust) {
      setFirestoreDoc('customers', id, updatedCust);
    }
    addAuditLog('CUSTOMER_UPDATED', 'Customers', `Updated customer ID: ${id}`);
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    deleteFirestoreDoc('customers', id);
    addAuditLog('CUSTOMER_DELETED', 'Customers', `Deleted customer ${cust?.name || id}`);
  };

  // Suppliers
  const addSupplier = (supData: Omit<Supplier, 'id' | 'createdAt'>): Supplier => {
    const newSup: Supplier = {
      ...supData,
      id: 'sup-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setSuppliers((prev) => [newSup, ...prev]);
    setFirestoreDoc('suppliers', newSup.id, newSup);
    addAuditLog('SUPPLIER_CREATED', 'Suppliers', `Added supplier ${newSup.name} (${newSup.companyName})`);
    return newSup;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    let updatedSup: Supplier | null = null;
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          updatedSup = { ...s, ...updates };
          return updatedSup;
        }
        return s;
      })
    );
    if (updatedSup) {
      setFirestoreDoc('suppliers', id, updatedSup);
    }
    addAuditLog('SUPPLIER_UPDATED', 'Suppliers', `Updated supplier ID: ${id}`);
  };

  const deleteSupplier = (id: string) => {
    const sup = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    deleteFirestoreDoc('suppliers', id);
    addAuditLog('SUPPLIER_DELETED', 'Suppliers', `Deleted supplier ${sup?.name || id}`);
  };

  // Accounts
  const addAccount = (accData: Omit<Account, 'id'>) => {
    const newAcc: Account = { ...accData, id: 'acc-' + Date.now() };
    setAccounts((prev) => [...prev, newAcc]);
    setFirestoreDoc('accounts', newAcc.id, newAcc);
    addAuditLog('ACCOUNT_CREATED', 'Accounts', `Added account ${newAcc.name}`);
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    let updatedAcc: Account | null = null;
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          updatedAcc = { ...a, ...updates };
          return updatedAcc;
        }
        return a;
      })
    );
    if (updatedAcc) {
      setFirestoreDoc('accounts', id, updatedAcc);
    }
  };

  const transferFunds = (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => {
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);
    if (!fromAcc || !toAcc || amount <= 0) return;

    const nextFrom = { ...fromAcc, balance: fromAcc.balance - amount };
    const nextTo = { ...toAcc, balance: toAcc.balance + amount };

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === fromAccountId) return nextFrom;
        if (a.id === toAccountId) return nextTo;
        return a;
      })
    );

    setFirestoreDoc('accounts', fromAccountId, nextFrom);
    setFirestoreDoc('accounts', toAccountId, nextTo);

    addAuditLog(
      'TRANSFER_FUNDS',
      'Accounts',
      `Transferred ৳${amount.toLocaleString()} from ${fromAcc.name} to ${toAcc.name} (${notes || 'No notes'})`
    );
  };

  // Daily Closing
  const recordDailyClosing = (closingData: Omit<DailyClosing, 'closedBy' | 'closedAt'>) => {
    const closing: DailyClosing = {
      ...closingData,
      closedBy: currentUser?.name || 'Administrator',
      closedAt: new Date().toISOString(),
    };
    setDailyClosings((prev) => [closing, ...prev]);
    setFirestoreDoc('dailyClosings', 'closing-' + closing.date, closing);
    addAuditLog(
      'DAILY_CLOSING',
      'Accounts',
      `Recorded daily cash closing for ${closing.date}. Expected: ৳${closing.closingCashExpected}, Actual: ৳${closing.closingCashActual}`
    );
  };

  // Expenses & Income
  const addExpense = (expenseData: Omit<Expense, 'id' | 'accountName' | 'enteredBy' | 'createdAt'>) => {
    const targetAccount = accounts.find((a) => a.id === expenseData.accountId);
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now(),
      accountName: targetAccount ? targetAccount.name : 'Unknown Account',
      enteredBy: currentUser?.name || 'Administrator',
      createdAt: new Date().toISOString(),
    };

    // Deduct from account balance
    if (targetAccount) {
      updateAccount(targetAccount.id, { balance: targetAccount.balance - expenseData.amount });
    }

    setExpenses((prev) => [newExpense, ...prev]);
    setFirestoreDoc('expenses', newExpense.id, newExpense);

    addAuditLog(
      'EXPENSE_RECORDED',
      'Expenses',
      `Recorded expense ৳${expenseData.amount} for ${expenseData.categoryName}: ${expenseData.description}`
    );
  };

  const recordExpense = (data: {
    categoryId: string;
    amount: number;
    accountId: string;
    voucherNo?: string;
    payee?: string;
    description: string;
  }) => {
    const cat = expenseCategories.find((c) => c.id === data.categoryId);
    addExpense({
      date: new Date().toISOString(),
      categoryId: data.categoryId,
      categoryName: cat?.name || 'General Expense',
      amount: data.amount,
      accountId: data.accountId,
      description: data.description,
      payee: data.payee,
      voucherNo: data.voucherNo,
      reference: data.voucherNo,
    });
  };

  const addIncome = (incomeData: Omit<Income, 'id' | 'accountName' | 'enteredBy' | 'createdAt'>) => {
    const targetAccount = accounts.find((a) => a.id === incomeData.accountId);
    const newIncome: Income = {
      ...incomeData,
      id: 'inc-' + Date.now(),
      accountName: targetAccount ? targetAccount.name : 'Unknown Account',
      enteredBy: currentUser?.name || 'Administrator',
      createdAt: new Date().toISOString(),
    };

    if (targetAccount) {
      updateAccount(targetAccount.id, { balance: targetAccount.balance + incomeData.amount });
    }

    setIncomes((prev) => [newIncome, ...prev]);
    setFirestoreDoc('incomes', newIncome.id, newIncome);
    addAuditLog(
      'INCOME_RECORDED',
      'Accounts',
      `Recorded other income ৳${incomeData.amount} (${incomeData.categoryName})`
    );
  };

  // INTERCONNECTED TRANSACTION: CREATE SALE
  const createSale = (saleData: {
    customerId: string;
    items: Sale['items'];
    subtotal: number;
    discountTotal: number;
    deliveryCharge?: number;
    taxAmount: number;
    grandTotal: number;
    paidAmount: number;
    dueDate?: string;
    paymentMethodId: string;
    accountId: string;
    vehicleInfo?: string;
    notes?: string;
  }): Sale => {
    const customer = customers.find((c) => c.id === saleData.customerId);
    const invoiceNumber = businessProfile.invoicePrefix + businessProfile.nextInvoiceNumber;
    const dueAmount = Math.max(0, saleData.grandTotal - saleData.paidAmount);

    let paymentStatus: Sale['paymentStatus'] = 'UNPAID';
    if (saleData.paidAmount >= saleData.grandTotal) {
      paymentStatus = 'PAID';
    } else if (saleData.paidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    // 1. Calculate total cost for profit calculation
    let totalCost = 0;
    saleData.items.forEach((item) => {
      totalCost += item.costPrice * item.quantity;
    });
    const grossProfit = saleData.grandTotal - totalCost;

    const newSale: Sale = {
      id: 'sale-' + Date.now(),
      invoiceNo: invoiceNumber,
      date: new Date().toISOString(),
      customerId: saleData.customerId,
      customerName: customer ? customer.name : 'Walk-in Customer',
      customerPhone: customer ? customer.phone : '',
      customerWhatsapp: customer?.whatsappNumber || '',
      items: saleData.items,
      subtotal: saleData.subtotal,
      discountTotal: saleData.discountTotal,
      deliveryCharge: saleData.deliveryCharge || 0,
      taxAmount: saleData.taxAmount,
      grandTotal: saleData.grandTotal,
      paidAmount: saleData.paidAmount,
      dueAmount,
      dueDate: saleData.dueDate,
      paymentStatus,
      paymentMethodId: saleData.paymentMethodId,
      accountId: saleData.accountId,
      sellerId: currentUser?.id || 'admin-1',
      sellerName: currentUser?.name || 'Administrator',
      vehicleInfo: saleData.vehicleInfo,
      notes: saleData.notes,
      totalCost,
      grossProfit,
      createdAt: new Date().toISOString(),
    };

    // 2. Automatically decrease inventory stock for each sold product
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const soldItem = saleData.items.find((item) => item.productId === p.id);
        if (soldItem) {
          const newStock = Math.max(0, p.currentStock - soldItem.quantity);
          const updatedP = { ...p, currentStock: newStock, updatedAt: new Date().toISOString() };
          setFirestoreDoc('products', p.id, updatedP);
          return updatedP;
        }
        return p;
      })
    );

    // 3. Update customer's totalPurchased, totalPaid, and currentDue
    if (customer && customer.id !== 'walk-in') {
      const updatedCust = {
        ...customer,
        totalPurchased: customer.totalPurchased + saleData.grandTotal,
        totalPaid: customer.totalPaid + saleData.paidAmount,
        currentDue: customer.currentDue + dueAmount,
      };
      setCustomers((prevCustomers) =>
        prevCustomers.map((c) => (c.id === customer.id ? updatedCust : c))
      );
      setFirestoreDoc('customers', customer.id, updatedCust);
    }

    // 4. Update chosen Account balance with the paid amount
    if (saleData.paidAmount > 0 && saleData.accountId) {
      setAccounts((prevAccounts) =>
        prevAccounts.map((a) => {
          if (a.id === saleData.accountId) {
            const updatedAcc = { ...a, balance: a.balance + saleData.paidAmount };
            setFirestoreDoc('accounts', a.id, updatedAcc);
            return updatedAcc;
          }
          return a;
        })
      );
    }

    // 5. Update invoice counter in business profile
    const nextProf = {
      ...businessProfile,
      nextInvoiceNumber: businessProfile.nextInvoiceNumber + 1,
    };
    setBusinessProfile(nextProf);
    setFirestoreDoc('settings', 'businessProfile', nextProf);

    // 6. Record sale
    setSales((prev) => [newSale, ...prev]);
    setFirestoreDoc('sales', newSale.id, newSale);
    setSelectedInvoice(newSale);

    // 7. Audit Log
    addAuditLog(
      'SALE_CREATED',
      'Sales / POS',
      `Created Invoice #${invoiceNumber} for ${newSale.customerName} - Total: ৳${newSale.grandTotal}, Paid: ৳${newSale.paidAmount}, Due: ৳${dueAmount}`
    );

    return newSale;
  };

  // INTERCONNECTED TRANSACTION: UPDATE SALE INVOICE
  const updateSale = (
    saleId: string,
    updatedData: {
      items: Sale['items'];
      subtotal: number;
      discountTotal: number;
      deliveryCharge?: number;
      taxAmount: number;
      grandTotal: number;
      paidAmount: number;
      dueDate?: string;
      vehicleInfo?: string;
      notes?: string;
    }
  ): Sale | null => {
    const existingSale = sales.find((s) => s.id === saleId);
    if (!existingSale) return null;

    // 1. Revert previous inventory deductions for existing items
    const oldQtyMap: { [productId: string]: number } = {};
    existingSale.items.forEach((it) => {
      oldQtyMap[it.productId] = (oldQtyMap[it.productId] || 0) + it.quantity;
    });

    // 2. Calculate new inventory quantities
    const newQtyMap: { [productId: string]: number } = {};
    updatedData.items.forEach((it) => {
      newQtyMap[it.productId] = (newQtyMap[it.productId] || 0) + it.quantity;
    });

    // Apply net stock diff: stock = stock + oldQty - newQty
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const oldQty = oldQtyMap[p.id] || 0;
        const newQty = newQtyMap[p.id] || 0;
        const netDiff = oldQty - newQty;
        if (netDiff !== 0) {
          return {
            ...p,
            currentStock: Math.max(0, p.currentStock + netDiff),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    // 3. Update customer balance diff
    const oldGrandTotal = existingSale.grandTotal;
    const oldPaid = existingSale.paidAmount;
    const oldDue = existingSale.dueAmount;

    const newDue = Math.max(0, updatedData.grandTotal - updatedData.paidAmount);
    let paymentStatus: Sale['paymentStatus'] = 'UNPAID';
    if (updatedData.paidAmount >= updatedData.grandTotal) {
      paymentStatus = 'PAID';
    } else if (updatedData.paidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    if (existingSale.customerId && existingSale.customerId !== 'walk-in') {
      const grandTotalDiff = updatedData.grandTotal - oldGrandTotal;
      const paidDiff = updatedData.paidAmount - oldPaid;
      const dueDiff = newDue - oldDue;

      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === existingSale.customerId) {
            return {
              ...c,
              totalPurchased: Math.max(0, c.totalPurchased + grandTotalDiff),
              totalPaid: Math.max(0, c.totalPaid + paidDiff),
              currentDue: Math.max(0, c.currentDue + dueDiff),
            };
          }
          return c;
        })
      );
    }

    // 4. Update account balance with paid difference
    const paidDiff = updatedData.paidAmount - oldPaid;
    if (paidDiff !== 0 && existingSale.accountId) {
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id === existingSale.accountId) {
            return { ...a, balance: a.balance + paidDiff };
          }
          return a;
        })
      );
    }

    // 5. Calculate cost & profit
    const totalCost = updatedData.items.reduce((sum, item) => sum + item.quantity * (item.costPrice || 0), 0);
    const grossProfit = Math.max(0, updatedData.grandTotal - totalCost);

    const updatedSale: Sale = {
      ...existingSale,
      items: updatedData.items,
      subtotal: updatedData.subtotal,
      discountTotal: updatedData.discountTotal,
      deliveryCharge: updatedData.deliveryCharge !== undefined ? updatedData.deliveryCharge : existingSale.deliveryCharge,
      taxAmount: updatedData.taxAmount,
      grandTotal: updatedData.grandTotal,
      paidAmount: updatedData.paidAmount,
      dueAmount: newDue,
      dueDate: updatedData.dueDate,
      paymentStatus,
      vehicleInfo: updatedData.vehicleInfo,
      notes: updatedData.notes,
      totalCost,
      grossProfit,
    };

    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));
    setFirestoreDoc('sales', updatedSale.id, updatedSale);

    // If currently selected in invoice view, update that as well
    if (selectedInvoice?.id === saleId) {
      setSelectedInvoice(updatedSale);
    }

    addAuditLog(
      'SALE_UPDATED',
      'Sales / POS',
      `Updated Invoice #${updatedSale.invoiceNo} (${updatedSale.customerName}) - New Total: ৳${updatedSale.grandTotal}, Paid: ৳${updatedSale.paidAmount}, Due: ৳${newDue}`
    );

    return updatedSale;
  };

  // DELETE SALE (with inventory & balance rollback)
  const deleteSale = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    // 1. Rollback inventory
    setProducts((prev) =>
      prev.map((p) => {
        const item = sale.items.find((i) => i.productId === p.id);
        if (item) {
          const nextStock = p.currentStock + item.quantity;
          const updatedP = { ...p, currentStock: nextStock };
          setFirestoreDoc('products', p.id, updatedP);
          return updatedP;
        }
        return p;
      })
    );

    // 2. Rollback customer balance
    if (sale.customerId && sale.customerId !== 'walk-in') {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === sale.customerId) {
            const updatedC = {
              ...c,
              totalPurchased: Math.max(0, c.totalPurchased - sale.grandTotal),
              totalPaid: Math.max(0, c.totalPaid - sale.paidAmount),
              currentDue: Math.max(0, c.currentDue - sale.dueAmount),
            };
            setFirestoreDoc('customers', c.id, updatedC);
            return updatedC;
          }
          return c;
        })
      );
    }

    // 3. Rollback account paid amount
    if (sale.paidAmount > 0 && sale.accountId) {
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id === sale.accountId) {
            const updatedA = { ...a, balance: a.balance - sale.paidAmount };
            setFirestoreDoc('accounts', a.id, updatedA);
            return updatedA;
          }
          return a;
        })
      );
    }

    // 4. Remove from sales list
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    deleteFirestoreDoc('sales', saleId);
    if (selectedInvoice?.id === saleId) {
      setSelectedInvoice(null);
    }

    addAuditLog(
      'SALE_DELETED',
      'Sales / POS',
      `Deleted Invoice #${sale.invoiceNo} - Stock & Customer balances rolled back.`
    );
  };

  // INTERCONNECTED TRANSACTION: CREATE PURCHASE
  const createPurchase = (purchaseData: {
    supplierId: string;
    supplierInvoiceNo?: string;
    items: Purchase['items'];
    subtotal: number;
    discountTotal: number;
    additionalCosts: number;
    grandTotal: number;
    paidAmount: number;
    dueDate?: string;
    paymentMethodId: string;
    accountId: string;
    notes?: string;
  }): Purchase => {
    const supplier = suppliers.find((s) => s.id === purchaseData.supplierId);
    const purchaseNumber = businessProfile.purchasePrefix + businessProfile.nextPurchaseNumber;
    const payableAmount = Math.max(0, purchaseData.grandTotal - purchaseData.paidAmount);

    let paymentStatus: Purchase['paymentStatus'] = 'UNPAID';
    if (purchaseData.paidAmount >= purchaseData.grandTotal) {
      paymentStatus = 'PAID';
    } else if (purchaseData.paidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    const newPurchase: Purchase = {
      id: 'pur-' + Date.now(),
      purchaseNo: purchaseNumber,
      supplierInvoiceNo: purchaseData.supplierInvoiceNo,
      date: new Date().toISOString(),
      supplierId: purchaseData.supplierId,
      supplierName: supplier ? (supplier.companyName || supplier.name) : (purchaseData.supplierId.includes('walk-in') ? 'Walk-in / Local Supplier' : 'Unknown Supplier'),
      items: purchaseData.items,
      subtotal: purchaseData.subtotal,
      discountTotal: purchaseData.discountTotal,
      additionalCosts: purchaseData.additionalCosts,
      grandTotal: purchaseData.grandTotal,
      paidAmount: purchaseData.paidAmount,
      payableAmount,
      dueDate: purchaseData.dueDate,
      paymentStatus,
      paymentMethodId: purchaseData.paymentMethodId,
      accountId: purchaseData.accountId,
      notes: purchaseData.notes,
      createdAt: new Date().toISOString(),
    };

    // 1. Automatically increase inventory stock and re-calculate weighted average purchase price
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const item = purchaseData.items.find((i) => i.productId === p.id);
        if (item) {
          const oldStock = p.currentStock;
          const newStock = oldStock + item.quantity;
          // Weighted average cost: ((oldStock * oldCost) + (newQty * newCost)) / newStock
          const oldTotalCost = oldStock > 0 ? oldStock * p.purchasePrice : 0;
          const newBatchCost = item.quantity * item.unitCost;
          const weightedCost = newStock > 0 ? Math.round((oldTotalCost + newBatchCost) / newStock) : item.unitCost;

          const updatedP = {
            ...p,
            currentStock: newStock,
            purchasePrice: weightedCost,
            updatedAt: new Date().toISOString(),
          };
          setFirestoreDoc('products', p.id, updatedP);
          return updatedP;
        }
        return p;
      })
    );

    // 2. Update supplier's balance (totalPurchased, totalPaid, currentPayable)
    if (supplier) {
      const updatedSup = {
        ...supplier,
        totalPurchased: supplier.totalPurchased + purchaseData.grandTotal,
        totalPaid: supplier.totalPaid + purchaseData.paidAmount,
        currentPayable: supplier.currentPayable + payableAmount,
      };
      setSuppliers((prevSuppliers) =>
        prevSuppliers.map((s) => (s.id === supplier.id ? updatedSup : s))
      );
      setFirestoreDoc('suppliers', supplier.id, updatedSup);
    }

    // 3. Deduct paid amount from chosen Account
    if (purchaseData.paidAmount > 0 && purchaseData.accountId) {
      setAccounts((prevAccounts) =>
        prevAccounts.map((a) => {
          if (a.id === purchaseData.accountId) {
            const updatedAcc = { ...a, balance: a.balance - purchaseData.paidAmount };
            setFirestoreDoc('accounts', a.id, updatedAcc);
            return updatedAcc;
          }
          return a;
        })
      );
    }

    // 4. Update purchase counter in profile
    const nextProf = {
      ...businessProfile,
      nextPurchaseNumber: businessProfile.nextPurchaseNumber + 1,
    };
    setBusinessProfile(nextProf);
    setFirestoreDoc('settings', 'businessProfile', nextProf);

    // 5. Record purchase
    setPurchases((prev) => [newPurchase, ...prev]);
    setFirestoreDoc('purchases', newPurchase.id, newPurchase);

    // 6. Audit Log
    addAuditLog(
      'PURCHASE_CREATED',
      'Purchases',
      `Recorded Purchase #${purchaseNumber} from ${newPurchase.supplierName} - Total: ৳${newPurchase.grandTotal}, Paid: ৳${newPurchase.paidAmount}, Payable: ৳${payableAmount}`
    );

    return newPurchase;
  };

  // INTERCONNECTED TRANSACTION: RECORD CUSTOMER PAYMENT COLLECTION
  const recordCustomerPayment = (data: {
    customerId: string;
    amount: number;
    paymentMethodId: string;
    accountId: string;
    refInvoiceNo?: string;
    notes?: string;
  }): PaymentRecord => {
    const customer = customers.find((c) => c.id === data.customerId);
    const targetAccount = accounts.find((a) => a.id === data.accountId);
    const previousDue = customer ? customer.currentDue : 0;
    const newDue = Math.max(0, previousDue - data.amount);

    const receiptNo = 'REC-' + Date.now().toString().slice(-6);

    const record: PaymentRecord = {
      id: 'pay-' + Date.now(),
      receiptNo,
      date: new Date().toISOString(),
      type: 'customer_collection',
      partyId: data.customerId,
      partyName: customer ? customer.name : 'Unknown Customer',
      partyPhone: customer ? customer.phone : '',
      partyWhatsapp: customer ? customer.whatsappNumber : '',
      refInvoiceOrPurchaseNo: data.refInvoiceNo,
      amount: data.amount,
      paymentMethodId: data.paymentMethodId,
      accountId: data.accountId,
      accountName: targetAccount ? targetAccount.name : '',
      previousBalance: previousDue,
      newBalance: newDue,
      notes: data.notes,
      recordedBy: currentUser?.name || 'Administrator',
      createdAt: new Date().toISOString(),
    };

    // 1. Decrease Customer Due
    if (customer) {
      const updatedCust = {
        ...customer,
        totalPaid: customer.totalPaid + data.amount,
        currentDue: newDue,
      };
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? updatedCust : c))
      );
      setFirestoreDoc('customers', customer.id, updatedCust);
    }

    // 2. Increase Account Balance
    if (targetAccount) {
      const updatedAcc = { ...targetAccount, balance: targetAccount.balance + data.amount };
      setAccounts((prev) =>
        prev.map((a) => (a.id === targetAccount.id ? updatedAcc : a))
      );
      setFirestoreDoc('accounts', targetAccount.id, updatedAcc);
    }

    // 3. If refInvoiceNo provided, update that specific invoice; otherwise auto-adjust customer's older due invoices (FIFO)
    if (data.refInvoiceNo) {
      setSales((prev) =>
        prev.map((s) => {
          if (s.invoiceNo === data.refInvoiceNo) {
            const newPaid = s.paidAmount + data.amount;
            const newInvoiceDue = Math.max(0, s.grandTotal - newPaid);
            const newStatus: Sale['paymentStatus'] =
              newInvoiceDue === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
            const updatedSaleObj = {
              ...s,
              paidAmount: newPaid,
              dueAmount: newInvoiceDue,
              paymentStatus: newStatus,
            };
            setFirestoreDoc('sales', s.id, updatedSaleObj);
            return updatedSaleObj;
          }
          return s;
        })
      );
    } else {
      let remainingToAdjust = data.amount;
      setSales((prev) =>
        prev.map((s) => {
          if (s.customerId === data.customerId && s.dueAmount > 0 && remainingToAdjust > 0) {
            const payThis = Math.min(s.dueAmount, remainingToAdjust);
            remainingToAdjust -= payThis;
            const newPaid = s.paidAmount + payThis;
            const newInvoiceDue = s.dueAmount - payThis;
            const newStatus: Sale['paymentStatus'] =
              newInvoiceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
            const updatedSaleObj = {
              ...s,
              paidAmount: newPaid,
              dueAmount: newInvoiceDue,
              paymentStatus: newStatus,
            };
            setFirestoreDoc('sales', s.id, updatedSaleObj);
            return updatedSaleObj;
          }
          return s;
        })
      );
    }

    setPaymentRecords((prev) => [record, ...prev]);
    setFirestoreDoc('paymentRecords', record.id, record);

    addAuditLog(
      'CUSTOMER_PAYMENT_COLLECTED',
      'Customers / Accounts',
      `Collected ৳${data.amount.toLocaleString()} from ${record.partyName} (Previous Due: ৳${previousDue}, Remaining: ৳${newDue})`
    );

    return record;
  };

  // INTERCONNECTED TRANSACTION: RECORD SUPPLIER PAYMENT DISBURSEMENT
  const recordSupplierPayment = (data: {
    supplierId: string;
    amount: number;
    paymentMethodId: string;
    accountId: string;
    refPurchaseNo?: string;
    notes?: string;
  }): PaymentRecord => {
    const supplier = suppliers.find((s) => s.id === data.supplierId);
    const targetAccount = accounts.find((a) => a.id === data.accountId);
    const previousPayable = supplier ? supplier.currentPayable : 0;
    const newPayable = Math.max(0, previousPayable - data.amount);

    const receiptNo = 'SPAY-' + Date.now().toString().slice(-6);

    const record: PaymentRecord = {
      id: 'spay-' + Date.now(),
      receiptNo,
      date: new Date().toISOString(),
      type: 'supplier_payment',
      partyId: data.supplierId,
      partyName: supplier ? supplier.name : 'Unknown Supplier',
      partyPhone: supplier ? supplier.phone : '',
      partyWhatsapp: supplier ? supplier.whatsappNumber : '',
      refInvoiceOrPurchaseNo: data.refPurchaseNo,
      amount: data.amount,
      paymentMethodId: data.paymentMethodId,
      accountId: data.accountId,
      accountName: targetAccount ? targetAccount.name : '',
      previousBalance: previousPayable,
      newBalance: newPayable,
      notes: data.notes,
      recordedBy: currentUser?.name || 'Administrator',
      createdAt: new Date().toISOString(),
    };

    // 1. Decrease Supplier Payable
    if (supplier) {
      const updatedSup = {
        ...supplier,
        totalPaid: (supplier.totalPaid || 0) + data.amount,
        currentPayable: newPayable,
      };
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplier.id ? updatedSup : s))
      );
      setFirestoreDoc('suppliers', supplier.id, updatedSup);
    }

    // 2. Deduct from Account Balance
    if (targetAccount) {
      const updatedAcc = { ...targetAccount, balance: targetAccount.balance - data.amount };
      setAccounts((prev) =>
        prev.map((a) => (a.id === targetAccount.id ? updatedAcc : a))
      );
      setFirestoreDoc('accounts', targetAccount.id, updatedAcc);
    }

    // 3. If refPurchaseNo provided, update that purchase; otherwise auto-adjust older purchases (FIFO)
    if (data.refPurchaseNo) {
      setPurchases((prev) =>
        prev.map((p) => {
          if (p.purchaseNo === data.refPurchaseNo) {
            const newPaid = p.paidAmount + data.amount;
            const newPurchasePayable = Math.max(0, p.grandTotal - newPaid);
            const newStatus: Purchase['paymentStatus'] =
              newPurchasePayable === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
            const updatedPurObj = {
              ...p,
              paidAmount: newPaid,
              payableAmount: newPurchasePayable,
              paymentStatus: newStatus,
            };
            setFirestoreDoc('purchases', p.id, updatedPurObj);
            return updatedPurObj;
          }
          return p;
        })
      );
    } else {
      let remainingToAdjust = data.amount;
      setPurchases((prev) =>
        prev.map((p) => {
          if (p.supplierId === data.supplierId && p.payableAmount > 0 && remainingToAdjust > 0) {
            const payThis = Math.min(p.payableAmount, remainingToAdjust);
            remainingToAdjust -= payThis;
            const newPaid = p.paidAmount + payThis;
            const newPayable = p.payableAmount - payThis;
            const newStatus: Purchase['paymentStatus'] =
              newPayable === 0 ? 'PAID' : 'PARTIALLY_PAID';
            const updatedPurObj = {
              ...p,
              paidAmount: newPaid,
              payableAmount: newPayable,
              paymentStatus: newStatus,
            };
            setFirestoreDoc('purchases', p.id, updatedPurObj);
            return updatedPurObj;
          }
          return p;
        })
      );
    }

    setPaymentRecords((prev) => [record, ...prev]);
    setFirestoreDoc('paymentRecords', record.id, record);

    addAuditLog(
      'SUPPLIER_PAYMENT_MADE',
      'Suppliers / Accounts',
      `Paid ৳${data.amount.toLocaleString()} to supplier ${record.partyName} (Previous Payable: ৳${previousPayable}, Remaining: ৳${newPayable})`
    );

    return record;
  };

  // SALES RETURN
  const createSalesReturn = (
    saleId: string,
    items: SalesReturn['items'],
    refundType: 'cash_refund' | 'adjust_due',
    accountId?: string,
    reason = 'Customer Return'
  ) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    let totalRefund = 0;
    items.forEach((item) => {
      totalRefund += item.total;
    });

    const returnRecord: SalesReturn = {
      id: 'ret-' + Date.now(),
      returnNo: 'RET-' + Date.now().toString().slice(-5),
      date: new Date().toISOString(),
      saleId,
      invoiceNo: sale.invoiceNo,
      customerId: sale.customerId,
      customerName: sale.customerName,
      items,
      totalRefundAmount: totalRefund,
      refundType,
      accountId,
      reason,
      processedBy: currentUser?.name || 'Administrator',
      createdAt: new Date().toISOString(),
    };

    // Restock returned items
    setProducts((prev) =>
      prev.map((p) => {
        const retItem = items.find((i) => i.productId === p.id);
        if (retItem) {
          return { ...p, currentStock: p.currentStock + retItem.quantity };
        }
        return p;
      })
    );

    // If cash refund, deduct from account
    if (refundType === 'cash_refund' && accountId) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, balance: a.balance - totalRefund } : a))
      );
    } else if (refundType === 'adjust_due') {
      // Adjust customer's total due
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === sale.customerId ? { ...c, currentDue: Math.max(0, c.currentDue - totalRefund) } : c
        )
      );
    }

    // UPDATE THE ORIGINAL SALE WITH ADJUSTED ITEMS, TOTALS & RETURN BADGE
    const updatedSaleItems = sale.items.map((item) => {
      const returned = items.find((ret) => ret.productId === item.productId);
      if (returned) {
        const remainingQty = Math.max(0, item.quantity - returned.quantity);
        return {
          ...item,
          quantity: remainingQty,
          total: remainingQty * item.sellingPrice,
        };
      }
      return item;
    });

    const originalGrandTotal = sale.originalGrandTotal || sale.grandTotal;
    const newReturnedAmount = (sale.returnedAmount || 0) + totalRefund;
    const newGrandTotal = Math.max(0, originalGrandTotal - newReturnedAmount);

    let newDue = sale.dueAmount;
    let newPaid = sale.paidAmount;

    if (refundType === 'adjust_due') {
      const dueReduction = Math.min(sale.dueAmount, totalRefund);
      newDue = Math.max(0, sale.dueAmount - dueReduction);
      const remainingRefundToPaid = totalRefund - dueReduction;
      if (remainingRefundToPaid > 0) {
        newPaid = Math.max(0, sale.paidAmount - remainingRefundToPaid);
      }
    } else if (refundType === 'cash_refund') {
      // Cash was returned from counter, so net paid amount is reduced
      newPaid = Math.max(0, sale.paidAmount - totalRefund);
    }

    const newPaymentStatus: Sale['paymentStatus'] =
      newDue <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    const newSubtotal = updatedSaleItems.reduce((sum, item) => sum + item.total, 0);

    const updatedSale: Sale = {
      ...sale,
      items: updatedSaleItems,
      subtotal: newSubtotal,
      grandTotal: newGrandTotal,
      paidAmount: newPaid,
      dueAmount: newDue,
      paymentStatus: newPaymentStatus,
      isAdjustedAfterReturn: true,
      returnNotes: reason,
      returnedAmount: newReturnedAmount,
      originalGrandTotal,
      returnedItemsSummary: items,
      lastAdjustedAt: new Date().toISOString(),
      returnVoucherNo: returnRecord.returnNo,
    };

    setSales((prev) => prev.map((s) => (s.id === sale.id ? updatedSale : s)));
    setSelectedInvoice(updatedSale);

    setSalesReturns((prev) => [returnRecord, ...prev]);
    addAuditLog(
      'SALES_RETURN',
      'Sales / POS',
      `Processed return #${returnRecord.returnNo} for Invoice #${sale.invoiceNo} (Amount: ৳${totalRefund.toLocaleString()}). Invoice updated & adjusted.`
    );
  };

  // LOAN MANAGEMENT METHODS
  const addLoanParty = (
    partyData: Omit<LoanParty, 'id' | 'createdAt' | 'totalBorrowed' | 'totalLent' | 'currentPayable' | 'currentReceivable'>
  ): LoanParty => {
    const newParty: LoanParty = {
      ...partyData,
      id: 'lp-' + Date.now(),
      totalBorrowed: 0,
      totalLent: 0,
      currentPayable: 0,
      currentReceivable: 0,
      createdAt: new Date().toISOString(),
    };
    setLoanParties((prev) => [newParty, ...prev]);
    addAuditLog(
      'LOAN_PARTY_CREATED',
      'Dues / Loans',
      `Added loan party/agent: ${newParty.name} (${newParty.entityType})`
    );
    return newParty;
  };

  const recordLoanTransaction = (data: {
    type: 'borrow' | 'lend' | 'repay_borrow' | 'collect_lend';
    partyId: string;
    partyName: string;
    partyType: LoanParty['entityType'];
    customerId?: string;
    supplierId?: string;
    loanPartyId?: string;
    amount: number;
    accountId: string;
    paymentMethodId?: string;
    dueDate?: string;
    isInstallment?: boolean;
    installmentFrequency?: InstallmentFrequency;
    totalInstallments?: number;
    perInstallmentAmount?: number;
    schedule?: InstallmentScheduleItem[];
    notes?: string;
  }): LoanRecord => {
    const targetAccount = accounts.find((a) => a.id === data.accountId);
    const voucherNo = 'LN-V-' + Date.now().toString().slice(-5);

    const record: LoanRecord = {
      id: 'lr-' + Date.now(),
      voucherNo,
      date: new Date().toISOString(),
      type: data.type,
      partyId: data.partyId,
      partyName: data.partyName,
      partyType: data.partyType,
      customerId: data.customerId,
      supplierId: data.supplierId,
      loanPartyId: data.loanPartyId,
      amount: data.amount,
      accountId: data.accountId,
      accountName: targetAccount ? targetAccount.name : '',
      paymentMethodId: data.paymentMethodId,
      dueDate: data.dueDate,
      isInstallment: data.isInstallment,
      installmentFrequency: data.installmentFrequency,
      totalInstallments: data.totalInstallments,
      perInstallmentAmount: data.perInstallmentAmount,
      schedule: data.schedule,
      notes: data.notes,
      enteredBy: currentUser?.name || 'Administrator',
      createdAt: new Date().toISOString(),
    };

    // 1. Account balance adjustment
    if (data.type === 'borrow' || data.type === 'collect_lend') {
      // Inflow into account
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id === data.accountId) {
            const nextAcc = { ...a, balance: a.balance + data.amount };
            setFirestoreDoc('accounts', a.id, nextAcc);
            return nextAcc;
          }
          return a;
        })
      );
    } else {
      // Outflow from account
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id === data.accountId) {
            const nextAcc = { ...a, balance: a.balance - data.amount };
            setFirestoreDoc('accounts', a.id, nextAcc);
            return nextAcc;
          }
          return a;
        })
      );
    }

    // 2. Customer balance adjustment if customer party
    if (data.customerId || data.partyType === 'customer') {
      const custId = data.customerId || data.partyId;
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === custId) {
            let nextDue = c.currentDue || 0;
            if (data.type === 'lend') {
              nextDue += data.amount;
            } else if (data.type === 'collect_lend') {
              nextDue = Math.max(0, nextDue - data.amount);
            }
            const updatedC = { ...c, currentDue: nextDue };
            setFirestoreDoc('customers', c.id, updatedC);
            return updatedC;
          }
          return c;
        })
      );
    }

    // 3. Supplier balance adjustment if supplier party
    if (data.supplierId || data.partyType === 'supplier') {
      const supId = data.supplierId || data.partyId;
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.id === supId) {
            let nextPayable = s.currentPayable ?? s.currentBalance ?? 0;
            if (data.type === 'borrow') {
              nextPayable += data.amount;
            } else if (data.type === 'repay_borrow') {
              nextPayable = Math.max(0, nextPayable - data.amount);
            }
            const updatedS = { ...s, currentPayable: nextPayable };
            setFirestoreDoc('suppliers', s.id, updatedS);
            return updatedS;
          }
          return s;
        })
      );
    }

    // 4. Loan party balance adjustment
    setLoanParties((prev) => {
      const exists = prev.find((p) => p.id === data.partyId);
      if (!exists) {
        // If this party was a customer/supplier or ad-hoc, create or add them to loan parties
        const newP: LoanParty = {
          id: data.partyId,
          name: data.partyName,
          entityType: data.partyType,
          phone: '',
          totalBorrowed: data.type === 'borrow' ? data.amount : 0,
          totalLent: data.type === 'lend' ? data.amount : 0,
          currentPayable: data.type === 'borrow' ? data.amount : 0,
          currentReceivable: data.type === 'lend' ? data.amount : 0,
          createdAt: new Date().toISOString(),
        };
        setFirestoreDoc('loanParties', newP.id, newP);
        return [newP, ...prev];
      }

      return prev.map((p) => {
        if (p.id === data.partyId) {
          let updatedP = { ...p };
          if (data.type === 'borrow') {
            updatedP = {
              ...p,
              totalBorrowed: p.totalBorrowed + data.amount,
              currentPayable: p.currentPayable + data.amount,
            };
          } else if (data.type === 'lend') {
            updatedP = {
              ...p,
              totalLent: p.totalLent + data.amount,
              currentReceivable: p.currentReceivable + data.amount,
            };
          } else if (data.type === 'repay_borrow') {
            updatedP = {
              ...p,
              currentPayable: Math.max(0, p.currentPayable - data.amount),
            };
          } else if (data.type === 'collect_lend') {
            updatedP = {
              ...p,
              currentReceivable: Math.max(0, p.currentReceivable - data.amount),
            };
          }
          setFirestoreDoc('loanParties', p.id, updatedP);
          return updatedP;
        }
        return p;
      });
    });

    setLoanRecords((prev) => [record, ...prev]);
    setFirestoreDoc('loanRecords', record.id, record);

    const actionText =
      data.type === 'borrow'
        ? `গৃহীত লোন ৳${data.amount.toLocaleString()} (${data.partyName})`
        : data.type === 'lend'
        ? `প্রদত্ত লোন/ধার ৳${data.amount.toLocaleString()} (${data.partyName})`
        : data.type === 'repay_borrow'
        ? `লোন কিস্তি পরিশোধ ৳${data.amount.toLocaleString()} (${data.partyName})`
        : `লোন কিস্তি আদায় ৳${data.amount.toLocaleString()} (${data.partyName})`;

    addAuditLog('LOAN_TRANSACTION', 'Dues / Loans', `${actionText} - ভাউচার #${voucherNo}`);
    return record;
  };

  const payLoanInstallment = (
    loanRecordId: string,
    installmentNo: number,
    accountId: string,
    paymentMethodId?: string,
    notes?: string
  ): boolean => {
    const parentRecord = loanRecords.find((r) => r.id === loanRecordId);
    if (!parentRecord || !parentRecord.schedule) return false;

    const installment = parentRecord.schedule.find((s) => s.installmentNo === installmentNo);
    if (!installment || installment.isPaid) return false;

    // 1. Mark schedule item as paid in parent record
    const updatedSchedule = parentRecord.schedule.map((item) =>
      item.installmentNo === installmentNo
        ? {
            ...item,
            isPaid: true,
            paidDate: new Date().toISOString(),
            paidAmount: item.amount,
          }
        : item
    );

    setLoanRecords((prev) =>
      prev.map((r) => (r.id === loanRecordId ? { ...r, schedule: updatedSchedule } : r))
    );
    setFirestoreDoc('loanRecords', loanRecordId, { ...parentRecord, schedule: updatedSchedule });

    // 2. Record corresponding repayment or collection transaction
    const txType = parentRecord.type === 'borrow' ? 'repay_borrow' : 'collect_lend';
    recordLoanTransaction({
      type: txType,
      partyId: parentRecord.partyId,
      partyName: parentRecord.partyName,
      partyType: parentRecord.partyType,
      customerId: parentRecord.customerId,
      supplierId: parentRecord.supplierId,
      amount: installment.amount,
      accountId,
      paymentMethodId,
      notes: notes || `কিস্তি #${installmentNo} পরিশোধ (${parentRecord.voucherNo})`,
    });

    return true;
  };

  // Stock alerts
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => p.currentStock === 0);
  }, [products]);

  // Reminders & Due Dates Calculation (Sales, Purchases, Loans & Installments)
  const dueReminders = useMemo(() => {
    const list: DueReminder[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Customer Invoices with dues and due dates
    sales.forEach((s) => {
      if (s.dueAmount > 0 && s.dueDate) {
        const dueD = new Date(s.dueDate);
        dueD.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: DueReminder['status'] = 'upcoming';
        if (diffDays === 0) status = 'today';
        else if (diffDays < 0) status = 'overdue';

        // Include if overdue, today, or due in next 10 days
        if (diffDays <= 10) {
          list.push({
            id: 'due-s-' + s.id,
            partyType: 'customer',
            partyId: s.customerId,
            partyName: s.customerName,
            phone: s.customerPhone || '',
            whatsappNumber: s.customerWhatsapp || '',
            refNo: s.invoiceNo,
            amount: s.dueAmount,
            dueDate: s.dueDate,
            daysDiff: diffDays,
            status,
          });
        }
      }
    });

    // Supplier Payables with due dates
    purchases.forEach((p) => {
      if (p.payableAmount > 0 && p.dueDate) {
        const dueD = new Date(p.dueDate);
        dueD.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: DueReminder['status'] = 'upcoming';
        if (diffDays === 0) status = 'today';
        else if (diffDays < 0) status = 'overdue';

        if (diffDays <= 10) {
          list.push({
            id: 'due-p-' + p.id,
            partyType: 'supplier',
            partyId: p.supplierId,
            partyName: p.supplierName,
            phone: '',
            whatsappNumber: '',
            refNo: p.purchaseNo,
            amount: p.payableAmount,
            dueDate: p.dueDate,
            daysDiff: diffDays,
            status,
          });
        }
      }
    });

    // Loan Records & Installment Schedules with due dates
    loanRecords.forEach((lr) => {
      // 1. If loan has installment schedule
      if (lr.schedule && lr.schedule.length > 0) {
        lr.schedule.forEach((inst) => {
          if (!inst.isPaid && inst.dueDate) {
            const dueD = new Date(inst.dueDate);
            dueD.setHours(0, 0, 0, 0);
            const diffDays = Math.round((dueD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            let status: DueReminder['status'] = 'upcoming';
            if (diffDays === 0) status = 'today';
            else if (diffDays < 0) status = 'overdue';

            if (diffDays <= 10) {
              list.push({
                id: `due-ln-${lr.id}-inst-${inst.installmentNo}`,
                partyType: 'loan',
                partyId: lr.partyId,
                partyName: `${lr.partyName} (কিস্তি #${inst.installmentNo})`,
                phone: '',
                whatsappNumber: '',
                refNo: `${lr.voucherNo} (${lr.type === 'borrow' ? 'দেনা কিস্তি' : 'পাওনা কিস্তি'})`,
                amount: inst.amount,
                dueDate: inst.dueDate,
                daysDiff: diffDays,
                status,
              });
            }
          }
        });
      } else if (lr.dueDate) {
        // Standard loan due date
        const dueD = new Date(lr.dueDate);
        dueD.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: DueReminder['status'] = 'upcoming';
        if (diffDays === 0) status = 'today';
        else if (diffDays < 0) status = 'overdue';

        if (diffDays <= 10) {
          list.push({
            id: 'due-ln-' + lr.id,
            partyType: 'loan',
            partyId: lr.partyId,
            partyName: lr.partyName,
            phone: '',
            whatsappNumber: '',
            refNo: `${lr.voucherNo} (${lr.type === 'borrow' ? 'লোন দেনা' : 'ধার পাওনা'})`,
            amount: lr.amount,
            dueDate: lr.dueDate,
            daysDiff: diffDays,
            status,
          });
        }
      }
    });

    return list.sort((a, b) => a.daysDiff - b.daysDiff);
  }, [sales, purchases, loanRecords]);

  // Calculated Real-Time Metrics for Dashboard
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    let todaySales = 0;
    let todayPurchases = 0;
    let todayCollection = 0;
    let todayExpenses = 0;
    let todayGrossProfit = 0;

    sales.forEach((s) => {
      if (s.date.startsWith(todayStr)) {
        todaySales += s.grandTotal;
        todayCollection += s.paidAmount;
        todayGrossProfit += s.grossProfit;
      }
    });

    // Also add payments received today from previous dues
    paymentRecords.forEach((pr) => {
      if (pr.date.startsWith(todayStr) && pr.type === 'customer_collection') {
        todayCollection += pr.amount;
      }
    });

    purchases.forEach((p) => {
      if (p.date.startsWith(todayStr)) {
        todayPurchases += p.grandTotal;
      }
    });

    expenses.forEach((e) => {
      if (e.date.startsWith(todayStr)) {
        todayExpenses += e.amount;
      }
    });

    let totalReceivable = 0;
    customers.forEach((c) => {
      totalReceivable += c.currentDue;
    });
    loanParties.forEach((lp) => {
      totalReceivable += lp.currentReceivable || 0;
    });

    let totalPayable = 0;
    suppliers.forEach((s) => {
      totalPayable += s.currentPayable;
    });
    loanParties.forEach((lp) => {
      totalPayable += lp.currentPayable || 0;
    });

    let inventoryValuation = 0;
    products.forEach((p) => {
      inventoryValuation += p.currentStock * p.purchasePrice;
    });

    return {
      todaySales,
      todayPurchases,
      todayCollection,
      todayExpenses,
      todayGrossProfit,
      totalReceivable,
      totalPayable,
      inventoryValuation,
    };
  }, [sales, purchases, paymentRecords, expenses, customers, suppliers, products, loanParties]);

  // Full backup & export
  const exportFullBackup = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      businessProfile,
      users,
      categories,
      brands,
      countries,
      expenseCategories,
      products,
      customers,
      suppliers,
      accounts,
      sales,
      purchases,
      paymentRecords,
      expenses,
      incomes,
      stockAdjustments,
      auditLogs,
      loanParties,
      loanRecords,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RM_AutoManage_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.businessProfile) setBusinessProfile(data.businessProfile);
      if (data.users) setUsers(data.users);
      if (data.categories) setCategories(data.categories);
      if (data.brands) setBrands(data.brands);
      if (data.countries) setCountries(data.countries);
      if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
      if (data.products) setProducts(data.products);
      if (data.customers) setCustomers(data.customers);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.accounts) setAccounts(data.accounts);
      if (data.sales) setSales(data.sales);
      if (data.purchases) setPurchases(data.purchases);
      if (data.paymentRecords) setPaymentRecords(data.paymentRecords);
      if (data.expenses) setExpenses(data.expenses);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.loanParties) setLoanParties(data.loanParties);
      if (data.loanRecords) setLoanRecords(data.loanRecords);
      return true;
    } catch {
      return false;
    }
  };

  const resetToDefaultData = () => {
    setBusinessProfile(initialBusinessProfile);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    setCategories(initialCategories);
    setBrands(initialBrands);
    setCountries(initialCountries);
    setExpenseCategories(initialExpenseCategories);
    setProducts(initialProducts);
    setCustomers(initialCustomers);
    setSuppliers(initialSuppliers);
    setAccounts(initialAccounts);
    setSales(initialSales);
    setPurchases(initialPurchases);
    setPaymentRecords([]);
    setExpenses(initialExpenses);
    setIncomes([]);
    setStockAdjustments([]);
    setAuditLogs(initialAuditLogs);
    setLoanParties(initialLoanParties);
    setLoanRecords(initialLoanRecords);
    localStorage.clear();
  };

  const resetToCleanFreshData = () => {
    setSales([]);
    setPurchases([]);
    setPaymentRecords([]);
    setExpenses([]);
    setIncomes([]);
    setStockAdjustments([]);
    setCustomers([]);
    setSuppliers([]);
    setLoanParties([]);
    setLoanRecords([]);
    setAccounts([
      {
        id: 'acc-1',
        name: 'দোকান ক্যাশ / Cash Counter',
        type: 'cash',
        balance: 0,
        isDefault: true,
      },
      {
        id: 'acc-2',
        name: 'বিকাশ মার্চেন্ট / bKash',
        type: 'mfs',
        accountNumber: '01711000000',
        balance: 0,
        isDefault: false,
      },
    ]);
    setAuditLogs([
      {
        id: 'audit-' + Date.now(),
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'System Administrator',
        action: 'CLEAN_SLATE_RESET',
        module: 'SYSTEM',
        details: 'System reset to clean fresh production state. Ready for live transactions.',
      },
    ]);
    localStorage.clear();
  };

  const updateUser = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const deleteUser = (userId: string) => {
    if (users.length <= 1) return;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const logout = () => {
    localStorage.setItem(`${STORAGE_KEY}_current_user_id`, 'LOGGED_OUT');
    setCurrentUser(null);
  };

  const login = (usernameOrPhone: string, password?: string): { success: boolean; error?: string } => {
    const cleanIdentifier = usernameOrPhone.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : '';

    const matchedUser = users.find((u) => {
      const uUsername = (u.username || '').toLowerCase();
      const uPhone = (u.phone || '').replace(/\D/g, '');
      const cleanPhone = cleanIdentifier.replace(/\D/g, '');
      return uUsername === cleanIdentifier || (cleanPhone.length >= 7 && uPhone.includes(cleanPhone));
    });

    if (!matchedUser) {
      return { success: false, error: 'User not found with this username or mobile number.' };
    }

    if (matchedUser.password && cleanPassword && matchedUser.password !== cleanPassword) {
      return { success: false, error: 'Incorrect password.' };
    }

    setCurrentUser(matchedUser);
    localStorage.setItem(`${STORAGE_KEY}_current_user_id`, matchedUser.id);
    return { success: true };
  };

  // Unified Transactions Journal
  const transactions: Transaction[] = useMemo(() => {
    const list: Transaction[] = [];

    // 1. Sales payments
    sales.forEach((s) => {
      if (s.paidAmount > 0) {
        const acc = accounts.find((a) => a.id === s.accountId);
        list.push({
          id: 'tx-sale-' + s.id,
          date: s.date,
          type: 'sale_collection',
          flow: 'in',
          accountId: s.accountId,
          accountName: acc?.name || 'Counter Cash',
          amount: s.paidAmount,
          description: `Invoice #${s.invoiceNo} receipt (${s.customerName})`,
          creatorName: s.sellerName,
          relatedEntityId: s.customerId,
        });
      }
    });

    // 2. Customer collections & supplier payments
    paymentRecords.forEach((pr) => {
      list.push({
        id: 'tx-pay-' + pr.id,
        date: pr.date,
        type: pr.type === 'customer_collection' ? 'customer_due_collection' : 'supplier_payment',
        flow: pr.type === 'customer_collection' ? 'in' : 'out',
        accountId: pr.accountId,
        accountName: pr.accountName,
        amount: pr.amount,
        description: pr.notes || (pr.type === 'customer_collection' ? `Due payment from ${pr.partyName}` : `Bill disbursement to ${pr.partyName}`),
        creatorName: pr.recordedBy,
        relatedEntityId: pr.partyId,
      });
    });

    // 3. Operational Expenses
    expenses.forEach((e) => {
      list.push({
        id: 'tx-exp-' + e.id,
        date: e.date,
        type: 'operational_expense',
        flow: 'out',
        accountId: e.accountId,
        accountName: e.accountName,
        amount: e.amount,
        description: `${e.categoryName}: ${e.description}`,
        creatorName: e.enteredBy,
      });
    });

    // 4. Loans
    loanRecords.forEach((lr) => {
      list.push({
        id: 'tx-loan-' + lr.id,
        date: lr.date,
        type: `loan_${lr.type}`,
        flow: (lr.type === 'borrow' || lr.type === 'collect_lend') ? 'in' : 'out',
        accountId: lr.accountId,
        accountName: lr.accountName,
        amount: lr.amount,
        description: `Loan ${lr.type}: ${lr.partyName} (Voucher #${lr.voucherNo})`,
        creatorName: lr.enteredBy,
        relatedEntityId: lr.partyId,
      });
    });

    // 5. Purchases upfront payments
    purchases.forEach((p) => {
      if (p.paidAmount > 0) {
        const acc = accounts.find((a) => a.id === p.accountId);
        list.push({
          id: 'tx-pur-' + p.id,
          date: p.date,
          type: 'purchase_payment',
          flow: 'out',
          accountId: p.accountId,
          accountName: acc?.name || 'Bank/Cash',
          amount: p.paidAmount,
          description: `Purchase #${p.purchaseNo} disbursement (${p.supplierName})`,
          creatorName: 'Procurement',
          relatedEntityId: p.supplierId,
        });
      }
    });

    // 6. Sales Return Cash Refunds
    salesReturns.forEach((sr) => {
      if (sr.refundType === 'cash_refund' && sr.accountId) {
        const acc = accounts.find((a) => a.id === sr.accountId);
        list.push({
          id: 'tx-ret-' + sr.id,
          date: sr.date,
          type: 'sales_return_refund',
          flow: 'out',
          accountId: sr.accountId,
          accountName: acc?.name || 'Counter Cash',
          amount: sr.totalRefundAmount,
          description: `Return Refund #${sr.returnNo} for Inv #${sr.invoiceNo} (${sr.customerName})`,
          creatorName: sr.processedBy,
          relatedEntityId: sr.customerId,
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, purchases, paymentRecords, expenses, accounts, loanRecords, salesReturns]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        language,
        setLanguage,
        t,
        theme,
        toggleTheme,

        businessProfile,
        updateBusinessProfile,
        users,
        currentUser,
        setCurrentUser,
        addUser,
        updateUser,
        deleteUser,
        updateUserPermissions,
        logout,
        login,

        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        brands,
        addBrand,
        countries,
        addCountry,
        expenseCategories,
        addExpenseCategory,
        paymentMethods,
        addPaymentMethod,
        updatePaymentMethod,
        deletePaymentMethod,

        products,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        lowStockProducts,
        outOfStockProducts,

        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordCustomerPayment,

        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        recordSupplierPayment,

        accounts,
        addAccount,
        updateAccount,
        transferFunds,
        dailyClosings,
        recordDailyClosing,

        sales,
        createSale,
        updateSale,
        deleteSale,
        selectedInvoice,
        setSelectedInvoice,
        salesReturns,
        createSalesReturn,

        purchases,
        createPurchase,
        selectedPurchase,
        setSelectedPurchase,

        paymentRecords,
        selectedReceipt,
        setSelectedReceipt,

        expenses,
        addExpense,
        recordExpense,
        incomes,
        addIncome,

        transactions,

        stockAdjustments,
        auditLogs,
        addAuditLog,

        loanParties,
        loanRecords,
        addLoanParty,
        recordLoanTransaction,
        payLoanInstallment,

        dueReminders,
        metrics,

        exportFullBackup,
        importBackup,
        resetToDefaultData,
        resetToSeedData: resetToDefaultData,
        resetToCleanFreshData,

        isCloudSyncing,
        cloudSyncStatus,
        syncAllToFirestore,
        testFirestore,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
