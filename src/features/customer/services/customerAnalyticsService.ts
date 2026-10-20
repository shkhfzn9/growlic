import dbConnect from '@/lib/mongodb';
import Customer from '../model';
import Order from '@/features/order/model';
import { sanitizeTenantId } from '@/lib/tenant';
import {
  evaluateCustomerSegment,
  calculateAverageVisitInterval,
  getDaysDifference,
  getKolkataDateParts,
  getMealTimeSlot,
  DEFAULT_SEGMENTATION_CONFIG,
  CustomerSegment,
} from '@/config/customerSegmentation';
import {
  ICustomerWithSegment,
  ICustomerListFilters,
  ICustomerListResponse,
  ICustomerDetail,
  ICustomerVisitOrder,
  ICustomerAnalytics,
  ICohortRow,
  IParetoCustomer,
} from '../types';

const VALID_STATUSES = [
  'completed',
  'ready',
  'preparing',
  'in_progress',
  'confirmed',
  'accepted',
  'scheduled',
  'received',
];

const NON_CANCELLED_STATUSES = ['cancelled', 'rejected'] as const;
const NON_CANCELLED_QUERY = {
  status: { $nin: NON_CANCELLED_STATUSES },
};

const VIP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const vipThresholdCache = new Map<string, { value: number; expiresAt: number }>();

const ANALYTICS_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const analyticsCache = new Map<string, { data: ICustomerAnalytics; expiresAt: number }>();

/**
 * Pure helper to compute 90th percentile threshold from an array of spends
 */
function computeVipThresholdFromSpends(spends: number[]): number {
  if (!spends.length) return 5000;
  const sorted = [...spends].sort((a, b) => b - a);
  const top10Index = Math.max(0, Math.ceil(sorted.length * (1 - DEFAULT_SEGMENTATION_CONFIG.vipLtvPercentile)) - 1);
  return sorted[top10Index] || 5000;
}

/**
 * Calculates the VIP LTV cutoff threshold (90th percentile) for a restaurant.
 * Uses an in-memory cache with 5-minute TTL to prevent redundant database queries.
 */
export async function calculateVipLtvThreshold(restaurantId: string): Promise<number> {
  const cleanId = sanitizeTenantId(restaurantId);
  const now = Date.now();
  const cached = vipThresholdCache.get(cleanId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  await dbConnect();
  const customers = await Customer.find({ restaurantId: cleanId }, { totalSpent: 1 })
    .sort({ totalSpent: -1 })
    .lean();

  const threshold = computeVipThresholdFromSpends(customers.map((c) => c.totalSpent || 0));
  vipThresholdCache.set(cleanId, { value: threshold, expiresAt: now + VIP_CACHE_TTL_MS });
  return threshold;
}

/**
 * Helper to enrich a raw customer document with computed segment and visit frequency.
 */
function enrichCustomer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  vipThreshold: number,
  now: Date = new Date()
): ICustomerWithSegment {
  const plain = doc.toObject ? doc.toObject() : doc;
  const visits = plain.totalOrders ?? 0;
  const ltv = plain.totalSpent ?? 0;
  const aov = plain.averageOrderValue ?? (visits > 0 ? Math.round(ltv / visits) : 0);

  const lastVisitDate = plain.lastOrderDate ? new Date(plain.lastOrderDate) : (plain.updatedAt ? new Date(plain.updatedAt) : null);
  const firstVisitDate = plain.firstOrderDate ? new Date(plain.firstOrderDate) : (plain.createdAt ? new Date(plain.createdAt) : lastVisitDate);

  const daysSinceLastVisit = lastVisitDate ? getDaysDifference(now, lastVisitDate) : 999;
  const avgInterval = calculateAverageVisitInterval(firstVisitDate, lastVisitDate, visits);

  let expectedNextVisitDate: string | null = null;
  if (lastVisitDate && avgInterval) {
    const nextDate = new Date(lastVisitDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);
    expectedNextVisitDate = nextDate.toISOString();
  }

  const segment = evaluateCustomerSegment(
    {
      totalSpent: ltv,
      totalOrders: visits,
      firstVisitDate,
      lastVisitDate,
    },
    vipThreshold,
    now
  );

  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    name: plain.name,
    phone: plain.phone,
    totalOrders: visits,
    totalSpent: ltv,
    averageOrderValue: aov,
    lastOrderDate: lastVisitDate ? lastVisitDate.toISOString() : null,
    firstOrderDate: firstVisitDate ? firstVisitDate.toISOString() : null,
    favoriteCategory: plain.favoriteCategory || '',
    stampCount: plain.stampCount ?? 0,
    lastStampDate: plain.lastStampDate ? new Date(plain.lastStampDate).toISOString() : null,
    hasPendingDiscount: !!plain.hasPendingDiscount,
    totalRedemptions: plain.totalRedemptions ?? 0,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
    segment,
    daysSinceLastVisit,
    averageVisitIntervalDays: avgInterval,
    expectedNextVisitDate,
  };
}

