'use client';

import React from 'react';
import { BusinessFormFieldProps } from './types';
import { ShoppingBag, Clock, MessageSquare, Tag, Layers } from 'lucide-react';

export default function RetailItemFormFields({ formData, onChange, vocab, disabled }: BusinessFormFieldProps) {
  return (
    <div className="flex flex-col gap-5 border-t border-purple-100 pt-5 bg-gradient-to-b from-purple-50/20 to-transparent p-4 rounded-2xl">
      {/* Product Care & Specifications */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-purple-600" /> {vocab.processDetailsLabel}
        </label>
        <textarea
          placeholder="e.g. Machine wash cold inside out with like colors. Line dry only. Do not iron directly on printed logos..."
          value={formData.preparation}
          onChange={(e) => onChange('preparation', e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all resize-none"
        />
      </div>

      {/* Materials & Features */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-purple-600" /> {vocab.suppliesLabel} (Comma-separated)
        </label>
        <input
          type="text"
          placeholder="e.g. 100% Organic Heavy Cotton, 400 GSM Fleece, Reinforced Stitching, Ribbed Cuffs"
          value={formData.ingredients}
          onChange={(e) => onChange('ingredients', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all"
        />
      </div>

      {/* Available Sizes & Variants */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-purple-600" /> Available Sizes & Color Variants
        </label>
        <input
          type="text"
          placeholder="e.g. S, M, L, XL, XXL (Colors: Carbon Black, Crimson Red)"
          value={formData.portionSize === 'Good for 1' ? '' : formData.portionSize}
          onChange={(e) => onChange('portionSize', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-purple-600 transition-all"
        />
      </div>

      {/* Packing / Dispatch Time */}
      <div className="flex flex-col gap-1.5 bg-white border border-purple-100 rounded-2xl p-4 shadow-2xs">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-purple-600" /> {vocab.timeEstimateLabel}
        </label>
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Min Dispatch (Mins)</span>
            <input
              type="number"
              placeholder="5"
              value={formData.prepTimeMin}
              onChange={(e) => onChange('prepTimeMin', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:border-purple-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Max Dispatch (Mins)</span>
            <input
              type="number"
              placeholder="15"
              value={formData.prepTimeMax}
              onChange={(e) => onChange('prepTimeMax', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:border-purple-600"
            />
          </div>
        </div>
      </div>

      {/* Store Manager Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-purple-600" /> {vocab.noteLabel} (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Bestseller item — Limited inventory edition"
          value={formData.chefNote}
          onChange={(e) => onChange('chefNote', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-purple-600 transition-all"
        />
      </div>
    </div>
  );
}
