import dbConnect from '@/lib/mongodb';
import Order from '@/features/order/model';
import { ExpenseCategory, ExpenseItem, ExpenseLog } from '@/features/expense/model';
import {
  PnLTimePeriod,
  QuarterName,
  PnLBreakdownGranularity,
  PnLDateRange,
  PnLStatementResponse,
  PnLSummaryMetrics,
  PnLTimeBucket,
  PnLCategoryExpense,
  PnLOrderDrilldownFilter,
  PnLOrdersResponse,
  PnLDrilldownOrder,
  PnLExpensesResponse,
  PnLExpenseDrilldownItem,
} from './types';

function norm(id: string): string {
  return (id || '').trim().toLowerCase();
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns date boundaries in Indian Standard Time (IST, UTC+05:30).
 */
export function getPnLDateBoundaries(params: {
  period: PnLTimePeriod;
  singleDate?: string;
  startDate?: string;
  endDate?: string;
  quarter?: QuarterName;
  year?: number;
  monthIndex?: number; // 0 to 11
}): PnLDateRange {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  const curYear = istNow.getUTCFullYear();
  const curMonth = istNow.getUTCMonth();
  const curDate = istNow.getUTCDate();

  const getDayStart = (y: number, m: number, d: number) => {
    return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS);
  };

  const getDayEnd = (y: number, m: number, d: number) => {
    return new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS);
  };

  const formatISTDateString = (d: Date) => {
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    return ist.toISOString().split('T')[0];
  };

  switch (params.period) {
    case 'today': {
      const start = getDayStart(curYear, curMonth, curDate);
      const end = getDayEnd(curYear, curMonth, curDate);
      return {
        start,
        end,
        label: `Today (${formatISTDateString(start)})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'today',
      };
    }

    case 'yesterday': {
      const yDate = new Date(Date.UTC(curYear, curMonth, curDate - 1));
      const start = getDayStart(yDate.getUTCFullYear(), yDate.getUTCMonth(), yDate.getUTCDate());
      const end = getDayEnd(yDate.getUTCFullYear(), yDate.getUTCMonth(), yDate.getUTCDate());
      return {
        start,
        end,
        label: `Yesterday (${formatISTDateString(start)})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'yesterday',
      };
    }

    case 'this_week': {
      const dayOfWeek = istNow.getUTCDay(); // 0 is Sunday, 1 is Monday...
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(Date.UTC(curYear, curMonth, curDate - daysFromMonday));
      const start = getDayStart(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
      const end = getDayEnd(curYear, curMonth, curDate);
      return {
        start,
        end,
        label: `This Week (${formatISTDateString(start)} to ${formatISTDateString(end)})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'this_week',
      };
    }

    case 'last_7_days': {
      const past7 = new Date(Date.UTC(curYear, curMonth, curDate - 6));
      const start = getDayStart(past7.getUTCFullYear(), past7.getUTCMonth(), past7.getUTCDate());
      const end = getDayEnd(curYear, curMonth, curDate);
      return {
        start,
        end,
        label: `Last 7 Days (${formatISTDateString(start)} to ${formatISTDateString(end)})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'last_7_days',
      };
    }

    case 'last_week': {
      const dayOfWeek = istNow.getUTCDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const prevMonday = new Date(Date.UTC(curYear, curMonth, curDate - daysFromMonday - 7));
      const prevSunday = new Date(Date.UTC(curYear, curMonth, curDate - daysFromMonday - 1));
      const start = getDayStart(prevMonday.getUTCFullYear(), prevMonday.getUTCMonth(), prevMonday.getUTCDate());
      const end = getDayEnd(prevSunday.getUTCFullYear(), prevSunday.getUTCMonth(), prevSunday.getUTCDate());
      return {
        start,
        end,
        label: `Last Week (${formatISTDateString(start)} to ${formatISTDateString(end)})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'last_week',
      };
    }

    case 'this_month': {
      const start = getDayStart(curYear, curMonth, 1);
      const end = getDayEnd(curYear, curMonth, curDate);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return {
        start,
        end,
        label: `This Month (${monthNames[curMonth]} ${curYear})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'this_month',
      };
    }

    case 'last_month': {
      const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
      const prevYear = curMonth === 0 ? curYear - 1 : curYear;
      const lastDayOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth + 1, 0)).getUTCDate();
      const start = getDayStart(prevYear, prevMonth, 1);
      const end = getDayEnd(prevYear, prevMonth, lastDayOfPrevMonth);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return {
        start,
        end,
        label: `Last Month (${monthNames[prevMonth]} ${prevYear})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'last_month',
      };
    }

    case 'specific_month': {
      const targetYear = params.year || curYear;
      const targetMonth = params.monthIndex ?? curMonth;
      const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
      const start = getDayStart(targetYear, targetMonth, 1);
      const end = getDayEnd(targetYear, targetMonth, lastDay);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return {
        start,
        end,
        label: `${monthNames[targetMonth]} ${targetYear}`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'specific_month',
      };
    }

    case 'quarter': {
      const targetYear = params.year || curYear;
      const q = params.quarter || 'Q1';

      let startMonth = 0;
      let endMonth = 2;
      let qName = 'Q1 (Jan - Mar)';

      if (q === 'Q2') {
        startMonth = 3;
        endMonth = 5;
        qName = 'Q2 (Apr - Jun)';
      } else if (q === 'Q3') {
        startMonth = 6;
        endMonth = 8;
        qName = 'Q3 (Jul - Sep)';
      } else if (q === 'Q4') {
        startMonth = 9;
        endMonth = 11;
        qName = 'Q4 (Oct - Dec)';
      }

      const lastDayOfEndMonth = new Date(Date.UTC(targetYear, endMonth + 1, 0)).getUTCDate();
      const start = getDayStart(targetYear, startMonth, 1);
      const end = getDayEnd(targetYear, endMonth, lastDayOfEndMonth);

      return {
        start,
        end,
        label: `${qName} ${targetYear}`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'quarter',
      };
    }

    case 'single_date': {
      if (params.singleDate) {
        const parts = params.singleDate.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          const start = getDayStart(parts[0], parts[1] - 1, parts[2]);
          const end = getDayEnd(parts[0], parts[1] - 1, parts[2]);
          return {
            start,
            end,
            label: `Date: ${params.singleDate}`,
            startDateStr: params.singleDate,
            endDateStr: params.singleDate,
            period: 'single_date',
          };
        }
      }
      const start = getDayStart(curYear, curMonth, curDate);
      const end = getDayEnd(curYear, curMonth, curDate);
      return {
        start,
        end,
        label: `Today (${formatISTDateString(start)})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'single_date',
      };
    }

    case 'custom':
    default: {
      if (params.startDate && params.endDate) {
        const sParts = params.startDate.split('-').map(Number);
        const eParts = params.endDate.split('-').map(Number);
        if (sParts.length === 3 && eParts.length === 3) {
          const start = getDayStart(sParts[0], sParts[1] - 1, sParts[2]);
          const end = getDayEnd(eParts[0], eParts[1] - 1, eParts[2]);
          return {
            start,
            end,
            label: `${params.startDate} to ${params.endDate}`,
            startDateStr: params.startDate,
            endDateStr: params.endDate,
            period: 'custom',
          };
        }
      }
      // Fallback: This Month
      const start = getDayStart(curYear, curMonth, 1);
      const end = getDayEnd(curYear, curMonth, curDate);
      return {
        start,
        end,
        label: `This Month (${formatISTDateString(start)} to ${formatISTDateString(end)})`,
        startDateStr: formatISTDateString(start),
        endDateStr: formatISTDateString(end),
        period: 'custom',
      };
    }
  }
}

