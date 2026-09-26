import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Car,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Globe,
  Tag,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, VehicleCompatibility, Category } from '../../types';
import { formatBDT } from '../../utils/formatters';
import { compressAndResizeImage, formatFileSize } from '../../utils/imageCompressor';
import { CategoryModal } from './CategoryModal';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit?: Product | null;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  productToEdit,
  onClose,
}) => {
  const {
    products,
    categories,
    brands,
    countries,
    addProduct,
    updateProduct,
    currentUser,
    language,
    t,
  } = useApp();

  const [name, setName] = useState(productToEdit?.name || '');
  const [productCode, setProductCode] = useState(productToEdit?.productCode || '');
  const [sku, setSku] = useState(productToEdit?.sku || '');
  const [barcode, setBarcode] = useState(productToEdit?.barcode || '');
  const [categoryId, setCategoryId] = useState(productToEdit?.categoryId || categories[0]?.id || '');
  const [subcategory, setSubcategory] = useState(productToEdit?.subcategory || '');
  const [brandId, setBrandId] = useState(productToEdit?.brandId || brands[0]?.id || '');
  const [originCountryId, setOriginCountryId] = useState(
    productToEdit?.originCountryId || countries[0]?.id || ''
  );
  const [condition, setCondition] = useState(productToEdit?.condition || 'New');
  const [rackLocation, setRackLocation] = useState(productToEdit?.rackLocation || '');
  const [unit, setUnit] = useState(productToEdit?.unit || 'Pcs');
  const [image, setImage] = useState(productToEdit?.image || '');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionNotice, setCompressionNotice] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Helper to generate a unique SKU based on selected category prefix
  const generateSkuForCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    const prefix = cat?.skuPrefix || cat?.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'PRD';
    let candidate = '';
    let attempts = 0;
    do {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      candidate = `${prefix}-${randomNum}`;
      attempts++;
    } while (products.some((p) => p.sku === candidate) && attempts < 25);
    return candidate;
  };

  // Auto-generate SKU upon opening for a new product if empty
  useEffect(() => {
    if (!productToEdit && !sku && categoryId) {
      setSku(generateSkuForCategory(categoryId));
    }
  }, [productToEdit, categoryId]);

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    if (!productToEdit) {
      setSku(generateSkuForCategory(newCatId));
    }
  };

  // Pricing & Stock
  const [purchasePrice, setPurchasePrice] = useState<number>(productToEdit?.purchasePrice || 0);
  const [defaultSellingPrice, setDefaultSellingPrice] = useState<number>(
    productToEdit?.defaultSellingPrice || 0
  );
  const [wholesalePrice, setWholesalePrice] = useState<number>(
    productToEdit?.wholesalePrice || 0
  );
  const [minAuthorizedPrice, setMinAuthorizedPrice] = useState<number>(
    productToEdit?.minAuthorizedPrice || 0
  );
  const [currentStock, setCurrentStock] = useState<number>(productToEdit?.currentStock || 0);
  const [minStockLevel, setMinStockLevel] = useState<number>(productToEdit?.minStockLevel || 5);
  const [reorderLevel, setReorderLevel] = useState<number>(productToEdit?.reorderLevel || 10);

  // Warranty & Details
  const [warranty, setWarranty] = useState(productToEdit?.warranty || '');
  const [description, setDescription] = useState(productToEdit?.description || '');
  const [notes, setNotes] = useState(productToEdit?.notes || '');

  // Vehicle Compatibilities array
  const [compatibilities, setCompatibilities] = useState<VehicleCompatibility[]>(
    productToEdit?.vehicleCompatibilities && productToEdit.vehicleCompatibilities.length > 0
      ? productToEdit.vehicleCompatibilities
      : [{ brand: 'Toyota', model: '', yearRange: '' }]
  );

  const [errorMsg, setErrorMsg] = useState('');

  const handleAddCompatibility = () => {
    setCompatibilities((prev) => [...prev, { brand: 'Toyota', model: '', yearRange: '' }]);
  };

  const handleUpdateCompatibility = (
    index: number,
    field: keyof VehicleCompatibility,
    value: string
  ) => {
    setCompatibilities((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveCompatibility = (index: number) => {
    if (compatibilities.length <= 1) return;
    setCompatibilities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    if (!sku.trim()) {
      setErrorMsg('SKU / Product code is required.');
      return;
    }

    const cleanedCompatibilities = compatibilities.filter(
      (c) => c.brand.trim() || c.model.trim()
    );

    try {
      if (productToEdit) {
        updateProduct(productToEdit.id, {
          name: name.trim(),
          sku: sku.trim(),
          productCode: productCode.trim() || undefined,
          barcode: barcode.trim() || sku.trim(),
          categoryId,
          subcategory: subcategory.trim() || undefined,
          brandId,
          originCountryId,
          condition,
          rackLocation: rackLocation.trim(),
          unit,
          purchasePrice,
          defaultSellingPrice,
          wholesalePrice,
          minAuthorizedPrice,
          currentStock,
          minStockLevel,
          reorderLevel,
          warranty: warranty.trim() || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          image: image.trim() || undefined,
          vehicleCompatibilities: cleanedCompatibilities,
        });
      } else {
        addProduct({
          name: name.trim(),
          sku: sku.trim(),
          productCode: productCode.trim() || undefined,
          barcode: barcode.trim() || sku.trim(),
          categoryId,
          subcategory: subcategory.trim() || undefined,
          brandId,
          originCountryId,
          condition,
          rackLocation: rackLocation.trim(),
          unit,
          purchasePrice,
          defaultSellingPrice,
          wholesalePrice,
          minAuthorizedPrice,
          currentStock,
          minStockLevel,
          reorderLevel,
          warranty: warranty.trim() || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          image: image.trim() || undefined,
          vehicleCompatibilities: cleanedCompatibilities,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save product.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {productToEdit ? 'Edit Automobile Part Profile' : 'Add New Automobile Part to Inventory'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Categorization, vehicle compatibility, storage rack, and multi-tier pricing
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Part Information */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-500" />
              <span>Basic Identification & Classification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'অটোমোবাইল পার্টসের নাম *' : 'Automobile Part Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Front Ceramic Brake Pad Set (Premio / Allion)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'প্রোডাক্ট / পার্টস কোড (Part Code)' : 'Product / Part Code'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 04465-42160, 13011-21040"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-blue-600 dark:text-blue-400"
                />
                <span className="text-[10px] text-slate-400">নির্দিষ্ট পার্ট নম্বর বা ক্যাটালগ কোড</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'bn' ? 'ক্যাটাগরি *' : 'Category *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                  >
                    + {language === 'bn' ? 'নতুন ক্যাটাগরি' : 'Add Category'}
                  </button>
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.skuPrefix ? `[${c.skuPrefix}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'সাব-ক্যাটাগরি' : 'Subcategory'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Brake Pads"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'bn' ? 'স্বয়ংক্রিয় SKU কোড *' : 'SKU Code *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSku(generateSkuForCategory(categoryId))}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
                    title="ক্যাটাগরি প্রিফিক্স অনুযায়ী নতুন ইউনিক SKU তৈরি করুন"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>{language === 'bn' ? 'অটো কোড' : 'Auto Generate'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. BRK-4921"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Manufacturer / Brand *
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.origin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Country of Origin *
                </label>
                <select
                  value={originCountryId}
                  onChange={(e) => setOriginCountryId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {countries.map((cnt) => (
                    <option key={cnt.id} value={cnt.id}>
                      {cnt.flag} {cnt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Part Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="New">Brand New (নতুন)</option>
                  <option value="Reconditioned">Reconditioned (রিকন্ডিশন্ড)</option>
                  <option value="Used">Used / Second Hand (ব্যবহৃত)</option>
                  <option value="Refurbished">Refurbished</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Rack / Shelf Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. A-02-3 / Rack 4"
                  value={rackLocation}
                  onChange={(e) => setRackLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Stock Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Pcs">Pieces (Pcs)</option>
                  <option value="Set">Set</option>
                  <option value="Box">Box</option>
                  <option value="Bottle">Bottle (Can)</option>
                  <option value="Litre">Litre</option>
                  <option value="Pair">Pair</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Barcode (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Scan or enter barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Vehicle Compatibilities (Multi-brand/model/years) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-amber-500" />
                <span>Vehicle Compatibility (গাড়ির মডেল সামঞ্জস্যতা)</span>
              </h3>
              <button
                type="button"
                onClick={handleAddCompatibility}
                className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Vehicle</span>
              </button>
            </div>

            <div className="space-y-2">
              {compatibilities.map((comp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <div className="w-1/3">
                    <input
                      type="text"
                      placeholder="Brand (e.g. Toyota, Honda, Yamaha)"
                      value={comp.brand}
                      onChange={(e) => handleUpdateCompatibility(idx, 'brand', e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>

                  <div className="w-1/2">
                    <input
                      type="text"
                      placeholder="Model / Chassis (e.g. Premio NZT260, Civic FC 1.5T)"
                      value={comp.model}
                      onChange={(e) => handleUpdateCompatibility(idx, 'model', e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="w-1/4">
                    <input
                      type="text"
                      placeholder="Year (e.g. 2015-2022, All)"
                      value={comp.yearRange}
                      onChange={(e) => handleUpdateCompatibility(idx, 'yearRange', e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  {compatibilities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCompatibility(idx)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Pricing & Costing */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              Pricing & Costing Strategy (Bangladeshi Taka ৳)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Cost Price only editable or visible if authorized */}
              {currentUser?.permissions?.canViewCost && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Purchase Cost Price (৳) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Selling Price (৳) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={defaultSellingPrice}
                  onChange={(e) => setDefaultSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Wholesale Price (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Min Authorized Price (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAuthorizedPrice}
                  onChange={(e) => setMinAuthorizedPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Stock Levels & Alerts */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              Inventory Quantities & Low Stock Alerts
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Min Stock Alert Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Reorder Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Warranty & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Warranty Terms
              </label>
              <input
                type="text"
                placeholder="e.g. 6 Months / 10,000 KM"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description / Specifications
              </label>
              <input
                type="text"
                placeholder="e.g. Japanese OEM specification, high endurance ceramic formulation"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section: Product Image (Optional) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                  পণ্যের ছবি / Product Photo (ঐচ্ছিক / Optional)
                </h3>
              </div>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ছবি মুছুন (Remove)</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Preview Thumbnail */}
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                    <ImageIcon className="w-7 h-7 mb-1 opacity-50" />
                    <span className="text-[10px]">ছবি নেই</span>
                  </div>
                )}
              </div>

              {/* File upload and URL input */}
              <div className="flex-1 w-full space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ডিভাইস থেকে ছবি আপলোড করুন (স্বয়ংক্রিয় সাইজ ও সাইজ অপ্টিমাইজড):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isCompressing}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setIsCompressing(true);
                          setCompressionNotice('ছবি সাইজ কনভার্ট ও কম্প্রেস হচ্ছে...');
                          const result = await compressAndResizeImage(file, {
                            maxWidth: 800,
                            maxHeight: 800,
                            quality: 0.78,
                          });
                          setImage(result.dataUrl);
                          setCompressionNotice(
                            `ছবি সফলভাবে নির্দিষ্ট সাইজে কনভার্ট করা হয়েছে! (${formatFileSize(result.originalSize)} ➔ ${formatFileSize(result.compressedSize)})`
                          );
                        } catch (err) {
                          console.error('Image compression error:', err);
                          setCompressionNotice('ছবি প্রসেসিংয়ে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন।');
                        } finally {
                          setIsCompressing(false);
                        }
                      }
                    }}
                    className="text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 dark:file:bg-purple-950 dark:file:text-purple-300 hover:file:bg-purple-200 cursor-pointer w-full"
                  />
                  {compressionNotice && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      ✓ {compressionNotice}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    অথবা ছবির অনলাইন লিংক দিন (Image URL):
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/part-photo.jpg"
                    value={image.startsWith('data:') ? '' : image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-sm active:scale-95 transition-all"
            >
              {productToEdit ? 'Save Changes' : 'Add to Inventory'}
            </button>
          </div>
        </form>

        {/* Category Management Modal */}
        {isCategoryModalOpen && (
          <CategoryModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            onCategoryCreated={(newCat) => {
              handleCategoryChange(newCat.id);
            }}
          />
        )}
      </div>
    </div>
  );
};
