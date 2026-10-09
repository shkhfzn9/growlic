'use client';

import React, { useState } from 'react';
import { X, Sparkles, Upload, Trash2, Plus, CheckCircle2, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { parseMenuImageAction, bulkCreateMenuItemsAction } from '@/actions/menu';

export interface ScannedItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

interface AiMenuScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  businessCategory: string;
  itemNoun: string;
  catalogTitle: string;
}

export default function AiMenuScanModal({
  isOpen,
  onClose,
  onSuccess,
  businessCategory,
  itemNoun,
  catalogTitle,
}: AiMenuScanModalProps) {
  const [stage, setStage] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const defaultImageForCategory = businessCategory === 'salon' ? '/saloon_placeholder2.jpg' : '/dish_placeholder.jpg';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG or PNG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image size exceeds 8MB limit.');
      return;
    }

    setError('');
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartScan = async () => {
    if (!imagePreview || !selectedFile) return;

    setLoading(true);
    setError('');
    setStage('scanning');

    try {
      const mimeType = selectedFile.type || 'image/jpeg';
      const res = await parseMenuImageAction(imagePreview, mimeType, businessCategory);

      if (res.success && res.items) {
        const formatted: ScannedItem[] = res.items.map((item: any, idx: number) => ({
          id: `scan_${Date.now()}_${idx}`,
          name: item.name || '',
          description: item.description || '',
          price: item.price || 0,
          category: item.category || (businessCategory === 'salon' ? 'General Treatments' : 'General Catalog'),
          image: defaultImageForCategory,
        }));

        setScannedItems(formatted);
        setStage('review');
      } else {
        throw new Error('No items could be extracted from this image.');
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to parse image. Please try a clearer menu photo.';
      setError(msg);
      setStage('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (id: string, field: keyof ScannedItem, value: any) => {
    setScannedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === 'price' ? Math.max(0, Number(value) || 0) : value,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddBlankItem = () => {
    const newItem: ScannedItem = {
      id: `manual_${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      category: scannedItems[0]?.category || (businessCategory === 'salon' ? 'Hair Treatments' : 'General Menu'),
      image: defaultImageForCategory,
    };
    setScannedItems((prev) => [...prev, newItem]);
  };

  const handleSaveAll = async () => {
    if (scannedItems.length === 0) {
      setError('Please add at least one item to save.');
      return;
    }

    const invalidItem = scannedItems.find((item) => !item.name.trim() || !item.category.trim() || item.price <= 0);
    if (invalidItem) {
      setError(`Please provide a valid name, category, and price (> 0) for all items.`);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = scannedItems.map((item) => ({
        name: item.name.trim(),
        description: item.description.trim(),
        price: Number(item.price),
        category: item.category.trim(),
        image: item.image || defaultImageForCategory,
      }));

      const res = await bulkCreateMenuItemsAction(payload);
      if (res.success) {
        onSuccess(res.count);
        onClose();
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to save scanned items to catalog.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-950 to-black text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-purple-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                <span>AI Menu & Service Scanner</span>
                <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  Gemini 2.5 Vision
                </span>
              </h3>
              <p className="text-xs text-purple-200/80 font-medium mt-0.5">
                Upload paper menu photo → Auto extract items & prices → Edit & Save to DB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl p-4 flex items-center gap-2.5 shrink-0 shadow-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Stage 1: Upload Photo */}
          {stage === 'upload' && (
            <div className="flex flex-col gap-5 py-2">
              <div className="border-2 border-dashed border-purple-200 rounded-3xl p-8 bg-purple-50/40 hover:bg-purple-50/80 transition-colors flex flex-col items-center justify-center text-center gap-3 relative cursor-pointer group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="w-14 h-14 rounded-2xl bg-white border border-purple-200 text-purple-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-purple-950">
                    {selectedFile ? selectedFile.name : `Click or Drag & Drop ${catalogTitle} Image Photo`}
                  </h4>
                  <p className="text-xs text-purple-800/80 font-medium mt-1">
                    Supports rate cards, price boards, menu charts (JPEG, PNG, WebP)
                  </p>
                </div>
              </div>

              {imagePreview && (
                <div className="flex flex-col gap-3 items-center bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                  <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Image Preview:</span>
                  <div className="h-44 w-full max-w-md rounded-xl overflow-hidden border border-gray-300 shadow-sm bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Menu photo" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!imagePreview || loading}
                  onClick={handleStartScan}
                  className="px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start AI Vision Scan</span>
                </button>
              </div>
            </div>
          )}

          {/* Stage 2: Processing AI Scan */}
          {stage === 'scanning' && (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-700 animate-spin" />
                <Sparkles className="w-6 h-6 text-purple-700 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-gray-900">✨ Gemini Vision AI Reading Menu Image...</h4>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Extracting service names, descriptions, price tags, and categories.
                </p>
              </div>
            </div>
          )}

          {/* Stage 3: Review & Edit Data Grid */}
          {stage === 'review' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200/80 rounded-2xl p-3.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
                  <span className="text-xs font-extrabold text-purple-950">
                    Extracted {scannedItems.length} {itemNoun.toLowerCase()}{scannedItems.length > 1 ? 's' : ''} from photo! Review & edit below before saving:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBlankItem}
                  className="px-3 py-1.5 bg-white border border-purple-300 text-purple-900 text-[11px] font-extrabold rounded-xl hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Row</span>
                </button>
              </div>

              {/* Scanned Items Editable List */}
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {scannedItems.map((item, idx) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3 hover:border-purple-300 transition-colors">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider">
                        #{idx + 1} {itemNoun}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete this row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Item / Service Name *</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="e.g. Keratin Hair Treatment"
                          className="w-full text-xs font-bold px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-purple-600 outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Price (₹) *</label>
                        <input
                          type="number"
                          value={item.price || ''}
                          onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                          placeholder="2499"
                          className="w-full text-xs font-black px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-purple-600 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Category *</label>
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                          placeholder="e.g. Hair Treatments"
                          className="w-full text-xs font-bold px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-purple-600 outline-none uppercase"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Preset Starter Image</label>
                        <select
                          value={item.image}
                          onChange={(e) => handleItemChange(item.id, 'image', e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-purple-600 outline-none cursor-pointer"
                        >
                          <option value="/saloon_placeholder2.jpg">✨ Salon Spa & Treatment (/saloon_placeholder2.jpg)</option>
                          <option value="/cosmetics.jpg">💄 Hair Styling & Cosmetics (/cosmetics.jpg)</option>
                          <option value="/dish_placeholder.jpg">🖼️ Generic Placeholder (/dish_placeholder.jpg)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="e.g. Deep restorative keratin treatment for smooth, frizz-free hair..."
                        className="w-full text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-purple-600 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStage('upload')}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 uppercase tracking-wider cursor-pointer"
                >
                  ← Rescan Photo
                </button>
                <button
                  type="button"
                  disabled={saving || scannedItems.length === 0}
                  onClick={handleSaveAll}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Store DB...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Import {scannedItems.length} {itemNoun}s to DB</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