/**
 * Categorizes an expense category name as Cost of Goods Sold (COGS) or Operating Expense (OPEX).
 */
export function isCostOfGoodsSold(categoryName: string, itemUnit?: string): boolean {
  const lower = (categoryName || '').toLowerCase().trim();
  const lowerUnit = (itemUnit || '').toLowerCase().trim();

  // Explicit OPEX patterns
  const opexKeywords = [
    'rent',
    'salary',
    'salaries',
    'staff',
    'wage',
    'wages',
    'payroll',
    'electricity',
    'power',
    'water',
    'utility',
    'utilities',
    'gas',
    'lpg',
    'cylinder',
    'maintenance',
    'repair',
    'marketing',
    'ad',
    'ads',
    'advertising',
    'promo',
    'software',
    'internet',
    'wifi',
    'cleaning',
    'hygiene',
    'license',
    'tax',
    'miscellaneous',
    'admin',
  ];

  for (const kw of opexKeywords) {
    if (lower.includes(kw)) {
      return false;
    }
  }

  // Explicit COGS patterns
  const cogsKeywords = [
    'raw',
    'ingredient',
    'grocery',
    'groceries',
    'vegetable',
    'veggie',
    'meat',
    'chicken',
    'mutton',
    'fish',
    'seafood',
    'poultry',
    'dairy',
    'milk',
    'cheese',
    'paneer',
    'butter',
    'curd',
    'spice',
    'oil',
    'flour',
    'grain',
    'packaging',
    'box',
    'container',
    'beverage',
    'syrup',
    'sauce',
    'bread',
    'food',
    'supplies',
  ];

  for (const kw of cogsKeywords) {
    if (lower.includes(kw)) {
      return true;
    }
  }

  // Unit-based inference
  if (['kg', 'gram', 'litre', 'ml', 'dozen'].includes(lowerUnit)) {
    return true;
  }

  // Default: Raw Materials / Direct supplies are COGS
  return true;
}

