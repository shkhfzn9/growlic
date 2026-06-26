'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getMenuItems, toggleMenuItemAvailability, deleteMenuItem } from '../services/menu.service';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ImageOff } from 'lucide-react';
import { PageHeader, StatusBadge, AdminButton, EmptyState } from '@/components/ui';
import { MenuItem } from '../types/menu.types';

export default function MenuPage() {
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
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-40 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4 animate-pulse border-b border-[#E2E6EA] last:border-0">
              <div className="w-12 h-12 bg-[#E2E6EA] rounded-lg" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-32 bg-[#E2E6EA] rounded" />
                <div className="h-3 w-48 bg-[#E2E6EA] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Menu Items"
        subtitle="Manage your restaurant menu"
        actions={
          <Link href="/admin/menu/new">
            <AdminButton icon={<Plus className="w-4 h-4" />}>Add Item</AdminButton>
          </Link>
        }
      />

      {error && (
        <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 text-sm text-[#DC2626] font-medium">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No menu items"
          description="Add your first menu item to get started."
          action={
            <Link href="/admin/menu/new">
              <AdminButton icon={<Plus className="w-4 h-4" />}>Add Item</AdminButton>
            </Link>
          }
        />
      ) : (
        <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] w-16">Image</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Category</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Price</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EA]">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-[#F4F6F9]/50 transition-colors">
                    <td className="px-4 py-3">
                      {item.image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F4F6F9] border border-[#E2E6EA]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#F4F6F9] border border-[#E2E6EA] flex items-center justify-center">
                          <ImageOff className="w-4 h-4 text-[#6B7280]" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#111827] block">{item.name}</span>
                      <span className="text-[12px] text-[#6B7280] line-clamp-1">{item.description}</span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{item.category}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#111827]">₹{item.price}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(item._id, item.available)}>
                        <StatusBadge
                          label={item.available ? 'Available' : 'Unavailable'}
                          variant={item.available ? 'success' : 'neutral'}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <Link href={`/admin/menu/edit/${item._id}`}>
                          <AdminButton variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />}>Edit</AdminButton>
                        </Link>
                        <AdminButton variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(item._id)}>
                          Delete
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
