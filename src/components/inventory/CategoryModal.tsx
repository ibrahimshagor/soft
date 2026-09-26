import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Hash,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (newCategory: Category) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onCategoryCreated,
}) => {
  const { categories, addCategory, updateCategory, deleteCategory, products, language } = useApp();

  const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [skuPrefix, setSkuPrefix] = useState('');
  const [subcategoriesStr, setSubcategoriesStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setNameBn('');
    setSkuPrefix('');
    setSubcategoriesStr('');
    setErrorMsg('');
    setIsAddingOrEditing(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setNameBn(cat.nameBn || '');
    setSkuPrefix(cat.skuPrefix || cat.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase());
    setSubcategoriesStr((cat.subcategories || []).join(', '));
    setErrorMsg('');
    setIsAddingOrEditing(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    // If prefix hasn't been manually set, derive 3-letter uppercase prefix
    if (!editingId && (!skuPrefix || skuPrefix.length <= 3)) {
      const derived = val.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
      if (derived) {
        setSkuPrefix(derived);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(language === 'bn' ? 'ক্যাটাগরির নাম আবশ্যক।' : 'Category name is required.');
      return;
    }

    const cleanPrefix = (
      skuPrefix.trim() || name.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'GEN'
    ).toUpperCase();

    const subcats = subcategoriesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingId) {
      updateCategory(editingId, {
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        skuPrefix: cleanPrefix,
        subcategories: subcats,
      });
      setIsAddingOrEditing(false);
      setEditingId(null);
    } else {
      const newCategoryData = {
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        skuPrefix: cleanPrefix,
        subcategories: subcats,
      };
      addCategory(newCategoryData);
      setIsAddingOrEditing(false);
      if (onCategoryCreated) {
        // Find newly added category in next tick or pass constructed
        const tempCat: Category = {
          ...newCategoryData,
          id: 'cat-' + Date.now(),
        };
        onCategoryCreated(tempCat);
      }
    }
  };

  const handleDelete = (catId: string, catName: string) => {
    const productsInCat = products.filter((p) => p.categoryId === catId).length;
    if (productsInCat > 0) {
      alert(
        language === 'bn'
          ? `এই ক্যাটাগরিতে ${productsInCat}টি প্রোডাক্ট রয়েছে। তাই এটি ডিলিট করা যাবে না।`
          : `Cannot delete: ${productsInCat} products belong to this category.`
      );
      return;
    }
    if (
      window.confirm(
        language === 'bn'
          ? `আপনি কি নিশ্চিত যে "${catName}" ক্যাটাগরি ডিলিট করতে চান?`
          : `Delete category "${catName}"?`
      )
    ) {
      deleteCategory(catId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {language === 'bn' ? 'প্রোডাক্ট ক্যাটাগরি ও অটো SKU প্রিফিক্স' : 'Product Categories & Auto SKU'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {language === 'bn'
                  ? 'ক্যাটাগরি তৈরি করুন এবং প্রতিটি ক্যাটাগরির জন্য নির্দিষ্ট SKU প্রিফিক্স কোড দিন'
                  : 'Manage categories and define custom 3-letter SKU prefixes for auto-generation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {language === 'bn' ? `মোট ক্যাটাগরি: ${categories.length}` : `Total Categories: ${categories.length}`}
            </span>
            {!isAddingOrEditing && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'নতুন ক্যাটাগরি যোগ করুন' : 'Add Category'}</span>
              </button>
            )}
          </div>

          {/* Inline Add / Edit Form */}
          {isAddingOrEditing && (
            <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {editingId
                    ? language === 'bn' ? 'ক্যাটাগরি এডিট করুন' : 'Edit Category'
                    : language === 'bn' ? 'নতুন ক্যাটাগরি তৈরি করুন' : 'Create New Category'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingOrEditing(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ক্যাটাগরির নাম (English) *' : 'Category Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Engine Parts, Brake Discs, Sensors"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ক্যাটাগরির নাম (বাংলা)' : 'Category Name (Bengali)'}
                  </label>
                  <input
                    type="text"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    placeholder="যেমন: ইঞ্জিন পার্টস, ব্রেক ডিস্ক"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* SKU Prefix Field - Core Requirement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      {language === 'bn' ? 'ডিফল্ট SKU প্রিফিক্স কোড *' : 'Default SKU Prefix *'}
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                      {skuPrefix ? `${skuPrefix}-XXXX` : 'PREFIX-XXXX'}
                    </span>
                  </div>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={skuPrefix}
                      onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())}
                      placeholder="ENG, BRK, SUS, ELE"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold uppercase tracking-wider text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'bn'
                      ? 'এই ক্যাটাগরি সিলেক্ট করলে স্বয়ংক্রিয়ভাবে SKU তৈরি হবে (যেমন: ENG-2918)'
                      : 'Selecting this category will auto-generate SKUs with this prefix'}
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'সাব-ক্যাটাগরি (কমা দিয়ে লিখুন)' : 'Subcategories (comma separated)'}
                  </label>
                  <input
                    type="text"
                    value={subcategoriesStr}
                    onChange={(e) => setSubcategoriesStr(e.target.value)}
                    placeholder="Piston, Ring, Valve, Gasket"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'bn' ? 'ঐচ্ছিক সাব-ক্যাটাগরি তালিকা' : 'Optional subcategory tag hints'}
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingOrEditing(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs"
                >
                  {editingId
                    ? language === 'bn' ? 'পরিবর্তন সেভ করুন' : 'Update Category'
                    : language === 'bn' ? 'ক্যাটাগরি সংরক্ষণ করুন' : 'Save Category'}
                </button>
              </div>
            </form>
          )}

          {/* Categories List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            {categories.map((cat) => {
              const productCount = products.filter((p) => p.categoryId === cat.id).length;
              const prefix = cat.skuPrefix || cat.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

              return (
                <div
                  key={cat.id}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-12 text-center py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-black text-[11px] uppercase shrink-0">
                      {prefix}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{cat.name}</span>
                        {cat.nameBn && cat.nameBn !== cat.name && (
                          <span className="text-[11px] text-slate-500 font-normal">({cat.nameBn})</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{productCount} products</span>
                        {cat.subcategories && cat.subcategories.length > 0 && (
                          <span>• {cat.subcategories.length} subcategories</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      title="Edit Category & Prefix"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
          >
            {language === 'bn' ? 'সম্পন্ন (Done)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
