import { z } from 'zod';
import { ValidationError } from '@/shared/errors';

export const createOrderItemZodSchema = z.object({
  menuItemId: z.string().min(1, 'Menu Item ID is required'),
  name: z.string().optional(),
  price: z.number().optional(),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(50, 'Quantity cannot exceed 50 per line'),
  image: z.string().optional(),
  originatedFromNudge: z.boolean().optional(),
  nudgeType: z.enum(['cross_sell', 'threshold_discount', 'combo_freebie']).optional(),
  nudgeRuleId: z.string().optional(),
});

export const createOrderZodSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  customerName: z.string().optional().default('Counter Guest'),
  customerPhone: z.string().min(1, 'Customer phone is required').refine((phone) => {
    const clean = phone.trim().replace(/\D/g, '');
    return clean.length >= 8;
  }, { message: 'Please enter a valid phone number' }),
  source: z.enum(['qr_scan', 'admin_counter']).optional(),
  customerOldPhone: z.string().optional(),
  tableId: z.string().optional(),
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']).optional(),
  paymentMode: z.enum(['cash', 'online', 'credit']).optional(),
  items: z
    .array(createOrderItemZodSchema)
    .min(1, 'Order must contain at least 1 item')
    .max(50, 'Order cannot contain more than 50 items'),
  subtotal: z.number().optional(),
  total: z.number().optional(),
  discount: z.number().optional(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  appointmentDetails: z
    .object({
      bookingDate: z.string(),
      bookingTime: z.string(),
      specialistId: z.string().optional(),
      specialistName: z.string().optional(),
      userNotes: z.string().optional(),
    })
    .optional(),
});

export type CreateOrderPayload = z.infer<typeof createOrderZodSchema>;

export const orderSchemas = {
  createOrder: (data: any) => {
    const result = createOrderZodSchema.safeParse(data);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Validation failed';
      throw new ValidationError(firstError);
    }
    return result.data;
  },

  orderId: (id: string) => {
    if (!id) {
      throw new ValidationError('Order ID is required');
    }
  },

  restaurantId: (restaurantId: string) => {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }
  },
};
