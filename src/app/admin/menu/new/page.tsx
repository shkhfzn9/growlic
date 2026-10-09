'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { createMenuItem, getMenuItems } from '@/actions/menu';
import { getRestaurantDetails } from '@/actions/auth';
import { getVocabulary } from '@/config/businessVocabulary';
import Link from 'next/link';
import BusinessFormFieldsContainer from '@/features/menu/components/businessForms/BusinessFormFieldsContainer';

interface MenuItem {
  _id: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
  images?: string[];
  preparation?: string;
  ingredients?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default function NewMenuItemPage() {
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);

  const [businessCategory, setBusinessCategory] = useState<string>('restaurant');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [image, setImage] = useState('');
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);

  const [preparation, setPreparation] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');
  const [spiceLevel, setSpiceLevel] = useState('0');
  const [portionSize, setPortionSize] = useState('Good for 1');
  const [customPortionSize, setCustomPortionSize] = useState('');
  const [prepTimeMin, setPrepTimeMin] = useState('10');
  const [prepTimeMax, setPrepTimeMax] = useState('12');
  const [chefNote, setChefNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Auto-detect business category from DB admin profile
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const details = await getRestaurantDetails();
        if (details?.businessCategory) {
          setBusinessCategory(details.businessCategory);
        } else if (details?.themePreset === 'rose_quartz' || details?.themePreset === 'velvet_noir') {
          setBusinessCategory('salon');
        } else if (details?.themePreset === 'carbon_crimson' || details?.themePreset === 'cyber_cyan') {
          setBusinessCategory('detailing');
        }
      } catch (err) {
        console.error('Failed to load business details:', err);
      }
    };

    fetchBusinessInfo();
  }, []);

  const activeCategoryStr = (category === 'new' || categories.length === 0 ? customCategory : category).toLowerCase();
  const isSalonCat = activeCategoryStr.includes('hair') || activeCategoryStr.includes('spa') || activeCategoryStr.includes('facial') || activeCategoryStr.includes('nail') || activeCategoryStr.includes('treatment') || businessCategory === 'salon';
  const isDetailingCat = activeCategoryStr.includes('coating') || activeCategoryStr.includes('detailing') || activeCategoryStr.includes('polish') || activeCategoryStr.includes('wrap') || businessCategory === 'detailing';

  const effectiveCategory = isSalonCat ? 'salon' : isDetailingCat ? 'detailing' : businessCategory;
  const vocab = getVocabulary(effectiveCategory);

  useEffect(() => {
    const fetchExistingCategories = async () => {
      if (!auth.restaurantId) return;
      try {
        const menu = await getMenuItems(auth.restaurantId);
        const existingCats = Array.from<string>(new Set(menu.map((i: MenuItem) => i.category)));
        setCategories(existingCats);
        if (existingCats.length > 0) {
          setCategory(existingCats[0]);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

    if (auth.restaurantId) {
      fetchExistingCategories();
    }
  }, [auth.restaurantId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image size exceeds 2MB limit.');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 800, 800, 0.7);
      setImage(compressedDataUrl);
      setFormError('');
    } catch (err) {
      console.error(err);
      setFormError('Failed to compress image.');
    }
  };

  const handleExtraImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const newCompressed = await Promise.all(
        files.map((file) => compressImage(file, 800, 800, 0.7))
      );
      setExtraImages((prev) => [...prev, ...newCompressed].slice(0, 5));
    } catch (err) {
      console.error(err);
      setFormError('Failed to compress extra slide images.');
    }
  };

  const handleRemoveExtraImage = (index: number) => {
    setExtraImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !price || isNaN(Number(price))) {
      setFormError(`Please enter a valid ${vocab.itemNoun.toLowerCase()} name and price.`);
      return;
    }

    const finalCategory = category === 'new' || categories.length === 0 ? customCategory.trim() : category;
    if (!finalCategory) {
      setFormError(`Please specify a ${vocab.categoryNoun.toLowerCase()}.`);
      return;
    }

    setLoading(true);

    try {
      await createMenuItem({
        name: name.trim(),
        description: description.trim(),
        category: finalCategory,
        price: Number(price),
        image: image || (effectiveCategory === 'salon' ? '/saloon_placeholder2.jpg' : '/dish_placeholder.jpg'),
        available,
        preparation: preparation.trim(),
        ingredients: ingredients.split(',').map((ing) => ing.trim()).filter(Boolean),
        nutrition: {
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        },
        images: extraImages,
        spiceLevel: Number(spiceLevel),
        portionSize: portionSize === 'custom' ? customPortionSize.trim() : portionSize,
        prepTimeMin: Number(prepTimeMin) || 0,
        prepTimeMax: Number(prepTimeMax) || 0,
        chefNote: chefNote.trim(),
      });

      router.push('/admin/menu');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to create item. Please try again.';
      setFormError(message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{vocab.addItemTitle}</h1>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            Add a new {vocab.itemNoun.toLowerCase()} to your {vocab.catalogTitle.toLowerCase()}
          </p>
        </div>
        <Link
          href="/admin/menu"
          className="text-xs font-extrabold text-gray-500 hover:text-[#C0181A] transition-colors uppercase tracking-wider bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl"
        >
          ← Cancel
        </Link>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl p-4 flex items-center gap-2.5 shadow-xs">
          <span className="text-base">⚠️</span>
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">
            {vocab.itemNoun} Name *
          </label>
          <input
            type="text"
            placeholder={
              effectiveCategory === 'salon'
                ? 'e.g. Keratin Hair Spa & Therapy'
                : effectiveCategory === 'detailing'
                ? 'e.g. 9H Ceramic Coating Shield'
                : effectiveCategory === 'retail'
                ? 'e.g. Premium Heavyweight Cotton Hoodie'
                : 'e.g. Steamed Pork Momos'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="w-full text-xs px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all"
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Description</label>
          <textarea
            placeholder={
              effectiveCategory === 'salon'
                ? 'e.g. Deep conditioning keratin treatment for smooth, frizz-free hair with natural shine...'
                : effectiveCategory === 'detailing'
                ? 'e.g. Multi-layer nano ceramic coating with 2-year hydrophobic paint protection...'
                : effectiveCategory === 'retail'
                ? 'e.g. 100% heavy fleece organic cotton hoodie with reinforced double stitching...'
                : 'e.g. Hand-rolled Tibetan momos stuffed with spiced minced meat, served with hot garlic dip...'
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-medium outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Price (₹) *</label>
            <input
              type="number"
              placeholder={
                effectiveCategory === 'salon'
                  ? '1499'
                  : effectiveCategory === 'detailing'
                  ? '8999'
                  : effectiveCategory === 'retail'
                  ? '1299'
                  : '189'
              }
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={loading}
              className="w-full text-xs px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">
              {vocab.categoryNoun} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
              className="w-full text-xs px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold uppercase outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.toUpperCase()}
                </option>
              ))}
              <option value="new">+ Create New Category</option>
            </select>
          </div>
        </div>

        {(category === 'new' || categories.length === 0) && (
          <div className="flex flex-col gap-1.5 bg-red-50/50 border border-red-100 rounded-2xl p-4">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#C0181A]">New Category Name</label>
            <input
              type="text"
              placeholder={
                effectiveCategory === 'salon'
                  ? 'e.g. Hair Care & Treatments'
                  : effectiveCategory === 'detailing'
                  ? 'e.g. Ceramic & Paint Protection'
                  : effectiveCategory === 'retail'
                  ? 'e.g. Apparel & Footwear'
                  : 'e.g. Desserts & Beverages'
              }
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              disabled={loading}
              className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold outline-none focus:border-[#C0181A]"
              required
            />
          </div>
        )}

        {/* Business-Specific Modular Fields */}
        <BusinessFormFieldsContainer
          businessCategory={effectiveCategory}
          formData={{
            preparation,
            ingredients,
            calories,
            protein,
            carbs,
            fat,
            spiceLevel,
            portionSize,
            customPortionSize,
            prepTimeMin,
            prepTimeMax,
            chefNote,
          }}
          onChange={(field, value) => {
            if (field === 'preparation') setPreparation(value);
            else if (field === 'ingredients') setIngredients(value);
            else if (field === 'calories') setCalories(value);
            else if (field === 'protein') setProtein(value);
            else if (field === 'carbs') setCarbs(value);
            else if (field === 'fat') setFat(value);
            else if (field === 'spiceLevel') setSpiceLevel(value);
            else if (field === 'portionSize') setPortionSize(value);
            else if (field === 'customPortionSize') setCustomPortionSize(value);
            else if (field === 'prepTimeMin') setPrepTimeMin(value);
            else if (field === 'prepTimeMax') setPrepTimeMax(value);
            else if (field === 'chefNote') setChefNote(value);
          }}
          disabled={loading}
        />

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">
            Primary {vocab.itemNoun} Image
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Select Preset Placeholder</span>
              <select
                value={
                  image === '/saloon_placeholder2.jpg' || image === '/cosmetics.jpg' || image === '/dish_placeholder.jpg'
                    ? image
                    : image
                    ? 'custom'
                    : effectiveCategory === 'salon'
                    ? '/saloon_placeholder2.jpg'
                    : '/dish_placeholder.jpg'
                }
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setImage(e.target.value);
                  }
                }}
                disabled={loading}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:bg-white focus:border-[#C0181A] transition-all cursor-pointer"
              >
                {effectiveCategory === 'salon' ? (
                  <>
                    <option value="/saloon_placeholder2.jpg">✨ Salon Spa & Treatment (/saloon_placeholder2.jpg)</option>
                    <option value="/cosmetics.jpg">💄 Hair Styling & Cosmetics (/cosmetics.jpg)</option>
                    <option value="/dish_placeholder.jpg">🖼️ Generic Placeholder (/dish_placeholder.jpg)</option>
                  </>
                ) : (
                  <>
                    <option value="/dish_placeholder.jpg">🖼️ Generic Placeholder (/dish_placeholder.jpg)</option>
                    <option value="/saloon_placeholder2.jpg">✨ Salon Spa & Treatment (/saloon_placeholder2.jpg)</option>
                    <option value="/cosmetics.jpg">💄 Hair Styling & Cosmetics (/cosmetics.jpg)</option>
                  </>
                )}
                {image && image !== '/saloon_placeholder2.jpg' && image !== '/cosmetics.jpg' && image !== '/dish_placeholder.jpg' && (
                  <option value="custom">📁 Uploaded Custom Image</option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Or Upload Custom Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loading}
                className="text-xs w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-extrabold file:bg-red-50 file:text-[#C0181A] hover:file:bg-red-100 cursor-pointer border border-gray-200 rounded-xl p-1 bg-gray-50/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mt-1 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Quick Pick:</span>
              <button
                type="button"
                onClick={() => setImage('/saloon_placeholder2.jpg')}
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  (image === '/saloon_placeholder2.jpg' || (!image && effectiveCategory === 'salon'))
                    ? 'border-[#C0181A] bg-red-50 text-[#C0181A] shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/saloon_placeholder2.jpg" alt="" className="w-4 h-4 object-cover rounded-md" />
                <span>Salon Spa Treatment</span>
              </button>

              <button
                type="button"
                onClick={() => setImage('/cosmetics.jpg')}
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  image === '/cosmetics.jpg'
                    ? 'border-[#C0181A] bg-red-50 text-[#C0181A] shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cosmetics.jpg" alt="" className="w-4 h-4 object-cover rounded-md" />
                <span>Hair Styling & Cosmetics</span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Active:</span>
              <div className="w-10 h-10 rounded-xl border border-gray-200 overflow-hidden shadow-xs bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image || (effectiveCategory === 'salon' ? '/saloon_placeholder2.jpg' : '/dish_placeholder.jpg')}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-4">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">
            Additional Showcase Slides (Max 5)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleExtraImageUpload}
            disabled={loading}
            className="text-xs w-full file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
          />
          {extraImages.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-2">
              {extraImages.map((img, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 group h-14">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Slide ${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveExtraImage(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-red-700 transition-colors shadow-xs"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-b border-gray-100 py-3.5 my-2">
          <div>
            <p className="text-xs font-bold text-gray-900 uppercase">Instant Availability</p>
            <p className="text-[10px] text-gray-500">Allow customers to order/book this immediately</p>
          </div>
          <input
            type="checkbox"
            id="available"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            disabled={loading}
            className="w-5 h-5 accent-[#C0181A] cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#C0181A] to-[#8B0000] hover:from-[#A01012] hover:to-[#6B0000] text-white font-extrabold text-xs py-4 rounded-2xl uppercase tracking-wider transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span>Saving {vocab.itemNoun}...</span>
          ) : (
            <span>Save & Add To {vocab.catalogTitle}</span>
          )}
        </button>
      </form>
    </div>
  );
}
