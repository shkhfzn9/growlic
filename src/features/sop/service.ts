import * as repo from './repository';
import { PlainSopTask, PlainSopLog } from './repository';

export const DEFAULT_TOKYO_MOMOS_SOP = [
  // BATCH 1 — MOMO PREP (10:00 AM – 1:00 PM)
  {
    batchName: 'BATCH 1 — MOMO PREP',
    batchWindow: '10:00 AM – 1:00 PM',
    taskName: 'Spice Mix',
    description: 'Prepare spice blends & seasoning mix',
    targetMinutes: 15,
    orderIndex: 1,
  },
  {
    batchName: 'BATCH 1 — MOMO PREP',
    batchWindow: '10:00 AM – 1:00 PM',
    taskName: 'Meat / Keema Prep',
    description: 'Wash, mince, marinate meat / keema',
    targetMinutes: 30,
    orderIndex: 2,
  },
  {
    batchName: 'BATCH 1 — MOMO PREP',
    batchWindow: '10:00 AM – 1:00 PM',
    taskName: 'Chopping — Shimla + Onion',
    description: 'Fine chopping of capsicum & onions',
    targetMinutes: 30,
    orderIndex: 3,
  },
  {
    batchName: 'BATCH 1 — MOMO PREP',
    batchWindow: '10:00 AM – 1:00 PM',
    taskName: 'Maida Mixing / Dough',
    description: 'Mix, knead & rest dough',
    targetMinutes: 20,
    orderIndex: 4,
  },
  {
    batchName: 'BATCH 1 — MOMO PREP',
    batchWindow: '10:00 AM – 1:00 PM',
    taskName: 'Sheet Making + Folding',
    description: 'Roll, fill, fold & arrange momos (Bottleneck step)',
    targetMinutes: 60,
    orderIndex: 5,
  },
  {
    batchName: 'BATCH 1 — MOMO PREP',
    batchWindow: '10:00 AM – 1:00 PM',
    taskName: 'Steaming',
    description: 'Steam momos batch in steamers',
    targetMinutes: 25,
    orderIndex: 6,
  },

  // BATCH 2 — BOILING & CHUTNEYS (1:30 PM – 2:30 PM)
  {
    batchName: 'BATCH 2 — BOILING & CHUTNEYS',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Boil Chicken',
    description: 'Boil chicken for soups & fillings',
    targetMinutes: 20,
    orderIndex: 7,
  },
  {
    batchName: 'BATCH 2 — BOILING & CHUTNEYS',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Boil Rice',
    description: 'Boil basmati rice batch for fried rice',
    targetMinutes: 15,
    orderIndex: 8,
  },
  {
    batchName: 'BATCH 2 — BOILING & CHUTNEYS',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Boil Noodles',
    description: 'Boil & drain noodles for wok dishes',
    targetMinutes: 10,
    orderIndex: 9,
  },
  {
    batchName: 'BATCH 2 — BOILING & CHUTNEYS',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Red Chutney',
    description: 'Blend & cook spicy red momo chutney',
    targetMinutes: 10,
    orderIndex: 10,
  },
  {
    batchName: 'BATCH 2 — BOILING & CHUTNEYS',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Green Chutney',
    description: 'Prepare fresh coriander green chutney',
    targetMinutes: 10,
    orderIndex: 11,
  },
  {
    batchName: 'BATCH 2 — BOILING & CHUTNEYS',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Mayonnaise',
    description: 'Prepare garlic mayo dip batch',
    targetMinutes: 10,
    orderIndex: 12,
  },

  // BATCH 3 — CLEANING (1:30 PM – 2:30 PM)
  {
    batchName: 'BATCH 3 — CLEANING',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Board Outside',
    description: 'Place outdoor menu standee board',
    targetMinutes: 5,
    orderIndex: 13,
  },
  {
    batchName: 'BATCH 3 — CLEANING',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Glass Cleaning',
    description: 'Wipe & clean front glass & doors',
    targetMinutes: 15,
    orderIndex: 14,
  },
  {
    batchName: 'BATCH 3 — CLEANING',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Floor Cleaning',
    description: 'Sweep and mop kitchen & dining floor',
    targetMinutes: 15,
    orderIndex: 15,
  },
  {
    batchName: 'BATCH 3 — CLEANING',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Table Cleaning',
    description: 'Sanitize all customer dining tables',
    targetMinutes: 15,
    orderIndex: 16,
  },
  {
    batchName: 'BATCH 3 — CLEANING',
    batchWindow: '1:30 PM – 2:30 PM',
    taskName: 'Saman Andar & Device Charging',
    description: 'Bring outdoor items in, charge mobile & Paytm speaker',
    targetMinutes: 10,
    orderIndex: 17,
  },

  // BATCH 4 — CLOSING (10:30 PM start)
  {
    batchName: 'BATCH 4 — CLOSING',
    batchWindow: '10:30 PM Start',
    taskName: 'Call Water for Boiling',
    description: 'Set water for next-day rice, chicken & noodles',
    targetMinutes: 5,
    orderIndex: 18,
  },
  {
    batchName: 'BATCH 4 — CLOSING',
    batchWindow: '10:30 PM Start',
    taskName: 'Restaurant Cleaning',
    description: 'Clean counters, utensils, trash & floor',
    targetMinutes: 30,
    orderIndex: 19,
  },
  {
    batchName: 'BATCH 4 — CLOSING',
    batchWindow: '10:30 PM Start',
    taskName: 'Boulan (Lock Up)',
    description: 'Turn gas off, lights off & lock main doors',
    targetMinutes: 10,
    orderIndex: 20,
  },
  {
    batchName: 'BATCH 4 — CLOSING',
    batchWindow: '10:30 PM Start',
    taskName: 'Saman Andar & Valuables Store',
    description: 'Bring in outdoor items & store cash/valuables',
    targetMinutes: 10,
    orderIndex: 21,
  },
];

