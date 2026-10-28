export type PnLTimePeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_7_days'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'specific_month'
  | 'quarter'
  | 'custom'
  | 'single_date';

export type QuarterName = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export type PnLBreakdownGranularity = 'day' | 'week' | 'month' | 'quarter';

export interface PnLDateRange {
  start: Date;
  end: Date;
  label: string;
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  period: PnLTimePeriod;
}

export interface PnLCategoryExpense {
  categoryId: string;
  categoryName: string;
  type: 'cogs' | 'opex';
  totalSpend: number;
  itemCount: number;
  percentageOfNetSales: number;
}

export interface PnLSummaryMetrics {
  // Top Line Revenue
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  taxCollected: number;
  totalOrders: number;
  averageOrderValue: number;

  // Direct Costs
  cogsTracked: number;
  cogsBenchmarkEstimated: number;
  cogsUsed: number;
  isCogsEstimated: boolean;
  cogsRatio: number; // percentage of netSales
  cogsMode: 'actual' | 'custom' | 'benchmark';
  customCogsPercent?: number | null;

  // Gross Profit
  grossProfit: number;
  grossMargin: number; // percentage

  // Operating Expenses
  totalOpex: number;
  opexRatio: number; // percentage of netSales
  categoryExpenses: PnLCategoryExpense[];

  // Bottom Line Profit & Loss
  operatingProfit: number; // EBITDA
  operatingMargin: number;
  netProfit: number; // Gross Profit - OPEX
  netMargin: number; // percentage

  // Operational Context
  activeDaysCount: number;
  dailyAverageSales: number;
  dailyAverageProfit: number;
}

export interface PnLTimeBucket {
  periodKey: string;     // YYYY-MM-DD or Month name
  displayLabel: string;  // e.g. "Fri, Oct 23, 2026" or "Week 42" or "October 2026"
  dateStart: string;     // ISO String
  dateEnd: string;       // ISO String
  orderCount: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  netProfit: number;
  netMargin: number;
  isProfitable: boolean;
}

export interface PnLStatementResponse {
  dateRange: {
    start: string;
    end: string;
    label: string;
    period: PnLTimePeriod;
    quarter?: QuarterName;
    year?: number;
  };
  metrics: PnLSummaryMetrics;
  breakdown: PnLTimeBucket[];
  breakdownGranularity: PnLBreakdownGranularity;
}

export interface PnLOrderDrilldownFilter {
  search?: string;
  orderType?: 'all' | 'dine_in' | 'takeaway' | 'delivery';
  source?: 'all' | 'qr_scan' | 'admin_counter';
  paymentMode?: 'all' | 'cash' | 'online' | 'credit';
  status?: 'all' | 'valid_only' | 'completed' | 'preparing' | 'confirmed' | 'received' | 'cancelled';
  sortBy?: 'time_desc' | 'time_asc' | 'total_desc' | 'total_asc';
  page?: number;
  limit?: number;
}

export interface PnLDrilldownOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
  originatedFromNudge?: boolean;
}

export interface PnLDrilldownOrder {
  _id: string;
  orderIdShort: string;
  customerName: string;
  customerPhone: string;
  tableId?: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  source: 'qr_scan' | 'admin_counter';
  paymentMode: 'cash' | 'online' | 'credit';
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  couponCode?: string;
  notes?: string;
  items: PnLDrilldownOrderItem[];
  itemCount: number;
  placedAt: string;
  placedTimeFormatted: string;
  relativeTime: string;
}

export interface PnLOrdersResponse {
  orders: PnLDrilldownOrder[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  totalRevenue: number;
  summaryDateLabel: string;
}

export interface PnLExpenseDrilldownItem {
  _id: string;
  purchaseDate: string;
  purchaseDateFormatted: string;
  itemName: string;
  categoryName: string;
  type: 'cogs' | 'opex';
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  vendor?: string;
  note?: string;
}

export interface PnLExpensesResponse {
  expenses: PnLExpenseDrilldownItem[];
  totalSpend: number;
  cogsSpend: number;
  opexSpend: number;
  totalCount: number;
}
