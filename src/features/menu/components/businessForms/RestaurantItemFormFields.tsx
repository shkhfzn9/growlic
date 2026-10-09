'use client';

import React from 'react';
import { BusinessFormFieldProps } from './types';
import { Flame, Utensils, Clock, MessageSquare, Scale } from 'lucide-react';

export default function RestaurantItemFormFields({ formData, onChange, vocab, disabled }: BusinessFormFieldProps) {
  return (
    <div className="flex flex-col gap-5 border-t border-gray-100 pt-5">
      {/* Preparation Details */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-[#C0181A]" /> {vocab.processDetailsLabel}
        </label>
        <textarea
          placeholder="e.g. Hand-rolled Tibetan momos stuffed with spiced minced meat, steamed in bamboo baskets for 12 mins..."
          value={formData.preparation}
          onChange={(e) => onChange('preparation', e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-medium outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all resize-none"
        />
      </div>

      {/* Ingredients */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">
          {vocab.suppliesLabel} (Comma-separated)
        </label>
        <input
          type="text"
          placeholder="e.g. Refined Wheat Flour, Minced Chicken Breast, Ginger, Garlic, Spring Onion, Sichuan Pepper"
          value={formData.ingredients}
          onChange={(e) => onChange('ingredients', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all"
        />
      </div>

      {/* Spice Level & Portion Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Spice Level */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" /> Spice Level
          </label>
          <select
            value={formData.spiceLevel}
            onChange={(e) => onChange('spiceLevel', e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:bg-white focus:border-[#C0181A] transition-all cursor-pointer"
          >
            <option value="0">🌱 Non-Spicy / Mild</option>
            <option value="1">🔥 Mild Heat (Level 1)</option>
            <option value="2">🔥🔥 Medium Spicy (Level 2)</option>
            <option value="3">🔥🔥🔥 Extra Hot / Fiery (Level 3)</option>
          </select>
        </div>

        {/* Portion Size */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-[#C0181A]" /> Serving Portion Size
          </label>
          <select
            value={formData.portionSize}
            onChange={(e) => onChange('portionSize', e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:bg-white focus:border-[#C0181A] transition-all cursor-pointer"
          >
            <option value="Good for 1">Single Portion (Good for 1)</option>
            <option value="Shareable for 2-3">Shareable Starter (2-3 People)</option>
            <option value="Shareable for 3-4">Large Platter (3-4 People)</option>
            <option value="custom">Custom Portion Label...</option>
          </select>
        </div>
      </div>

      {formData.portionSize === 'custom' && (
        <div className="flex flex-col gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-3">
          <label className="text-[10px] font-bold uppercase text-gray-600">Custom Portion Description</label>
          <input
            type="text"
            placeholder="e.g. 6 Pieces / 250ml Bowl"
            value={formData.customPortionSize}
            onChange={(e) => onChange('customPortionSize', e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-3.5 py-2 rounded-lg border border-gray-200 bg-white font-semibold outline-none focus:border-[#C0181A]"
          />
        </div>
      )}

      {/* Prep Time */}
      <div className="flex flex-col gap-1.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#C0181A]" /> {vocab.timeEstimateLabel}
        </label>
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Min Minutes</span>
            <input
              type="number"
              placeholder="8"
              value={formData.prepTimeMin}
              onChange={(e) => onChange('prepTimeMin', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold outline-none focus:border-[#C0181A]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Max Minutes</span>
            <input
              type="number"
              placeholder="12"
              value={formData.prepTimeMax}
              onChange={(e) => onChange('prepTimeMax', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold outline-none focus:border-[#C0181A]"
            />
          </div>
        </div>
      </div>

      {/* Nutrition Facts */}
      <div className="flex flex-col gap-2 bg-[#F9FAFB] border border-gray-200 rounded-2xl p-4">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Nutrition Facts per Serving (Optional)</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Calories (kcal)</span>
            <input
              type="number"
              placeholder="250"
              value={formData.calories}
              onChange={(e) => onChange('calories', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white font-bold outline-none focus:border-[#C0181A]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Protein (g)</span>
            <input
              type="number"
              placeholder="14"
              value={formData.protein}
              onChange={(e) => onChange('protein', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white font-bold outline-none focus:border-[#C0181A]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Carbs (g)</span>
            <input
              type="number"
              placeholder="35"
              value={formData.carbs}
              onChange={(e) => onChange('carbs', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white font-bold outline-none focus:border-[#C0181A]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Fat (g)</span>
            <input
              type="number"
              placeholder="8"
              value={formData.fat}
              onChange={(e) => onChange('fat', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white font-bold outline-none focus:border-[#C0181A]"
            />
          </div>
        </div>
      </div>

      {/* Chef Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-[#C0181A]" /> {vocab.noteLabel} (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Marinated overnight, char-grilled fresh to order"
          value={formData.chefNote}
          onChange={(e) => onChange('chefNote', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#C0181A] transition-all"
        />
      </div>
    </div>
  );
}
