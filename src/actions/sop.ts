'use server';

import * as sopService from '@/features/sop';
import { cookies } from 'next/headers';
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