/**
 * Generates an array of all dates (YYYY-MM-DD) between start and end inclusive in IST.
 */
function getDaysList(startDate: Date, endDate: Date): string[] {
  const days: string[] = [];
  const current = new Date(startDate.getTime());

  while (current <= endDate) {
    const ist = new Date(current.getTime() + IST_OFFSET_MS);
    days.push(ist.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

/**
 * Formats a YYYY-MM-DD date string into a friendly human-readable label.
 * e.g., "Fri, Oct 23, 2026"
 */
function formatDayLabel(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dayNames[date.getUTCDay()]}, ${monthNames[date.getUTCMonth()]} ${d}, ${y}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Core P&L Aggregation Service:
 * Aggregates Orders & Expenses into a clean, audited Profit & Loss Statement.
 */
export async function getPnLStatement(params: {
  restaurantId: string;
  period: PnLTimePeriod;
  granularity?: PnLBreakdownGranularity; // 'day' | 'month'
  singleDate?: string;
  startDate?: string;
  endDate?: string;
  quarter?: QuarterName;
  year?: number;
  monthIndex?: number;
  customCogsPercent?: number | null;
}): Promise<PnLStatementResponse> {
  await dbConnect();
  const restaurantId = norm(params.restaurantId);

  const dateRange = getPnLDateBoundaries(params);
  const start = dateRange.start;
  const end = dateRange.end;

  // 1. Fetch Orders in range (Exclude cancelled/rejected from revenue)
  const orderMatchQuery: Record<string, any> = {
    restaurantId,
    status: { $nin: ['cancelled', 'rejected'] },
    $or: [
      { placed_at: { $gte: start, $lte: end } },
      { placed_at: null, createdAt: { $gte: start, $lte: end } },
    ],
  };

  const orders = await Order.find(orderMatchQuery)
    .select('_id total subtotal discount tax status placed_at createdAt paymentMode orderType source')
    .lean();

  // 2. Fetch Expenses in range
  const expenses = await ExpenseLog.find({
    restaurantId,
    purchaseDate: { $gte: start, $lte: end },
  })
    .populate({
      path: 'itemId',
      select: 'name unit categoryId',
      populate: { path: 'categoryId', select: 'name' },
    })
    .lean();

  // 3. Summarize Overall Revenue & Expenses
  let grossSales = 0;
  let totalDiscounts = 0;
  let netSales = 0;
  let taxCollected = 0;
  const totalOrders = orders.length;

  for (const o of orders) {
    const sub = Number(o.subtotal) || 0;
    const disc = Number(o.discount) || 0;
    const tax = Number(o.tax) || 0;
    const tot = Number(o.total) || Math.max(0, sub - disc + tax);

    grossSales += sub > 0 ? sub : tot + disc;
    totalDiscounts += disc;
    netSales += Math.max(0, (sub > 0 ? sub : tot) - disc);
    taxCollected += tax;
  }

  grossSales = Math.round(grossSales * 100) / 100;
  totalDiscounts = Math.round(totalDiscounts * 100) / 100;
  netSales = Math.round(netSales * 100) / 100;
  taxCollected = Math.round(taxCollected * 100) / 100;

  // Group Expenses by Category & type (COGS vs OPEX)
  const categoryMap: Map<string, {
    categoryId: string;
    categoryName: string;
    type: 'cogs' | 'opex';
    totalSpend: number;
    itemCount: number;
  }> = new Map();

  let cogsTracked = 0;
  let totalOpex = 0;

  for (const exp of expenses) {
    const item = (exp.itemId as any) || {};
    const category = item.categoryId || {};
    const catId = category._id ? category._id.toString() : 'uncategorized';
    const catName = category.name || 'General Raw Materials';
    const unit = item.unit || 'unit';
    const spend = Number(exp.totalPrice) || 0;

    const isCogs = isCostOfGoodsSold(catName, unit);
    const type = isCogs ? 'cogs' : 'opex';

    if (isCogs) {
      cogsTracked += spend;
    } else {
      totalOpex += spend;
    }

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        categoryId: catId,
        categoryName: catName,
        type,
        totalSpend: 0,
        itemCount: 0,
      });
    }

    const catRecord = categoryMap.get(catId)!;
    catRecord.totalSpend += spend;
    catRecord.itemCount += 1;
  }

  cogsTracked = Math.round(cogsTracked * 100) / 100;
  totalOpex = Math.round(totalOpex * 100) / 100;

  // Food Cost & COGS Calculation:
  // Supports manual custom COGS percentage, tracked actuals from ExpenseLog, or 32% benchmark fallback
  const isCustomCogs = typeof params.customCogsPercent === 'number' && params.customCogsPercent >= 0;
  const customCogsRate = isCustomCogs ? (params.customCogsPercent as number) / 100 : 0.32;
  const cogsBenchmarkEstimated = Math.round(netSales * 0.32 * 100) / 100;

  let cogsUsed = 0;
  let cogsMode: 'actual' | 'custom' | 'benchmark' = 'actual';
  let isCogsEstimated = false;

  if (isCustomCogs) {
    cogsUsed = Math.round(netSales * customCogsRate * 100) / 100;
    cogsMode = 'custom';
    isCogsEstimated = true;
  } else if (cogsTracked > 0) {
    cogsUsed = cogsTracked;
    cogsMode = 'actual';
    isCogsEstimated = false;
  } else {
    cogsUsed = cogsBenchmarkEstimated;
    cogsMode = 'benchmark';
    isCogsEstimated = true;
  }

  const grossProfit = Math.round((netSales - cogsUsed) * 100) / 100;
  const grossMargin = netSales > 0 ? Math.round((grossProfit / netSales) * 10000) / 100 : 0;

  const operatingProfit = Math.round((grossProfit - totalOpex) * 100) / 100;
  const operatingMargin = netSales > 0 ? Math.round((operatingProfit / netSales) * 10000) / 100 : 0;

  const netProfit = operatingProfit;
  const netMargin = operatingMargin;

  const cogsRatio = netSales > 0 ? Math.round((cogsUsed / netSales) * 10000) / 100 : 0;
  const opexRatio = netSales > 0 ? Math.round((totalOpex / netSales) * 10000) / 100 : 0;
  const averageOrderValue = totalOrders > 0 ? Math.round((netSales / totalOrders) * 100) / 100 : 0;

  const categoryExpenses: PnLCategoryExpense[] = Array.from(categoryMap.values()).map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    type: c.type,
    totalSpend: Math.round(c.totalSpend * 100) / 100,
    itemCount: c.itemCount,
    percentageOfNetSales: netSales > 0 ? Math.round((c.totalSpend / netSales) * 10000) / 100 : 0,
  }));

  categoryExpenses.sort((a, b) => b.totalSpend - a.totalSpend);

  // 4. Time Breakdown Bucketing
  // Granularity logic:
  // - If user specifically requested 'month' granularity for quarter/year: group by month.
  // - User requested "per day quater p$l", so default to 'day' breakdown!
  let resolvedGranularity: PnLBreakdownGranularity = params.granularity || 'day';
  if (params.period === 'quarter' && !params.granularity) {
    resolvedGranularity = 'day'; // Per day quarter P&L by default!
  }

  const daysList = getDaysList(start, end);
  const activeDaysCount = daysList.length;
  const dailyAverageSales = activeDaysCount > 0 ? Math.round((netSales / activeDaysCount) * 100) / 100 : 0;
  const dailyAverageProfit = activeDaysCount > 0 ? Math.round((netProfit / activeDaysCount) * 100) / 100 : 0;

  const summaryMetrics: PnLSummaryMetrics = {
    grossSales,
    totalDiscounts,
    netSales,
    taxCollected,
    totalOrders,
    averageOrderValue,
    cogsTracked,
    cogsBenchmarkEstimated,
    cogsUsed,
    isCogsEstimated,
    cogsRatio,
    cogsMode,
    customCogsPercent: isCustomCogs ? params.customCogsPercent : null,
    grossProfit,
    grossMargin,
    totalOpex,
    opexRatio,
    categoryExpenses,
    operatingProfit,
    operatingMargin,
    netProfit,
    netMargin,
    activeDaysCount,
    dailyAverageSales,
    dailyAverageProfit,
  };

  // Build Breakdown
  const breakdown: PnLTimeBucket[] = [];

  if (resolvedGranularity === 'day') {
    // Group orders and expenses by date string (YYYY-MM-DD in IST)
    const dayOrdersMap: Map<string, typeof orders> = new Map();
    const dayExpensesMap: Map<string, typeof expenses> = new Map();

    for (const d of daysList) {
      dayOrdersMap.set(d, []);
      dayExpensesMap.set(d, []);
    }

    for (const o of orders) {
      const orderDate = new Date(o.placed_at || o.createdAt);
      const istDate = new Date(orderDate.getTime() + IST_OFFSET_MS);
      const key = istDate.toISOString().split('T')[0];
      if (dayOrdersMap.has(key)) {
        dayOrdersMap.get(key)!.push(o);
      }
    }

    for (const e of expenses) {
      const expDate = new Date(e.purchaseDate);
      const istDate = new Date(expDate.getTime() + IST_OFFSET_MS);
      const key = istDate.toISOString().split('T')[0];
      if (dayExpensesMap.has(key)) {
        dayExpensesMap.get(key)!.push(e);
      }
    }

    // Sort days descending (newest day first) for convenient daily review
    const reverseDays = [...daysList].reverse();

    for (const dKey of reverseDays) {
      const dayOrds = dayOrdersMap.get(dKey) || [];
      const dayExps = dayExpensesMap.get(dKey) || [];

      let dGross = 0;
      let dDisc = 0;
      let dNet = 0;

      for (const o of dayOrds) {
        const sub = Number(o.subtotal) || 0;
        const disc = Number(o.discount) || 0;
        const tot = Number(o.total) || 0;
        dGross += sub > 0 ? sub : tot + disc;
        dDisc += disc;
        dNet += Math.max(0, (sub > 0 ? sub : tot) - disc);
      }

      let dCogs = 0;
      let dOpex = 0;

      for (const e of dayExps) {
        const item = (e.itemId as any) || {};
        const cat = item.categoryId || {};
        const isCogs = isCostOfGoodsSold(cat.name || '', item.unit);
        const spend = Number(e.totalPrice) || 0;
        if (isCogs) dCogs += spend;
        else dOpex += spend;
      }

      // Day COGS: respect custom COGS % if specified, otherwise tracked actuals, otherwise benchmark
      let dCogsUsed = 0;
      if (isCustomCogs) {
        dCogsUsed = Math.round(dNet * customCogsRate * 100) / 100;
      } else if (dCogs > 0) {
        dCogsUsed = dCogs;
      } else {
        dCogsUsed = Math.round(dNet * 0.32 * 100) / 100;
      }
      const dGrossProfit = Math.round((dNet - dCogsUsed) * 100) / 100;
      const dNetProfit = Math.round((dGrossProfit - dOpex) * 100) / 100;
      const dNetMargin = dNet > 0 ? Math.round((dNetProfit / dNet) * 10000) / 100 : 0;

      // Start and End for this specific day
      const [y, m, d] = dKey.split('-').map(Number);
      const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - IST_OFFSET_MS);
      const dayEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - IST_OFFSET_MS);

      breakdown.push({
        periodKey: dKey,
        displayLabel: formatDayLabel(dKey),
        dateStart: dayStart.toISOString(),
        dateEnd: dayEnd.toISOString(),
        orderCount: dayOrds.length,
        grossSales: Math.round(dGross * 100) / 100,
        discounts: Math.round(dDisc * 100) / 100,
        netSales: Math.round(dNet * 100) / 100,
        cogs: Math.round(dCogsUsed * 100) / 100,
        grossProfit: dGrossProfit,
        opex: Math.round(dOpex * 100) / 100,
        netProfit: dNetProfit,
        netMargin: dNetMargin,
        isProfitable: dNetProfit >= 0,
      });
    }
  } else if (resolvedGranularity === 'month') {
    // Month-by-month bucketing (e.g. for quarter or annual overview)
    const monthBuckets: Map<string, {
      monthKey: string;
      label: string;
      start: Date;
      end: Date;
      orders: typeof orders;
      expenses: typeof expenses;
    }> = new Map();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    for (const d of daysList) {
      const [y, m] = d.split('-').map(Number);
      const mKey = `${y}-${String(m).padStart(2, '0')}`;
      if (!monthBuckets.has(mKey)) {
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        monthBuckets.set(mKey, {
          monthKey: mKey,
          label: `${monthNames[m - 1]} ${y}`,
          start: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS),
          end: new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59, 999) - IST_OFFSET_MS),
          orders: [],
          expenses: [],
        });
      }
    }

    for (const o of orders) {
      const oDate = new Date(o.placed_at || o.createdAt);
      const istDate = new Date(oDate.getTime() + IST_OFFSET_MS);
      const [y, m] = istDate.toISOString().split('T')[0].split('-').map(Number);
      const mKey = `${y}-${String(m).padStart(2, '0')}`;
      if (monthBuckets.has(mKey)) {
        monthBuckets.get(mKey)!.orders.push(o);
      }
    }

    for (const e of expenses) {
      const eDate = new Date(e.purchaseDate);
      const istDate = new Date(eDate.getTime() + IST_OFFSET_MS);
      const [y, m] = istDate.toISOString().split('T')[0].split('-').map(Number);
      const mKey = `${y}-${String(m).padStart(2, '0')}`;
      if (monthBuckets.has(mKey)) {
        monthBuckets.get(mKey)!.expenses.push(e);
      }
    }

    for (const b of Array.from(monthBuckets.values())) {
      let mGross = 0;
      let mDisc = 0;
      let mNet = 0;

      for (const o of b.orders) {
        const sub = Number(o.subtotal) || 0;
        const disc = Number(o.discount) || 0;
        const tot = Number(o.total) || 0;
        mGross += sub > 0 ? sub : tot + disc;
        mDisc += disc;
        mNet += Math.max(0, (sub > 0 ? sub : tot) - disc);
      }

      let mCogs = 0;
      let mOpex = 0;

      for (const e of b.expenses) {
        const item = (e.itemId as any) || {};
        const cat = item.categoryId || {};
        const isCogs = isCostOfGoodsSold(cat.name || '', item.unit);
        const spend = Number(e.totalPrice) || 0;
        if (isCogs) mCogs += spend;
        else mOpex += spend;
      }

      let mCogsUsed = 0;
      if (isCustomCogs) {
        mCogsUsed = Math.round(mNet * customCogsRate * 100) / 100;
      } else if (mCogs > 0) {
        mCogsUsed = mCogs;
      } else {
        mCogsUsed = Math.round(mNet * 0.32 * 100) / 100;
      }
      const mGrossProfit = Math.round((mNet - mCogsUsed) * 100) / 100;
      const mNetProfit = Math.round((mGrossProfit - mOpex) * 100) / 100;
      const mNetMargin = mNet > 0 ? Math.round((mNetProfit / mNet) * 10000) / 100 : 0;

      breakdown.push({
        periodKey: b.monthKey,
        displayLabel: b.label,
        dateStart: b.start.toISOString(),
        dateEnd: b.end.toISOString(),
        orderCount: b.orders.length,
        grossSales: Math.round(mGross * 100) / 100,
        discounts: Math.round(mDisc * 100) / 100,
        netSales: Math.round(mNet * 100) / 100,
        cogs: Math.round(mCogsUsed * 100) / 100,
        grossProfit: mGrossProfit,
        opex: Math.round(mOpex * 100) / 100,
        netProfit: mNetProfit,
        netMargin: mNetMargin,
        isProfitable: mNetProfit >= 0,
      });
    }
  }

  return {
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
      label: dateRange.label,
      period: params.period,
      quarter: params.quarter,
      year: params.year,
    },
    metrics: summaryMetrics,
    breakdown,
    breakdownGranularity: resolvedGranularity,
  };
}

