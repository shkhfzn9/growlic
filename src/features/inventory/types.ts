export type InventoryTimePeriod =
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'single_date';

export interface ItemSalesMetric {
  itemId: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  quantitySold: number;
  revenue: number;
  revenueSharePercent: number;
  volumeSharePercent: number;
  orderFrequency: number;
  available: boolean;
  trackInventory?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  velocityStatus: 'fast_mover' | 'moderate' | 'slow_mover' | 'zero_sales';
  rank: number;
  isTopSeller: boolean;
  isTopGrossing: boolean;
}

export interface CategorySalesSummary {
  category: string;
  quantitySold: number;
  revenue: number;
  revenueSharePercent: number;
  volumeSharePercent: number;
  itemCount: number;
}

export interface HourlySalesDistribution {
  hour: number;
  label: string;
  quantitySold: number;
  revenue: number;
}

export interface TomorrowDemandForecast {
  dayName: string;
  dateStr: string;
  scheduledOrdersCount: number;
  scheduledItemsCount: number;
  scheduledRevenue: number;
  projectedTotalUnits: number;
  projectedTotalRevenue: number;
  topForecastItems: Array<{
    name: string;
    category: string;
    expectedQty: number;
    expectedRevenue: number;
  }>;
  scheduledBookings: Array<{
    orderId: string;
    customerName: string;
    time: string;
    itemsSummary: string;
    total: number;
  }>;
}

export interface BusinessSituationInsight {
  type: 'success' | 'warning' | 'info' | 'opportunity';
  title: string;
  description: string;
  impactScore?: number;
}

export interface InventoryAnalyticsReport {
  period: InventoryTimePeriod;
  periodLabel: string;
  dateRange: {
    start: string;
    end: string;
  };
  singleDate?: string;
  summary: {
    totalQuantitySold: number;
    totalItemRevenue: number;
    totalOrdersCount: number;
    avgBasketSize: number;
    avgItemPrice: number;
    activeItemsSoldCount: number;
    totalCatalogItemsCount: number;
    catalogActivePercent: number;
    topSellingItem: {
      name: string;
      category: string;
      quantity: number;
      revenue: number;
      price: number;
      volumeSharePercent: number;
    } | null;
    topGrossingItem: {
      name: string;
      category: string;
      revenue: number;
      quantity: number;
      revenueSharePercent: number;
    } | null;
    fastMoversCount: number;
    moderateMoversCount: number;
    slowMoversCount: number;
    zeroSalesCount: number;
  };
  items: ItemSalesMetric[];
  categories: CategorySalesSummary[];
  hourlySales: HourlySalesDistribution[];
  tomorrowForecast?: TomorrowDemandForecast;
  insights: BusinessSituationInsight[];
  pareto: {
    coreDriversCount: number;
    coreDriversPercent: number;
    coreDriversRevenue: number;
  };
}