/**
 * Retrieves paginated customers enriched with computed segments, search, and multi-filters.
 */
export async function getCustomerListWithSegments(
  restaurantId: string,
  filters: ICustomerListFilters = {}
): Promise<ICustomerListResponse> {
  await dbConnect();
  const cleanId = sanitizeTenantId(restaurantId);
  const now = new Date();

  // 1. Fetch customer records for this tenant
  const rawCustomers = await Customer.find({ restaurantId: cleanId }).lean();

  // Compute VIP threshold from rawCustomers directly in-memory to save 1 full collection scan
  const vipThreshold = computeVipThresholdFromSpends(rawCustomers.map((c) => c.totalSpent || 0));
  vipThresholdCache.set(cleanId, { value: vipThreshold, expiresAt: Date.now() + VIP_CACHE_TTL_MS });

  const enriched = rawCustomers.map((doc) => enrichCustomer(doc, vipThreshold, now));

  // 2. Compute segment counts for summary chips
  const segmentCounts = {
    ALL: enriched.length,
    VIP: 0,
    REGULAR: 0,
    NEW: 0,
    AT_RISK: 0,
    LOST: 0,
  };

  enriched.forEach((c) => {
    if (segmentCounts[c.segment] !== undefined) {
      segmentCounts[c.segment]++;
    }
  });

  // 3. Apply filters
  let filtered = enriched;

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }

  if (filters.segment && filters.segment !== 'ALL') {
    filtered = filtered.filter((c) => c.segment === filters.segment);
  }

  if (typeof filters.minLtv === 'number') {
    filtered = filtered.filter((c) => c.totalSpent >= filters.minLtv!);
  }

  if (typeof filters.maxLtv === 'number') {
    filtered = filtered.filter((c) => c.totalSpent <= filters.maxLtv!);
  }

  if (typeof filters.lastVisitBeforeDays === 'number') {
    filtered = filtered.filter((c) => c.daysSinceLastVisit >= filters.lastVisitBeforeDays!);
  }

  if (filters.dateRangeStart) {
    const start = new Date(filters.dateRangeStart).getTime();
    filtered = filtered.filter((c) => {
      const d = c.lastOrderDate ? new Date(c.lastOrderDate).getTime() : 0;
      return d >= start;
    });
  }

  if (filters.dateRangeEnd) {
    const end = new Date(filters.dateRangeEnd).getTime() + 24 * 60 * 60 * 1000;
    filtered = filtered.filter((c) => {
      const d = c.lastOrderDate ? new Date(c.lastOrderDate).getTime() : 0;
      return d <= end;
    });
  }

  // 4. Default Sort: Latest visit first, then highest LTV
  filtered.sort((a, b) => {
    const dateA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
    const dateB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return b.totalSpent - a.totalSpent;
  });

  // 5. Pagination
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, filters.limit || 15);
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    customers: paginated,
    total,
    page,
    limit,
    totalPages,
    segmentCounts,
  };
}

/**
 * Retrieves comprehensive detail, header metrics, and analytics insight cards for a single customer.
 */
