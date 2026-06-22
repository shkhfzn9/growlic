/**
 * Sums the subtotal price from a list of order items.
 * 
 * @param items List of items containing unit price and quantity.
 * @returns The calculated subtotal.
 */
export function calculateSubtotal(items: Array<{ price: number; quantity: number }>): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
