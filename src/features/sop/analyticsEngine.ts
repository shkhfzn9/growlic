/**
 * SOP Performance Analytics Engine
 * Pure, deterministic, production-grade calculation module for SOP staff performance metrics,
 * period capping (100 / 700 / 3000 caps), deduplication, missed task tracking, custom date ranges, and comparative window insights.
 */

export interface PlainSopLog {
  _id?: string;
  restaurantId?: string;
  taskId?: string;
  taskName: string;
  batchName: string;
  employeeName: string;
  actualMinutes?: number;
  targetMinutes?: number;
  delayMinutes?: number;
  status: 'completed' | 'delayed';
  delayReason?: string;
  dateStr: string;
  completedAtIso?: string;
  createdAt?: string;
}

export interface PlainSopTask {
  _id: string;
  taskName: string;
  batchName: string;
  batchWindow?: string;
  targetMinutes: number;
  assignedStaffName?: string;
  active?: boolean;
  orderIndex?: number;
}

export interface DailyBreakdownItem {
  dateStr: string;
  total: number;
  delayed: number;
  missed: number;
  score: number; // 0 to 100
}

export interface PeriodBlockItem {
  label: string;
  earned: number;
  cap: number;
  ratio: number;
  delays: number;
  missed: number;
}

export interface ComputedStaffPerformance {
  daysCount: number;
  maxBaseScore: number;
  earnedScore: number;
  productivityRatio: number;
  gradeLabel: string;
  onTimeCount: number;
  delayedCount: number;
  missedCount: number;
  totalPenalties: number;
  filteredLogs: PlainSopLog[];
  delayedLogs: PlainSopLog[];
  missedTasks: { dateStr: string; task: PlainSopTask }[];
  dailyBreakdown: DailyBreakdownItem[];
  bestDay: DailyBreakdownItem | null;
  worstDay: DailyBreakdownItem | null;
  weeklyBlocks: PeriodBlockItem[];
  bestWeek: PeriodBlockItem | null;
  worstWeek: PeriodBlockItem | null;
  monthlyBlocks: PeriodBlockItem[];
  bestMonth: PeriodBlockItem | null;
  worstMonth: PeriodBlockItem | null;
}

/**
 * Returns YYYY-MM-DD in local time cleanly without UTC shift errors.
 */
export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats ISO timestamp or Date object to 12-hour format e.g. "02:59 PM"
 */
export function formatExecutionTime(completedAtIso?: string, createdAt?: string): string {
  const timeStr = completedAtIso || createdAt;
  if (!timeStr) return '--:--';
  try {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:--';
  }
}

/**
 * Normalizes staff name strings for safe casing & whitespace comparisons.
 */
export function normalizeStaffName(name: string): string {
  return (name || '').trim().toLowerCase();
}

/**
 * Deduplicates raw SOP logs to prevent accidental double-counting if a task completion
 * was recorded twice on the same day for the same employee.
 */
export function deduplicateSopLogs(logs: PlainSopLog[]): PlainSopLog[] {
  const seen = new Set<string>();
  const deduplicated: PlainSopLog[] = [];

  for (const log of logs) {
    if (!log || !log.dateStr) continue;
    const empKey = normalizeStaffName(log.employeeName);
    const taskKey = (log.taskId || log.taskName || '').trim().toLowerCase();
    const uniqueKey = `${empKey}::${log.dateStr}::${taskKey}`;

    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      deduplicated.push(log);
    }
  }

  return deduplicated;
}

/**
 * Centralized Calculation Engine for Staff SOP Performance (including Delay, Missed Tasks & Custom Date Ranges)
 */
