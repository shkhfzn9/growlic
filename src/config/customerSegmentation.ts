/**
 * Customer Segmentation & Meal Time Slots Configuration
 * 
 * Provides customizable thresholds for RFM/Behavioral segmentation
 * and meal time slot boundaries evaluated in Asia/Kolkata timezone (+05:30).
 */

export type CustomerSegment = 'VIP' | 'REGULAR' | 'NEW' | 'AT_RISK' | 'LOST';

export interface SegmentationConfig {
  /** Days since last visit to classify as LOST (Default: 90) */
  lostDays: number;
  /** Minimum days since last visit for AT-RISK classification (Default: 30) */
  atRiskMinDays: number;
  /** Multiplier on customer's average interval for AT-RISK (Default: 1.5) */
  atRiskIntervalMultiplier: number;
  /** Percentile of customer LTV for VIP qualification (Default: 0.90 -> Top 10%) */
  vipLtvPercentile: number;
  /** Minimum completed visits required for VIP qualification (Default: 3) */
  vipMinVisits: number;
  /** Minimum completed visits for REGULAR qualification (Default: 2) */
  regularMinVisits: number;
  /** Maximum days from first visit to qualify as NEW (Default: 30) */
  newMaxDays: number;
}

export const DEFAULT_SEGMENTATION_CONFIG: SegmentationConfig = {
  lostDays: 90,
  atRiskMinDays: 30,
  atRiskIntervalMultiplier: 1.5,
  vipLtvPercentile: 0.90,
  vipMinVisits: 3,
  regularMinVisits: 2,
  newMaxDays: 30,
};

export interface MealSlotConfig {
  /** Boundary for Breakfast: hour < breakfastEndHour (Default: 11) */
  breakfastEndHour: number;
  /** Boundary for Lunch: breakfastEndHour <= hour < lunchEndHour (Default: 16) */
  lunchEndHour: number;
  /** Boundary for Snacks: lunchEndHour <= hour < snacksEndHour (Default: 19) */
  snacksEndHour: number;
  /** Boundary for Dinner: hour >= dinnerStartHour (Default: 19) */
  dinnerStartHour: number;
}

export const DEFAULT_MEAL_SLOT_CONFIG: MealSlotConfig = {
  breakfastEndHour: 11,
  lunchEndHour: 16,
  snacksEndHour: 19,
  dinnerStartHour: 19,
};

export type MealTimeSlot = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';

/**
 * Returns the date converted to Asia/Kolkata time zone (+05:30).
 */
export function getKolkataDateParts(inputDate: Date | string | number): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;  // 0-23
  minute: number;
  dayOfWeek: string;
  timeStr: string;
  dateStr: string;
} {
  const d = new Date(inputDate);
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'long',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const dayOfWeek = getPart('weekday');
  const day = parseInt(getPart('day'), 10) || 1;
  const month = parseInt(getPart('month'), 10) || 1;
  const year = parseInt(getPart('year'), 10) || 2026;
  const hour = parseInt(getPart('hour'), 10) || 0;
  const minute = parseInt(getPart('minute'), 10) || 0;

  const dateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  
  // Format 12-hour string (e.g. 02:45 PM)
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const timeStr = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;

  return { year, month, day, hour, minute, dayOfWeek, timeStr, dateStr };
}

/**
 * Identifies the meal time slot for a given date in Asia/Kolkata timezone.
 */
export function getMealTimeSlot(
  inputDate: Date | string | number,
  config: MealSlotConfig = DEFAULT_MEAL_SLOT_CONFIG
): MealTimeSlot {
  const { hour } = getKolkataDateParts(inputDate);
  if (hour < config.breakfastEndHour) {
    return 'Breakfast';
  }
  if (hour < config.lunchEndHour) {
    return 'Lunch';
  }
  if (hour < config.snacksEndHour) {
    return 'Snacks';
  }
  return 'Dinner';
}

/**
 * Calculates days difference between two dates.
 */
export function getDaysDifference(recentDate: Date, olderDate: Date): number {
  const diffMs = recentDate.getTime() - olderDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Computes average visit interval in days.
 * Returns null if fewer than 2 visits.
 */
export function calculateAverageVisitInterval(
  firstVisit: Date | string | null | undefined,
  lastVisit: Date | string | null | undefined,
  totalVisits: number
): number | null {
  if (totalVisits < 2 || !firstVisit || !lastVisit) {
    return null;
  }
  const first = new Date(firstVisit);
  const last = new Date(lastVisit);
  const daysDiff = getDaysDifference(last, first);
  if (daysDiff <= 0) return 1; // Multiple visits on same day
  const intervals = totalVisits - 1;
  return Math.round((daysDiff / intervals) * 10) / 10;
}

/**
 * Pure evaluation function for customer segment.
 * Rules evaluated in strict order (First match wins):
 * 1. LOST: days since last visit > 90
 * 2. AT-RISK: days since last visit > max(30, 1.5 x customer's avg interval)
 * 3. VIP: top 10% by LTV AND >= 3 visits AND not at-risk/lost
 * 4. REGULAR: >= 2 visits AND not at-risk/lost
 * 5. NEW: exactly 1 visit AND first visit within last 30 days
 */
export function evaluateCustomerSegment(
  stats: {
    totalSpent: number;
    totalOrders: number;
    firstVisitDate?: Date | string | null;
    lastVisitDate?: Date | string | null;
  },
  vipLtvThreshold: number,
  referenceDate: Date = new Date(),
  config: SegmentationConfig = DEFAULT_SEGMENTATION_CONFIG
): CustomerSegment {
  const lastVisit = stats.lastVisitDate ? new Date(stats.lastVisitDate) : null;
  const firstVisit = stats.firstVisitDate ? new Date(stats.firstVisitDate) : lastVisit;
  const visits = stats.totalOrders || 0;
  const ltv = stats.totalSpent || 0;

  const daysSinceLastVisit = lastVisit ? getDaysDifference(referenceDate, lastVisit) : 999;
  const daysSinceFirstVisit = firstVisit ? getDaysDifference(referenceDate, firstVisit) : daysSinceLastVisit;

  const avgInterval = calculateAverageVisitInterval(firstVisit, lastVisit, visits) || 14;

  // Rule 1: LOST
  if (daysSinceLastVisit > config.lostDays) {
    return 'LOST';
  }

  // Rule 2: AT-RISK
  const atRiskThreshold = Math.max(config.atRiskMinDays, config.atRiskIntervalMultiplier * avgInterval);
  if (daysSinceLastVisit > atRiskThreshold) {
    return 'AT_RISK';
  }

  // Rule 3: VIP
  if (ltv >= vipLtvThreshold && visits >= config.vipMinVisits) {
    return 'VIP';
  }

  // Rule 4: REGULAR
  if (visits >= config.regularMinVisits) {
    return 'REGULAR';
  }

  // Rule 5: NEW (1 visit and within 30 days)
  if (visits === 1 && daysSinceFirstVisit <= config.newMaxDays) {
    return 'NEW';
  }

  // Fallback for 1-visit customers older than 30 days who might not have triggered at-risk
  if (daysSinceFirstVisit > config.newMaxDays) {
    return 'AT_RISK';
  }

  return 'NEW';
}
