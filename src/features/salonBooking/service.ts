import { SalonAppointment, SalonBookingData, BookingTimeSlot, SpecialistOption, BookingStatus } from './types';

export const DEFAULT_SPECIALISTS: SpecialistOption[] = [
  { id: 'any', name: 'Any Available Specialist', role: 'Next Available Stylist' },
  { id: 'senior_stylist', name: 'Senior Hair Stylist', role: 'Hair Care & Cut Specialist' },
  { id: 'facial_expert', name: 'Skin & Facial Expert', role: 'Skin & Spa Specialist' },
  { id: 'beauty_artist', name: 'Nails & Beauty Artist', role: 'Beauty Specialist' },
];

export const SALON_TIME_SLOTS = [
  '09:30 AM',
  '10:30 AM',
  '11:30 AM',
  '12:30 PM',
  '02:00 PM',
  '03:00 PM',
  '04:30 PM',
  '06:00 PM',
  '07:30 PM',
];

/**
 * Generates time slots for a given date.
 */
export function generateAvailableSlots(dateStr?: string): BookingTimeSlot[] {
  const today = new Date().toISOString().split('T')[0];
  const isToday = dateStr === today;
  const currentHour = new Date().getHours();

  return SALON_TIME_SLOTS.map((time, idx) => {
    // Basic availability check for past slots today
    let available = true;
    if (isToday) {
      const slotHour = 9 + idx * 1.2;
      if (currentHour >= slotHour) {
        available = false;
      }
    }
    return {
      id: `slot_${idx}`,
      time,
      available,
    };
  });
}

/**
 * Formats salon booking parameters into a structured notes string for order storage.
 */
export function formatSalonBookingNotes(booking: SalonBookingData): string {
  const parts = [];
  parts.push(`📅 Booking Date: ${booking.bookingDate}`);
  parts.push(`⏰ Time Slot: ${booking.bookingTime}`);
  if (booking.specialistName) {
    parts.push(`✂️ Specialist: ${booking.specialistName}`);
  }
  if (booking.notes?.trim()) {
    parts.push(`📝 Notes: ${booking.notes.trim()}`);
  }
  return parts.join('\n');
}

/**
 * Parses booking metadata back from order notes string.
 */
export function parseSalonBookingNotes(notes: string = ''): {
  bookingDate: string;
  bookingTime: string;
  specialistName: string;
  userNotes: string;
} {
  let bookingDate = '';
  let bookingTime = '';
  let specialistName = '';
  let userNotes = '';

  const lines = notes.split('\n');
  lines.forEach((line) => {
    if (line.includes('📅 Booking Date:')) {
      bookingDate = line.replace('📅 Booking Date:', '').trim();
    } else if (line.includes('⏰ Time Slot:')) {
      bookingTime = line.replace('⏰ Time Slot:', '').trim();
    } else if (line.includes('✂️ Specialist:')) {
      specialistName = line.replace('✂️ Specialist:', '').trim();
    } else if (line.includes('📝 Notes:')) {
      userNotes = line.replace('📝 Notes:', '').trim();
    }
  });

  return { bookingDate, bookingTime, specialistName, userNotes };
}