export function computeStaffPerformanceMetrics(params: {
  staffName: string;
  allLogs: PlainSopLog[];
  assignedTasks: PlainSopTask[];
  timeframe: 'day' | 'week' | 'month' | '6months' | 'year';
  targetDateStr?: string;
  customDateRange?: { startDateStr: string; endDateStr: string };
}): ComputedStaffPerformance {
  const { staffName, allLogs, assignedTasks, timeframe, targetDateStr, customDateRange } = params;
  const normalizedTargetStaff = normalizeStaffName(staffName);

  // 1. Filter logs for target staff
  const rawStaffLogs = (allLogs || []).filter(
    (l) => normalizeStaffName(l.employeeName) === normalizedTargetStaff
  );

  // 2. Deduplicate logs to prevent double-counting
  const staffLogs = deduplicateSopLogs(rawStaffLogs);

  // 3. Determine timeframe date bounds & daysCount (N)
  const todayObj = new Date();
  let endDateStr = getLocalDateStr(todayObj);
  let startDateStr = endDateStr;
  let daysCount = 1;

  const hasCustomRange = Boolean(customDateRange && customDateRange.startDateStr && customDateRange.endDateStr);

  if (hasCustomRange && customDateRange) {
    startDateStr = customDateRange.startDateStr;
    endDateStr = customDateRange.endDateStr;

    const startObj = new Date(startDateStr);
    const endObj = new Date(endDateStr);
    const diffTime = Math.abs(endObj.getTime() - startObj.getTime());
    daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  } else if (targetDateStr) {
    startDateStr = targetDateStr;
    endDateStr = targetDateStr;
    daysCount = 1;
  } else {
    const startDate = new Date(todayObj);
    if (timeframe === 'day') {
      daysCount = 1;
    } else if (timeframe === 'week') {
      daysCount = 7;
      startDate.setDate(todayObj.getDate() - 7);
    } else if (timeframe === 'month') {
      daysCount = 30;
      startDate.setDate(todayObj.getDate() - 30);
    } else if (timeframe === '6months') {
      daysCount = 180;
      startDate.setDate(todayObj.getDate() - 180);
    } else if (timeframe === 'year') {
      daysCount = 365;
      startDate.setDate(todayObj.getDate() - 365);
    }
    startDateStr = getLocalDateStr(startDate);
  }

  // 4. Filter logs by date range
  const filteredLogs = staffLogs.filter((l) => {
    if (targetDateStr) return l.dateStr === targetDateStr;
    return l.dateStr >= startDateStr && l.dateStr <= endDateStr;
  });

  // 5. Track Missed Tasks for assigned staff tasks across past dates
  const missedTasksList: { dateStr: string; task: PlainSopTask }[] = [];
  const missedCountMap = new Map<string, number>();

  if (assignedTasks && assignedTasks.length > 0) {
    const todayStr = getLocalDateStr(new Date());
    const logsByDateAndTask = new Set<string>();

    staffLogs.forEach((l) => {
      if (l.dateStr && (l.taskId || l.taskName)) {
        const taskKey = (l.taskId || l.taskName).trim().toLowerCase();
        logsByDateAndTask.add(`${l.dateStr}::${taskKey}`);
      }
    });

    if (hasCustomRange && customDateRange) {
      const startObj = new Date(startDateStr);
      const endObj = new Date(endDateStr);

      for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
        const dStr = getLocalDateStr(d);
        if (dStr < todayStr) {
          assignedTasks.forEach((task) => {
            const taskKey = (task._id || task.taskName).trim().toLowerCase();
            const nameKey = task.taskName.trim().toLowerCase();
            const hasLog = logsByDateAndTask.has(`${dStr}::${taskKey}`) || logsByDateAndTask.has(`${dStr}::${nameKey}`);

            if (!hasLog) {
              missedTasksList.push({ dateStr: dStr, task });
              missedCountMap.set(dStr, (missedCountMap.get(dStr) || 0) + 1);
            }
          });
        }
      }
    } else {
      for (let d = daysCount - 1; d >= 0; d--) {
        const targetDate = new Date(todayObj);
        targetDate.setDate(todayObj.getDate() - d);
        const dStr = getLocalDateStr(targetDate);

        if (targetDateStr ? dStr === targetDateStr : (dStr >= startDateStr && dStr <= endDateStr)) {
          if (dStr < todayStr) {
            assignedTasks.forEach((task) => {
              const taskKey = (task._id || task.taskName).trim().toLowerCase();
              const nameKey = task.taskName.trim().toLowerCase();
              const hasLog = logsByDateAndTask.has(`${dStr}::${taskKey}`) || logsByDateAndTask.has(`${dStr}::${nameKey}`);

              if (!hasLog) {
                missedTasksList.push({ dateStr: dStr, task });
                missedCountMap.set(dStr, (missedCountMap.get(dStr) || 0) + 1);
              }
            });
          }
        }
      }
    }
  }

  // 6. Calculate Delay & Missed Task Penalties (-5 per delay, -5 per missed task)
  const delayedLogs = filteredLogs.filter((l) => l.status === 'delayed' || Boolean(l.delayReason?.trim()));
  const onTimeCount = filteredLogs.length - delayedLogs.length;
  const delayedCount = delayedLogs.length;
  const missedCount = missedTasksList.length;

  const totalPenalties = (delayedCount * 5) + (missedCount * 5);
  const maxBaseScore = daysCount * 100;
  const earnedScore = Math.max(0, maxBaseScore - totalPenalties);
  const productivityRatio = maxBaseScore > 0 ? Math.round((earnedScore / maxBaseScore) * 1000) / 10 : 100;

  const gradeLabel =
    productivityRatio >= 95
      ? 'GRADE A+ (Elite Execution)'
      : productivityRatio >= 85
      ? 'GRADE A (High Performer)'
      : productivityRatio >= 70
      ? 'GRADE B (Moderate Risk)'
      : 'GRADE C (Needs Action)';

  // 7. Map daily logs for graph & date sequences
  const dateMap = new Map<string, { total: number; delayed: number }>();
  filteredLogs.forEach((l) => {
    if (!l.dateStr) return;
    const d = l.dateStr;
    const curr = dateMap.get(d) || { total: 0, delayed: 0 };
    curr.total += 1;
    if (l.status === 'delayed' || Boolean(l.delayReason?.trim())) {
      curr.delayed += 1;
    }
    dateMap.set(d, curr);
  });

  // 8. Construct complete date sequence
  const dailyBreakdown: DailyBreakdownItem[] = [];

  if (hasCustomRange && customDateRange) {
    const startObj = new Date(startDateStr);
    const endObj = new Date(endDateStr);

    for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
      const dStr = getLocalDateStr(d);
      const stat = dateMap.get(dStr) || { total: 0, delayed: 0 };
      const missedOnDay = missedCountMap.get(dStr) || 0;
      const penalty = (stat.delayed * 5) + (missedOnDay * 5);
      const dayScore = Math.max(0, Math.min(100, 100 - penalty));
      dailyBreakdown.push({
        dateStr: dStr,
        total: stat.total,
        delayed: stat.delayed,
        missed: missedOnDay,
        score: dayScore,
      });
    }
  } else if (targetDateStr) {
    const stat = dateMap.get(targetDateStr) || { total: 0, delayed: 0 };
    const missedOnDay = missedCountMap.get(targetDateStr) || 0;
    const penalty = (stat.delayed * 5) + (missedOnDay * 5);
    const dayScore = Math.max(0, Math.min(100, 100 - penalty));
    dailyBreakdown.push({
      dateStr: targetDateStr,
      total: stat.total,
      delayed: stat.delayed,
      missed: missedOnDay,
      score: dayScore,
    });
  } else {
    for (let d = daysCount - 1; d >= 0; d--) {
      const targetDate = new Date(todayObj);
      targetDate.setDate(todayObj.getDate() - d);
      const dStr = getLocalDateStr(targetDate);

      const stat = dateMap.get(dStr) || { total: 0, delayed: 0 };
      const missedOnDay = missedCountMap.get(dStr) || 0;
      const penalty = (stat.delayed * 5) + (missedOnDay * 5);
      const dayScore = Math.max(0, Math.min(100, 100 - penalty));

      dailyBreakdown.push({
        dateStr: dStr,
        total: stat.total,
        delayed: stat.delayed,
        missed: missedOnDay,
        score: dayScore,
      });
    }
  }

  // 9. Best & Worst Day calculations (100 Cap per day)
  const bestDay = dailyBreakdown.reduce((best: DailyBreakdownItem | null, item: DailyBreakdownItem) => (!best || item.score > best.score ? item : best), null);
  const worstDay = dailyBreakdown.reduce((worst: DailyBreakdownItem | null, item: DailyBreakdownItem) => (!worst || item.score < worst.score ? item : worst), null);

  // 10. Weekly Blocks calculation (700 Cap per 7-day week)
  const weeklyBlocks: PeriodBlockItem[] = [];
  for (let i = 0; i < dailyBreakdown.length; i += 7) {
    const chunk = dailyBreakdown.slice(i, i + 7);
    const delays = chunk.reduce((sum, item) => sum + item.delayed, 0);
    const missed = chunk.reduce((sum, item) => sum + item.missed, 0);
    const cap = chunk.length * 100;
    const earned = Math.max(0, cap - ((delays * 5) + (missed * 5)));
    const ratio = Math.round((earned / cap) * 1000) / 10;
    const label = `Week ${Math.floor(i / 7) + 1} (${chunk[0].dateStr.slice(5)})`;
    weeklyBlocks.push({ label, earned, cap, ratio, delays, missed });
  }

  const bestWeek = weeklyBlocks.reduce((best: PeriodBlockItem | null, w: PeriodBlockItem) => (!best || w.ratio > best.ratio ? w : best), null);
  const worstWeek = weeklyBlocks.reduce((worst: PeriodBlockItem | null, w: PeriodBlockItem) => (!worst || w.ratio < worst.ratio ? w : worst), null);

  // 11. Monthly Blocks calculation (3000 Cap per 30-day month)
  const monthlyBlocks: PeriodBlockItem[] = [];
  for (let i = 0; i < dailyBreakdown.length; i += 30) {
    const chunk = dailyBreakdown.slice(i, i + 30);
    const delays = chunk.reduce((sum, item) => sum + item.delayed, 0);
    const missed = chunk.reduce((sum, item) => sum + item.missed, 0);
    const cap = chunk.length * 100;
    const earned = Math.max(0, cap - ((delays * 5) + (missed * 5)));
    const ratio = Math.round((earned / cap) * 1000) / 10;
    const label = `Month ${Math.floor(i / 30) + 1} (${chunk[0].dateStr.slice(5)})`;
    monthlyBlocks.push({ label, earned, cap, ratio, delays, missed });
  }

  const bestMonth = monthlyBlocks.reduce((best: PeriodBlockItem | null, m: PeriodBlockItem) => (!best || m.ratio > m.ratio ? m : best), null);
  const worstMonth = monthlyBlocks.reduce((worst: PeriodBlockItem | null, m: PeriodBlockItem) => (!worst || m.ratio < m.ratio ? m : worst), null);

  return {
    daysCount,
    maxBaseScore,
    earnedScore,
    productivityRatio,
    gradeLabel,
    onTimeCount,
    delayedCount,
    missedCount,
    totalPenalties,
    filteredLogs,
    delayedLogs,
    missedTasks: missedTasksList,
    dailyBreakdown,
    bestDay,
    worstDay,
    weeklyBlocks,
    bestWeek,
    worstWeek,
    monthlyBlocks,
    bestMonth,
    worstMonth,
  };
}
