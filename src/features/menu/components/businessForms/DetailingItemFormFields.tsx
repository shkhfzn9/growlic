'use client';

import React from 'react';
import { BusinessFormFieldProps } from './types';
import { ShieldAlert, Clock, MessageSquare, Car, Award } from 'lucide-react';

export default function DetailingItemFormFields({ formData, onChange, vocab, disabled }: BusinessFormFieldProps) {
  return (
    <div className="flex flex-col gap-5 border-t border-red-200 pt-5 bg-gradient-to-b from-gray-900/[0.03] to-transparent p-4 rounded-2xl">
      {/* Application Procedure */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> {vocab.processDetailsLabel}
        </label>
        <textarea
          placeholder="e.g. Snow foam pre-wash, clay bar decontamination, dual-action machine polish, apply 2 coats of 9H ceramic glass shield and IR cure..."
          value={formData.preparation}
          onChange={(e) => onChange('preparation', e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all resize-none"
        />
      </div>

      {/* Coatings & Materials Used */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-red-600" /> {vocab.suppliesLabel} (Comma-separated)
        </label>
        <input
          type="text"
          placeholder="e.g. 9H Nano-Ceramic Glass Coating, Paint Clay Bar, Heavy Cut Compound, Hydrophobic Spray Sealant"
          value={formData.ingredients}
          onChange={(e) => onChange('ingredients', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
        />
      </div>

      {/* Execution & Cure Duration */}
      <div className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-red-600" /> {vocab.timeEstimateLabel}
        </label>
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Work Time (Mins)</span>
            <input
              type="number"
              placeholder="120"
              value={formData.prepTimeMin}
              onChange={(e) => onChange('prepTimeMin', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:border-red-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Cure / Total Time (Mins)</span>
            <input
              type="number"
              placeholder="180"
              value={formData.prepTimeMax}
              onChange={(e) => onChange('prepTimeMax', e.target.value)}
              disabled={disabled}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold outline-none focus:border-red-600"
            />
          </div>
        </div>
      </div>

      {/* Vehicle Compatibility */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5 text-red-600" /> Vehicle Type & Class Compatibility
        </label>
        <input
          type="text"
          placeholder="e.g. Hatchback, Sedan, SUV, Luxury & Supercars"
          value={formData.portionSize === 'Good for 1' ? '' : formData.portionSize}
          onChange={(e) => onChange('portionSize', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-red-600 transition-all"
        />
      </div>

      {/* Master Detailer Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-red-600" /> {vocab.noteLabel} (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Includes official 3-Year Paint Protection Warranty & Certificate"
          value={formData.chefNote}
          onChange={(e) => onChange('chefNote', e.target.value)}
          disabled={disabled}
          className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold outline-none focus:border-red-600 transition-all"
        />
      </div>
    </div>
  );
}