/**
 * Interactive Order Drilldown:
 * Queries and formats exact orders for a specific day or date interval with multi-filters and pagination.
 */
export async function getPnLOrdersDrilldown(params: {
  restaurantId: string;
  startDateIso: string;
  endDateIso: string;
  filter?: PnLOrderDrilldownFilter;
}): Promise<PnLOrdersResponse> {
  await dbConnect();
  const restaurantId = norm(params.restaurantId);

  const start = new Date(params.startDateIso);
  const end = new Date(params.endDateIso);

  const filter = params.filter || {};
  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const skip = (page - 1) * limit;

  const matchQuery: Record<string, any> = {
    restaurantId,
    $or: [
      { placed_at: { $gte: start, $lte: end } },
      { placed_at: null, createdAt: { $gte: start, $lte: end } },
    ],
  };

  // Status Filter
  if (filter.status === 'valid_only') {
    matchQuery.status = { $nin: ['cancelled', 'rejected'] };
  } else if (filter.status && filter.status !== 'all') {
    matchQuery.status = filter.status;
  }

  // Order Type Filter
  if (filter.orderType && filter.orderType !== 'all') {
    matchQuery.orderType = filter.orderType;
  }

  // Source Filter
  if (filter.source && filter.source !== 'all') {
    matchQuery.source = filter.source;
  }

  // Payment Mode Filter
  if (filter.paymentMode && filter.paymentMode !== 'all') {
    matchQuery.paymentMode = filter.paymentMode;
  }

  // Text Search (Customer Name, Phone, Notes, or Item Name)
  if (filter.search && filter.search.trim().length > 0) {
    const s = filter.search.trim();
    const regex = new RegExp(s, 'i');
    matchQuery.$and = [
      ...(matchQuery.$and || []),
      {
        $or: [
          { customerName: regex },
          { customerPhone: regex },
          { notes: regex },
          { 'items.name': regex },
        ],
      },
    ];
  }

  // Sorting
  let sortObj: Record<string, 1 | -1> = { placed_at: -1, createdAt: -1 };
  if (filter.sortBy === 'time_asc') {
    sortObj = { placed_at: 1, createdAt: 1 };
  } else if (filter.sortBy === 'total_desc') {
    sortObj = { total: -1 };
  } else if (filter.sortBy === 'total_asc') {
    sortObj = { total: 1 };
  }

  const [rawOrders, totalCount, aggRevenue] = await Promise.all([
    Order.find(matchQuery)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(matchQuery),
    Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalSales: { $sum: '$total' } } },
    ]),
  ]);

  const totalRevenue = aggRevenue[0]?.totalSales || 0;

  // Format orders for UI
  const orders: PnLDrilldownOrder[] = rawOrders.map((o: any) => {
    const placedDate = new Date(o.placed_at || o.createdAt);
    const istPlaced = new Date(placedDate.getTime() + IST_OFFSET_MS);

    // Format time: e.g. "02:45 PM"
    const hours = istPlaced.getUTCHours();
    const minutes = istPlaced.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const timeOnly = `${formattedHours}:${formattedMinutes} ${ampm}`;

    // Format date: "23 Oct 2026"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateFormatted = `${istPlaced.getUTCDate()} ${monthNames[istPlaced.getUTCMonth()]} ${istPlaced.getUTCFullYear()}`;
    const placedTimeFormatted = `${timeOnly}, ${dateFormatted}`;

    // Relative time
    const diffMs = Date.now() - placedDate.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    let relativeTime = 'Just now';
    if (diffMins >= 1 && diffMins < 60) {
      relativeTime = `${diffMins}m ago`;
    } else if (diffMins >= 60 && diffMins < 1440) {
      relativeTime = `${Math.floor(diffMins / 60)}h ago`;
    } else if (diffMins >= 1440) {
      relativeTime = `${Math.floor(diffMins / 1440)}d ago`;
    }

    const items = (o.items || []).map((it: any) => ({
      menuItemId: it.menuItemId || '',
      name: it.name || 'Custom Item',
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      subtotal: (Number(it.price) || 0) * (Number(it.quantity) || 1),
      image: it.image || '',
      originatedFromNudge: !!it.originatedFromNudge,
    }));

    const idStr = o._id.toString();
    const orderIdShort = `#${idStr.slice(-5).toUpperCase()}`;

    return {
      _id: idStr,
      orderIdShort,
      customerName: o.customerName || 'Walk-in Guest',
      customerPhone: o.customerPhone || '',
      tableId: o.tableId || undefined,
      orderType: o.orderType || 'takeaway',
      source: o.source || 'qr_scan',
      paymentMode: o.paymentMode || 'cash',
      status: o.status || 'received',
      subtotal: Number(o.subtotal) || 0,
      discount: Number(o.discount) || 0,
      tax: Number(o.tax) || 0,
      total: Number(o.total) || 0,
      couponCode: o.couponCode || undefined,
      notes: o.notes || undefined,
      items,
      itemCount: items.reduce((acc: number, it: any) => acc + it.quantity, 0),
      placedAt: placedDate.toISOString(),
      placedTimeFormatted,
      relativeTime,
    };
  });

  // Human date label for summary
  const istStart = new Date(start.getTime() + IST_OFFSET_MS);
  const istEnd = new Date(end.getTime() + IST_OFFSET_MS);
  const startDay = istStart.toISOString().split('T')[0];
  const endDay = istEnd.toISOString().split('T')[0];
  const summaryDateLabel = startDay === endDay ? formatDayLabel(startDay) : `${startDay} to ${endDay}`;

  return {
    orders,
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
    currentPage: page,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    summaryDateLabel,
  };
}

