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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BusinessProfile, User } from '../../types';
import { compressAndResizeImage } from '../../utils/imageCompressor';
import { PaymentMethodsManager } from './PaymentMethodsManager';

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
  const [settingsTab, setSettingsTab] = useState<'profile' | 'payment_methods'>('profile');

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
  const [confirmDemoReset, setConfirmDemoReset] = useState(false);

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
      </div>

      {settingsTab === 'payment_methods' ? (
        <PaymentMethodsManager />
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
              {/* Fresh Slate Reset */}
              <button
                type="button"
                onClick={() => setConfirmCleanReset(true)}
                className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                <span>{language === 'bn' ? 'সম্পূর্ণ ফ্রেশ ডাটাবেজ তৈরি করুন (Fresh Start)' : 'Clean Slate Reset (Live Start)'}</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                Wipes demo sales, purchases, dues and payments for real business start.
              </p>

              {/* Seed Demo Reset */}
              <button
                type="button"
                onClick={() => setConfirmDemoReset(true)}
                className="w-full py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 text-[11px] underline block text-center"
              >
                {language === 'bn' ? 'ডেমো ডাটাবেজ রিস্টোর করুন' : 'Restore Demo Automobile Records'}
              </button>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-900 w-full max-w-sm p-5 text-xs space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Clean Slate Reset</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              This will clear all demo sales invoices, purchase records, dues, and payment transactions. Product inventory categories will remain intact. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCleanReset(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToCleanFreshData();
                  setConfirmCleanReset(false);
                  alert('Database reset to fresh live state.');
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Yes, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Demo Reset */}
      {confirmDemoReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-900 w-full max-w-sm p-5 text-xs space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Restore Demo Automobile Records</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              This will restore the sample automobile showroom data (RM Automobiles demo products, sales, customers, suppliers).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDemoReset(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToSeedData();
                  setConfirmDemoReset(false);
                  alert('Demo automobile database restored.');
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs"
              >
                Restore Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
