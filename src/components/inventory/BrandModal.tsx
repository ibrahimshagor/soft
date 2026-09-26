import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, Tag, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Brand } from '../../types';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBrand?: (brandId: string) => void;
}

export const BrandModal: React.FC<BrandModalProps> = ({ isOpen, onClose, onSelectBrand }) => {
  const { brands, addBrand, updateBrand, deleteBrand, language } = useApp();

  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (b: Brand) => {
    setEditingId(b.id);
    setName(b.name);
    setOrigin(b.origin || '');
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setOrigin('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(language === 'bn' ? 'ব্র্যান্ডের নাম লিখুন।' : 'Please enter brand name.');
      return;
    }

    if (editingId) {
      updateBrand(editingId, {
        name: name.trim(),
        origin: origin.trim() || 'Global',
      });
      handleCancelEdit();
    } else {
      addBrand({
        name: name.trim(),
        origin: origin.trim() || 'Global',
      });
      setName('');
      setOrigin('');
    }
  };

  const handleDelete = (id: string, brandName: string) => {
    if (brands.length <= 1) {
      alert(language === 'bn' ? 'কমপক্ষে একটি ব্র্যান্ড তালিকায় থাকতে হবে।' : 'At least one brand must remain.');
      return;
    }
    if (confirm(language === 'bn' ? `আপনি কি নিশ্চিতভাবে "${brandName}" ব্র্যান্ডটি মুছতে চান?` : `Delete brand "${brandName}"?`)) {
      deleteBrand(id);
      if (editingId === id) handleCancelEdit();
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {language === 'bn' ? 'ম্যানুফ্যাকচারার / ব্র্যান্ড পরিচালনা' : 'Manage Manufacturers & Brands'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'bn' ? 'নতুন ব্র্যান্ড যোগ করুন, এডিট বা অপ্রয়োজনীয় ব্র্যান্ড ডিলিট করুন' : 'Create, edit or delete automobile parts manufacturers'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create / Edit Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/10 space-y-3">
          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>{editingId ? (language === 'bn' ? 'ব্র্যান্ড সম্পাদনা করুন' : 'Edit Brand') : (language === 'bn' ? '+ নতুন ব্র্যান্ড যোগ করুন' : '+ Add New Brand')}</span>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-[11px] text-slate-500 hover:underline"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'ব্র্যান্ডের নাম *' : 'Brand Name *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Denso / Bosch / Toyota Genuine"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'উৎপত্তি / দেশ (Origin)' : 'Origin / Details'}
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Japan / Germany / Thailand"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-[11px] font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{editingId ? (language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Update Brand') : (language === 'bn' ? 'ব্র্যান্ড যুক্ত করুন' : 'Save Brand')}</span>
          </button>
        </form>

        {/* Existing Brands List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {language === 'bn' ? `সকল ব্র্যান্ড (${brands.length} টি)` : `Available Brands (${brands.length})`}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            {brands.map((b) => (
              <div
                key={b.id}
                className="p-2.5 sm:p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => onSelectBrand?.(b.id)}
                >
                  <div className="font-bold text-slate-900 dark:text-white">{b.name}</div>
                  <div className="text-[10px] text-slate-400">{b.origin || 'Global'}</div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(b)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    title="Edit Brand"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id, b.name)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Brand"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
