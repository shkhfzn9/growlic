export type BookingStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface BookingTimeSlot {
  id: string;
  time: string; // e.g. '10:00 AM'
  available: boolean;
}

export interface SpecialistOption {
  id: string;
  name: string;
  role: string;
}

export interface SalonBookingData {
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // e.g. '10:00 AM'
  specialistId?: string;
  specialistName?: string;
  notes?: string;
}

export interface SalonAppointment {
  _id: string;
  restaurantId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  specialistName?: string;
  notes?: string;
  status: BookingStatus;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
  }>;
  totalAmount: number;
  createdAt: string;
}
