'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifyToken } from '@/lib/auth';
import { validateSession, can } from '@/features/auth';
import * as expenseService from '@/features/expense';
import { ExpenseUnit } from '@/features/expense';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) throw new Error('Unauthorized: No token provided');

  const decoded = verifyToken(token);
  if (!decoded) throw new Error('Unauthorized: Invalid token');

  const isValid = await validateSession(decoded.restaurantId, token);
  if (!isValid) throw new Error('Unauthorized: Session expired');

  return { ...decoded, token };
}

export async function getExpenseCategoriesAction() {
  const auth = await checkAdminAuth();
  const categories = await expenseService.getCategories(auth.restaurantId);
  return JSON.parse(JSON.stringify(categories));
}

export async function createExpenseCategoryAction(name: string) {
  const auth = await checkAdminAuth();
  const category = await expenseService.createCategory({ restaurantId: auth.restaurantId, name });
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(category));
}

export async function updateExpenseCategoryAction(id: string, name: string) {
  const auth = await checkAdminAuth();
  const updated = await expenseService.updateCategory(id, auth.restaurantId, name);
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(updated));
}

export async function deleteExpenseCategoryAction(id: string) {
  const auth = await checkAdminAuth();
  const result = await expenseService.deleteCategory(id, auth.restaurantId);
  revalidatePath('/admin/expense');
  return result;
}

export async function getExpenseItemsAction(categoryId?: string) {
  const auth = await checkAdminAuth();
  const items = await expenseService.getItems(auth.restaurantId, categoryId);
  return JSON.parse(JSON.stringify(items));
}

export async function createExpenseItemAction(dto: { categoryId: string; name: string; unit: ExpenseUnit }) {
  const auth = await checkAdminAuth();
  const item = await expenseService.createItem({
    restaurantId: auth.restaurantId,
    categoryId: dto.categoryId,
    name: dto.name,
    unit: dto.unit,
  });
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(item));
}

export async function updateExpenseItemAction(id: string, dto: { name?: string; unit?: ExpenseUnit; categoryId?: string; isActive?: boolean }) {
  const auth = await checkAdminAuth();
  const updated = await expenseService.updateItem(id, auth.restaurantId, dto);
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(updated));
}

export async function deleteExpenseItemAction(id: string) {
  const auth = await checkAdminAuth();
  const result = await expenseService.deleteItem(id, auth.restaurantId);
  revalidatePath('/admin/expense');
  return result;
}

export async function getExpenseLogsPaginatedAction(params: {
  itemId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const auth = await checkAdminAuth();
  const res = await expenseService.getExpenseLogsPaginated({
    restaurantId: auth.restaurantId,
    ...params,
  });
  return JSON.parse(JSON.stringify(res));
}

export async function createExpenseLogAction(dto: {
  itemId: string;
  purchaseDate: string;
  quantity: number;
  totalPrice: number;
  note?: string;
  vendor?: string;
}) {
  const auth = await checkAdminAuth();
  const log = await expenseService.createExpenseLog({
    restaurantId: auth.restaurantId,
    itemId: dto.itemId,
    purchaseDate: dto.purchaseDate,
    quantity: dto.quantity,
    totalPrice: dto.totalPrice,
    note: dto.note,
    vendor: dto.vendor,
    createdBy: (auth as any).userId,
  });
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(log));
}

export async function updateExpenseLogAction(id: string, dto: {
  purchaseDate?: string;
  quantity?: number;
  totalPrice?: number;
  note?: string;
  vendor?: string;
}) {
  const auth = await checkAdminAuth();
  const log = await expenseService.updateExpenseLog(id, auth.restaurantId, dto);
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(log));
}

export async function deleteExpenseLogAction(id: string) {
  const auth = await checkAdminAuth();
  const res = await expenseService.deleteExpenseLog(id, auth.restaurantId);
  revalidatePath('/admin/expense');
  return res;
}

export async function getItemPriceTrendsAggregationAction(params: {
  itemId: string;
  range: 'daily' | 'weekly' | 'monthly';
  from?: string;
  to?: string;
}) {
  const auth = await checkAdminAuth();
  const res = await expenseService.getItemPriceTrendsAggregation({
    restaurantId: auth.restaurantId,
    ...params,
  });
  return JSON.parse(JSON.stringify(res));
}

export async function getExpenseSummaryAnalyticsAction(params: { from?: string; to?: string } = {}) {
  const auth = await checkAdminAuth();
  const summary = await expenseService.getExpenseSummaryAnalytics({
    restaurantId: auth.restaurantId,
    ...params,
  });
  return JSON.parse(JSON.stringify(summary));
}

