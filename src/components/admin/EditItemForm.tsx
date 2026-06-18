'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { updateMenuItem, getMenuItems } from '@/actions/menu';
import Link from 'next/link';

interface MenuItem {
  _id: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
}

interface EditItemFormProps {
  item: MenuItem;
}

export default function EditItemForm({ item }: EditItemFormProps) {
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(item.price.toString());
  const [category, setCategory] = useState(item.category);
  const [customCategory, setCustomCategory] = useState('');
  const [image, setImage] = useState(item.image);
  const [available, setAvailable] = useState(item.available);

  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (auth.restaurantId) {
      getMenuItems(auth.restaurantId)
        .then((items: MenuItem[]) => {
          const cats = Array.from(new Set(items.map((i) => i.category)));
          setCategories(cats);
        })
        .catch((err) => console.error(err));
    }
  }, [auth.restaurantId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('File size too large. Please select an image under 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalCategory = category === 'new' ? customCategory.trim() : category;

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }

    if (!finalCategory) {
      setFormError('Category is required.');
      return;
    }

    if (!price || Number(price) <= 0) {
      setFormError('Please enter a valid price.');
      return;
    }

    setLoading(true);

    try {
      await updateMenuItem(item._id, {
        name: name.trim(),
        description: description.trim(),
        category: finalCategory,
        price: Number(price),
        image,
        available,
      });

      router.push('/admin/menu');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to update item. Please try again.';
      setFormError(message);
      setLoading(false);
    }
  };

  return (
    <div className="font-mono-custom flex flex-col gap-6 max-w-xl mx-auto">
      {/* Header bar */}
      <div className="border-b border-black pb-4 flex justify-between items-baseline">
        <h1 className="text-xl font-bold uppercase">Edit Menu Item</h1>
        <Link href="/admin/menu" className="text-xs uppercase underline">
          ← Cancel
        </Link>
      </div>

      {formError && (
        <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase">
          ⚠️ {formError}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="border border-black p-6 bg-white flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Item Name</label>
          <input
            type="text"
            placeholder="e.g. Steamed Pork Momos"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="w-full text-xs"
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Description</label>
          <textarea
            placeholder="Describe the item ingredients, preparation, spicy level..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full text-xs border border-black p-2 rounded-none resize-none"
          />
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Price (₹)</label>
          <input
            type="number"
            placeholder="149"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={loading}
            className="w-full text-xs"
            required
          />
        </div>

        {/* Category Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
            className="w-full text-xs border border-black p-2 rounded-none bg-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.toUpperCase()}
              </option>
            ))}
            <option value="new">Create New Category</option>
          </select>

          {/* Custom Category Input */}
          {(category === 'new' || categories.length === 0) && (
            <input
              type="text"
              placeholder="e.g. Desserts"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              disabled={loading}
              className="w-full text-xs mt-2"
              required
            />
          )}
        </div>

        {/* Image Uploader */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Item Image</label>
          <div className="flex gap-4 items-center mt-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={loading}
              className="text-xs flex-1 border border-black p-2"
            />
            {image && (
              <div className="w-16 h-16 border border-black flex items-center justify-center bg-zinc-100 select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 uppercase">
            Upload new local image (Max 1MB) or keep current.
          </span>
        </div>

        {/* Availability checkbox */}
        <div className="flex items-center gap-2 mt-2 py-2 border-t border-b border-black">
          <input
            type="checkbox"
            id="available"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="available" className="text-xs font-bold uppercase cursor-pointer select-none">
            Item Available immediately
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="border-2 border-black w-full py-3 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all cursor-pointer mt-4"
        >
          {loading ? 'SAVING CHANGES...' : '[ SAVE CHANGES ]'}
        </button>
      </form>
    </div>
  );
}
