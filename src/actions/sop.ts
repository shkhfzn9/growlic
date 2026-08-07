'use server';

import * as sopService from '@/features/sop';
import { SopLog, SopTask, SopStaff } from '@/features/sop/model';
import dbConnect from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifyToken } from '@/lib/auth';
import { validateSession, can } from '@/features/auth';

/**
 * Validates admin auth cookie for admin actions.
 */
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error('Unauthorized: Invalid token');
  }

  const isValid = await validateSession(decoded.restaurantId, token);
  if (!isValid) {
    throw new Error('Unauthorized: Session has expired or been revoked');
  }

  return { token, restaurantId: decoded.restaurantId };
}

/**
 * Public action: Get SOP tasks for employee tracking screen.
 */
export async function getPublicSopTasksAction(restaurantId: string) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID is required');
    const tasks = await sopService.getRestaurantTasks(restaurantId);
    return JSON.parse(JSON.stringify(tasks));
  } catch (err) {
    console.error('Error in getPublicSopTasksAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to load SOP tasks');
  }
}

/**
 * Public action: Submit completed task log from employee tracking screen.
 */
export async function submitTaskLogAction(data: {
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
}) {
  try {
    const log = await sopService.logTaskCompletion(data);
    return JSON.parse(JSON.stringify(log));
  } catch (err) {
    console.error('Error in submitTaskLogAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to submit task log');
  }
}

/**
 * Public action: Get today's completed task logs for employee tracking screen.
 */
export async function getTodayLogsAction(restaurantId: string) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID is required');
    const logs = await sopService.getTodayLogs(restaurantId);
    return JSON.parse(JSON.stringify(logs));
  } catch (err) {
    console.error('Error in getTodayLogsAction:', err);
    return [];
  }
}

/**
 * Public action: Undo/remove a completed task log for today.
 */
export async function undoTaskLogAction(restaurantId: string, taskId: string) {
  try {
    if (!restaurantId || !taskId) throw new Error('Restaurant ID and Task ID are required');
    const success = await sopService.undoTodayTaskCompletion(restaurantId, taskId);
    return { success };
  } catch (err) {
    console.error('Error in undoTaskLogAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to undo task log');
  }
}

/**
 * Public action: Get logged dates for the past 7 days for employee streak tracker.
 */
export async function getRecentSopStreakAction(restaurantId: string): Promise<Record<string, number>> {
  try {
    if (!restaurantId) return {};
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const startDateStr = sevenDaysAgo.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];

    const logs = await sopService.findLogsByRestaurant(restaurantId, startDateStr, endDateStr);

    const dateTaskSets: Record<string, Set<string>> = {};
    logs.forEach((log) => {
      if (!dateTaskSets[log.dateStr]) {
        dateTaskSets[log.dateStr] = new Set();
      }
      dateTaskSets[log.dateStr].add(log.taskId);
    });

    const dateCounts: Record<string, number> = {};
    Object.keys(dateTaskSets).forEach((dateStr) => {
      dateCounts[dateStr] = dateTaskSets[dateStr].size;
    });

    return dateCounts;
  } catch (err) {
    console.error('Error in getRecentSopStreakAction:', err);
    return {};
  }
}

// ── ADMIN ACTIONS ──

/**
 * Admin action: Get bottleneck analytics & logs.
 */
export async function getAdminSopAnalyticsAction(startDateStr?: string, endDateStr?: string, batchName?: string) {
  try {
    const admin = await checkAdminAuth();
    const [analytics, tasks, staffProfiles] = await Promise.all([
      sopService.getAdminSopAnalytics(admin.restaurantId, startDateStr, endDateStr, batchName),
      sopService.getRestaurantTasks(admin.restaurantId),
      sopService.getStaffProfiles(admin.restaurantId),
    ]);
    return JSON.parse(JSON.stringify({ ...analytics, tasks, staffProfiles }));
  } catch (err) {
    console.error('Error in getAdminSopAnalyticsAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch analytics');
  }
}

/**
 * Admin action: Add new task to SOP.
 */
export async function addAdminSopTaskAction(data: {
  batchName: string;
  batchWindow: string;
  taskName: string;
  description?: string;
  targetMinutes: number;
  assignedStaffName?: string;
}) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    const newTask = await sopService.createAdminTask({
      ...data,
      restaurantId: admin.restaurantId,
      active: true,
      orderIndex: Date.now(),
    });
    return JSON.parse(JSON.stringify(newTask));
  } catch (err) {
    console.error('Error in addAdminSopTaskAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to add task');
  }
}