export async function getCustomerDetail(
  restaurantId: string,
  phone: string
): Promise<ICustomerDetail | null> {
  await dbConnect();
  const cleanId = sanitizeTenantId(restaurantId);
  const cleanPhone = phone.trim();

  const customerDoc = await Customer.findOne({
    restaurantId: cleanId,
    phone: cleanPhone,
  }).lean();

  if (!customerDoc) return null;

  const vipThreshold = await calculateVipLtvThreshold(cleanId);
  const now = new Date();
  const customer = enrichCustomer(customerDoc, vipThreshold, now);

  // Fetch valid completed orders
  const orders = await Order.find({
    restaurantId: cleanId,
    customerPhone: cleanPhone,
    ...NON_CANCELLED_QUERY,
  })
    .sort({ createdAt: 1 })
    .lean();

  // 1. Top Favorite Items (Top 5 by quantity)
  const itemMap = new Map<string, { name: string; quantity: number; totalSpend: number }>();
  let ordersWithDiscount = 0;
  let vegCount = 0;
  let nonVegCount = 0;

  const dayCounts: Record<string, number> = {};
  const slotCounts: Record<string, number> = {
    Breakfast: 0,
    Lunch: 0,
    Snacks: 0,
    Dinner: 0,
  };
  const categoryCounts: Record<string, number> = {};

  const VEG_KEYWORDS = ['veg', 'paneer', 'tofu', 'dal', 'salad', 'corn', 'mushroom', 'aloo', 'gobi', 'cheese'];
  const NON_VEG_KEYWORDS = ['chicken', 'mutton', 'fish', 'prawn', 'egg', 'meat', 'pork', 'buff', 'non-veg', 'non veg'];

  orders.forEach((ord) => {
    if ((ord.discount || 0) > 0 || ord.couponCode) {
      ordersWithDiscount++;
    }

    const orderDate = ord.placed_at || ord.createdAt;
    const { dayOfWeek } = getKolkataDateParts(orderDate);
    dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;

    const slot = getMealTimeSlot(orderDate);
    slotCounts[slot] = (slotCounts[slot] || 0) + 1;

    (ord.items || []).forEach((item: any) => {
      const name = (item.name || 'Item').trim();
      const qty = item.quantity || 1;
      const price = item.price || 0;

      const existing = itemMap.get(name) || { name, quantity: 0, totalSpend: 0 };
      existing.quantity += qty;
      existing.totalSpend += price * qty;
      itemMap.set(name, existing);

      // Category detection
      const cat = (item.category || customer.favoriteCategory || 'General').trim();
      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + qty;
      }

      // Veg vs Non-Veg Detection
      const lower = name.toLowerCase();
      const isExplicitNonVeg = NON_VEG_KEYWORDS.some((k) => lower.includes(k));
      const isExplicitVeg = VEG_KEYWORDS.some((k) => lower.includes(k));

      if (isExplicitNonVeg) {
        nonVegCount += qty;
      } else if (isExplicitVeg) {
        vegCount += qty;
      }
    });
  });

  const topFavoriteItems = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Category percentages
  const totalCatItems = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const categoryPercentages = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalCatItems > 0 ? Math.round((count / totalCatItems) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const favoriteCategory = categoryPercentages[0]?.category || customer.favoriteCategory || 'General';

  // Preferred Day & Slot
  let preferredDayOfWeek = 'Any Day';
  let maxDayCount = -1;
  Object.entries(dayCounts).forEach(([day, cnt]) => {
    if (cnt > maxDayCount) {
      maxDayCount = cnt;
      preferredDayOfWeek = day;
    }
  });

  let preferredTimeSlot: any = 'Lunch';
  let maxSlotCount = -1;
  Object.entries(slotCounts).forEach(([slot, cnt]) => {
    if (cnt > maxSlotCount) {
      maxSlotCount = cnt;
      preferredTimeSlot = slot;
    }
  });

  // Veg vs Non-Veg split
  const totalVegNonVeg = vegCount + nonVegCount;
  const vegNonVegSplit = {
    vegCount,
    nonVegCount,
    vegPercent: totalVegNonVeg > 0 ? Math.round((vegCount / totalVegNonVeg) * 100) : 0,
    nonVegPercent: totalVegNonVeg > 0 ? Math.round((nonVegCount / totalVegNonVeg) * 100) : 0,
    hasData: totalVegNonVeg > 0,
  };

  // Discount dependency
  const discountDependencyPercent =
    orders.length > 0 ? Math.round((ordersWithDiscount / orders.length) * 100) : 0;

  // Spend trend (chronological)
  const spendTrend = orders.map((ord, idx) => {
    const { dateStr } = getKolkataDateParts(ord.placed_at || ord.createdAt);
    return {
      orderIndex: idx + 1,
      date: dateStr,
      amount: ord.total || 0,
      orderNumber: (ord as any).orderNumber || ord._id.toString().slice(-4),
    };
  });

  // Customer Since Text
  const firstDate = customer.firstOrderDate ? new Date(customer.firstOrderDate) : now;
  const daysSinceFirst = getDaysDifference(now, firstDate);
  let customerSinceText = `${daysSinceFirst} days`;
  if (daysSinceFirst >= 365) {
    const years = (daysSinceFirst / 365).toFixed(1);
    customerSinceText = `${years} year${Number(years) > 1 ? 's' : ''}`;
  } else if (daysSinceFirst >= 30) {
    const months = Math.floor(daysSinceFirst / 30);
    customerSinceText = `${months} month${months > 1 ? 's' : ''}`;
  }

  // Visit frequency text
  const visitFrequencyText =
    customer.averageVisitIntervalDays !== null
      ? `Every ${customer.averageVisitIntervalDays} days`
      : 'N/A';

  // Expected next visit text
  let expectedNextVisitText = 'N/A';
  if (customer.expectedNextVisitDate) {
    const { dateStr } = getKolkataDateParts(customer.expectedNextVisitDate);
    expectedNextVisitText = dateStr;
  }

  return {
    customer,
    insights: {
      topFavoriteItems,
      favoriteCategory,
      categoryPercentages,
      preferredDayOfWeek,
      preferredTimeSlot,
      vegNonVegSplit,
      discountDependencyPercent,
      spendTrend,
    },
    visitFrequencyText,
    expectedNextVisitText,
    customerSinceText,
  };
}

