import { ExpenseUnit } from './model';

export interface PlainExpenseCategory {
  _id: string;
  restaurantId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlainExpenseItem {
  _id: string;
  restaurantId: string;
  categoryId: string | { _id: string; name: string };
  categoryName?: string;
  name: string;
  unit: ExpenseUnit;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlainExpenseLog {
  _id: string;
  restaurantId: string;
  itemId: string | { _id: string; name: string; unit: ExpenseUnit; categoryId?: string };
  itemName?: string;
  itemUnit?: ExpenseUnit;
  categoryName?: string;
  purchaseDate: string; // ISO date string YYYY-MM-DD
  quantity: number;
  totalPrice: number;
  pricePerUnit: number;
  previousLogId?: string | null;
  deltaPerUnit?: number | null;
  deltaTotal?: number | null;
  deltaPercent?: number | null;
  note?: string;
  vendor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenseCategoryDTO {
  restaurantId: string;
  name: string;
}

export interface CreateExpenseItemDTO {
  restaurantId: string;
  categoryId: string;
  name: string;
  unit: ExpenseUnit;
}

export interface UpdateExpenseItemDTO {
  name?: string;
  unit?: ExpenseUnit;
  categoryId?: string;
  isActive?: boolean;
}

export interface CreateExpenseLogDTO {
  restaurantId: string;
  itemId: string;
  purchaseDate: string | Date;
  quantity: number;
  totalPrice: number;
  note?: string;
  vendor?: string;
  createdBy?: string;
}

export interface UpdateExpenseLogDTO {
  purchaseDate?: string | Date;
  quantity?: number;
  totalPrice?: number;
  note?: string;
  vendor?: string;
}

export interface ItemTimeSeriesBucket {
  period: string; // e.g. "2026-08-05" or "2026-W32" or "2026-08"
  avgPricePerUnit: number;
  minPricePerUnit: number;
  maxPricePerUnit: number;
  totalQuantity: number;
  totalSpend: number;
  purchaseCount: number;
  deltaVsPrevPeriod?: number | null;
}

export interface ExpenseDashboardSummary {
  totalSpendThisWeek: number;
  totalSpendLastWeek: number;
  weekOverWeekDelta: number;
  weekOverWeekPercent: number;

  totalSpendThisMonth: number;
  totalSpendLastMonth: number;
  monthOverMonthDelta: number;
  monthOverMonthPercent: number;

  topSpendItems: Array<{
    itemId: string;
    itemName: string;
    categoryName: string;
    unit: string;
    totalSpend: number;
    totalQuantity: number;
  }>;

  highestPriceJumpItem: {
    itemId: string;
    itemName: string;
    categoryName: string;
    unit: string;
    prevPrice: number;
    currentPrice: number;
    deltaPercent: number;
  } | null;
}

export interface ItemMarginImpact {
  itemId: string;
  itemName: string;
  categoryName: string;
  unit: ExpenseUnit;
  totalQuantity: number;
  totalSpend: number;
  firstPricePerUnit: number;
  latestPricePerUnit: number;
  maxPricePerUnit: number;
  minPricePerUnit: number;
  totalExtraPaid: number;
  totalMoneySaved: number;
  netExtraSpend: number;
  inflationPercent: number;
  riskLevel: 'HIGH_RISK' | 'MEDIUM_RISK' | 'STABLE' | 'SAVINGS';
}

export interface MarginImpactSummary {
  timeframe: string;
  totalPeriodSpend: number;
  totalExtraSpendDueToInflation: number;
  totalSavingsFromPriceDrops: number;
  netInflationImpact: number;
  overallInflationPercent: number;
  topMarginEaterItem: ItemMarginImpact | null;
  items: ItemMarginImpact[];
}
