import {
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
  Expense,
  AuditLog,
  LoanParty,
  LoanRecord,
} from '../types';

export const initialBusinessProfile: BusinessProfile = {
  businessName: 'RM Automobiles',
  appName: 'RM AutoManage',
  tagline: 'Automobile Parts Sales, Inventory & Complete Business Management',
  logoUrl: '', // Fallback to SVG badge in UI if empty
  signatureUrl: '', // Clean signature
  phone: '01711-223344',
  whatsappNumber: '01711-223344',
  email: 'info@rmautomobiles.com',
  address: 'Shop # 12-14, Motor Parts Market, Shahid Tajuddin Ahmed Sarani, Tejgaon, Dhaka-1208',
  website: 'https://rmautomobiles.com',
  tradeLicense: 'TRAD/DSCC/049281/2023',
  binVat: 'BIN-003892718-0101',
  ownerName: 'আব্দুর রহিম রনি',
  proprietorTitle: 'স্বত্বাধিকারী / Proprietor',
  invoicePrefix: 'RM-INV-',
  purchasePrefix: 'RM-PUR-',
  nextInvoiceNumber: 1048,
  nextPurchaseNumber: 215,
  defaultDueDays: 15,
  currency: '৳',
  whatsappTemplate: 'Hello {customer_name}, here is your invoice #{invoice_no} for {amount}. Thank you for shopping with RM Automobiles.',
  invoiceNotes: 'Sold goods are non-refundable after 7 days and must be accompanied by the original cash memo. Electrical & sensor parts carry no replacement warranty once installed. (বিক্রিত মাল মূল অক্ষত প্যাকেটে ক্যাশ মেমোসহ ৭ দিনের মধ্যে পরিবর্তনযোগ্য। ইলেকট্রিক ও সেন্সর পার্টস ফিটিং করার পর কোনো ওয়ারেন্টি বা ফেরত প্রযোজ্য নয়।)',
  invoiceSignatureLabel: 'স্বত্বাধিকারী / Authorized Signature',
  showSignatureOnInvoice: true,
  enableDemoMode: true,
};

export const initialUsers: User[] = [
  {
    id: 'user-1',
    name: 'আব্দুর রহিম রনি',
    username: 'admin',
    password: '123',
    phone: '01711223344',
    role: 'super_admin',
    permissions: {
      canViewCost: true,
      canEditCartPrice: true,
      canDeleteRecords: true,
      canViewProfitAndReports: true,
      canManageSuppliersAndPurchases: true,
      canManageSettingsAndUsers: true,
      canAdjustStock: true,
      canManageAccounts: true,
    },
  },
  {
    id: 'user-2',
    name: 'Tariqul Islam (Manager)',
    username: 'manager',
    password: '123',
    phone: '01819334455',
    role: 'manager',
    permissions: {
      canViewCost: true,
      canEditCartPrice: true,
      canDeleteRecords: false,
      canViewProfitAndReports: true,
      canManageSuppliersAndPurchases: true,
      canManageSettingsAndUsers: false,
      canAdjustStock: true,
      canManageAccounts: true,
    },
  },
  {
    id: 'user-3',
    name: 'Ashraful Alam (Sales Staff)',
    username: 'sales',
    password: '123',
    phone: '01912445566',
    role: 'staff',
    permissions: {
      canViewCost: false,
      canEditCartPrice: false,
      canDeleteRecords: false,
      canViewProfitAndReports: false,
      canManageSuppliersAndPurchases: false,
      canManageSettingsAndUsers: false,
      canAdjustStock: false,
      canManageAccounts: false,
    },
  },
];

export const initialCategories: Category[] = [
  { id: 'cat-1', name: 'Brake Parts', nameBn: 'ব্রেক পার্টস', skuPrefix: 'BRK', subcategories: ['Brake Pads', 'Brake Shoes', 'Brake Discs', 'Brake Calipers', 'Brake Master Cylinder'] },
  { id: 'cat-2', name: 'Engine Parts', nameBn: 'ইঞ্জিন পার্টস', skuPrefix: 'ENG', subcategories: ['Piston & Rings', 'Gaskets', 'Valves', 'Timing Belt / Chain', 'Spark Plugs'] },
  { id: 'cat-3', name: 'Suspension & Steering', nameBn: 'সাসপেনশন ও স্টিয়ারিং', skuPrefix: 'SUS', subcategories: ['Shock Absorbers', 'Ball Joints', 'Tie Rod Ends', 'Control Arms', 'Bushing Sets'] },
  { id: 'cat-4', name: 'Lubricants & Fluids', nameBn: 'লুব্রিকেন্টস ও ফ্লুইড', skuPrefix: 'LUB', subcategories: ['Engine Oil', 'Gear Oil', 'Brake Fluid', 'Coolant', 'ATF Fluid'] },
  { id: 'cat-5', name: 'Filters', nameBn: 'ফিল্টার্স', skuPrefix: 'FLT', subcategories: ['Oil Filter', 'Air Filter', 'Cabin AC Filter', 'Fuel Filter'] },
  { id: 'cat-6', name: 'Electrical & Lighting', nameBn: 'ইলেকট্রিক্যাল ও লাইটিং', skuPrefix: 'ELE', subcategories: ['Headlight Bulbs', 'Horn', 'Relays & Fuses', 'Alternator', 'Starter Motor'] },
  { id: 'cat-7', name: 'Transmission & Clutch', nameBn: 'ট্রান্সমিশন ও ক্লাচ', skuPrefix: 'TRN', subcategories: ['Clutch Plate', 'Pressure Plate', 'Clutch Cable', 'Release Bearing'] },
  { id: 'cat-8', name: 'Batteries', nameBn: 'ব্যাটারি', skuPrefix: 'BAT', subcategories: ['Maintenance Free (MF)', 'Conventional Lead-Acid', 'Motorcycle VRLA'] },
  { id: 'cat-9', name: 'Cooling System', nameBn: 'কুলিং সিস্টেম', skuPrefix: 'COL', subcategories: ['Radiator', 'Water Pump', 'Thermostat Valve', 'Radiator Fan'] },
  { id: 'cat-10', name: 'Motorcycle Parts', nameBn: 'মোটরসাইকেল পার্টস', skuPrefix: 'MOT', subcategories: ['Drive Chain & Sprocket', 'Cables', 'Carburetor', 'Brake Lever'] },
];