/**
 * Retrieves paginated visit history for a specific customer.
 */
export async function getCustomerVisitHistory(
  restaurantId: string,
  phone: string,
  page = 1,
  limit = 10
): Promise<{ orders: ICustomerVisitOrder[]; total: number; page: number; totalPages: number }> {
  await dbConnect();
  const cleanId = sanitizeTenantId(restaurantId);
  const cleanPhone = phone.trim();

  const query = {
    restaurantId: cleanId,
    customerPhone: cleanPhone,
    ...NON_CANCELLED_QUERY,
  };

  const total = await Order.countDocuments(query);
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (Math.max(1, page) - 1) * limit;

  const docs = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const orders: ICustomerVisitOrder[] = docs.map((ord: any) => {
    const placedDate = ord.placed_at || ord.createdAt;
    const { dateStr, dayOfWeek, timeStr } = getKolkataDateParts(placedDate);
    const timeSlot = getMealTimeSlot(placedDate);

    const subtotal = ord.subtotal || 0;
    const total = ord.total || 0;
    const discount = ord.discount || 0;
    const tax = ord.tax ?? Math.max(0, Math.round((total - (subtotal - discount)) * 100) / 100);

    const items = (ord.items || []).map((i: any) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      subtotal: i.price * i.quantity,
      image: i.image || '',
    }));

    return {
      _id: ord._id.toString(),
      orderNumber: ord.orderNumber || ord._id.toString().slice(-4),
      placedAt: new Date(placedDate).toISOString(),
      dateStr,
      dayOfWeek,
      timeStr,
      timeSlot,
      orderType: ord.orderType || 'takeaway',
      tableId: ord.tableId || 'Counter',
      paymentMode: ord.paymentMode || 'cash',
      status: ord.status,
      items,
      subtotal,
      discount,
      tax,
      total,
    };
  });

  return { orders, total, page, totalPages };
}

/**
 * Computes deep customer analytics:
 * - Monthly Cohort Retention Heatmap
 * - Pareto 80/20 Revenue Concentration & Top 20% table
 * - Summary KPIs & Segment Distribution
 */
