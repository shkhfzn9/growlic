import { describe, it, expect } from 'vitest';
import {
  evaluateCustomerSegment,
  calculateAverageVisitInterval,
  getMealTimeSlot,
  getKolkataDateParts,
  DEFAULT_SEGMENTATION_CONFIG,
} from '@/config/customerSegmentation';

describe('Customer Segmentation & Meal Slots Unit Tests', () => {
  const refDate = new Date('2026-10-20T12:00:00.000Z');
  const vipLtvThreshold = 5000;

  describe('RFM / Behavioral Segmentation Hierarchy (First Match Wins)', () => {
    it('Rule 1: Classifies as LOST when days since last visit > 90, even with high VIP LTV', () => {
      // Last visit 95 days ago
      const lastVisit = new Date(refDate.getTime() - 95 * 24 * 60 * 60 * 1000);
      const firstVisit = new Date(refDate.getTime() - 200 * 24 * 60 * 60 * 1000);

      const segment = evaluateCustomerSegment(
        {
          totalSpent: 25000, // Very high LTV
          totalOrders: 10,
          firstVisitDate: firstVisit,
          lastVisitDate: lastVisit,
        },
        vipLtvThreshold,
        refDate
      );

      expect(segment).toBe('LOST');
    });

    it('Rule 2: Classifies as AT-RISK when days since last visit > max(30, 1.5 * interval)', () => {
      // 5 visits over 50 days -> avg interval = 50 / 4 = 12.5 days
      // 1.5 * 12.5 = 18.75 days; max(30, 18.75) = 30 days
      // Last visit 35 days ago (> 30) -> AT-RISK
      const lastVisit = new Date(refDate.getTime() - 35 * 24 * 60 * 60 * 1000);
      const firstVisit = new Date(refDate.getTime() - 85 * 24 * 60 * 60 * 1000);

      const segment = evaluateCustomerSegment(
        {
          totalSpent: 8000,
          totalOrders: 5,
          firstVisitDate: firstVisit,
          lastVisitDate: lastVisit,
        },
        vipLtvThreshold,
        refDate
      );

      expect(segment).toBe('AT_RISK');
    });

    it('Rule 2 (High Cadence): Classifies as AT-RISK when 1.5 * avgInterval exceeds 30 days', () => {
      // 3 visits over 100 days -> avg interval = 50 days
      // 1.5 * 50 = 75 days; max(30, 75) = 75 days
      // Last visit 78 days ago (> 75) -> AT-RISK
      const lastVisit = new Date(refDate.getTime() - 78 * 24 * 60 * 60 * 1000);
      const firstVisit = new Date(refDate.getTime() - 178 * 24 * 60 * 60 * 1000);

      const segment = evaluateCustomerSegment(
        {
          totalSpent: 12000,
          totalOrders: 3,
          firstVisitDate: firstVisit,
          lastVisitDate: lastVisit,
        },
        vipLtvThreshold,
        refDate
      );

      expect(segment).toBe('AT_RISK');
    });

    it('Rule 3: Classifies as VIP when LTV >= threshold, visits >= 3, and not at-risk/lost', () => {
      const lastVisit = new Date(refDate.getTime() - 4 * 24 * 60 * 60 * 1000); // 4 days ago
      const firstVisit = new Date(refDate.getTime() - 60 * 24 * 60 * 60 * 1000);

      const segment = evaluateCustomerSegment(
        {
          totalSpent: 9500, // >= 5000
          totalOrders: 6,   // >= 3
          firstVisitDate: firstVisit,
          lastVisitDate: lastVisit,
        },
        vipLtvThreshold,
        refDate
      );

      expect(segment).toBe('VIP');
    });

    it('Rule 4: Classifies as REGULAR when visits >= 2 and not at-risk/lost/vip', () => {
      const lastVisit = new Date(refDate.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const firstVisit = new Date(refDate.getTime() - 40 * 24 * 60 * 60 * 1000);

      const segment = evaluateCustomerSegment(
        {
          totalSpent: 1800, // < 5000 (not VIP)
          totalOrders: 3,
          firstVisitDate: firstVisit,
          lastVisitDate: lastVisit,
        },
        vipLtvThreshold,
        refDate
      );

      expect(segment).toBe('REGULAR');
    });

    it('Rule 5: Classifies as NEW when exactly 1 visit and first visit was within 30 days', () => {
      const singleVisit = new Date(refDate.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const segment = evaluateCustomerSegment(
        {
          totalSpent: 450,
          totalOrders: 1,
          firstVisitDate: singleVisit,
          lastVisitDate: singleVisit,
        },
        vipLtvThreshold,
        refDate
      );

      expect(segment).toBe('NEW');
    });

    it('Edge Case: 1-visit customer older than 30 days falls into AT_RISK or LOST', () => {
      // Single visit was 40 days ago
      const olderSingleVisit = new Date(refDate.getTime() - 40 * 24 * 60 * 60 * 1000);

      const segment = evaluateCustomerSegment(
        {
          totalSpent: 500,
          totalOrders: 1,
          firstVisitDate: olderSingleVisit,
          lastVisitDate: olderSingleVisit,
        },
        vipLtvThreshold,
        refDate
      );

      expect(segment).toBe('AT_RISK');
    });

    it('Edge Case: 1-visit customer older than 90 days falls into LOST', () => {
      const lostSingleVisit = new Date(refDate.getTime() - 95 * 24 * 60 * 60 * 1000);

      const segment = evaluateCustomerSegment(
        {
          totalSpent: 500,
          totalOrders: 1,
          firstVisitDate: lostSingleVisit,
          lastVisitDate: lostSingleVisit,
        },
        vipLtvThreshold,
        refDate
      );

      expect(segment).toBe('LOST');
    });
  });

  describe('Visit Interval Calculation', () => {
    it('returns null for customers with fewer than 2 visits', () => {
      const first = new Date('2026-09-01');
      const last = new Date('2026-09-01');
      expect(calculateAverageVisitInterval(first, last, 1)).toBeNull();
      expect(calculateAverageVisitInterval(null, null, 0)).toBeNull();
    });

    it('correctly calculates average interval in days for returning customers', () => {
      const first = new Date('2026-09-01T00:00:00Z');
      const last = new Date('2026-09-31T00:00:00Z'); // 30 days later
      // 4 visits means 3 intervals -> 30 / 3 = 10 days
      const interval = calculateAverageVisitInterval(first, last, 4);
      expect(interval).toBe(10);
    });

    it('handles multiple visits on the same day without division by zero', () => {
      const sameDay = new Date('2026-10-15T10:00:00Z');
      const interval = calculateAverageVisitInterval(sameDay, sameDay, 3);
      expect(interval).toBe(1);
    });
  });

  describe('Asia/Kolkata Timezone & Meal Slot Calculations', () => {
    it('correctly calculates Breakfast slot (< 11:00 AM IST)', () => {
      // 03:30 UTC is 09:00 AM IST
      const date = new Date('2026-10-20T03:30:00.000Z');
      const slot = getMealTimeSlot(date);
      expect(slot).toBe('Breakfast');
    });

    it('correctly calculates Lunch slot (11:00 AM to 04:00 PM IST)', () => {
      // 07:30 UTC is 01:00 PM IST
      const date = new Date('2026-10-20T07:30:00.000Z');
      const slot = getMealTimeSlot(date);
      expect(slot).toBe('Lunch');
    });

    it('correctly calculates Snacks slot (04:00 PM to 07:00 PM IST)', () => {
      // 11:30 UTC is 05:00 PM IST
      const date = new Date('2026-10-20T11:30:00.000Z');
      const slot = getMealTimeSlot(date);
      expect(slot).toBe('Snacks');
    });

    it('correctly calculates Dinner slot (07:00 PM+ IST)', () => {
      // 14:30 UTC is 08:00 PM IST
      const date = new Date('2026-10-20T14:30:00.000Z');
      const slot = getMealTimeSlot(date);
      expect(slot).toBe('Dinner');
    });

    it('shifts midnight UTC correctly across day boundaries in Asia/Kolkata', () => {
      // 23:30 UTC on Oct 19 is 05:00 AM IST on Oct 20 (Breakfast)
      const date = new Date('2026-10-19T23:30:00.000Z');
      const parts = getKolkataDateParts(date);
      expect(parts.day).toBe(20);
      expect(parts.hour).toBe(5);
      expect(getMealTimeSlot(date)).toBe('Breakfast');
    });
  });
});