export const initialBrands: Brand[] = [
  { id: 'br-1', name: 'Toyota Genuine Parts', origin: 'Japan' },
  { id: 'br-2', name: 'Honda Genuine', origin: 'Japan' },
  { id: 'br-3', name: 'Denso', origin: 'Japan' },
  { id: 'br-4', name: 'NGK Spark Plugs', origin: 'Japan' },
  { id: 'br-5', name: 'Bosch Automotive', origin: 'Germany' },
  { id: 'br-6', name: 'KYB (Kayaba)', origin: 'Japan' },
  { id: 'br-7', name: 'Mobil 1', origin: 'USA / Singapore' },
  { id: 'br-8', name: 'Castrol', origin: 'UK / India' },
  { id: 'br-9', name: 'Motul', origin: 'France' },
  { id: 'br-10', name: 'AISIN', origin: 'Japan' },
  { id: 'br-11', name: 'Brembo', origin: 'Italy' },
  { id: 'br-12', name: 'GS Yuasa', origin: 'Japan / Indonesia' },
  { id: 'br-13', name: 'Yamaha Genuine', origin: 'Japan / India' },
];

export const initialCountries: Country[] = [
  { id: 'cnt-1', name: 'Japan', nameBn: 'জাপান', flag: '🇯🇵' },
  { id: 'cnt-2', name: 'India', nameBn: 'ভারত', flag: '🇮🇳' },
  { id: 'cnt-3', name: 'Thailand', nameBn: 'থাইল্যান্ড', flag: '🇹🇭' },
  { id: 'cnt-4', name: 'Indonesia', nameBn: 'ইন্দোনেশিয়া', flag: '🇮🇩' },
  { id: 'cnt-5', name: 'Germany', nameBn: 'জার্মানি', flag: '🇩🇪' },
  { id: 'cnt-6', name: 'China', nameBn: 'চীন', flag: '🇨🇳' },
  { id: 'cnt-7', name: 'Korea (South)', nameBn: 'দক্ষিণ কোরিয়া', flag: '🇰🇷' },
  { id: 'cnt-8', name: 'Local (Bangladesh)', nameBn: 'বাংলাদেশ', flag: '🇧🇩' },
];

export const initialPaymentMethods: PaymentMethod[] = [
  { id: 'pm-1', name: 'Cash (নগদ ক্যাশ)', nameBn: 'ক্যাশ / নগদ ক্যাশ', type: 'cash', defaultAccountId: 'acc-1', isActive: true },
  { id: 'pm-2', name: 'Islami Bank A/C', nameBn: 'ইসলামী ব্যাংক হিসাব', type: 'bank', defaultAccountId: 'acc-2', isActive: true },
  { id: 'pm-3', name: 'City Bank A/C', nameBn: 'সিটি ব্যাংক হিসাব', type: 'bank', defaultAccountId: 'acc-3', isActive: true },
  { id: 'pm-4', name: 'bKash Merchant (01711223344)', nameBn: 'বিকাশ মার্চেন্ট', type: 'mfs', defaultAccountId: 'acc-4', isActive: true },
  { id: 'pm-5', name: 'Nagad (01711223344)', nameBn: 'নগদ ওয়ালেট', type: 'mfs', defaultAccountId: 'acc-5', isActive: true },
];

export const initialExpenseCategories: ExpenseCategory[] = [
  { id: 'exp-1', name: 'Shop Rent', nameBn: 'দোকান ভাড়া' },
  { id: 'exp-2', name: 'Staff Salary & Allowance', nameBn: 'কর্মচারীর বেতন ও ভাতা' },
  { id: 'exp-3', name: 'Electricity & Utilities', nameBn: 'বিদ্যুৎ ও ইউটিলিটি বিল' },
  { id: 'exp-4', name: 'Transport & Courier', nameBn: 'মাল পরিবহন ও কুরিয়ার খরচ' },
  { id: 'exp-5', name: 'Tea, Food & Entertainment', nameBn: 'আপ্যায়ন ও নাস্তা খরচ' },
  { id: 'exp-6', name: 'Internet & Mobile Bills', nameBn: 'ইন্টারনেট ও মোবাইল বিল' },
  { id: 'exp-7', name: 'Shop Repair & Maintenance', nameBn: 'দোকান মেরামত ও রক্ষণাবেক্ষণ' },
  { id: 'exp-8', name: 'Government Tax & Trade Fees', nameBn: 'ট্যাক্স ও লাইসেন্স ফি' },
  { id: 'exp-9', name: 'Other Miscellaneous', nameBn: 'অন্যান্য সাধারণ খরচ' },
];

export const initialAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'দোকান ক্যাশ কাউন্টার (Cash Counter)',
    type: 'cash',
    balance: 0,
    isDefault: true,
  },
];

export const initialProducts: Product[] = [];
export const initialCustomers: Customer[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialSales: Sale[] = [];
export const initialPurchases: Purchase[] = [];
export const initialExpenses: Expense[] = [];
export const initialAuditLogs: AuditLog[] = [];
export const initialLoanParties: LoanParty[] = [];
export const initialLoanRecords: LoanRecord[] = [];
