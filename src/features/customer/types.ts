import { CustomerSegment, MealTimeSlot } from '@/config/customerSegmentation';

export type { CustomerSegment, MealTimeSlot };

export interface ICustomer {
  _id: string;
  restaurantId: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue?: number;
  lastOrderDate?: string | null;
  firstOrderDate?: string | null;
  favoriteCategory?: string;
  stampCount: number;
  lastStampDate: string | null;
  hasPendingDiscount: boolean;
  totalRedemptions: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICustomerWithSegment extends ICustomer {
  segment: CustomerSegment;
  daysSinceLastVisit: number;
  averageVisitIntervalDays: number | null;
  expectedNextVisitDate: string | null;
}

export interface ICustomerOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
}

export interface ICustomerVisitOrder {
  _id: string;
  orderNumber: number | string;
  placedAt: string;
  dateStr: string;
  dayOfWeek: string;
  timeStr: string;
  timeSlot: MealTimeSlot;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId: string;
  paymentMode: 'cash' | 'online' | 'credit';
  status: string;
  items: ICustomerOrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface ICustomerDetailInsights {
  topFavoriteItems: Array<{
    name: string;
    quantity: number;
    totalSpend: number;
  }>;
  favoriteCategory: string;
  categoryPercentages: Array<{
    category: string;
    percentage: number;
    count: number;
  }>;
  preferredDayOfWeek: string;
  preferredTimeSlot: MealTimeSlot;
  vegNonVegSplit: {
    vegCount: number;
    nonVegCount: number;
    vegPercent: number;
    nonVegPercent: number;
    hasData: boolean;
  };
  discountDependencyPercent: number;
  spendTrend: Array<{
    orderIndex: number;
    date: string;
    amount: number;
    orderNumber: string | number;
  }>;
}

export interface ICustomerDetail {
  customer: ICustomerWithSegment;
  insights: ICustomerDetailInsights;
  visitFrequencyText: string;
  expectedNextVisitText: string;
  customerSinceText: string;
}

export interface ICustomerListFilters {
  search?: string;
  segment?: CustomerSegment | 'ALL';
  minLtv?: number;
  maxLtv?: number;
  lastVisitBeforeDays?: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  page?: number;
  limit?: number;
}

export interface ICustomerListResponse {
  customers: ICustomerWithSegment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  segmentCounts: {
    ALL: number;
    VIP: number;
    REGULAR: number;
    NEW: number;
    AT_RISK: number;
    LOST: number;
  };
}

export interface ICohortRow {
  cohortMonth: string; // e.g. "Nov 2025"
  cohortSize: number;
  retentionByMonth: Array<{
    monthIndex: number; // 0, 1, 2...
    activeCount: number;
    percentage: number; // 0 - 100
  }>;
}

export interface IParetoCustomer {
  _id: string;
  name: string;
  phone: string;
  totalSpent: number;
  totalOrders: number;
  segment: CustomerSegment;
  revenueSharePercent: number;
}

export interface ICustomerAnalytics {
  cohortAnalysis: {
    rows: ICohortRow[];
    maxMonths: number;
    hasData: boolean;
  };
  pareto: {
    top20PercentShare: number;
    totalRevenue: number;
    top20CustomersCount: number;
    totalCustomersCount: number;
    chartDeciles: Array<{
      decile: string;
      revenue: number;
      cumulativePercentage: number;
    }>;
    topCustomers: IParetoCustomer[];
  };
  kpis: {
    newCustomersThisMonth: number;
    repeatCustomersThisMonth: number;
    repeatRatePercent: number;
    retention30DayPercent: number;
    overallAvgIntervalDays: number;
    segmentDistribution: Array<{
      segment: CustomerSegment;
      count: number;
      percentage: number;
      color: string;
    }>;
  };
}