/**
 * Admin action: Update existing SOP task.
 */
export async function updateAdminSopTaskAction(id: string, data: {
  batchName?: string;
  batchWindow?: string;
  taskName?: string;
  description?: string;
  targetMinutes?: number;
  assignedStaffName?: string;
  active?: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    const updated = await sopService.updateAdminTask(id, admin.restaurantId, data);
    return JSON.parse(JSON.stringify(updated));
  } catch (err) {
    console.error('Error in updateAdminSopTaskAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to update task');
  }
}

/**
 * Admin action: Delete SOP task.
 */
export async function deleteAdminSopTaskAction(id: string) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    const deleted = await sopService.deleteAdminTask(id, admin.restaurantId);
    return { success: deleted };
  } catch (err) {
    console.error('Error in deleteAdminSopTaskAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to delete task');
  }
}

/**
 * Admin action: Reset & Seed default SOP tasks.
 */
export async function resetDefaultSopAction() {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    const tasks = await sopService.resetToDefaultSop(admin.restaurantId);
    return JSON.parse(JSON.stringify(tasks));
  } catch (err) {
    console.error('Error in resetDefaultSopAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to reset SOP');
  }
}

/**
 * Admin action: Re-order SOP tasks.
 */
export async function reorderAdminSopTasksAction(orderedIds: string[]) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    const updated = await sopService.reorderAdminTasks(admin.restaurantId, orderedIds);
    return JSON.parse(JSON.stringify(updated));
  } catch (err) {
    console.error('Error in reorderAdminSopTasksAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to reorder tasks');
  }
}

/**
 * Admin action: Bulk assign staff member to all tasks in a batch.
 */
export async function assignBatchStaffAction(batchName: string, staffName: string) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    const updated = await sopService.assignBatchStaff(admin.restaurantId, batchName, staffName);
    return JSON.parse(JSON.stringify(updated));
  } catch (err) {
    console.error('Error in assignBatchStaffAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to assign batch staff');
  }
}

/**
 * Public action: Get created staff profiles for a restaurant.
 */
export async function getRestaurantStaffProfilesAction(restaurantId: string) {
  try {
    if (!restaurantId) return [];
    const profiles = await sopService.getStaffProfiles(restaurantId);
    return JSON.parse(JSON.stringify(profiles));
  } catch (err) {
    console.error('Error in getRestaurantStaffProfilesAction:', err);
    return [];
  }
}

/**
 * Admin action: Create new staff profile.
 */
export async function createStaffProfileAction(data: { name: string; role?: string }) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    const created = await sopService.createStaffProfile({
      restaurantId: admin.restaurantId,
      name: data.name,
      role: data.role,
    });
    return JSON.parse(JSON.stringify(created));
  } catch (err) {
    console.error('Error in createStaffProfileAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to create staff profile');
  }
}

/**
 * Admin action: Delete staff profile.
 */
export async function deleteStaffProfileAction(id: string) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    await sopService.deleteStaffProfile(id, admin.restaurantId);
    return { success: true };
  } catch (err) {
    console.error('Error in deleteStaffProfileAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to delete staff profile');
  }
}

/**
 * Admin action: Cleanly wipe corrupt data & seed 100 days of SOP historical execution data into MongoDB.
 */