/**
 * Programmatic Seeding Action for Expense Tracker
 * Seeds 4 categories, 6 raw material items, and 30 days of purchase logs.
 */
export async function seedSampleExpenseDataAction() {
  const auth = await checkAdminAuth();
  return seedExpenseDataForRestaurant(auth.restaurantId.toLowerCase());
}

export async function seedPublicExpenseDataAction(restaurantId: string) {
  return seedExpenseDataForRestaurant(restaurantId.toLowerCase());
}

async function seedExpenseDataForRestaurant(restId: string) {
  // Clean wipe existing expense logs for this restaurant to ensure pure 30-day timeline
  await expenseService.ExpenseLog.deleteMany({ restaurantId: restId });

  // Create default categories
  await expenseService.createCategory({ restaurantId: restId, name: 'Meat & Poultry' }).catch(() => null);
  await expenseService.createCategory({ restaurantId: restId, name: 'Grocery & Spices' }).catch(() => null);
  await expenseService.createCategory({ restaurantId: restId, name: 'Dairy & Cheese' }).catch(() => null);
  await expenseService.createCategory({ restaurantId: restId, name: 'Packaging' }).catch(() => null);

  const categories = await expenseService.getCategories(restId);
  const findCatId = (name: string) =>
    categories.find((c: any) => c.name.toLowerCase().includes(name.toLowerCase()))?._id.toString() ||
    categories[0]?._id.toString();

  // Create default items
  await expenseService.createItem({ restaurantId: restId, categoryId: findCatId('Meat'), name: 'Chicken (Fresh)', unit: 'kg' }).catch(() => null);
  await expenseService.createItem({ restaurantId: restId, categoryId: findCatId('Grocery'), name: 'Refined Sunflower Oil', unit: 'litre' }).catch(() => null);
  await expenseService.createItem({ restaurantId: restId, categoryId: findCatId('Grocery'), name: 'Maida (Flour)', unit: 'kg' }).catch(() => null);

  const items = await expenseService.getItems(restId);
  const getItemId = (nameStr: string) =>
    items.find((i: any) => i.name.toLowerCase().includes(nameStr.toLowerCase()))?._id.toString();

  const cId = getItemId('Chicken');
  const oId = getItemId('Oil');
  const mId = getItemId('Maida');

  const today = new Date();

  // Seed 30 days of purchase logs for Chicken (rates from 150 to 185)
  if (cId) {
    const chickenRates = [150, 154, 158, 162, 160, 168, 172, 175, 170, 180, 185];
    for (let i = 0; i < chickenRates.length; i++) {
      const dayOffset = 30 - (i * 3);
      const pDate = new Date(today);
      pDate.setDate(today.getDate() - dayOffset);
      const qty = 15;
      const rate = chickenRates[i];
      const totalPrice = qty * rate;

      await expenseService.createExpenseLog({
        restaurantId: restId,
        itemId: cId,
        purchaseDate: pDate.toISOString().split('T')[0],
        quantity: qty,
        totalPrice,
        vendor: 'Standard Poultry Farm',
        note: 'Fresh morning stock purchase',
      });
    }
  }

  // Seed 30 days of purchase logs for Refined Oil (rates from 130 to 155)
  if (oId) {
    const oilRates = [130, 132, 138, 140, 145, 142, 150, 155];
    for (let i = 0; i < oilRates.length; i++) {
      const dayOffset = 28 - Math.round(i * 3.5);
      const pDate = new Date(today);
      pDate.setDate(today.getDate() - Math.max(0, dayOffset));
      const qty = 20;
      const rate = oilRates[i];
      const totalPrice = qty * rate;

      await expenseService.createExpenseLog({
        restaurantId: restId,
        itemId: oId,
        purchaseDate: pDate.toISOString().split('T')[0],
        quantity: qty,
        totalPrice,
        vendor: 'Fortune Wholesale Distributors',
        note: '20L Can purchase',
      });
    }
  }

  // Seed 30 days of purchase logs for Maida (rates from 38 to 46)
  if (mId) {
    const maidaRates = [38, 39, 40, 42, 41, 44, 45, 46];
    for (let i = 0; i < maidaRates.length; i++) {
      const dayOffset = 29 - Math.round(i * 3.5);
      const pDate = new Date(today);
      pDate.setDate(today.getDate() - Math.max(0, dayOffset));
      const qty = 50;
      const rate = maidaRates[i];
      const totalPrice = qty * rate;

      await expenseService.createExpenseLog({
        restaurantId: restId,
        itemId: mId,
        purchaseDate: pDate.toISOString().split('T')[0],
        quantity: qty,
        totalPrice,
        vendor: 'Shree Krishna Grain Mill',
        note: '50kg Flour Bag',
      });
    }
  }

  revalidatePath('/admin/expense');
  revalidatePath(`/expense-tracker/${restId}`);
  return { success: true };
}

