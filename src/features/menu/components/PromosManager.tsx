'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getAdminBanners, saveBanner, deleteBanner } from '../services/menu.service';
import { PageHeader, AdminButton } from '@/components/ui';
import { Plus, Trash2, Megaphone, CheckCircle, Image as ImageIcon, Pencil, X } from 'lucide-react';
import { BannerData } from '../types/menu.types';
import { getRestaurantDetails } from '@/actions/auth';
import { getDomainPresetImages } from '@/config/businessVocabulary';

export default function PromosManager() {
  const auth = useSelector((state: RootState) => state.auth);

  const [businessCategory, setBusinessCategory] = useState<string>('restaurant');
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [buttonText, setButtonText] = useState('Order Now');
  const [buttonLink, setButtonLink] = useState('');
  const [image, setImage] = useState('');
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const domainPresets = getDomainPresetImages(businessCategory);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await getAdminBanners();
      setBanners(data);
    } catch (err) {
      console.error('Failed to load advertisements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function initCategoryAndData() {
      try {
        const details = await getRestaurantDetails();
        if (details?.businessCategory) {
          setBusinessCategory(details.businessCategory);
          const presets = getDomainPresetImages(details.businessCategory);
          if (presets.length > 0 && !image) {
            setImage(presets[0].value);
          }
        } else {
          const presets = getDomainPresetImages('restaurant');
          if (presets.length > 0 && !image) {
            setImage(presets[0].value);
          }
        }
      } catch (err) {
        console.error('Failed to get restaurant details:', err);
      }
    }

    if (auth.isLoggedIn && auth.restaurantId) {
      initCategoryAndData();
      loadBanners();
      if (!editingBannerId) {
        setButtonLink(`/menu/${auth.restaurantId}`);
      }
    }
  }, [auth.isLoggedIn, auth.restaurantId]);

  const handleEdit = (banner: BannerData) => {
    setEditingBannerId(banner._id);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || '');
    setButtonText(banner.buttonText || 'Order Now');
    setButtonLink(banner.buttonLink || (auth.restaurantId ? `/menu/${auth.restaurantId}` : ''));
    setImage(banner.image || domainPresets[0]?.value || '/dish_placeholder.jpg');
    setActive(banner.active !== false);
    setSaveSuccess(false);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingBannerId(null);
    setTitle('');
    setSubtitle('');
    setButtonText('Order Now');
    setButtonLink(auth.restaurantId ? `/menu/${auth.restaurantId}` : '');
    setImage(domainPresets[0]?.value || '/dish_placeholder.jpg');
    setActive(true);
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveBanner({
        _id: editingBannerId || undefined,
        title,
        subtitle,
        buttonText,
        buttonLink,
        image,
        active,
      });

      handleCancelEdit();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadBanners();
    } catch (err) {
      console.error(err);
      alert('Failed to save promo: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promotion banner?')) {
      try {
        await deleteBanner(id);
        if (editingBannerId === id) {
          handleCancelEdit();
        }
        await loadBanners();
      } catch (err) {
        console.error(err);
        alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12">
      {/* Create / Edit Promo Form */}
      <div className="flex-1 max-w-xl">
        <PageHeader title="Promos & Ads" subtitle="Post and edit advertisement banners for your menu page" />

        <form onSubmit={handleSubmit} className="bg-white border border-[#E2E6EA] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#111827] flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#C0181A]" />
                {editingBannerId ? 'Edit Advertisement Banner' : 'Post New Advertisement'}
              </h2>
              {editingBannerId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cancel Edit
                </button>
              )}
            </div>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              {editingBannerId
                ? 'Update the fields below to modify this active banner'
                : 'Fill in the fields below to create a new active banner'}
            </p>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#16A34A]/20 rounded-lg p-3 text-sm text-[#16A34A] font-medium">
              <CheckCircle className="w-4 h-4" /> Advertisement banner saved successfully!
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-[#8B0000] tracking-wider">Title *</label>
            <input
              type="text"
              placeholder="e.g. Free delivery for today's specials"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-lg px-4 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-[#8B0000] tracking-wider">Subtitle</label>
            <input
              type="text"
              placeholder="e.g. Up to 3 times per day"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-lg px-4 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-[#8B0000] tracking-wider">Button Text</label>
              <input
                type="text"
                placeholder="Order now"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-lg px-4 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-[#8B0000] tracking-wider">Button Link (Redirect Url)</label>
              <input
                type="text"
                placeholder="/menu/tokyo-momos"
                value={buttonLink}
                onChange={(e) => setButtonLink(e.target.value)}
                className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-lg px-4 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-[#8B0000] tracking-wider">Banner Image</label>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Enter image URL or base64 data"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-lg px-4 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors"
              />
              <span className="text-[11px] text-[#6B7280]">Or select a preset starter image:</span>
              <div className="flex gap-2 flex-wrap">
                {domainPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setImage(preset.value)}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      image === preset.value
                        ? 'bg-[#C0181A] text-white border-transparent'
                        : 'bg-[#F5F5F5] text-[#1A1A1A] border-[#E2E6EA] hover:bg-neutral-200'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="activeCheckbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 accent-[#C0181A]"
            />
            <label htmlFor="activeCheckbox" className="text-sm font-semibold text-[#1A1A1A] select-none cursor-pointer">
              Mark as active and display in carousel
            </label>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <AdminButton type="submit" loading={saving} className="flex-1 text-white bg-[#C0181A] hover:bg-[#8B0000]">
              {editingBannerId ? 'Save / Update Banner' : 'Create Banner'}
            </AdminButton>
            {editingBannerId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List of Active Promos */}
      <div className="flex-1 lg:max-w-md">
        <h3 className="text-base font-bold text-[#111827] mb-4">Active Promo Banners</h3>
        {loading ? (
          <div className="text-sm text-[#6B7280]">Loading banners...</div>
        ) : banners.length === 0 ? (
          <div className="border-2 border-dashed border-[#E2E6EA] rounded-xl p-8 text-center text-sm text-[#6B7280]">
            <Megaphone className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
            No active banners found. Create one using the form on the left.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {banners.map((banner) => (
              <div
                key={banner._id}
                className={`bg-white border rounded-xl p-4 flex items-center gap-3 relative shadow-sm transition-all ${
                  editingBannerId === banner._id
                    ? 'border-[#C0181A] ring-2 ring-[#C0181A]/20 bg-red-50/20'
                    : 'border-[#E2E6EA]'
                }`}
              >
                {/* Image / Icon preview */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-100 shrink-0 flex items-center justify-center border border-neutral-200">
                  {banner.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-neutral-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${
                    banner.active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {banner.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <h4 className="font-bold text-sm text-[#111827] truncate leading-tight">{banner.title}</h4>
                  {banner.subtitle && (
                    <p className="text-xs text-[#6B7280] truncate mt-0.5">{banner.subtitle}</p>
                  )}
                  <p className="text-[10px] text-neutral-400 mt-1 truncate">Link: {banner.buttonLink || '(None)'}</p>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(banner)}
                    className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Edit advertisement banner"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banner._id)}
                    className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete advertisement banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
