export type UserRole = 'super_admin' | 'manager' | 'staff' | 'salesman' | 'accountant' | 'inventory_manager';

export interface UserPermissions {
  canViewCost: boolean;
  canEditCartPrice: boolean;
  canDeleteRecords: boolean;
  canViewProfitAndReports: boolean;
  canManageSuppliersAndPurchases: boolean;
  canManageSettingsAndUsers: boolean;
  canAdjustStock: boolean;
  canManageAccounts: boolean;
  canManageUsers?: boolean;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  username?: string;
  password?: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  avatarUrl?: string;
  isActive?: boolean;
  permissions: UserPermissions;
}

export interface BusinessProfile {
  businessName: string;
  appName: string;
  tagline: string;
  logoUrl: string;
  signatureUrl: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  website: string;
  tradeLicense: string;
  binVat: string;
  ownerName: string;
  proprietorTitle?: string;
  invoicePrefix: string;
  purchasePrefix: string;
  nextInvoiceNumber: number;
  nextPurchaseNumber: number;
  defaultDueDays: number;
  currency: string;
  whatsappTemplate: string;
  invoiceNotes?: string;
  invoiceSignatureLabel?: string;
  showSignatureOnInvoice?: boolean;
  enableDemoMode?: boolean;
}

export interface VehicleCompatibility {
  brand: string;
  model: string;
  yearRange: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  productCode?: string; // Specific parts / manufacturer / catalog code
  barcode: string;
  categoryId: string;
  subcategory?: string;
  condition: string; // 'New' | 'Reconditioned' | 'Used' | 'Refurbished'
  brandId: string;
  brand?: string;
  originCountryId: string;
  countryOfOrigin?: string;
  vehicleCompatibilities: VehicleCompatibility[];
  rackLocation: string;
  unit: string;
  purchasePrice: number;
  defaultSellingPrice: number;
  wholesalePrice: number;
  minAuthorizedPrice: number;
  currentStock: number;
  minStockLevel: number;
  reorderLevel: number;
  image?: string;
  description?: string;
  warranty?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameBn: string;
  skuPrefix?: string; // Default prefix for automatic SKU generation (e.g. ENG, BRK, SUS)
  subcategories: string[];
}

export interface Brand {
  id: string;
  name: string;
  origin: string;
}

export interface Country {
  id: string;
  name: string;
  nameBn: string;
  flag?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  nameBn: string;
  type: 'cash' | 'bank' | 'mfs' | 'card';
  defaultAccountId?: string;
  isActive?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  customerType: 'Retail' | 'Garage / Workshop' | 'Wholesaler' | 'Workshop' | 'Fleet' | string;
  openingBalance: number;
  totalPurchased: number;
  totalPaid: number;
  currentDue: number;
  creditLimit: number;
  paymentTerms: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  contactPerson?: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  country?: string;
  supplierCategory?: 'importer' | 'wholesaler' | 'local_supplier' | 'distributor' | string;
  openingBalance: number;
  totalPurchased: number;
  totalPaid: number;
  currentPayable: number;
  currentBalance?: number;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'mfs' | 'mobile_banking';
  bankName?: string;
  branch?: string;
  bankBranch?: string;
  accountNumber?: string;
  accountHolder?: string;
  balance: number;
  isDefault?: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  productCode?: string;
  quantity: number;
  unit: string;
  costPrice: number;
  defaultSellingPrice: number;
  sellingPrice: number;
  unitPrice?: number;
  discount: number;
  total: number;
  brand?: string;
  condition?: string;
  origin?: string;
  category?: string;
  vehicleModel?: string;
  image?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  deliveryCharge?: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  dueDate?: string;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  paymentMethodId: string;
  accountId: string;
  sellerId: string;
  sellerName: string;
  vehicleInfo?: string;
  notes?: string;
  totalCost: number;
  grossProfit: number;
  isAdjustedAfterReturn?: boolean;
  returnNotes?: string;
  returnedAmount?: number;
  originalGrandTotal?: number;
  lastAdjustedAt?: string;
  returnVoucherNo?: string;
  returnedItemsSummary?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitRefundPrice: number;
    total: number;
  }>;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  brand?: string;
  condition?: string;
  origin?: string;
  category?: string;
  vehicleModel?: string;
  image?: string;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierInvoiceNo?: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  discountTotal: number;
  additionalCosts: number; // Transport, loading
  grandTotal: number;
  paidAmount: number;
  payableAmount: number;
  dueDate?: string;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  paymentMethodId: string;
  accountId: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  date: string;
  type: 'customer_collection' | 'supplier_payment';
  partyId: string;
  partyName: string;
  partyPhone: string;
  partyWhatsapp?: string;
  refInvoiceOrPurchaseNo?: string;
  amount: number;
  paymentMethodId: string;
  accountId: string;
  accountName: string;
  previousBalance: number;
  newBalance: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameBn: string;
}

