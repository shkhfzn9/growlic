'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, UserCheck, FileText, CheckCircle2 } from 'lucide-react';
import { DEFAULT_SPECIALISTS, generateAvailableSlots } from '../service';
import { SalonBookingData, BookingTimeSlot } from '../types';
import { getBookedSlotsAction } from '@/actions/orders';

interface SalonBookingFormProps {
  restaurantId?: string;
  onBookingChange: (data: SalonBookingData) => void;
  disabled?: boolean;
}

export default function SalonBookingForm({ restaurantId, onBookingChange, disabled }: SalonBookingFormProps) {
  // Generate 15 days in future
  const dateOptions = useMemo(() => {
    const list: Array<{ dateStr: string; dayLabel: string; subLabel: string; fullLabel: string }> = [];
    const now = new Date();
    for (let i = 0; i < 15; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const subLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const fullLabel = `${dayLabel}, ${subLabel}`;
      list.push({ dateStr, dayLabel, subLabel, fullLabel });
    }
    return list;
  }, []);

  const minDate = dateOptions[0].dateStr;
  const maxDate = dateOptions[dateOptions.length - 1].dateStr;

  const [selectedDate, setSelectedDate] = useState<string>(minDate);
  const [availableSlots, setAvailableSlots] = useState<BookingTimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('10:30 AM');
  const [specialistName, setSpecialistName] = useState<string>('Any Available Specialist');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    let active = true;
    const baseSlots = generateAvailableSlots(selectedDate);

    const fetchBooked = async () => {
      if (!restaurantId) {
        if (active) {
          setAvailableSlots(baseSlots);
          const firstAvail = baseSlots.find((s) => s.available);
          if (firstAvail && !baseSlots.find((s) => s.time === selectedTime && s.available)) {
            setSelectedTime(firstAvail.time);
          }
        }
        return;
      }

      try {
        const bookedTimes = await getBookedSlotsAction(restaurantId, selectedDate, specialistName);
        if (!active) return;
        const updatedSlots = baseSlots.map((slot) => {
          if (bookedTimes.includes(slot.time)) {
            return { ...slot, available: false };
          }
          return slot;
        });
        setAvailableSlots(updatedSlots);

        const firstAvail = updatedSlots.find((s) => s.available);
        if (firstAvail && !updatedSlots.find((s) => s.time === selectedTime && s.available)) {
          setSelectedTime(firstAvail.time);
        }
      } catch (err) {
        if (active) setAvailableSlots(baseSlots);
      }
    };

    fetchBooked();

    return () => {
      active = false;
    };
  }, [selectedDate, specialistName, restaurantId]);

  useEffect(() => {
    onBookingChange({
      bookingDate: selectedDate,
      bookingTime: selectedTime,
      specialistName,
      notes,
    });
  }, [selectedDate, selectedTime, specialistName, notes, onBookingChange]);

  const selectedDateObj = dateOptions.find((d) => d.dateStr === selectedDate);
  const dateDisplayHeading = selectedDateObj ? selectedDateObj.fullLabel : selectedDate;

  return (
    <div className="flex flex-col gap-4 bg-purple-50/60 border border-purple-200/70 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-purple-200/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-700" />
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-purple-950">
            Salon Appointment Schedule
          </h4>
        </div>
        <span className="text-[10px] font-extrabold text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded-full">
          Book up to 15 days ahead
        </span>
      </div>

      {/* 1. 15-Day Date Selector Calendar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1">
            <span>Select Booking Date *</span>
          </label>
          <div className="flex items-center gap-1.5 bg-white border border-purple-200 rounded-lg px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-purple-700" />
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={selectedDate}
              disabled={disabled}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-[11px] font-bold text-purple-950 bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Scrollable 15-Day Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {dateOptions.map((option) => {
            const isSelected = selectedDate === option.dateStr;
            return (
              <button
                key={option.dateStr}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedDate(option.dateStr)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 min-w-[76px] ${
                  isSelected
                    ? 'bg-purple-900 text-white border-purple-900 shadow-sm ring-2 ring-purple-900/20'
                    : 'bg-white text-purple-950 border-purple-200 hover:border-purple-400'
                }`}
              >
                <span>{option.dayLabel}</span>
                <span className={`text-[10px] font-semibold ${isSelected ? 'text-purple-200' : 'text-purple-600'}`}>
                  {option.subLabel}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-purple-800 font-semibold italic">
          Selected Date: <strong>{dateDisplayHeading}</strong>
        </p>
      </div>

      {/* 2. Time Slot Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-purple-900 uppercase tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-700" />
            <span>Select Time Slot *</span>
          </span>
          <span className="text-[10px] font-black text-purple-900 bg-purple-200/70 px-2 py-0.5 rounded-md">
            {selectedTime}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {availableSlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              disabled={disabled || !slot.available}
              onClick={() => setSelectedTime(slot.time)}
              className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                selectedTime === slot.time
                  ? 'bg-purple-900 text-white border-purple-900 shadow-sm font-black ring-2 ring-purple-900/20'
                  : slot.available
                  ? 'bg-white text-purple-950 border-purple-200 hover:border-purple-400'
                  : 'bg-gray-100 text-gray-400 border-gray-200 line-through cursor-not-allowed'
              }`}
            >
              {selectedTime === slot.time && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-purple-200" />}
              <span>{slot.time}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Preferred Specialist / Stylist */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-purple-700" />
          <span>Preferred Specialist (Optional)</span>
        </label>
        <select
          value={specialistName}
          disabled={disabled}
          onChange={(e) => setSpecialistName(e.target.value)}
          className="w-full text-xs font-bold text-purple-950 bg-white border border-purple-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-700/20 cursor-pointer"
        >
          {DEFAULT_SPECIALISTS.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name} ({s.role})
            </option>
          ))}
        </select>
      </div>

      {/* 4. Booking Notes / Treatment Preferences */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-purple-700" />
          <span>Treatment Notes / Requests</span>
        </label>
        <input
          type="text"
          value={notes}
          disabled={disabled}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Sensitive scalp, haircut style preference"
          className="w-full text-xs text-purple-950 bg-white border border-purple-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-700/20"
        />
      </div>
    </div>
  );
}

