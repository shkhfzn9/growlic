'use client';

import React from 'react';
import { BusinessFormFieldProps } from './types';
import { Sparkles, Clock, MessageSquare, ShieldCheck, HeartPulse } from 'lucide-react';

export default function SalonItemFormFields({ formData, onChange, vocab, disabled }: BusinessFormFieldProps) {
  return (
    <div className="flex flex-col gap-5 border-t border-pink-100 pt-5 bg-gradient-to-b from-pink-50/20 to-transparent p-4 rounded-2xl">
      {/* Treatment Process */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-600" /> {vocab.processDetailsLabel}
        </label>
        <textarea
          placeholder="e.g. Wash with clarifying shampoo, apply keratin formula section by section, blow dry & flat iron to lock in treatment..."
          value={formData.preparation}
          onChange={(e) => onChange('preparation', e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all resize-none"
        />
      </div>

      {/* Products & Serums Used */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <HeartPulse className="w-3.5 h-3.5 text-pink-600" /> {vocab.suppliesLabel} (Comma-separated)
        </label>
        <input
          type="text"
          placeholder="e.g. Hydrolyzed Keratin, Argan Oil, Amino Acid Complex, Sulfate-Free Hydrating Shampoo"
          value={formData.ingredients}
          onChange={(e) => onChange('ingredients', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all"
        />
      </div>

      {/* Service Duration */}
      <div className="flex flex-col gap-1.5 bg-white border border-pink-100 rounded-2xl p-4 shadow-2xs">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-pink-600" /> {vocab.timeEstimateLabel}
        </label>
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Min Service Duration (Mins)</span>
            <input
              type="number"
              placeholder="45"
              value={formData.prepTimeMin}
              onChange={(e) => onChange('prepTimeMin', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:border-pink-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Max Service Duration (Mins)</span>
            <input
              type="number"
              placeholder="60"
              value={formData.prepTimeMax}
              onChange={(e) => onChange('prepTimeMax', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:border-pink-500"
            />
          </div>
        </div>
      </div>

      {/* Target Hair/Skin Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-pink-600" /> Target Hair / Skin Compatibility
        </label>
        <input
          type="text"
          placeholder="e.g. Frizzy, Damaged or Chemically Treated Hair (Suitable for all skin types)"
          value={formData.portionSize === 'Good for 1' ? '' : formData.portionSize}
          onChange={(e) => onChange('portionSize', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-pink-500 transition-all"
        />
      </div>

      {/* Specialist Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-pink-600" /> {vocab.noteLabel} (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Includes complimentary scalp massage, consultation & hot towel blow-dry finish"
          value={formData.chefNote}
          onChange={(e) => onChange('chefNote', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-pink-500 transition-all"
        />
      </div>
    </div>
  );
}