export interface Expense {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  accountId: string;
  accountName: string;
  reference?: string;
  payee?: string;
  voucherNo?: string;
  description: string;
  enteredBy: string;
  createdAt: string;
}

export interface PurchaseReturn {
  id: string;
  returnNo: string;
  date: string;
  purchaseId: string;
  purchaseNo: string;
  supplierId: string;
  supplierName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  totalRefundAmount: number;
  refundType: 'cash_refund' | 'adjust_payable';
  accountId?: string;
  reason: string;
  processedBy: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: string;
  flow: 'in' | 'out';
  accountId: string;
  accountName: string;
  amount: number;
  description: string;
  creatorName: string;
  relatedEntityId?: string;
}

export interface Income {
  id: string;
  date: string;
  categoryName: string;
  amount: number;
  accountId: string;
  accountName: string;
  reference?: string;
  description: string;
  enteredBy: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'damage' | 'lost' | 'found' | 'count_audit' | 'addition' | 'reduction';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  adjustedBy: string;
  createdAt: string;
}

export interface SalesReturn {
  id: string;
  returnNo: string;
  date: string;
  saleId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitRefundPrice: number;
    total: number;
  }>;
  totalRefundAmount: number;
  refundType: 'cash_refund' | 'adjust_due';
  accountId?: string;
  reason: string;
  processedBy: string;
  createdAt: string;
}

export interface AccountTransfer {
  id: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  notes?: string;
  performedBy: string;
  createdAt: string;
}

export interface DailyClosing {
  date: string;
  openingCash: number;
  cashSales: number;
  customerCollections: number;
  supplierPayments: number;
  cashExpenses: number;
  otherCashIn: number;
  otherCashOut: number;
  closingCashExpected: number;
  closingCashActual: number;
  difference: number;
  closedBy: string;
  closedAt: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
}

export type LoanEntityType = 'bank' | 'cooperative' | 'person' | 'customer' | 'supplier' | 'other';

export type InstallmentFrequency = 'weekly' | 'monthly' | 'semi_annual' | 'yearly' | 'lump_sum';

export interface InstallmentScheduleItem {
  installmentNo: number;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  paidAmount?: number;
}

export interface LoanParty {
  id: string;
  name: string;
  entityType: LoanEntityType;
  phone: string;
  companyName?: string;
  address?: string;
  email?: string;
  totalBorrowed: number; // মোট কত ধার/ঋণ নেওয়া হয়েছে
  totalLent: number; // মোট কত ধার/ঋণ দেওয়া হয়েছে
  currentPayable: number; // আমরা তাদের কত ফেরত দেব (দেনা)
  currentReceivable: number; // তারা আমাদের কত ফেরত দেবে (পাওনা)
  openingPayable?: number;
  openingReceivable?: number;
  notes?: string;
  createdAt: string;
}

export interface LoanRecord {
  id: string;
  voucherNo: string;
  date: string;
  type: 'borrow' | 'lend' | 'repay_borrow' | 'collect_lend';
  partyId: string;
  partyName: string;
  partyType: LoanEntityType;
  customerId?: string;
  supplierId?: string;
  loanPartyId?: string;
  amount: number;
  accountId: string;
  accountName: string;
  paymentMethodId?: string;
  dueDate?: string;
  isInstallment?: boolean;
  installmentFrequency?: InstallmentFrequency;
  totalInstallments?: number;
  perInstallmentAmount?: number;
  schedule?: InstallmentScheduleItem[];
  notes?: string;
  enteredBy: string;
  createdAt: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'invoices'
  | 'purchases'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'loan_directory'
  | 'dues_ledger'
  | 'accounts'
  | 'expenses'
  | 'reports'
  | 'settings';
