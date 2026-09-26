import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Download,
  Filter,
  AlertTriangle,
  SlidersHorizontal,
  Edit,
  Trash2,
  Boxes,
  Car,
  Wrench,
  CheckCircle2,
  Layers,
  Flame,
  Tag,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { formatBDT, exportToCSV } from '../../utils/formatters';
import { ProductFormModal } from './ProductFormModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { CategoryModal } from './CategoryModal';
import { BrandModal } from './BrandModal';
import { CountryModal } from './CountryModal';

export const ProductList: React.FC = () => {
  const {
    products,
    categories,
    brands,
    countries,
    sales,
    deleteProduct,
    currentUser,
    metrics,
    language,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [stockStatus, setStockStatus] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [isTopSellingFilter, setIsTopSellingFilter] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Calculate sales stats per product
  const productSalesMap = useMemo(() => {
    const map = new Map<string, { totalSoldQty: number; totalRevenue: number }>();
    sales.forEach((s) => {
      s.items?.forEach((it) => {
        const existing = map.get(it.productId) || { totalSoldQty: 0, totalRevenue: 0 };
        map.set(it.productId, {
          totalSoldQty: existing.totalSoldQty + (it.quantity || 0),
          totalRevenue: existing.totalRevenue + (it.total || 0),
        });
      });
    });
    return map;
  }, [sales]);

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        (p.rackLocation && p.rackLocation.toLowerCase().includes(q)) ||
        p.vehicleCompatibilities.some(
          (v) =>
            v.brand.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q) ||
            v.yearRange.includes(q)
        );

      const matchCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      const matchBrand = selectedBrand === 'ALL' || p.brandId === selectedBrand;

      let matchStock = true;
      if (stockStatus === 'LOW') {
        matchStock = p.currentStock > 0 && p.currentStock <= p.minStockLevel;
      } else if (stockStatus === 'OUT') {
        matchStock = p.currentStock <= 0;
      }

      return matchSearch && matchCategory && matchBrand && matchStock;
    });

    if (isTopSellingFilter) {
      return list.sort((a, b) => {
        const soldA = productSalesMap.get(a.id)?.totalSoldQty || 0;
        const soldB = productSalesMap.get(b.id)?.totalSoldQty || 0;
        return soldB - soldA;
      });
    }

    return list;
  }, [products, search, selectedCategory, selectedBrand, stockStatus, isTopSellingFilter, productSalesMap]);

  if (!currentUser) return null;

  const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  const handleExportCSV = () => {
    const rows = [
      ['Part Name', 'SKU', 'Category', 'Brand', 'Condition', 'Rack', 'Stock', 'Unit', 'Cost Price', 'Selling Price', 'Wholesale Price'],
      ...filteredProducts.map((p) => {
        const cat = categories.find((c) => c.id === p.categoryId)?.name || '';
        const brd = brands.find((b) => b.id === p.brandId)?.name || '';
        return [
          p.name,
          p.sku,
          cat,
          brd,
          p.condition,
          p.rackLocation || '',
          p.currentStock,
          p.unit,
          currentUser.permissions.canViewCost ? p.purchasePrice : 'Hidden',
          p.defaultSellingPrice,
          p.wholesalePrice || '',
        ];
      }),
    ];
    exportToCSV(`RM_Automobile_Parts_Inventory_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleOpenAdd = () => {
    setProductToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setProductToEdit(product);
    setIsFormOpen(true);
  };

  const handleDelete = (productId: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      deleteProduct(productId);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('inventory')} & Spare Parts Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automobile parts catalog, vehicle compatibility, storage locations, and live stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs"
            title="Manage categories and SKU prefixes"
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'bn' ? 'ক্যাটাগরি পরিচালনা' : 'Categories'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportCsv')}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newProduct')}</span>
          </button>
        </div>
      </div>

      {/* Inventory Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Listed SKUs
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {products.length} Parts
            </span>
          </div>
          <Boxes className="w-5 h-5 text-purple-500 opacity-60" />
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Stock Valuation
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatBDT(metrics.inventoryValuation)}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500">Asset</span>
        </div>

        <button
          type="button"
          onClick={() => setStockStatus(stockStatus === 'LOW' ? 'ALL' : 'LOW')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            stockStatus === 'LOW'
              ? 'bg-amber-50 border-amber-400 dark:bg-amber-950/40 dark:border-amber-700'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Low Stock Alerts
          </span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400">
            {lowStockCount} Items
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStockStatus(stockStatus === 'OUT' ? 'ALL' : 'OUT')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            stockStatus === 'OUT'
              ? 'bg-rose-50 border-rose-400 dark:bg-rose-950/40 dark:border-rose-700'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            Out of Stock
          </span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400">
            {outOfStockCount} Items
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search part name, SKU, barcode, car model, rack..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Brand filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
          >
            <option value="ALL">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Reset button */}
          {(search || selectedCategory !== 'ALL' || selectedBrand !== 'ALL' || stockStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
                setSelectedBrand('ALL');
                setStockStatus('ALL');
              }}
              className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Products List: Mobile Cards (< md) & Desktop Table (>= md) */}
      
      {/* 1. Mobile Cards View (No horizontal scrolling!) */}
      <div className="md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No automobile spare parts found matching the criteria.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const cat = categories.find((c) => c.id === product.categoryId)?.name || 'General';
            const brand = brands.find((b) => b.id === product.brandId)?.name || 'Generic';
            const country = countries.find((cnt) => cnt.id === product.originCountryId);

            const isOutOfStock = product.currentStock <= 0;
            const isLowStock = !isOutOfStock && product.currentStock <= product.minStockLevel;

            return (
              <div
                key={product.id}
                className="bg-white dark:bg-slate-800/95 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-3.5 space-y-3 shadow-xs hover:border-amber-400 transition-all"
              >
                {/* Header: Image, Name, SKU, Condition */}
                <div className="flex items-start gap-3">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <Boxes className="w-6 h-6 opacity-60" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                        {product.name}
                      </h3>
                      {/* Stock Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {isOutOfStock ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>স্টক নেই (0)</span>
                          </>
                        ) : isLowStock ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>কম স্টক ({product.currentStock} {product.unit})</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{product.currentStock} {product.unit}</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 font-mono flex-wrap">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">SKU: {product.sku}</span>
                      {product.productCode && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                          কোড: {product.productCode}
                        </span>
                      )}
                      {product.condition && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            product.condition.toLowerCase() === 'reconditioned'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {product.condition}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid: Brand, Category, Origin, Location */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">ব্র্যান্ড ও উৎস</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {brand} {country?.flag || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">ক্যাটাগরি ও র্যাক</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {cat} {product.rackLocation ? `(${product.rackLocation})` : ''}
                    </span>
                  </div>
                </div>

                {/* Vehicle Compatibility */}
                {product.vehicleCompatibilities.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-slate-400 font-semibold text-[10px]">গাড়ির মডেল:</span>
                    {product.vehicleCompatibilities.map((v, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
                      >
                        {v.brand} {v.model}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price & Action Row */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">বিক্রয় মূল্য</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      {formatBDT(product.defaultSellingPrice)}
                    </div>
                    {currentUser.permissions.canViewCost && (
                      <span className="text-[10px] text-slate-400">
                        কেনা: {formatBDT(product.purchasePrice)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAdjustingProduct(product)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-bold text-xs active:scale-95 transition-all"
                      title="Adjust Stock"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>স্টক সমন্বয়</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(product)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Edit Product"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-500" />
                    </button>

                    {currentUser.role === 'super_admin' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id, product.name)}
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View (>= md screens) */}
      <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5">Part Name & SKU</th>
                <th className="py-3 px-3.5">Brand & Origin</th>
                <th className="py-3 px-3.5">Category & Rack</th>
                <th className="py-3 px-3.5">Vehicle Compatibility</th>
                {currentUser.permissions.canViewCost && (
                  <th className="py-3 px-3.5 text-right">Cost (৳)</th>
                )}
                <th className="py-3 px-3.5 text-right">Selling Price</th>
                <th className="py-3 px-3.5 text-center">Stock Level</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No automobile spare parts found matching the criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const cat = categories.find((c) => c.id === product.categoryId)?.name || 'General';
                  const brand = brands.find((b) => b.id === product.brandId)?.name || 'Generic';
                  const country = countries.find((cnt) => cnt.id === product.originCountryId);

                  const isOutOfStock = product.currentStock <= 0;
                  const isLowStock = !isOutOfStock && product.currentStock <= product.minStockLevel;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Name & SKU */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                              <Boxes className="w-5 h-5 opacity-60" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono flex-wrap">
                              <span>SKU: {product.sku}</span>
                              {product.productCode && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                                  কোড: {product.productCode}
                                </span>
                              )}
                              {product.condition && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  product.condition.toLowerCase() === 'reconditioned'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}>
                                  {product.condition}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Brand & Origin */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {brand}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>{country?.flag || '🌐'}</span>
                          <span>{country?.name || 'Imported'}</span>
                        </div>
                      </td>

                      {/* Category & Rack */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{cat}</div>
                        <div className="text-[10px] text-slate-400">
                          Rack: <span className="font-semibold text-slate-600 dark:text-slate-300">{product.rackLocation || 'Shelf'}</span>
                        </div>
                      </td>

                      {/* Vehicle Compatibilities */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {product.vehicleCompatibilities.length === 0 ? (
                            <span className="text-[10px] text-slate-400">Universal</span>
                          ) : (
                            product.vehicleCompatibilities.slice(0, 2).map((v, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
                              >
                                {v.brand} {v.model}
                              </span>
                            ))
                          )}
                          {product.vehicleCompatibilities.length > 2 && (
                            <span className="text-[10px] text-slate-400">
                              +{product.vehicleCompatibilities.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cost */}
                      {currentUser.permissions.canViewCost && (
                        <td className="py-3 px-3.5 text-right font-semibold text-slate-600 dark:text-slate-400">
                          {formatBDT(product.purchasePrice)}
                        </td>
                      )}

                      {/* Selling Price */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="font-black text-slate-900 dark:text-white">
                          {formatBDT(product.defaultSellingPrice)}
                        </div>
                        {product.wholesalePrice && (
                          <div className="text-[10px] text-slate-400">
                            WS: {formatBDT(product.wholesalePrice)}
                          </div>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-3.5 text-center">
                        <div
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {product.currentStock} {product.unit}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Min: {product.minStockLevel}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setAdjustingProduct(product)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                            title="Adjust Stock"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {currentUser.role === 'super_admin' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(product.id, product.name)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {isFormOpen && (
        <ProductFormModal
          isOpen={isFormOpen}
          productToEdit={productToEdit}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <StockAdjustmentModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
        />
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
        />
      )}
    </div>
  );
};