export async function getCustomerAnalytics(
  restaurantId: string,
  forceRefresh = false
): Promise<ICustomerAnalytics> {
  const cleanId = sanitizeTenantId(restaurantId);
  const nowMs = Date.now();

  if (!forceRefresh) {
    const cached = analyticsCache.get(cleanId);
    if (cached && cached.expiresAt > nowMs) {
      return cached.data;
    }
  }

  await dbConnect();
  const now = new Date();

  // Fetch all customers for this tenant and compute VIP threshold directly
  const rawCustomers = await Customer.find({ restaurantId: cleanId }).lean();
  const vipThreshold = computeVipThresholdFromSpends(rawCustomers.map((c) => c.totalSpent || 0));
  vipThresholdCache.set(cleanId, { value: vipThreshold, expiresAt: nowMs + VIP_CACHE_TTL_MS });

  const customers = rawCustomers.map((doc) => enrichCustomer(doc, vipThreshold, now));

  // Fetch all valid orders for this restaurant
  const orders = await Order.find(
    { restaurantId: cleanId, ...NON_CANCELLED_QUERY },
    { customerPhone: 1, placed_at: 1, createdAt: 1, total: 1 }
  ).lean();

  // -------------------------------------------------------------
  // A) COHORT ANALYSIS (Retention Heatmap)
  // -------------------------------------------------------------
  // 1. Identify each customer's first order month (YYYY-MM) and all active months
  const customerFirstMonth = new Map<string, string>(); // phone -> "YYYY-MM"
  const customerActiveMonths = new Map<string, Set<string>>(); // phone -> Set of "YYYY-MM"

  orders.forEach((ord) => {
    const phone = ord.customerPhone?.trim();
    if (!phone) return;
    const orderDate = ord.placed_at || ord.createdAt;
    const { year, month } = getKolkataDateParts(orderDate);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    if (!customerActiveMonths.has(phone)) {
      customerActiveMonths.set(phone, new Set());
    }
    customerActiveMonths.get(phone)!.add(monthKey);

    const existingFirst = customerFirstMonth.get(phone);
    if (!existingFirst || monthKey < existingFirst) {
      customerFirstMonth.set(phone, monthKey);
    }
  });

  // 2. Group customers into cohorts by first order month
  const cohortMap = new Map<string, Set<string>>(); // "YYYY-MM" -> Set of phones
  customerFirstMonth.forEach((firstMonth, phone) => {
    if (!cohortMap.has(firstMonth)) {
      cohortMap.set(firstMonth, new Set());
    }
    cohortMap.get(firstMonth)!.add(phone);
  });

  // Sort cohort months ascending
  const sortedCohortMonths = Array.from(cohortMap.keys()).sort();
  const maxMonths = 6; // Month 0 to Month 5

  const cohortRows: ICohortRow[] = sortedCohortMonths.map((cohortKey) => {
    const phonesInCohort = cohortMap.get(cohortKey)!;
    const cohortSize = phonesInCohort.size;

    const [cYear, cMonth] = cohortKey.split('-').map(Number);
    const d = new Date(cYear, cMonth - 1, 1);
    const cohortLabel = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

    const retentionByMonth = [];

    for (let m = 0; m < maxMonths; m++) {
      // Calculate target month key
      const targetDate = new Date(cYear, cMonth - 1 + m, 1);
      const tYear = targetDate.getFullYear();
      const tMonth = targetDate.getMonth() + 1;
      const targetMonthKey = `${tYear}-${String(tMonth).padStart(2, '0')}`;

      // If target month is in future relative to current month, do not evaluate
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (targetMonthKey > currentMonthKey) {
        break;
      }

      let activeCount = 0;
      phonesInCohort.forEach((phone) => {
        if (customerActiveMonths.get(phone)?.has(targetMonthKey)) {
          activeCount++;
        }
      });

      const percentage = cohortSize > 0 ? Math.round((activeCount / cohortSize) * 100) : 0;
      retentionByMonth.push({
        monthIndex: m,
        activeCount,
        percentage,
      });
    }

    return {
      cohortMonth: cohortLabel,
      cohortSize,
      retentionByMonth,
    };
  });

  // -------------------------------------------------------------
  // B) REVENUE CONCENTRATION (PARETO 80/20)
  // -------------------------------------------------------------
  const sortedBySpend = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);
  const totalRevenue = sortedBySpend.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalCustCount = sortedBySpend.length;
  const top20Count = Math.max(1, Math.ceil(totalCustCount * 0.2));

  const top20Customers = sortedBySpend.slice(0, top20Count);
  const top20Spend = top20Customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const top20PercentShare = totalRevenue > 0 ? Math.round((top20Spend / totalRevenue) * 100) : 0;

  // Chart Deciles (10 buckets)
  const chartDeciles = [];
  const decileSize = Math.max(1, Math.ceil(totalCustCount / 10));
  let runningCumRevenue = 0;

  for (let i = 0; i < 10; i++) {
    const start = i * decileSize;
    const end = Math.min(totalCustCount, start + decileSize);
    const bucket = sortedBySpend.slice(start, end);
    const bucketRev = bucket.reduce((sum, c) => sum + c.totalSpent, 0);
    runningCumRevenue += bucketRev;
    const cumulativePercentage = totalRevenue > 0 ? Math.round((runningCumRevenue / totalRevenue) * 100) : 0;

    chartDeciles.push({
      decile: `D${i + 1} (${(i + 1) * 10}%)`,
      revenue: bucketRev,
      cumulativePercentage: Math.min(100, cumulativePercentage),
    });
  }

  const topCustomers: IParetoCustomer[] = top20Customers.slice(0, 15).map((c) => ({
    _id: c._id,
    name: c.name,
    phone: c.phone,
    totalSpent: c.totalSpent,
    totalOrders: c.totalOrders,
    segment: c.segment,
    revenueSharePercent: totalRevenue > 0 ? Math.round((c.totalSpent / totalRevenue) * 1000) / 10 : 0,
  }));

  // -------------------------------------------------------------
  // C) SUMMARY KPIS & SEGMENT DISTRIBUTION
  // -------------------------------------------------------------
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let newThisMonth = 0;
  let repeatThisMonth = 0;
  customerActiveMonths.forEach((monthsSet, phone) => {
    if (monthsSet.has(currentMonthKey)) {
      const firstMonth = customerFirstMonth.get(phone);
      if (firstMonth === currentMonthKey) {
        newThisMonth++;
      } else {
        repeatThisMonth++;
      }
    }
  });

  const repeatVisitsCount = customers.filter((c) => c.totalOrders >= 2).length;
  const repeatRatePercent = totalCustCount > 0 ? Math.round((repeatVisitsCount / totalCustCount) * 100) : 0;

  // 30-Day Retention Rate: % of customers who ordered within last 30 days
  const active30Days = customers.filter((c) => c.daysSinceLastVisit <= 30).length;
  const retention30DayPercent = totalCustCount > 0 ? Math.round((active30Days / totalCustCount) * 100) : 0;

  // Overall Avg Interval
  const multiVisitCustomers = customers.filter((c) => c.averageVisitIntervalDays !== null);
  const overallAvgIntervalDays =
    multiVisitCustomers.length > 0
      ? Math.round(
          multiVisitCustomers.reduce((acc, c) => acc + (c.averageVisitIntervalDays || 0), 0) /
            multiVisitCustomers.length
        )
      : 14;

  // Segment Donut Distribution
  const segmentTally: Record<CustomerSegment, number> = {
    VIP: 0,
    REGULAR: 0,
    NEW: 0,
    AT_RISK: 0,
    LOST: 0,
  };

  customers.forEach((c) => {
    if (segmentTally[c.segment] !== undefined) {
      segmentTally[c.segment]++;
    }
  });

  const segmentColors: Record<CustomerSegment, string> = {
    VIP: '#8B5CF6',     // Violet / Purple
    REGULAR: '#3B82F6', // Blue
    NEW: '#10B981',     // Emerald
    AT_RISK: '#F59E0B', // Amber
    LOST: '#EF4444',    // Rose
  };

  const segmentDistribution = (Object.keys(segmentTally) as CustomerSegment[]).map((seg) => ({
    segment: seg,
    count: segmentTally[seg],
    percentage: totalCustCount > 0 ? Math.round((segmentTally[seg] / totalCustCount) * 100) : 0,
    color: segmentColors[seg],
  }));

  const result: ICustomerAnalytics = {
    cohortAnalysis: {
      rows: cohortRows,
      maxMonths,
      hasData: cohortRows.length > 0,
    },
    pareto: {
      top20PercentShare,
      totalRevenue,
      top20CustomersCount: top20Count,
      totalCustomersCount: totalCustCount,
      chartDeciles,
      topCustomers,
    },
    kpis: {
      newCustomersThisMonth: newThisMonth,
      repeatCustomersThisMonth: repeatThisMonth,
      repeatRatePercent,
      retention30DayPercent,
      overallAvgIntervalDays,
      segmentDistribution,
    },
  };

  analyticsCache.set(cleanId, { data: result, expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS });
  return result;
}