/**
 * Gets tasks for a restaurant. Auto-seeds default SOP tasks if 0 tasks exist.
 */
export async function getRestaurantTasks(restaurantId: string): Promise<PlainSopTask[]> {
  const existing = await repo.findTasksByRestaurant(restaurantId, true);
  if (existing.length > 0) {
    return existing;
  }

  // Seed default SOP
  const tasksToInsert = DEFAULT_TOKYO_MOMOS_SOP.map((t) => ({
    ...t,
    restaurantId: restaurantId.toLowerCase(),
    active: true,
  }));

  return repo.insertManyTasks(tasksToInsert);
}

/**
 * Reset & Seed default SOP tasks for a restaurant.
 */
export async function resetToDefaultSop(restaurantId: string): Promise<PlainSopTask[]> {
  await repo.deleteAllTasksByRestaurant(restaurantId);
  const tasksToInsert = DEFAULT_TOKYO_MOMOS_SOP.map((t) => ({
    ...t,
    restaurantId: restaurantId.toLowerCase(),
    active: true,
  }));
  return repo.insertManyTasks(tasksToInsert);
}

/**
 * Submits employee task completion log.
 */
export async function logTaskCompletion(data: {
  restaurantId: string;
  taskId: string;
  taskName: string;
  batchName: string;
  employeeName: string;
  startTimeIso?: string;
  endTimeIso?: string;
  completedAtIso?: string;
  targetMinutes: number;
  delayReason?: string;
  isDelayed?: boolean;
}): Promise<PlainSopLog> {
  const saveTime = data.completedAtIso
    ? new Date(data.completedAtIso)
    : new Date(data.endTimeIso || Date.now());
  const start = data.startTimeIso ? new Date(data.startTimeIso) : saveTime;
  const diffMs = Math.max(0, saveTime.getTime() - start.getTime());
  const actualMinutes = diffMs > 0 ? Math.max(1, Math.round(diffMs / (1000 * 60))) : data.targetMinutes;

  const hasReason = Boolean(data.delayReason?.trim());
  const isDelayed = Boolean(data.isDelayed || hasReason || actualMinutes > data.targetMinutes);
  const delayMinutes = isDelayed ? Math.max(5, Math.abs(actualMinutes - data.targetMinutes) || 5) : 0;

  const dateStr = saveTime.toISOString().split('T')[0];

  return repo.createLog({
    restaurantId: data.restaurantId.toLowerCase(),
    taskId: data.taskId,
    taskName: data.taskName,
    batchName: data.batchName,
    employeeName: data.employeeName.trim() || 'Staff Member',
    startTime: start,
    endTime: saveTime,
    actualMinutes: isDelayed ? data.targetMinutes + delayMinutes : actualMinutes,
    targetMinutes: data.targetMinutes,
    delayMinutes,
    status: isDelayed ? 'delayed' : 'completed',
    delayReason: data.delayReason?.trim() || '',
    dateStr,
  });
}

/**
 * Fetches today's SOP execution logs for employee tracker screen.
 */
