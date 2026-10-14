import { describe, it, expect } from 'vitest';
import { generateWhatsAppOrderLink, normalizePhoneNumber, isValidPhoneNumber } from './whatsappService';

describe('WhatsApp Service - Message Link Generator', () => {
  it('generates the exact requested message format for POS placed order', () => {
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

    expect(decodedMessage).toContain('Hi m! 👋');
    expect(decodedMessage).toContain('Thank you for ordering at *Tokyo Momos*.');
    expect(decodedMessage).toContain('*Order #79DB1D* has been placed ✅');
    expect(decodedMessage).toContain('🧾 *Your order*');
    expect(decodedMessage).toContain('- Veg Steamed Momos x 1');
    expect(decodedMessage).toContain('*Total items:* 1');
    expect(decodedMessage).toContain('*Total:* ₹129');
    expect(decodedMessage).toContain('*Payment:* Please pay at the counter for the order to get placed.');
    expect(decodedMessage).toContain('💬 We would love to hear your feedback! How was your experience with us?');
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
    expect(decodedMessage).toContain('Hi Sheikh Faizan! 👋');
    expect(decodedMessage).toContain('Thank you for ordering at *Biryani Central*.');
    expect(decodedMessage).toContain('- Chicken Biryani x 2');
    expect(decodedMessage).toContain('- Raita x 1');
    expect(decodedMessage).toContain('- Coke 250ml x 3');
    expect(decodedMessage).toContain('*Total items:* 6');
    expect(decodedMessage).toContain('*Total:* ₹550');
    expect(decodedMessage).toContain('💬 We would love to hear your feedback! How was your experience with us?');
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
    expect(decodedMessage).toContain('Hi Alice! 👋');
    expect(decodedMessage).toContain('READY FOR PICKUP*! 🍽️');
    expect(decodedMessage).toContain('- Fried Momos x 2');
    expect(decodedMessage).toContain('*Total items:* 2');
    expect(decodedMessage).toContain('*Total:* ₹240');
    expect(decodedMessage).toContain('We would love your feedback—please let us know how your experience was!');
  });
});
