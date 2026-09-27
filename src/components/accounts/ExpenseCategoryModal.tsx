import React, { useState } from 'react';
import { X, Tags, Plus, Edit2, Trash2, Check, AlertCircle, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory } from '../../types';

interface ExpenseCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseCategoryModal: React.FC<ExpenseCategoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    expenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    expenses,
    language,
  } = useApp();

  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    // Check duplicate
    const exists = expenseCategories.some(
      (c) => c.name.toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (exists) {
      setErrorMsg(language === 'bn' ? 'এই নামের ক্যাটাগরি ইতিমধ্যে বিদ্যমান।' : 'Category with this name already exists.');
      return;
    }

    addExpenseCategory({
      name: newCatName.trim(),
      nameBn: newCatName.trim(),
    });
    setNewCatName('');
    setErrorMsg('');
  };

  const handleStartEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setErrorMsg('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;

    // Check duplicate with others
    const exists = expenseCategories.some(
      (c) => c.id !== id && c.name.toLowerCase() === editingName.trim().toLowerCase()
    );
    if (exists) {
      setErrorMsg(language === 'bn' ? 'এই নামের ক্যাটাগরি ইতিমধ্যে বিদ্যমান।' : 'Category with this name already exists.');
      return;
    }

    updateExpenseCategory(id, {
      name: editingName.trim(),
      nameBn: editingName.trim(),
    });
    setEditingId(null);
    setEditingName('');
    setErrorMsg('');
  };

  const handleDelete = (cat: ExpenseCategory) => {
    if (expenseCategories.length <= 1) {
      setErrorMsg(
        language === 'bn'
          ? 'কমপক্ষে একটি খরচের ক্যাটাগরি থাকতে হবে।'
          : 'At least one expense category must remain.'
      );
      return;
    }

    const count = expenses.filter((e) => e.categoryId === cat.id).length;
    const confirmMsg = language === 'bn'
      ? `আপনি কি নিশ্চিতভাবে "${cat.name}" ক্যাটাগরিটি মুছে ফেলতে চান?${count > 0 ? ` (এই ক্যাটাগরিতে ${count}টি খরচ রয়েছে)` : ''}`
      : `Are you sure you want to delete category "${cat.name}"?${count > 0 ? ` (${count} expenses linked)` : ''}`;

    if (window.confirm(confirmMsg)) {
      deleteExpenseCategory(cat.id);
      setErrorMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-extrabold text-base">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-white font-black text-sm sm:text-base">
                {language === 'bn' ? 'খরচের ক্যাটাগরি ব্যবস্থাপনা' : 'Manage Expense Categories'}
              </h2>
              <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {language === 'bn' ? 'ক্যাটাগরি তৈরি, নাম পরিবর্তন ও ডিলিট করুন' : 'Add, rename or delete expense categories'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Add New Category Form */}
          <form onSubmit={handleAddCategory} className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              {language === 'bn' ? '+ নতুন ক্যাটাগরি যুক্ত করুন' : '+ Add New Category'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder={language === 'bn' ? 'যেমন: নাস্তা ও আপ্যায়ন, দোকান ভাড়া, বিদ্যুৎ বিল...' : 'e.g. Refreshments, Shop Rent, Utility Bills'}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'যোগ করুন' : 'Add'}</span>
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                {language === 'bn' ? `বিদ্যমান ক্যাটাগরি তালিকা (${expenseCategories.length})` : `Existing Categories (${expenseCategories.length})`}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
              {expenseCategories.map((cat) => {
                const count = expenses.filter((e) => e.categoryId === cat.id).length;
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(cat.id);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                          title={language === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title={language === 'bn' ? 'বাতিল' : 'Cancel'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {cat.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            {count} {language === 'bn' ? 'টি খরচ' : 'expenses'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title={language === 'bn' ? 'ক্যাটাগরি নাম এডিট করুন' : 'Edit category name'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title={language === 'bn' ? 'ক্যাটাগরি মুছে ফেলুন' : 'Delete category'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            {language === 'bn' ? 'সম্পন্ন / বন্ধ করুন' : 'Done / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
