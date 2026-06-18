'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getMenuItems, toggleMenuItemAvailability, deleteMenuItem } from '@/actions/menu';
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

export default function AdminMenuPage() {
  const auth = useSelector((state: RootState) => state.auth);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMenu = async () => {
    if (!auth.restaurantId) return;
    try {
      setLoading(true);
      const menu = await getMenuItems(auth.restaurantId);
      setItems(menu);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load menu items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.restaurantId) {
      Promise.resolve().then(() => loadMenu());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.restaurantId]);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleMenuItemAvailability(id, !currentStatus);
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, available: !currentStatus } : item))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle availability.';
      alert(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      try {
        await deleteMenuItem(id);
        setItems((prev) => prev.filter((item) => item._id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete item.';
        alert(message);
      }
    }
  };

  if (loading) {
    return <div className="font-mono-custom text-xs text-center py-12">LOADING MENU ITEMS...</div>;
  }

  return (
    <div className="font-mono-custom flex flex-col gap-6">
      {/* Title / Action bar */}
      <div className="border-b border-black pb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">Menu Items</h1>
          <span className="text-xs uppercase text-zinc-500">Configure your restaurant menu</span>
        </div>
        <Link
          href="/admin/menu/new"
          className="border border-black bg-black text-white hover:bg-white hover:text-black px-4 py-2 text-xs font-bold uppercase transition-all"
        >
          [ + ADD NEW ITEM ]
        </Link>
      </div>

      {error && (
        <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase">
          ⚠️ {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="border border-dashed border-black p-12 text-center text-xs uppercase bg-white">
          No menu items found. Click &quot;ADD NEW ITEM&quot; to create one.
        </div>
      ) : (
        <div className="border border-black overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-black bg-zinc-50 font-bold text-xs uppercase">
                <th className="p-3 border-r border-black w-20">Preview</th>
                <th className="p-3 border-r border-black">Name</th>
                <th className="p-3 border-r border-black">Category</th>
                <th className="p-3 border-r border-black">Price</th>
                <th className="p-3 border-r border-black">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black text-xs uppercase">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-zinc-50">
                  <td className="p-3 border-r border-black">
                    {item.image ? (
                      <div className="w-12 h-12 border border-black flex items-center justify-center bg-zinc-100 select-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400">NO IMG</span>
                    )}
                  </td>
                  <td className="p-3 border-r border-black">
                    <span className="font-bold text-sm block">{item.name}</span>
                    <span className="text-[10px] text-zinc-500 block font-sans line-clamp-1">
                      {item.description}
                    </span>
                  </td>
                  <td className="p-3 border-r border-black font-semibold">{item.category}</td>
                  <td className="p-3 border-r border-black font-bold">₹{item.price}</td>
                  <td className="p-3 border-r border-black">
                    <button
                      onClick={() => handleToggle(item._id, item.available)}
                      className={`font-bold px-2 py-0.5 border cursor-pointer ${
                        item.available
                          ? 'border-black bg-black text-white hover:bg-zinc-800'
                          : 'border-zinc-300 text-zinc-400 hover:bg-zinc-100'
                      }`}
                    >
                      {item.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                    </button>
                  </td>
                  <td className="p-3 flex gap-2 pt-6">
                    <Link
                      href={`/admin/menu/edit/${item._id}`}
                      className="border border-black px-2 py-0.5 hover:bg-black hover:text-white font-bold"
                    >
                      [ EDIT ]
                    </Link>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="border border-red-600 text-red-600 px-2 py-0.5 hover:bg-red-600 hover:text-white font-bold cursor-pointer"
                    >
                      [ DELETE ]
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
