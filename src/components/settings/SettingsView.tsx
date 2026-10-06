import React, { useState } from 'react';
import {
  Building2,
  Phone,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  UserCheck,
  Percent,
  Receipt,
  FileSignature,
  UserPlus,
  Users,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Key,
  Lock,
  AlertTriangle,
  X,
  FileText,
  CreditCard,
  Layers,
  Cloud,
  Copy,
  Check,
  Code2,
  History,
  RotateCcw,
  Globe,
  Search,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BusinessProfile, User } from '../../types';
import { compressAndResizeImage } from '../../utils/imageCompressor';
import { PaymentMethodsManager } from './PaymentMethodsManager';
import { firestoreRulesContent } from '../../services/firebase';

export const SettingsView: React.FC = () => {
  const {
    businessProfile,
    updateBusinessProfile,
    currentUser,
    users,
    setCurrentUser,
    addUser,
    updateUser,
    deleteUser,
    resetToSeedData,
    resetToCleanFreshData,
    resetArchives,
    restoreFromArchive,
    deleteArchive,
    auditLogs,
    exportFullBackup,
    importBackup,
    isCloudSyncing,
    cloudSyncStatus,
    syncAllToFirestore,
    testFirestore,
    t,
    language,
  } = useApp();

  const [formData, setFormData] = useState<BusinessProfile>(businessProfile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState('');
  const [settingsTab, setSettingsTab] = useState<'profile' | 'payment_methods' | 'audit_recovery'>('profile');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [restoringArchiveId, setRestoringArchiveId] = useState<string | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string>('');
  const [copiedDomain, setCopiedDomain] = useState<string>('');

  // User Management state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Add/Edit user form fields
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<User['role']>('salesman');
  const [newUserPerms, setNewUserPerms] = useState<User['permissions']>({
    canEditCartPrice: false,
    canViewCost: false,
    canViewProfitAndReports: false,
    canManageSuppliersAndPurchases: false,
    canManageSettingsAndUsers: false,
    canAdjustStock: false,
    canManageAccounts: false,
    canDeleteRecords: false,
    canManageUsers: false,
  });

  // Reset confirmation state
  const [confirmCleanReset, setConfirmCleanReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(firestoreRulesContent);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChange = (field: keyof BusinessProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Logo upload handler (Auto-resizes & compresses uploaded image)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await compressAndResizeImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.85,
      });
      handleChange('logoUrl', result.dataUrl);
    } catch (err) {
      console.error('Logo compression error:', err);
    }
  };

  // Signature upload handler (Auto-resizes & compresses uploaded signature)
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await compressAndResizeImage(file, {
        maxWidth: 500,
        maxHeight: 250,
        quality: 0.85,
      });
      handleChange('signatureUrl', result.dataUrl);
    } catch (err) {
      console.error('Signature compression error:', err);
    }
  };

  // Open add user modal
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserPhone('');
    setNewUserRole('salesman');
    setNewUserPerms({
      canEditCartPrice: false,
      canViewCost: false,
      canViewProfitAndReports: false,
      canManageSuppliersAndPurchases: false,
      canManageSettingsAndUsers: false,
      canAdjustStock: false,
      canManageAccounts: false,
      canDeleteRecords: false,
      canManageUsers: false,
    });
    setShowAddUserModal(true);
  };

  // Open edit user modal
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setNewUserName(u.name);
    setNewUserEmail(u.email || '');
    setNewUserUsername(u.username || '');
    setNewUserPassword(u.password || '');
    setNewUserPhone(u.phone);
    setNewUserRole(u.role);
    setNewUserPerms({ ...u.permissions });
    setShowAddUserModal(true);
  };

  const handleRolePreset = (role: User['role']) => {
    setNewUserRole(role);
    if (role === 'super_admin') {
      setNewUserPerms({
        canEditCartPrice: true,
        canViewCost: true,
        canViewProfitAndReports: true,
        canManageSuppliersAndPurchases: true,
        canManageSettingsAndUsers: true,
        canAdjustStock: true,
        canManageAccounts: true,
        canDeleteRecords: true,
        canManageUsers: true,
      });
    } else if (role === 'manager') {
      setNewUserPerms({
        canEditCartPrice: true,
        canViewCost: true,
        canViewProfitAndReports: true,
        canManageSuppliersAndPurchases: true,
        canManageSettingsAndUsers: false,
        canAdjustStock: true,
        canManageAccounts: true,
        canDeleteRecords: false,
        canManageUsers: false,
      });
    } else if (role === 'accountant') {
      setNewUserPerms({
        canEditCartPrice: false,
        canViewCost: true,
        canViewProfitAndReports: true,
        canManageSuppliersAndPurchases: true,
        canManageSettingsAndUsers: false,
        canAdjustStock: false,
        canManageAccounts: true,
        canDeleteRecords: false,
        canManageUsers: false,
      });
    } else if (role === 'inventory_manager') {
      setNewUserPerms({
        canEditCartPrice: false,
        canViewCost: true,
        canViewProfitAndReports: false,
        canManageSuppliersAndPurchases: true,
        canManageSettingsAndUsers: false,
        canAdjustStock: true,
        canManageAccounts: false,
        canDeleteRecords: false,
        canManageUsers: false,
      });
    } else {
      setNewUserPerms({
        canEditCartPrice: false,
        canViewCost: false,
        canViewProfitAndReports: false,
        canManageSuppliersAndPurchases: false,
        canManageSettingsAndUsers: false,
        canAdjustStock: false,
        canManageAccounts: false,
        canDeleteRecords: false,
        canManageUsers: false,
      });
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    if (editingUser) {
      updateUser({
        ...editingUser,
        name: newUserName.trim(),
        email: newUserEmail.trim() || undefined,
        username: newUserUsername.trim() || undefined,
        password: newUserPassword.trim() || undefined,
        phone: newUserPhone.trim(),
        role: newUserRole,
        permissions: newUserPerms,
      });
    } else {
      addUser({
        name: newUserName.trim(),
        email: newUserEmail.trim() || undefined,
        username: newUserUsername.trim() || undefined,
        password: newUserPassword.trim() || undefined,
        phone: newUserPhone.trim(),
        role: newUserRole,
        isActive: true,
        permissions: newUserPerms,
      });
    }

    setShowAddUserModal(false);
  };

  const handleDeleteUser = (u: User) => {
    if (users.length <= 1) {
      alert('Cannot delete the last remaining system user.');
      return;
    }
    if (confirm(`Are you sure you want to delete user "${u.name}"?`)) {
      deleteUser(u.id);
    }
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackup(content);
      if (success) {
        alert('Database restored successfully! Reloading...');
        window.location.reload();
      } else {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleTestFirebase = async () => {
    try {
      const res = await testFirestore();
      setTestResult(res);
      setTimeout(() => setTestResult(null), 8000);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed' });
    }
  };

  const handleForceCloudSync = async () => {
    try {
      await syncAllToFirestore();
      setCloudSyncMsg(language === 'bn' ? 'সকল ডাটা সফলভাবে ফায়ারবেস ক্লাউডে সিঙ্ক হয়েছে!' : 'All data successfully synced to Firebase Cloud!');
      setTimeout(() => setCloudSyncMsg(''), 4000);
    } catch (e) {
      setCloudSyncMsg(language === 'bn' ? 'ক্লাউড সিঙ্ক করতে সমস্যা হয়েছে।' : 'Error syncing to cloud.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('settings')} & System Configuration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {language === 'bn'
            ? 'দোকানের লোগো ও বিবরণ, পেমেন্ট মেথড ও একাউন্ট ম্যাপিং, ইউজার রোল ও ডাটাবেজ ব্যাকআপ'
            : 'Shop branding & logo upload, payment method mapping, user roles and database backup'}
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-bold gap-2">
        <button
          type="button"
          onClick={() => setSettingsTab('profile')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            settingsTab === 'profile'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{language === 'bn' ? 'দোকানের প্রোফাইল ও ইউজার কন্ট্রোল' : 'Shop Profile & User Roles'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSettingsTab('payment_methods')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            settingsTab === 'payment_methods'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{language === 'bn' ? 'পেমেন্ট মেথড ও একাউন্ট সংযোগ' : 'Payment Methods & Account Mapping'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSettingsTab('audit_recovery')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            settingsTab === 'audit_recovery'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{language === 'bn' ? 'অডিট লগ ও ডাটা রিকভারি হিস্ট্রি' : 'Audit Log & Data Recovery'}</span>
        </button>
      </div>

      {settingsTab === 'payment_methods' ? (
        <PaymentMethodsManager />
      ) : settingsTab === 'audit_recovery' ? (
        <div className="space-y-6">
          {restoreSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{restoreSuccessMsg}</span>
              </span>
              <button
                type="button"
                onClick={() => setRestoreSuccessMsg('')}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. Recovery Archives & Trash Snapshots */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {language === 'bn' ? 'ডাটা রিকভারি ও ট্র্যাশ স্ন্যাপশট (Restore Backups)' : 'Data Recovery & Snapshot Archives'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'bn'
                      ? 'পূর্বে মুছে ফেলা বা রিসেট করা ডাটার ব্যাকআপ স্ন্যাপশট। ১ ক্লিকেই পূর্বাবস্থায় ফিরিয়ে আনা যাবে।'
                      : 'Snapshots captured before resets. Restore any state with a single click.'}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                {resetArchives.length} {language === 'bn' ? 'টি সংরক্ষিত স্ন্যাপশট' : 'Saved Snapshots'}
              </span>
            </div>

            {resetArchives.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="font-semibold">{language === 'bn' ? 'কোনো আর্কাইভ স্ন্যাপশট নেই।' : 'No saved archive snapshots.'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'bn' ? 'সিস্টেমে রিসেট চালানো হলে স্বয়ংক্রিয়ভাবে এখানে স্ন্যাপশট সংরক্ষিত হয়।' : 'Snapshots are automatically created whenever an operational reset is triggered.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {resetArchives.map((archive) => (
                  <div
                    key={archive.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                            {new Date(archive.timestamp).toLocaleString()}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {archive.reason || 'Clean Reset'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {language === 'bn' ? 'অ্যাকশন গ্রহণকারী:' : 'Action performed by:'} <strong className="text-slate-700 dark:text-slate-300">{archive.resetByUserName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিতভাবে এই স্ন্যাপশটটি রিস্টোর করে পূর্বের সমস্ত সেল ও পার্টসের তথ্য ফিরিয়ে আনতে চান?' : 'Are you sure you want to restore this snapshot? Current data will be replaced.')) {
                              setRestoringArchiveId(archive.id);
                              restoreFromArchive(archive.id).then((success) => {
                                setRestoringArchiveId(null);
                                if (success) {
                                  setRestoreSuccessMsg(language === 'bn' ? 'স্ন্যাপশট সফলভাবে রিস্টোর হয়েছে! পূর্বের সকল ডাটা ফিরিয়ে আনা হয়েছে।' : 'Snapshot restored successfully! All previous records recovered.');
                                  setTimeout(() => setRestoreSuccessMsg(''), 5000);
                                }
                              });
                            }
                          }}
                          disabled={restoringArchiveId === archive.id}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${restoringArchiveId === archive.id ? 'animate-spin' : ''}`} />
                          <span>{language === 'bn' ? 'এই ডাটা ফিরিয়ে আনুন (Restore)' : 'Restore Snapshot'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(language === 'bn' ? 'এই স্ন্যাপশটটি চিরতরে মুছে ফেলতে চান?' : 'Permanently delete this snapshot?')) {
                              deleteArchive(archive.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Snapshot data summary pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-[11px]">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">{language === 'bn' ? 'বিক্রয় (Sales)' : 'Sales'}</span>
                        <strong className="text-slate-800 dark:text-slate-200">{archive.summary.salesCount} টি (৳{archive.summary.totalSalesVolume.toLocaleString()})</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">{language === 'bn' ? 'পার্টস পণ্য' : 'Products'}</span>
                        <strong className="text-slate-800 dark:text-slate-200">{archive.summary.productsCount} টি</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">{language === 'bn' ? 'কাস্টমার বকেয়া' : 'Customer Dues'}</span>
                        <strong className="text-rose-600 dark:text-rose-400">৳{archive.summary.totalDueVolume.toLocaleString()}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">{language === 'bn' ? 'পারচেজ' : 'Purchases'}</span>
                        <strong className="text-slate-800 dark:text-slate-200">{archive.summary.purchasesCount} টি</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">{language === 'bn' ? 'খরচ রেকর্ড' : 'Expenses'}</span>
                        <strong className="text-slate-800 dark:text-slate-200">{archive.summary.expensesCount} টি</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">{language === 'bn' ? 'লোন রেকর্ড' : 'Loans'}</span>
                        <strong className="text-slate-800 dark:text-slate-200">{archive.summary.loanRecordsCount} টি</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Authorized Domains for Firebase Authentication & Real-time Sync */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {language === 'bn' ? 'ফায়ারবেস অনুমোদিত ডোমেইন তালিকা (Authorized Domains)' : 'Firebase Authorized Domains'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'bn'
                    ? 'ফায়ারবেসে অথেন্টিকেশন ও সিঙ্কিং সক্রিয় রাখতে নিচের ডোমেইনগুলো Firebase Console-এ যোগ করুন।'
                    : 'Ensure these domains are added under Firebase Console -> Authentication -> Authorized Domains.'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { domain: 'ais-dev-x7pbbetn233t66cqdami4k-1023580278903.asia-southeast1.run.app', label: 'Google AI Studio Dev Preview (বর্তমান লাইভ এডিটর)' },
                { domain: 'ais-pre-x7pbbetn233t66cqdami4k-1023580278903.asia-southeast1.run.app', label: 'Google AI Studio Share/Preview (শেয়ার করা প্রিভিউ লিংক)' },
                { domain: 'rmautomob.github.io', label: 'GitHub Pages / Main Production Domain (আপনার মূল ওয়েবসাইট লিংক)' },
                { domain: 'localhost', label: 'Localhost (লোকাল ব্রাউজিং ও ডেভেলপমেন্ট)' },
              ].map((item) => (
                <div
                  key={item.domain}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/70"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{item.domain}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">{item.label}</span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.domain);
                      setCopiedDomain(item.domain);
                      setTimeout(() => setCopiedDomain(''), 2500);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0 ${
                      copiedDomain === item.domain
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {copiedDomain === item.domain ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ডোমেইন কপি</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
              👉 <strong>কোথায় পেস্ট করবেন:</strong> Firebase Console &rarr; <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong> ট্যাবে গিয়ে <strong>Add domain</strong> এ ক্লিক করে ওপরের ডোমেইনগুলো যোগ করে দিন।
            </p>
          </div>

          {/* 3. System Audit Trail Log */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {language === 'bn' ? 'সিস্টেম অডিট লগ ট্রেইল (System Activity Trail)' : 'System Audit Trail'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'bn'
                      ? 'প্রতিটি বিক্রয়, কালেকশন, পারচেজ, ডাটা এন্ট্রি ও সিস্টেম পরিবর্তনের নির্ভুল টাইমস্ট্যাম্প লগ।'
                      : 'Immutable log of all transactions, user operations and profile updates.'}
                  </p>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder={language === 'bn' ? 'লগ খুঁজুন...' : 'Search logs...'}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white w-36 sm:w-44"
                  />
                </div>

                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="all">{language === 'bn' ? 'সকল মডিউল' : 'All Modules'}</option>
                  <option value="Sales">Sales & Invoices</option>
                  <option value="Purchases">Purchases</option>
                  <option value="Customers">Customers & Dues</option>
                  <option value="Suppliers">Suppliers</option>
                  <option value="Accounts">Cash & Bank</option>
                  <option value="SYSTEM">System & Resets</option>
                  <option value="Settings">Settings</option>
                </select>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">সময় ও তারিখ</th>
                    <th className="py-2.5 px-3">ইউজার</th>
                    <th className="py-2.5 px-3">মডিউল</th>
                    <th className="py-2.5 px-3">অ্যাকশন</th>
                    <th className="py-2.5 px-3">বিস্তারিত বিবরণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs
                    .filter((log) => {
                      if (auditFilter !== 'all' && !log.module.toLowerCase().includes(auditFilter.toLowerCase())) {
                        return false;
                      }
                      if (auditSearch.trim()) {
                        const q = auditSearch.toLowerCase();
                        return (
                          log.action.toLowerCase().includes(q) ||
                          log.details.toLowerCase().includes(q) ||
                          log.userName.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-[11px]">
                        <td className="py-2 px-3 font-mono text-slate-500 shrink-0">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {log.userName}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {log.module}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {log.action}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {language === 'bn' ? 'কোনো অডিট লগ রেকর্ড পাওয়া যায়নি।' : 'No audit log records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Business Profile & Invoicing Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 sm:p-6 shadow-xs">
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>{language === 'bn' ? 'দোকানের বিবরণ ও ক্যাশ মেমো লোগো' : 'Shop Profile & Cash Memo Branding'}</span>
                </h2>

                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved!</span>
                  </span>
                )}
              </div>

              {/* Logo Upload Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  {language === 'bn' ? 'দোকানের লোগো (A4 ক্যাশ মেমোতে প্রিন্ট হবে)' : 'Shop Logo (Printed on A4 Invoices)'}
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview Container */}
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-[10px]">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'লোগো আপলোড করুন' : 'Upload Logo Image'}</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/svg+xml"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => handleChange('logoUrl', '')}
                          className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Supports PNG, JPG, WebP. Recommended: Square or transparent logo (under 2MB).
                    </p>
                  </div>
                </div>
              </div>

              {/* Owner Signature Upload Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                    {language === 'bn' ? 'স্বত্বাধিকারীর স্বাক্ষর (Owner Signature on Cash Memo)' : 'Owner Signature (Printed on Cash Memo / Invoices)'}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={formData.showSignatureOnInvoice !== false}
                      onChange={(e) => handleChange('showSignatureOnInvoice', e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span>{language === 'bn' ? 'মেমোতে স্বাক্ষর প্রদর্শন করুন' : 'Show signature on memo'}</span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Signature Preview Container */}
                  <div className="w-40 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {formData.signatureUrl ? (
                      <img
                        src={formData.signatureUrl}
                        alt="Signature"
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <span className="text-[10px]">{language === 'bn' ? 'স্বাক্ষর নেই' : 'No Signature'}</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'স্বাক্ষরের ছবি আপলোড' : 'Upload Signature'}</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleSignatureUpload}
                          className="hidden"
                        />
                      </label>

                      {formData.signatureUrl && (
                        <button
                          type="button"
                          onClick={() => handleChange('signatureUrl', '')}
                          className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{language === 'bn' ? 'সাদা কাগজে সাইন করে ছবি তুলে আপলোড করুন (পিএনজি/জেপিজি)।' : 'Upload photo/scan of physical signature (PNG or JPG).'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 text-[11px]">
                      {language === 'bn' ? 'স্বাক্ষরের নিচে পদবি/লেবেল' : 'Signature Title / Label'}
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceSignatureLabel || 'স্বত্বাধিকারী / Authorized Signature'}
                      onChange={(e) => handleChange('invoiceSignatureLabel', e.target.value)}
                      placeholder="e.g. Authorized Signature (স্বত্বাধিকারীর স্বাক্ষর)"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Shop info inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Business / Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Owner / Signatory Name
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName || ''}
                    onChange={(e) => handleChange('ownerName', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Shop Address (Printed on Invoices)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Primary Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={formData.whatsappNumber}
                    onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    BIN / VAT Registration #
                  </label>
                  <input
                    type="text"
                    value={formData.binVat || ''}
                    onChange={(e) => handleChange('binVat', e.target.value)}
                    placeholder="e.g. 002134567-0101"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Trade License #
                  </label>
                  <input
                    type="text"
                    value={formData.tradeLicense || ''}
                    onChange={(e) => handleChange('tradeLicense', e.target.value)}
                    placeholder="e.g. TRAD/DNCC/01299"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Terms / Warranty Note on A4 Cash Memo
                </label>
                <textarea
                  rows={2}
                  value={formData.invoiceNotes || ''}
                  onChange={(e) => handleChange('invoiceNotes', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-sm active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: User Management & Database Reset (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Management Section */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>{language === 'bn' ? 'ইউজার ম্যানেজমেন্ট ও রোল' : 'User Management & Roles'}</span>
              </h3>

              <button
                type="button"
                onClick={handleOpenAddUser}
                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'নতুন ইউজার' : 'Add User'}</span>
              </button>
            </div>

            {/* Current Active Session Switcher */}
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Active Session User (Current Login):
              </label>
              <select
                value={currentUser?.id || ''}
                onChange={(e) => {
                  const u = users.find((usr) => usr.id === e.target.value);
                  if (u) setCurrentUser(u);
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role.toUpperCase()} {u.id === currentUser?.id ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* List of all registered users */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-52 overflow-y-auto pr-1">
              {users.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {u.name}
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase">
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      {u.username && <span>User: {u.username}</span>}
                      {u.phone && <span>Phone: {u.phone}</span>}
                      {u.email && <span>Email: {u.email}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditUser(u)}
                      className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700"
                      title="Edit User & Permissions"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {users.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Security & Demo Mode Control (Super Admin Requirement) */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {language === 'bn' ? 'লগইন ও ডেমো মোড নিয়ন্ত্রণ' : 'Login & Demo Mode Security'}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  formData.enableDemoMode !== false
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {formData.enableDemoMode !== false
                  ? language === 'bn'
                    ? 'ডেমো অন (Active)'
                    : 'Demo Active'
                  : language === 'bn'
                  ? 'ডেমো অফ (Hidden)'
                  : 'Demo Disabled'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <div className="space-y-0.5 pr-4">
                <div className="font-bold text-slate-900 dark:text-white">
                  {language === 'bn' ? 'লগইন স্ক্রিনে কুইক ডেমো অ্যাকাউন্ট বাটন' : 'Quick Demo Buttons on Login Screen'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'bn'
                    ? 'বন্ধ রাখলে লগইন পেজে কোনো ১-ক্লিক ডেমো ইউজার বাটন দেখা যাবে না। শুধুমাত্র সঠিক ইউজারনেম/মোবাইল ও পাসওয়ার্ড জানা ব্যক্তিই সিস্টেমে প্রবেশ করতে পারবেন।'
                    : 'When turned OFF, 1-click demo accounts are completely hidden from login screen to prevent unauthorized access.'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={formData.enableDemoMode !== false}
                  onChange={(e) => {
                    const val = e.target.checked;
                    handleChange('enableDemoMode', val);
                    updateBusinessProfile({ enableDemoMode: val });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Firebase Cloud Firestore Real-time Sync Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {language === 'bn' ? 'ফায়ারবেস ক্লাউড ডাটাবেজ (Firebase Firestore)' : 'Firebase Cloud Firestore'}
                </h3>
              </div>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  cloudSyncStatus.isConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    cloudSyncStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                ></span>
                <span>{cloudSyncStatus.isConnected ? 'Live Connected' : 'Checking Connection'}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Project ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">rm-automobile</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">অথেন্টিকেশন স্ট্যাটাস:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {cloudSyncStatus.isAuthenticated ? 'অনুমোদিত (Anonymous Auth Active)' : 'সংযুক্ত হচ্ছে...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">লাইভ ডোমেইন সিঙ্ক:</span>
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[190px]">
                  rmautomob.github.io/soft
                </span>
              </div>
              {cloudSyncStatus.lastSynced && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">সর্বশেষ সিঙ্ক:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                    {cloudSyncStatus.lastSynced}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                {language === 'bn'
                  ? 'প্রতিটি বিক্রয়, মেমো, কাস্টমার বকেয়া বা কালেকশন সরাসরি ফায়ারবেস ক্লাউডে তাৎক্ষণিক সেভ হয় এবং সব ডিভাইসে সাথে সাথে আপডেট হয়।'
                  : 'All sales, customer dues, and receipts write directly to Firestore and sync across all devices in real-time.'}
              </p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-[11px] font-bold border transition-all ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                }`}
              >
                {testResult.message}
              </div>
            )}

            {cloudSyncMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-center">
                {cloudSyncMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestFirebase}
                disabled={isCloudSyncing}
                className="py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 text-[11px]"
              >
                <RefreshCw className={`w-3 h-3 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>সংযোগ পরীক্ষা করুন</span>
              </button>

              <button
                type="button"
                onClick={handleForceCloudSync}
                disabled={isCloudSyncing}
                className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 text-[11px]"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>
                  {isCloudSyncing
                    ? language === 'bn'
                      ? 'সিঙ্ক হচ্ছে...'
                      : 'Syncing...'
                    : language === 'bn'
                    ? 'সকল ডাটা সিঙ্ক'
                    : 'Sync All to Cloud'}
                </span>
              </button>
            </div>

            {/* Rules Button & Quick Instructions */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="w-full py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-bold flex items-center justify-center gap-2 text-[11px] shadow-xs"
              >
                <Code2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>ফায়ারবেস সিকিউরিটি রুলস কোড দেখুন ও কপি করুন (Rules Setup)</span>
              </button>
            </div>
          </div>

          {/* Database Backup & Reset Operations */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-xs text-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-500" />
              <span>{language === 'bn' ? 'ব্যাকআপ ও সিস্টেম রিসেট' : 'Database Backup & System Reset'}</span>
            </h3>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={exportFullBackup}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4 text-blue-500" />
                <span>Export Full Backup (.json)</span>
              </button>

              <label className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Restore Backup (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Database Reset Action Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <button
                type="button"
                onClick={() => setConfirmCleanReset(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span>{language === 'bn' ? 'সিস্টেম অপারেশনাল ডাটা রিসেট (০ থেকে শুরু)' : 'Reset All Operational Data (Start Fresh from 0)'}</span>
              </button>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-normal">
                {language === 'bn'
                  ? 'আপনার মূল অ্যাকাউন্ট ও প্রতিষ্ঠানের তথ্য অক্ষুণ্ণ রেখে সকল সেল, পারচেজ, কাস্টমার, সাপ্লায়ার, লোন, খরচ এবং ডামি ব্যাংক মুছে শূন্য (০) হবে।'
                  : 'Wipes all sales, purchases, inventory, dues, loans, expenses and dummy banks to 0 while keeping your user accounts and organization profile 100% intact.'}
              </p>
              {resetSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-center text-xs font-semibold animate-in fade-in">
                  ✓ {language === 'bn' ? 'অপারেশনাল ডাটা সফলভাবে রিসেট করা হয়েছে! সকল হিসাব শূন্য (০) থেকে প্রস্তুত।' : 'Operational data reset successful! All records are now clean and zero.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Add / Edit User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>{editingUser ? 'Edit User & Permissions' : 'Create New User / Staff'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Arif Rahman"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="e.g. arif_sales"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => handleRolePreset(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="salesman">Salesman</option>
                    <option value="manager">Manager</option>
                    <option value="accountant">Accountant</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address (Optional / ঐচ্ছিক)
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Permission Checkboxes */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Permissions:
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserPerms.canEditCartPrice}
                    onChange={(e) =>
                      setNewUserPerms((prev) => ({ ...prev, canEditCartPrice: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-amber-500"
                  />
                  <span>Can edit selling price on cart</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserPerms.canViewCost}
                    onChange={(e) =>
                      setNewUserPerms((prev) => ({ ...prev, canViewCost: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-amber-500"
                  />
                  <span>Can view procurement cost prices</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserPerms.canViewProfitAndReports}
                    onChange={(e) =>
                      setNewUserPerms((prev) => ({
                        ...prev,
                        canViewProfitAndReports: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-amber-500"
                  />
                  <span>Can view gross & net profit reports</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserPerms.canManageUsers}
                    onChange={(e) =>
                      setNewUserPerms((prev) => ({ ...prev, canManageUsers: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-amber-500"
                  />
                  <span>Can manage users and system settings</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Clean Reset */}
      {confirmCleanReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-900 w-full max-w-lg p-5 text-xs space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{language === 'bn' ? 'সিস্টেম অপারেশনাল ডাটা রিসেট নিশ্চিতকরণ' : 'Confirm Operational Data Reset'}</span>
            </div>

            <div className="space-y-3 leading-relaxed">
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {language === 'bn'
                  ? 'আপনি কি নিশ্চিতভাবে সমস্ত অপারেশনাল ও লেনদেনের ডাটা মুছে সম্পূর্ণ নতুন (০) থেকে শুরু করতে চান?'
                  : 'Are you sure you want to wipe all transaction records and start completely fresh from zero?'}
              </p>

              {/* Protected Items */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1.5 text-[11px] text-emerald-900 dark:text-emerald-300">
                <div className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <span>✓</span> {language === 'bn' ? 'সম্পূর্ণ অক্ষুণ্ণ ও সুরক্ষিত থাকবে (ডিলিট হবে না):' : 'Protected & Fully Preserved (Will NOT be deleted):'}
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[11px]">
                  <li>{language === 'bn' ? 'আপনার মূল সুপার অ্যাডমিন অ্যাকাউন্ট ও সকল ইউজারের অ্যাকাউন্ট (পাসওয়ার্ড ও রোলসহ)' : 'Your Super Admin and all user accounts (logins, passwords & permissions)'}</li>
                  <li>{language === 'bn' ? 'প্রতিষ্ঠানের নাম, লোগো, স্বত্বাধিকারীর নাম, ফোন, ঠিকানা ও সেটিংস' : 'Business name, proprietor title, logo, phone, address & system settings'}</li>
                  <li>{language === 'bn' ? 'পার্টস ক্যাটাগরি, ব্র্যান্ড, দেশ ও খরচের খাতের তালিকা' : 'Product categories, brands, countries & expense category masters'}</li>
                </ul>
              </div>

              {/* Wiped Items */}
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 space-y-1.5 text-[11px] text-rose-900 dark:text-rose-300">
                <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                  <span>🗑️</span> {language === 'bn' ? 'যা যা মুছে শূন্য (০) হয়ে যাবে:' : 'Records that will be permanently cleared to 0:'}
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[11px]">
                  <li>{language === 'bn' ? 'সকল সেলস ও ইনভয়েস তালিকা (০ হবে)' : 'All sales invoices & order history (0)'}</li>
                  <li>{language === 'bn' ? 'সকল পারচেজ বিল ও চালান (০ হবে)' : 'All purchases & procurement records (0)'}</li>
                  <li>{language === 'bn' ? 'ইনভেন্টরি প্রোডাক্টস তালিকা (০ হবে, নতুন করে যোগ করবেন)' : 'Inventory products list (0 - ready for fresh entry)'}</li>
                  <li>{language === 'bn' ? 'কাস্টমার ও সাপ্লায়ার ডিরেক্টরি এবং বাকি/পাওনা (০ হবে)' : 'Customer & Supplier directories, dues and payables (0)'}</li>
                  <li>{language === 'bn' ? 'লোন ডিরেক্টরি ও লোন রেকর্ড (০ হবে)' : 'Loan parties and borrowing/lending records (0)'}</li>
                  <li>{language === 'bn' ? 'এক্সপেন্স ট্র্যাকার খরচ ও ক্যাশফ্লো জার্নাল (০ হবে)' : 'Expense tracker records & cash flow journal (0)'}</li>
                  <li>{language === 'bn' ? 'ক্যাশ ও ব্যাংকের সমস্ত ডামি অ্যাকাউন্ট মুছে শুধু ১টি শূন্য ব্যালেন্সের ক্যাশ কাউন্টার থাকবে (আপনি আপনার মতো নতুন ব্যাংক যুক্ত করবেন)' : 'All dummy banks wiped; only 1 zero-balance main cash counter remains (add your real banks freely)'}</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmCleanReset(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToCleanFreshData();
                  setConfirmCleanReset(false);
                  setResetSuccessMessage(true);
                  setTimeout(() => setResetSuccessMessage(false), 5000);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, ডাটা মুছে ফ্রেশ শুরু করুন' : 'Yes, Reset All Data to 0'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Security Rules & Step-by-Step Setup Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {language === 'bn' ? 'ফায়ারবেস সিকিউরিটি রুলস ও কনফিগারেশন' : 'Firebase Security Rules & Setup'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Step by step guide */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                  <span>📌</span> {language === 'bn' ? 'ফায়ারবেস কনসোলে যেভাবে রুলস সেট করবেন (মাত্র ১ মিনিট):' : 'How to set rules in Firebase Console (1 minute):'}
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    <strong>Firebase Console</strong> (<a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">console.firebase.google.com</a>) এ লগইন করে <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded font-mono font-bold">rm-automobile</code> প্রজেক্টটি ওপেন করুন।
                  </li>
                  <li>
                    বামপাশের মেন্যু থেকে <strong>Build</strong> &rarr; <strong>Firestore Database</strong> &rarr; উপরে <strong>Rules</strong> ট্যাবে ক্লিক করুন।
                  </li>
                  <li>
                    Rules এডিটর বক্সে আগের যা লেখা আছে সব সিলেক্ট করে মুছে ফেলুন এবং নিচের বক্সে থাকা সম্পূর্ণ কোডটি <strong>কপি করে পেস্ট</strong> করুন।
                  </li>
                  <li>
                    উপরে ডানপাশের নীল রঙের <strong>Publish</strong> বাটনে ক্লিক করুন।
                  </li>
                  <li>
                    বামে <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong> এ গিয়ে <strong>Anonymous</strong> এনাবল (Enable) নিশ্চিত করুন।
                  </li>
                </ol>
              </div>

              {/* Code Box with Copy Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                    firestore.rules (Security Rules Code):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRules}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                      copiedRules
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copiedRules ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>কপি হয়েছে! (Copied)</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>রুলস কোড কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[260px] border border-slate-700 select-all">
                    {firestoreRulesContent}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
              >
                {language === 'bn' ? 'ঠিক আছে / বন্ধ করুন' : 'Done / Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