export async function getTodayLogs(restaurantId: string): Promise<PlainSopLog[]> {
  const todayStr = new Date().toISOString().split('T')[0];
  return repo.getTodayLogsByRestaurant(restaurantId, todayStr);
}

export async function undoTodayTaskCompletion(restaurantId: string, taskId: string): Promise<boolean> {
  const todayStr = new Date().toISOString().split('T')[0];
  return repo.deleteLogByTaskAndDate(restaurantId, taskId, todayStr);
}

/**
 * Admin Bottleneck & SOP Analytics Engine.
 */
export async function getAdminSopAnalytics(
  restaurantId: string,
  startDateStr?: string,
  endDateStr?: string,
  batchName?: string
) {
  const logs = await repo.findLogsByRestaurant(restaurantId, startDateStr, endDateStr, batchName);

  const totalCompleted = logs.length;
  const totalDelayed = logs.filter((l) => l.status === 'delayed').length;
  const onTimeRate = totalCompleted > 0 ? Math.round(((totalCompleted - totalDelayed) / totalCompleted) * 100) : 100;

  // Bottleneck tasks aggregation
  const taskAgg: Record<
    string,
    {
      taskId: string;
      taskName: string;
      batchName: string;
      targetMinutes: number;
      totalExecutions: number;
      delayedExecutions: number;
      totalActualMinutes: number;
      totalDelayMinutes: number;
      reasons: string[];
      staffList: string[];
    }
  > = {};

  logs.forEach((log) => {
    const key = log.taskId || log.taskName;
    if (!taskAgg[key]) {
      taskAgg[key] = {
        taskId: log.taskId,
        taskName: log.taskName,
        batchName: log.batchName,
        targetMinutes: log.targetMinutes,
        totalExecutions: 0,
        delayedExecutions: 0,
        totalActualMinutes: 0,
        totalDelayMinutes: 0,
        reasons: [],
        staffList: [],
      };
    }

    const item = taskAgg[key];
    item.totalExecutions++;
    item.totalActualMinutes += log.actualMinutes;

    if (log.status === 'delayed') {
      item.delayedExecutions++;
      item.totalDelayMinutes += log.delayMinutes;
      if (log.delayReason && !item.reasons.includes(log.delayReason)) {
        item.reasons.push(log.delayReason);
      }
    }

    if (log.employeeName && !item.staffList.includes(log.employeeName)) {
      item.staffList.push(log.employeeName);
    }
  });

  const taskBottlenecks = Object.values(taskAgg).map((t) => ({
    ...t,
    avgActualMinutes: Math.round(t.totalActualMinutes / t.totalExecutions),
    avgDelayMinutes: t.delayedExecutions > 0 ? Math.round(t.totalDelayMinutes / t.delayedExecutions) : 0,
    delayRatePct: Math.round((t.delayedExecutions / t.totalExecutions) * 100),
  }));

  // Sort by highest delay count & rate
  taskBottlenecks.sort((a, b) => b.delayedExecutions - a.delayedExecutions || b.avgDelayMinutes - a.avgDelayMinutes);

  return {
    totalCompleted,
    totalDelayed,
    onTimeRate,
    logs,
    taskBottlenecks,
  };
}

// ── ADMIN TASK MANAGERS ──

export async function createAdminTask(data: Partial<PlainSopTask>) {
  return repo.createTask(data as any);
}

export async function updateAdminTask(id: string, restaurantId: string, data: Partial<PlainSopTask>) {
  return repo.updateTask(id, restaurantId, data as any);
}

export async function deleteAdminTask(id: string, restaurantId: string) {
  return repo.deleteTask(id, restaurantId);
}

export async function reorderAdminTasks(restaurantId: string, orderedIds: string[]) {
  await repo.reorderTasksBulk(restaurantId, orderedIds);
  return repo.findTasksByRestaurant(restaurantId, false);
}

export async function assignBatchStaff(restaurantId: string, batchName: string, staffName: string) {
  await repo.updateTasksByBatch(restaurantId, batchName, { assignedStaffName: staffName.trim() });
  return repo.findTasksByRestaurant(restaurantId, false);
}

export async function getStaffProfiles(restaurantId: string) {
  return repo.findStaffByRestaurant(restaurantId);
}

export async function createStaffProfile(data: { restaurantId: string; name: string; role?: string }) {
  return repo.createStaffProfileInRepo(data);
}

export async function deleteStaffProfile(id: string, restaurantId: string) {
  return repo.deleteStaffProfileInRepo(id, restaurantId);
}