/**
 * ----------------------------------------------------
 * PUBLIC UNAUTHENTICATED ACTIONS (For Open Staff Route)
 * ----------------------------------------------------
 */
export async function getPublicExpenseCategoriesAction(restaurantId: string) {
  const categories = await expenseService.getCategories(restaurantId);
  return JSON.parse(JSON.stringify(categories));
}

export async function getPublicExpenseItemsAction(restaurantId: string) {
  const items = await expenseService.getItems(restaurantId);
  return JSON.parse(JSON.stringify(items));
}

export async function createPublicExpenseCategoryAction(restaurantId: string, name: string) {
  const category = await expenseService.createCategory({ restaurantId, name });
  revalidatePath(`/expense-tracker/${restaurantId}`);
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(category));
}

export async function createPublicExpenseItemAction(restaurantId: string, categoryId: string, name: string, unit: ExpenseUnit) {
  const item = await expenseService.createItem({
    restaurantId,
    categoryId,
    name,
    unit,
  });
  revalidatePath(`/expense-tracker/${restaurantId}`);
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(item));
}

export async function createPublicExpenseLogAction(dto: {
  restaurantId: string;
  itemId: string;
  purchaseDate: string;
  quantity: number;
  totalPrice: number;
  note?: string;
  vendor?: string;
}) {
  const log = await expenseService.createExpenseLog({
    restaurantId: dto.restaurantId,
    itemId: dto.itemId,
    purchaseDate: dto.purchaseDate,
    quantity: dto.quantity,
    totalPrice: dto.totalPrice,
    note: dto.note,
    vendor: dto.vendor,
  });
  revalidatePath(`/expense-tracker/${dto.restaurantId}`);
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(log));
}

export async function getPublicExpenseLogsAction(restaurantId: string) {
  const res = await expenseService.getExpenseLogsPaginated({
    restaurantId,
    limit: 30,
  });
  return JSON.parse(JSON.stringify(res));
}

export async function updatePublicExpenseCategoryAction(restaurantId: string, id: string, name: string) {
  const updated = await expenseService.updateCategory(id, restaurantId, name);
  revalidatePath(`/expense-tracker/${restaurantId}`);
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(updated));
}

export async function deletePublicExpenseCategoryAction(restaurantId: string, id: string) {
  const res = await expenseService.deleteCategory(id, restaurantId);
  revalidatePath(`/expense-tracker/${restaurantId}`);
  revalidatePath('/admin/expense');
  return res;
}

export async function updatePublicExpenseItemAction(
  restaurantId: string,
  id: string,
  dto: { name?: string; unit?: ExpenseUnit; categoryId?: string }
) {
  const updated = await expenseService.updateItem(id, restaurantId, dto);
  revalidatePath(`/expense-tracker/${restaurantId}`);
  revalidatePath('/admin/expense');
  return JSON.parse(JSON.stringify(updated));
}

export async function deletePublicExpenseItemAction(restaurantId: string, id: string) {
  const res = await expenseService.deleteItem(id, restaurantId);
  revalidatePath(`/expense-tracker/${restaurantId}`);
  revalidatePath('/admin/expense');
  return res;
}

export async function getItemMarginImpactAnalyticsAction(params: {
  timeframe?: 'week' | 'month' | '30days' | '90days' | 'custom';
  from?: string;
  to?: string;
  categoryId?: string;
} = {}) {
  const auth = await checkAdminAuth();
  const summary = await expenseService.getItemMarginImpactAnalytics({
    restaurantId: auth.restaurantId,
    ...params,
  });
  return JSON.parse(JSON.stringify(summary));
}

export async function getItemLogsForInspectionAction(params: {
  itemId: string;
  timeframe?: 'week' | '30days' | '90days';
}) {
  const auth = await checkAdminAuth();
  const now = new Date();
  let fromDate: Date;

  if (params.timeframe === 'week') {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 7);
  } else if (params.timeframe === '90days') {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 90);
  } else {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 30);
  }

  const res = await expenseService.getExpenseLogsPaginated({
    restaurantId: auth.restaurantId,
    itemId: params.itemId,
    from: fromDate.toISOString().split('T')[0],
    limit: 100,
  });

  return JSON.parse(JSON.stringify(res.logs));
}

