import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, Globe, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Country } from '../../types';

interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCountry?: (countryId: string) => void;
}

export const CountryModal: React.FC<CountryModalProps> = ({ isOpen, onClose, onSelectCountry }) => {
  const { countries, addCountry, updateCountry, deleteCountry, language } = useApp();

  const [name, setName] = useState('');
  const [flag, setFlag] = useState('🌐');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (c: Country) => {
    setEditingId(c.id);
    setName(c.name);
    setFlag(c.flag || '🌐');
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setFlag('🌐');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(language === 'bn' ? 'দেশের নাম লিখুন।' : 'Please enter country name.');
      return;
    }

    if (editingId) {
      updateCountry(editingId, {
        name: name.trim(),
        flag: flag.trim() || '🌐',
      });
      handleCancelEdit();
    } else {
      addCountry({
        name: name.trim(),
        flag: flag.trim() || '🌐',
      });
      setName('');
      setFlag('🌐');
    }
  };

  const handleDelete = (id: string, countryName: string) => {
    if (countries.length <= 1) {
      alert(language === 'bn' ? 'কমপক্ষে একটি দেশ তালিকায় থাকতে হবে।' : 'At least one country must remain.');
      return;
    }
    if (confirm(language === 'bn' ? `আপনি কি নিশ্চিতভাবে "${countryName}" তালিকা থেকে মুছতে চান?` : `Delete origin country "${countryName}"?`)) {
      deleteCountry(id);
      if (editingId === id) handleCancelEdit();
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {language === 'bn' ? 'কান্ট্রি অফ অরিজিন (Country of Origin) পরিচালনা' : 'Manage Origin Countries'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'bn' ? 'নতুন দেশ যোগ করুন, এডিট করুন বা অপ্রয়োজনীয় দেশ মুছে ফেলুন' : 'Create, edit or delete product origin countries'}
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-blue-50/40 dark:bg-blue-950/10 space-y-3">
          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>{editingId ? (language === 'bn' ? 'দেশ সম্পাদনা করুন' : 'Edit Country') : (language === 'bn' ? '+ নতুন দেশ যোগ করুন' : '+ Add New Origin Country')}</span>
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

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'পতাকা/ইমোজি' : 'Flag / Icon'}
              </label>
              <input
                type="text"
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="🇯🇵"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center font-emoji text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'দেশের নাম *' : 'Country Name *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Japan / Thailand / Korea / Germany"
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
            className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{editingId ? (language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Update Country') : (language === 'bn' ? 'দেশ যুক্ত করুন' : 'Save Country')}</span>
          </button>
        </form>

        {/* Existing Countries List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {language === 'bn' ? `সকল দেশ (${countries.length} টি)` : `Available Countries (${countries.length})`}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            {countries.map((c) => (
              <div
                key={c.id}
                className="p-2.5 sm:p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs"
              >
                <div
                  className="min-w-0 flex-1 flex items-center gap-2 cursor-pointer"
                  onClick={() => onSelectCountry?.(c.id)}
                >
                  <span className="text-base">{c.flag || '🌐'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(c)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    title="Edit Country"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.name)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Country"
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