/**
 * Interactive Expense Drilldown:
 * Queries and formats exact logged expenses for a period.
 */
export async function getPnLExpensesDrilldown(params: {
  restaurantId: string;
  startDateIso: string;
  endDateIso: string;
  type?: 'all' | 'cogs' | 'opex';
}): Promise<PnLExpensesResponse> {
  await dbConnect();
  const restaurantId = norm(params.restaurantId);

  const start = new Date(params.startDateIso);
  const end = new Date(params.endDateIso);

  const rawExpenses = await ExpenseLog.find({
    restaurantId,
    purchaseDate: { $gte: start, $lte: end },
  })
    .populate({
      path: 'itemId',
      select: 'name unit categoryId',
      populate: { path: 'categoryId', select: 'name' },
    })
    .sort({ purchaseDate: -1, createdAt: -1 })
    .lean();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let totalSpend = 0;
  let cogsSpend = 0;
  let opexSpend = 0;

  const formatted: PnLExpenseDrilldownItem[] = [];

  for (const exp of rawExpenses) {
    const item = (exp.itemId as any) || {};
    const category = item.categoryId || {};
    const catName = category.name || 'General Raw Materials';
    const unit = item.unit || 'unit';
    const spend = Number(exp.totalPrice) || 0;
    const isCogs = isCostOfGoodsSold(catName, unit);
    const type: 'cogs' | 'opex' = isCogs ? 'cogs' : 'opex';

    totalSpend += spend;
    if (isCogs) cogsSpend += spend;
    else opexSpend += spend;

    if (params.type && params.type !== 'all' && params.type !== type) {
      continue;
    }

    const expDate = new Date(exp.purchaseDate);
    const istExp = new Date(expDate.getTime() + IST_OFFSET_MS);
    const purchaseDateFormatted = `${istExp.getUTCDate()} ${monthNames[istExp.getUTCMonth()]} ${istExp.getUTCFullYear()}`;

    formatted.push({
      _id: exp._id.toString(),
      purchaseDate: expDate.toISOString(),
      purchaseDateFormatted,
      itemName: item.name || 'Expense Item',
      categoryName: catName,
      type,
      quantity: Number(exp.quantity) || 1,
      unit,
      pricePerUnit: Number(exp.pricePerUnit) || 0,
      totalPrice: spend,
      vendor: exp.vendor || undefined,
      note: exp.note || undefined,
    });
  }

  return {
    expenses: formatted,
    totalSpend: Math.round(totalSpend * 100) / 100,
    cogsSpend: Math.round(cogsSpend * 100) / 100,
    opexSpend: Math.round(opexSpend * 100) / 100,
    totalCount: formatted.length,
  };
}
