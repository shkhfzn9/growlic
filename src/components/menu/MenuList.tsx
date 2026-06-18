'use client';

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { addItem, updateQuantity, removeItem } from '@/redux/cartSlice';
import Link from 'next/link';

interface MenuItem {
  _id: string;
  restaurantId: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
}

interface MenuListProps {
  initialItems: MenuItem[];
  restaurantName: string;
  restaurantId: string;
}

export default function MenuList({ initialItems, restaurantName, restaurantId }: MenuListProps) {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Extract unique categories
  const categories = Array.from(new Set(initialItems.map((item) => item.category)));

  // Filter items based on category and search query
  const filteredItems = initialItems.filter((item) => {
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  // Helper to get item quantity in cart
  const getItemQuantity = (itemId: string) => {
    const item = cart.items.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  };

  const handleAddOne = (item: MenuItem) => {
    dispatch(
      addItem({
        item: {
          id: item._id,
          name: item.name,
          price: item.price,
          image: item.image,
          category: item.category,
        },
        restaurantId,
      })
    );
  };

  const handleRemoveOne = (itemId: string, currentQty: number) => {
    if (currentQty <= 1) {
      dispatch(removeItem(itemId));
    } else {
      dispatch(updateQuantity({ id: itemId, quantity: currentQty - 1 }));
    }
  };

  const handleAddMore = (itemId: string, currentQty: number) => {
    dispatch(updateQuantity({ id: itemId, quantity: currentQty + 1 }));
  };

  const totalItemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <header className="border-b-2 border-black py-6 px-4 bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-baseline">
            <h1 className="text-3xl font-bold tracking-tighter uppercase font-mono-custom">
              {restaurantName}
            </h1>
            <span className="text-xs uppercase border border-black px-2 py-0.5 font-mono-custom">
              QR Menu
            </span>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm font-mono-custom"
          />

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none font-mono-custom">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-xs border border-black cursor-pointer transition-colors ${
                selectedCategory === null
                  ? 'bg-black text-white font-bold'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              ALL
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs border border-black uppercase cursor-pointer transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-black text-white font-bold'
                    : 'bg-white text-black hover:bg-black hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu List */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="border border-dashed border-black p-8 text-center font-mono-custom text-sm">
            NO ITEMS FOUND MATCHING YOUR SEARCH.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredItems.map((item) => {
              const qty = getItemQuantity(item._id);
              return (
                <div
                  key={item._id}
                  className="border border-black p-4 flex gap-4 bg-white transition-colors duration-100"
                >
                  {/* Image/Emoji */}
                  {item.image && (
                    <div className="w-20 h-20 border border-black flex-shrink-0 flex items-center justify-center bg-zinc-50 select-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-none"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-base tracking-tight uppercase">
                          {item.name}
                        </h3>
                        <span className="font-mono-custom font-bold text-sm">
                          ₹{item.price}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 font-sans line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end mt-3">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAddOne(item)}
                          className="px-4 py-1 text-xs border border-black font-bold uppercase bg-white text-black hover:bg-black hover:text-white font-mono-custom transition-all"
                        >
                          [ ADD ]
                        </button>
                      ) : (
                        <div className="flex items-center border border-black font-mono-custom text-xs">
                          <button
                            onClick={() => handleRemoveOne(item._id, qty)}
                            className="px-3 py-1 font-bold border-r border-black hover:bg-zinc-100"
                          >
                            -
                          </button>
                          <span className="px-4 py-1 font-bold">{qty}</span>
                          <button
                            onClick={() => handleAddMore(item._id, qty)}
                            className="px-3 py-1 font-bold border-l border-black hover:bg-zinc-100"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black text-white py-4 px-6 border-t-2 border-black z-20">
          <div className="max-w-2xl mx-auto flex justify-between items-center font-mono-custom">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400">
                {totalItemsCount} ITEM{totalItemsCount > 1 ? 'S' : ''} IN CART
              </span>
              <span className="text-lg font-bold">Total: ₹{cart.total}</span>
            </div>
            <Link
              href="/cart"
              className="border border-white bg-white text-black hover:bg-black hover:text-white hover:border-white px-5 py-2 text-sm font-bold uppercase transition-all"
            >
              [ VIEW CART → ]
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
