import { describe, it, expect } from 'vitest';
import { generateWhatsAppOrderLink, normalizePhoneNumber, isValidPhoneNumber, isSalonBusiness, getGrowlicFormLink } from './whatsappService';

describe('WhatsApp Service - Message Link Generator', () => {
  it('generates the exact requested message format for POS placed order including Growlic promo footer', () => {
    const link = generateWhatsAppOrderLink({
      type: 'placed',
      phone: '9876543210',
      customerName: 'm',
      orderId: '65a8e279db1d',
      restaurantName: 'Tokyo Momos',
      total: 129,
      items: [
        { name: 'Veg Steamed Momos', quantity: 1, price: 129 },
      ],
    });

    expect(link).toContain('https://wa.me/919876543210?text=');
    const decodedMessage = decodeURIComponent(link.split('?text=')[1]);

    expect(decodedMessage).toContain('Hi m!');
    expect(decodedMessage).toContain('Thank you for ordering at *Tokyo Momos*.');
    expect(decodedMessage).toContain('*Order #79DB1D* has been placed.');
    expect(decodedMessage).toContain('*Your order:*');
    expect(decodedMessage).toContain('- Veg Steamed Momos x 1');
    expect(decodedMessage).toContain('*Total items:* 1');
    expect(decodedMessage).toContain('*Total:* ₹129');
    expect(decodedMessage).toContain('*Payment:* Please pay at the counter for the order to get placed.');
    expect(decodedMessage).toContain('We would love to hear your feedback! How was your experience with us?');
    expect(decodedMessage).toContain('_Powered by Growlic_ ⚡');
    expect(decodedMessage).toContain('Custom automation & software to grow your business.');
    expect(decodedMessage).toContain('Fill the form, get a *free audit* 👉');
  });

  it('correctly aggregates multiple item quantities in order receipt', () => {
    const link = generateWhatsAppOrderLink({
      type: 'placed',
      phone: '919876543210',
      customerName: 'Sheikh Faizan',
      orderId: 'ORD-998811',
      restaurantName: 'Biryani Central',
      total: 550,
      items: [
        { name: 'Chicken Biryani', quantity: 2 },
        { name: 'Raita', quantity: 1 },
        { name: 'Coke 250ml', quantity: 3 },
      ],
    });

    const decodedMessage = decodeURIComponent(link.split('?text=')[1]);
    expect(decodedMessage).toContain('Hi Sheikh Faizan!');
    expect(decodedMessage).toContain('Thank you for ordering at *Biryani Central*.');
    expect(decodedMessage).toContain('- Chicken Biryani x 2');
    expect(decodedMessage).toContain('- Raita x 1');
    expect(decodedMessage).toContain('- Coke 250ml x 3');
    expect(decodedMessage).toContain('*Total items:* 6');
    expect(decodedMessage).toContain('*Total:* ₹550');
    expect(decodedMessage).toContain('We would love to hear your feedback! How was your experience with us?');
    expect(decodedMessage).toContain('_Powered by Growlic_ ⚡');
  });

  it('generates proper pickup notification message when order is ready', () => {
    const link = generateWhatsAppOrderLink({
      type: 'ready',
      phone: '9876543210',
      customerName: 'Alice',
      orderId: '65a8e279db1d',
      restaurantName: 'The Momos Corner',
      total: 240,
      items: [
        { name: 'Fried Momos', quantity: 2 },
      ],
    });

    const decodedMessage = decodeURIComponent(link.split('?text=')[1]);
    expect(decodedMessage).toContain('Hi Alice!');
    expect(decodedMessage).toContain('READY FOR PICKUP*!');
    expect(decodedMessage).toContain('- Fried Momos x 2');
    expect(decodedMessage).toContain('*Total items:* 2');
    expect(decodedMessage).toContain('*Total:* ₹240');
    expect(decodedMessage).toContain('Enjoy your meal! We would love your feedback - please let us know how your experience was!');
    expect(decodedMessage).toContain('_Powered by Growlic_ ⚡');
    expect(decodedMessage).toContain('Fill the form, get a *free audit* 👉');
  });

  it('generates updated order receipt notification when items change', () => {
    const link = generateWhatsAppOrderLink({
      type: 'updated',
      phone: '9876543210',
      customerName: 'Sheikh',
      orderId: '6ad0c4ea35b87714b77b4571',
      restaurantName: 'Tokyo Momos',
      total: 350,
      items: [
        { name: 'Chicken Fried Momos', quantity: 2 },
        { name: 'Veg Steamed Momos', quantity: 1 },
      ],
    });

    const decodedMessage = decodeURIComponent(link.split('?text=')[1]);
    expect(decodedMessage).toContain('Hi Sheikh!');
    expect(decodedMessage).toContain('Your order *#7B4571* at *Tokyo Momos* has been *UPDATED*.');
    expect(decodedMessage).toContain('*Updated order:*');
    expect(decodedMessage).toContain('- Chicken Fried Momos x 2');
    expect(decodedMessage).toContain('- Veg Steamed Momos x 1');
    expect(decodedMessage).toContain('*Total items:* 3');
    expect(decodedMessage).toContain('*Updated Total:* ₹350');
    expect(decodedMessage).toContain('_Powered by Growlic_ ⚡');
  });

  it('generates distinct Salon booking confirmation message with appointment details and zero food wording', () => {
    const link = generateWhatsAppOrderLink({
      type: 'confirmed',
      phone: '4554614556',
      customerName: 'test@2',
      orderId: '66f54b87c12',
      orderNumber: '4b87',
      restaurantName: 'Luxe Hair & Spa Studio',
      businessCategory: 'salon',
      total: 1617,
      appointmentDetails: {
        bookingDate: '2026-10-16',
        bookingTime: '10:30 AM',
        specialistName: 'Any Available Specialist',
        userNotes: 'Senior stylist preferred',
      },
      items: [
        { name: 'Signature Haircut & Styling', quantity: 3, price: 599 },
      ],
    });

    const decodedMessage = decodeURIComponent(link.split('?text=')[1]);

    // Salon specific greetings and header
    expect(decodedMessage).toContain('Hi test@2!');
    expect(decodedMessage).toContain('booking *#Booking-4b87* at *Luxe Hair & Spa Studio* is *CONFIRMED*!');
    expect(decodedMessage).toContain('*Booking Date:* 2026-10-16');
    expect(decodedMessage).toContain('*Time Slot:* 10:30 AM');
    expect(decodedMessage).toContain('*Stylist:* Any Available Specialist');
    expect(decodedMessage).toContain('*Notes:* Senior stylist preferred');

    // Services booked (not "food order")
    expect(decodedMessage).toContain('*Services Booked:*');
    expect(decodedMessage).toContain('- Signature Haircut & Styling x 3');
    expect(decodedMessage).toContain('*Total Services:* 3');
    expect(decodedMessage).toContain('*Total Amount:* ₹1617');

    // Must NEVER contain restaurant / food wording
    expect(decodedMessage).not.toContain('meal');
    expect(decodedMessage).not.toContain('PICKUP');
    expect(decodedMessage).not.toContain('counter for the order');

    // Must contain Growlic promotional footer with free audit link
    expect(decodedMessage).toContain('_Powered by Growlic_ ⚡');
    expect(decodedMessage).toContain('Custom automation & software to grow your business.');
    expect(decodedMessage).toContain('Fill the form, get a *free audit* 👉');
  });
});