export async function seedSampleSopDataAction() {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) throw new Error('Forbidden: Insufficient permissions');

    await dbConnect();
    const restaurantId = admin.restaurantId.toLowerCase();

    // 1. Wipe previous corrupt/messy database records
    await SopLog.deleteMany({ restaurantId });
    await SopTask.deleteMany({ restaurantId });
    await SopStaff.deleteMany({ restaurantId });

    // 2. Create Clean Staff Profiles
    const jehan = await SopStaff.create({ restaurantId, name: 'Jehan', role: 'Head Chef' });
    const krish = await SopStaff.create({ restaurantId, name: 'Krish', role: 'Kitchen Specialist' });

    // 3. Create Clean SOP Tasks (Batches 1 to 4)
    const taskDefinitions = [
      // BATCH 1 — MOMO PREP (10:00 AM – 1:00 PM)
      { batchName: 'BATCH 1 — MOMO PREP', batchWindow: '10:00 AM – 1:00 PM', taskName: 'Spice Mix', targetMinutes: 15, assignedStaffName: 'Jehan', orderIndex: 1 },
      { batchName: 'BATCH 1 — MOMO PREP', batchWindow: '10:00 AM – 1:00 PM', taskName: 'Meat / Keema Prep', targetMinutes: 20, assignedStaffName: 'Jehan', orderIndex: 2 },
      { batchName: 'BATCH 1 — MOMO PREP', batchWindow: '10:00 AM – 1:00 PM', taskName: 'Chopping — Shimla + Onion', targetMinutes: 20, assignedStaffName: 'Jehan', orderIndex: 3 },
      { batchName: 'BATCH 1 — MOMO PREP', batchWindow: '10:00 AM – 1:00 PM', taskName: 'Maida Mixing / Dough', targetMinutes: 15, assignedStaffName: 'Jehan', orderIndex: 4 },
      { batchName: 'BATCH 1 — MOMO PREP', batchWindow: '10:00 AM – 1:00 PM', taskName: 'Sheet Making + Folding', targetMinutes: 30, assignedStaffName: 'Jehan', orderIndex: 5 },
      { batchName: 'BATCH 1 — MOMO PREP', batchWindow: '10:00 AM – 1:00 PM', taskName: 'Steaming', targetMinutes: 15, assignedStaffName: 'Jehan', orderIndex: 6 },

      // BATCH 2 — BOILING & CHUTNEYS (1:30 PM – 2:30 PM)
      { batchName: 'BATCH 2 — BOILING & CHUTNEYS', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Boil Chicken', targetMinutes: 20, assignedStaffName: 'Krish', orderIndex: 7 },
      { batchName: 'BATCH 2 — BOILING & CHUTNEYS', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Boil Rice', targetMinutes: 15, assignedStaffName: 'Krish', orderIndex: 8 },
      { batchName: 'BATCH 2 — BOILING & CHUTNEYS', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Boil Noodles', targetMinutes: 15, assignedStaffName: 'Krish', orderIndex: 9 },
      { batchName: 'BATCH 2 — BOILING & CHUTNEYS', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Red Chutney', targetMinutes: 15, assignedStaffName: 'Krish', orderIndex: 10 },
      { batchName: 'BATCH 2 — BOILING & CHUTNEYS', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Green Chutney', targetMinutes: 15, assignedStaffName: 'Krish', orderIndex: 11 },
      { batchName: 'BATCH 2 — BOILING & CHUTNEYS', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Mayonnaise', targetMinutes: 10, assignedStaffName: 'Krish', orderIndex: 12 },

      // BATCH 3 — CLEANING (1:30 PM – 2:30 PM)
      { batchName: 'BATCH 3 — CLEANING', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Board Outside', targetMinutes: 5, assignedStaffName: 'Jehan', orderIndex: 13 },
      { batchName: 'BATCH 3 — CLEANING', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Glass Cleaning', targetMinutes: 10, assignedStaffName: 'Jehan', orderIndex: 14 },
      { batchName: 'BATCH 3 — CLEANING', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Floor Cleaning', targetMinutes: 15, assignedStaffName: 'Jehan', orderIndex: 15 },
      { batchName: 'BATCH 3 — CLEANING', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Table Cleaning', targetMinutes: 10, assignedStaffName: 'Jehan', orderIndex: 16 },
      { batchName: 'BATCH 3 — CLEANING', batchWindow: '1:30 PM – 2:30 PM', taskName: 'Saman Andar & Device Charging', targetMinutes: 10, assignedStaffName: 'Jehan', orderIndex: 17 },

      // BATCH 4 — CLOSING (10:30 PM Start)
      { batchName: 'BATCH 4 — CLOSING', batchWindow: '10:30 PM Start', taskName: 'Call Water for Boiling', targetMinutes: 5, assignedStaffName: 'Krish', orderIndex: 18 },
      { batchName: 'BATCH 4 — CLOSING', batchWindow: '10:30 PM Start', taskName: 'Restaurant Cleaning', targetMinutes: 20, assignedStaffName: 'Krish', orderIndex: 19 },
      { batchName: 'BATCH 4 — CLOSING', batchWindow: '10:30 PM Start', taskName: 'Boulan (Lock Up)', targetMinutes: 10, assignedStaffName: 'Krish', orderIndex: 20 },
      { batchName: 'BATCH 4 — CLOSING', batchWindow: '10:30 PM Start', taskName: 'Saman Andar & Valuables Store', targetMinutes: 10, assignedStaffName: 'Krish', orderIndex: 21 },
    ];

    const createdTasks = await SopTask.insertMany(
      taskDefinitions.map((t) => ({ ...t, restaurantId, active: true }))
    );

    const sampleDelayReasons = [
      'Us time cstmr the',
      'Kiys tha paihle hi',
      'Cstmr the',
      'Gas cylinder replacement took 15 mins extra during morning prep',
      'Freezer defrosting cycle delayed dough prep',
      'Vendor late delivery of fresh chicken from market',
      'Deep fryer oil filtering before dinner rush',
    ];

    const today = new Date();
    const logsToInsert: Record<string, any>[] = [];

    // Helper to get YYYY-MM-DD
    const getFormatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 4. Seed 100 days of historical data (dayOffset = 1 to 100)
    for (let dayOffset = 1; dayOffset <= 100; dayOffset++) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - dayOffset);
      const dateStr = getFormatDate(pastDate);

      // Select ~15 to 18 tasks executed per past day
      createdTasks.forEach((task: any, idx: number) => {
        // Skip ~15% tasks to simulate realistic missed tasks in history
        if ((dayOffset * 13 + idx) % 7 === 0) return;

        const staffName = task.assignedStaffName || (idx % 2 === 0 ? 'Jehan' : 'Krish');
        const isDelayed = (dayOffset * 7 + idx * 3) % 8 === 0;
        const delayReason = isDelayed ? sampleDelayReasons[(dayOffset + idx) % sampleDelayReasons.length] : '';

        const execTime = new Date(pastDate);
        execTime.setHours(10 + (idx % 8), (idx * 12) % 60, 0);

        logsToInsert.push({
          restaurantId,
          taskId: task._id.toString(),
          taskName: task.taskName,
          batchName: task.batchName,
          employeeName: staffName,
          startTime: execTime,
          endTime: execTime,
          actualMinutes: isDelayed ? task.targetMinutes + 12 : task.targetMinutes,
          targetMinutes: task.targetMinutes,
          delayMinutes: isDelayed ? 12 : 0,
          status: isDelayed ? 'delayed' : 'completed',
          delayReason,
          dateStr,
          createdAt: execTime,
          updatedAt: execTime,
        });
      });
    }

    // 5. Seed Clean TODAY Execution Logs (dayOffset = 0, dateStr = todayLocalStr)
    const todayLocalStr = getFormatDate(today);

    // Jehan's Today Executions (16 Completed, 4 Delayed -> Score 80)
    const jehanTodayTasks = [
      { name: 'Spice Mix', batch: 'BATCH 1 — MOMO PREP', hour: 11, min: 2, delay: false },
      { name: 'Meat / Keema Prep', batch: 'BATCH 1 — MOMO PREP', hour: 11, min: 2, delay: false },
      { name: 'Chopping — Shimla + Onion', batch: 'BATCH 1 — MOMO PREP', hour: 11, min: 2, delay: false },
      { name: 'Maida Mixing / Dough', batch: 'BATCH 1 — MOMO PREP', hour: 11, min: 2, delay: false },
      { name: 'Sheet Making + Folding', batch: 'BATCH 1 — MOMO PREP', hour: 12, min: 27, delay: false },
      { name: 'Steaming', batch: 'BATCH 1 — MOMO PREP', hour: 12, min: 27, delay: false },
      { name: 'Boil Chicken', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 30, delay: false },
      { name: 'Boil Rice', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 30, delay: false },
      { name: 'Boil Noodles', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 30, delay: false },
      { name: 'Red Chutney', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 30, delay: false },
      { name: 'Green Chutney', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 30, delay: false },
      { name: 'Mayonnaise', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 30, delay: false },
      { name: 'Glass Cleaning', batch: 'BATCH 3 — CLEANING', hour: 14, min: 58, delay: true, reason: 'Us time cstmr the' },
      { name: 'Floor Cleaning', batch: 'BATCH 3 — CLEANING', hour: 14, min: 59, delay: true, reason: 'Us time cstmr the' },
      { name: 'Table Cleaning', batch: 'BATCH 3 — CLEANING', hour: 14, min: 59, delay: true, reason: 'Cstmr the' },
      { name: 'Saman Andar & Device Charging', batch: 'BATCH 3 — CLEANING', hour: 14, min: 59, delay: true, reason: 'Kiys tha paihle hi' },
    ];

    jehanTodayTasks.forEach((jt) => {
      const matchTask = createdTasks.find((t: any) => t.taskName === jt.name);
      const tTime = new Date(today);
      tTime.setHours(jt.hour, jt.min, 0);

      logsToInsert.push({
        restaurantId,
        taskId: matchTask ? matchTask._id.toString() : 'mock-id',
        taskName: jt.name,
        batchName: jt.batch,
        employeeName: 'Jehan',
        startTime: tTime,
        endTime: tTime,
        actualMinutes: jt.delay ? 25 : 15,
        targetMinutes: 15,
        delayMinutes: jt.delay ? 10 : 0,
        status: jt.delay ? 'delayed' : 'completed',
        delayReason: jt.reason || '',
        dateStr: todayLocalStr,
        createdAt: tTime,
        updatedAt: tTime,
      });
    });

    // Krish's Today Executions (17 Completed, 3 Delayed -> Score 85)
    const krishTodayTasks = [
      { name: 'Boil Chicken', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 10, delay: false },
      { name: 'Boil Rice', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 15, delay: false },
      { name: 'Boil Noodles', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 20, delay: false },
      { name: 'Red Chutney', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 25, delay: false },
      { name: 'Green Chutney', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 28, delay: false },
      { name: 'Mayonnaise', batch: 'BATCH 2 — BOILING & CHUTNEYS', hour: 14, min: 30, delay: false },
      { name: 'Board Outside', batch: 'BATCH 3 — CLEANING', hour: 14, min: 45, delay: false },
      { name: 'Glass Cleaning', batch: 'BATCH 3 — CLEANING', hour: 14, min: 50, delay: true, reason: 'High customer traffic at counter' },
      { name: 'Floor Cleaning', batch: 'BATCH 3 — CLEANING', hour: 14, min: 55, delay: true, reason: 'Refilled mop bucket' },
      { name: 'Table Cleaning', batch: 'BATCH 3 — CLEANING', hour: 15, min: 0, delay: true, reason: 'Dining hall full' },
      { name: 'Saman Andar & Device Charging', batch: 'BATCH 3 — CLEANING', hour: 15, min: 5, delay: false },
      { name: 'Spice Mix', batch: 'BATCH 1 — MOMO PREP', hour: 11, min: 15, delay: false },
      { name: 'Meat / Keema Prep', batch: 'BATCH 1 — MOMO PREP', hour: 11, min: 30, delay: false },
      { name: 'Chopping — Shimla + Onion', batch: 'BATCH 1 — MOMO PREP', hour: 11, min: 45, delay: false },
      { name: 'Maida Mixing / Dough', batch: 'BATCH 1 — MOMO PREP', hour: 12, min: 0, delay: false },
      { name: 'Sheet Making + Folding', batch: 'BATCH 1 — MOMO PREP', hour: 12, min: 30, delay: false },
      { name: 'Steaming', batch: 'BATCH 1 — MOMO PREP', hour: 12, min: 45, delay: false },
    ];

    krishTodayTasks.forEach((kt) => {
      const matchTask = createdTasks.find((t: any) => t.taskName === kt.name);
      const tTime = new Date(today);
      tTime.setHours(kt.hour, kt.min, 0);

      logsToInsert.push({
        restaurantId,
        taskId: matchTask ? matchTask._id.toString() : 'mock-id',
        taskName: kt.name,
        batchName: kt.batch,
        employeeName: 'Krish',
        startTime: tTime,
        endTime: tTime,
        actualMinutes: kt.delay ? 25 : 15,
        targetMinutes: 15,
        delayMinutes: kt.delay ? 10 : 0,
        status: kt.delay ? 'delayed' : 'completed',
        delayReason: kt.reason || '',
        dateStr: todayLocalStr,
        createdAt: tTime,
        updatedAt: tTime,
      });
    });

    await SopLog.insertMany(logsToInsert);

    revalidatePath('/admin/sop-tracker');
    revalidatePath('/admin/sop-tracker/analytics');
    return { success: true, count: logsToInsert.length };
  } catch (err) {
    console.error('Error in seedSampleSopDataAction:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to seed clean SOP data');
  }
}
