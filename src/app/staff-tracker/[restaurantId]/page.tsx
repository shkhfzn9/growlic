'use client';

import React, { useEffect, useState, use } from 'react';
import {
  getPublicSopTasksAction,
  submitTaskLogAction,
  getTodayLogsAction,
  getRecentSopStreakAction,
  undoTaskLogAction,
  getRestaurantStaffProfilesAction,
} from '@/actions/sop';
import {
  CheckCircle2,
  Clock,
  User,
  Check,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Flame,
  X,
  Minus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  UserCheck,
  Award,
  Sparkles,
} from 'lucide-react';

interface PlainSopTask {
  _id: string;
  batchName: string;
  batchWindow: string;
  taskName: string;
  description?: string;
  targetMinutes: number;
  assignedStaffName?: string;
}

interface PlainSopLog {
  _id: string;
  taskId: string;
  taskName?: string;
  employeeName: string;
  actualMinutes: number;
  targetMinutes: number;
  status: 'completed' | 'delayed';
  endTime: string;
}

interface StaffProfile {
  _id: string;
  name: string;
  role?: string;
}

/**
 * Checks if current time is past the scheduled batch timing window.
 */
export function checkBatchTimingDelay(
  batchWindow: string,
  date: Date = new Date()
): { isDelayed: boolean; windowEndTimeStr: string } {
  if (!batchWindow) return { isDelayed: false, windowEndTimeStr: '' };

  const parts = batchWindow.split(/[–-]/);
  const endPart = parts.length > 1 ? parts[1].trim() : parts[0].trim();

  // Match time formats like "1:00 PM", "2:30 PM", "10:30 PM"
  const match = endPart.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return { isDelayed: false, windowEndTimeStr: endPart };

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const windowEndMinutes = hours * 60 + minutes;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  return {
    isDelayed: currentMinutes > windowEndMinutes,
    windowEndTimeStr: endPart,
  };
}

export default function StaffTrackerPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId || 'tokyo-momos';

  const [tasks, setTasks] = useState<PlainSopTask[]>([]);
  const [todayLogs, setTodayLogs] = useState<PlainSopLog[]>([]);
  const [streakCounts, setStreakCounts] = useState<Record<string, number>>({});
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Active staff selection
  const [staffName, setStaffName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [inputName, setInputName] = useState('');

  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  // Delay prompt state
  const [pendingDelayTask, setPendingDelayTask] = useState<{
    task: PlainSopTask;
    windowEndTimeStr: string;
    overrideStaffName?: string;
  } | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [delayReasonError, setDelayReasonError] = useState(false);

  // Unassigned Task Staff Picker Modal
  const [pendingStaffSelectTask, setPendingStaffSelectTask] = useState<{
    task: PlainSopTask;
  } | null>(null);
  const [selectedAssigneeName, setSelectedAssigneeName] = useState<string>('');

  // Accordion collapsed state for batch menus
  const [collapsedBatches, setCollapsedBatches] = useState<Record<string, boolean>>({});

  // Load tasks, today logs, streak count, & created staff profiles
  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedTasks, fetchedLogs, fetchedStreakMap, fetchedProfiles] = await Promise.all([
        getPublicSopTasksAction(restaurantId),
        getTodayLogsAction(restaurantId),
        getRecentSopStreakAction(restaurantId),
        getRestaurantStaffProfilesAction(restaurantId),
      ]);
      setTasks(fetchedTasks || []);
      setTodayLogs(fetchedLogs || []);
      setStreakCounts(fetchedStreakMap || {});
      setStaffProfiles(fetchedProfiles || []);

      const storedName = localStorage.getItem(`growlic_staff_name_${restaurantId}`);
      if (storedName) {
        setStaffName(storedName);
        setIsNameSet(true);
      } else if (fetchedProfiles && fetchedProfiles.length > 0) {
        setStaffName(fetchedProfiles[0].name);
        setIsNameSet(true);
      }
    } catch (err) {
      console.error('Failed to load SOP tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const toggleBatchCollapse = (batchName: string) => {
    setCollapsedBatches((prev) => ({
      ...prev,
      [batchName]: !prev[batchName],
    }));
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputName.trim();
    if (!clean) return;
    setStaffName(clean);
    setIsNameSet(true);
    localStorage.setItem(`growlic_staff_name_${restaurantId}`, clean);
  };

  const handleSaveTask = (task: PlainSopTask) => {
    const assigned = task.assignedStaffName?.trim();
    const isUnassigned = !assigned || assigned.toLowerCase() === 'unassigned';

    // If task is unassigned: prompt assignee selection strictly from created staff profiles!
    if (isUnassigned) {
      setPendingStaffSelectTask({ task });
      if (staffProfiles.length > 0) {
        setSelectedAssigneeName(staffProfiles[0].name);
      } else {
        setSelectedAssigneeName('');
      }
      return;
    }

    // Already assigned task: execute under assigned staff member name
    const timingCheck = checkBatchTimingDelay(task.batchWindow);
    if (timingCheck.isDelayed) {
      setPendingDelayTask({ task, windowEndTimeStr: timingCheck.windowEndTimeStr, overrideStaffName: assigned });
      setDelayReason('');
      setDelayReasonError(false);
      return;
    }

    executeSaveTask(task, '', assigned);
  };

  const handleConfirmDelayedSave = async () => {
    if (!delayReason.trim()) {
      setDelayReasonError(true);
      return;
    }

    if (!pendingDelayTask) return;
    const { task, overrideStaffName } = pendingDelayTask;
    const reasonText = delayReason.trim();
    setPendingDelayTask(null);
    await executeSaveTask(task, reasonText, overrideStaffName);
  };

  const executeSaveTask = async (task: PlainSopTask, reason: string, customStaffName?: string) => {
    try {
      setSavingTaskId(task._id);
      const nowIso = new Date().toISOString();
      const finalStaffName = customStaffName || task.assignedStaffName || staffName || 'Staff Member';

      const newLog = await submitTaskLogAction({
        restaurantId,
        taskId: task._id,
        taskName: task.taskName,
        batchName: task.batchName,
        employeeName: finalStaffName,
        completedAtIso: nowIso,
        targetMinutes: task.targetMinutes,
        delayReason: reason,
        isDelayed: Boolean(reason.trim()),
      });

      setTodayLogs((prev) => [newLog, ...prev.filter((l) => l.taskId !== task._id)]);

      // Update streak counts for today
      const todayStr = new Date().toISOString().split('T')[0];
      setStreakCounts((prev) => ({
        ...prev,
        [todayStr]: (prev[todayStr] || 0) + 1,
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to save task. Please try again.');
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleUndoTask = async (task: PlainSopTask) => {
    if (!confirm(`Undo "${task.taskName}" completion?`)) return;

    try {
      setSavingTaskId(task._id);
      await undoTaskLogAction(restaurantId, task._id);

      setTodayLogs((prev) => prev.filter((l) => l.taskId !== task._id));

      // Decrement streak count for today
      const todayStr = new Date().toISOString().split('T')[0];
      setStreakCounts((prev) => ({
        ...prev,
        [todayStr]: Math.max(0, (prev[todayStr] || 1) - 1),
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to undo task completion');
    } finally {
      setSavingTaskId(null);
    }
  };

  // Group tasks by batchName
  const batchMap: Record<string, PlainSopTask[]> = {};
  tasks.forEach((t) => {
    if (!batchMap[t.batchName]) {
      batchMap[t.batchName] = [];
    }
    batchMap[t.batchName].push(t);
  });

  const completedTaskIds = new Set(todayLogs.map((l) => l.taskId));
  const completedTaskNames = new Set(
    todayLogs.map((l) => (l.taskName ? l.taskName.trim().toLowerCase() : '')).filter(Boolean)
  );

  const isTaskCompletedToday = (task: PlainSopTask) => {
    return completedTaskIds.has(task._id) || completedTaskNames.has(task.taskName.trim().toLowerCase());
  };

  const completedCount = tasks.filter((t) => isTaskCompletedToday(t)).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Streak line data calculation (Last 7 days)
  const streakDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = streakCounts[dateStr] || 0;
    const isToday = i === 6;

    let status: 'completed' | 'partial' | 'incomplete' = 'incomplete';
    if (count >= 15) {
      status = 'completed';
    } else if (count >= 7) {
      status = 'partial';
    }

    return {
      dateStr,
      dayName,
      formattedDate,
      count,
      status,
      isToday,
    };
  });

  const activeStreakDays = streakDays.filter((s) => s.status !== 'incomplete').length;
  const todayFormattedHeader = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col font-sans pb-16">
      {/* Sleek Dark Brand Header */}
      <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-slate-800 px-4 py-3.5 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C0181A] text-white font-black text-base flex items-center justify-center shadow-md">
              SOP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm text-white tracking-wide uppercase">
                  {restaurantId.replace(/-/g, ' ')}
                </h1>
                <span className="text-[9px] font-black bg-[#F5C518] text-slate-950 px-2 py-0.5 rounded uppercase">
                  Live SOP
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-semibold">{todayFormattedHeader}</p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700 active:scale-95 shadow-sm"
            title="Refresh Checklist"
          >
            <RefreshCw className={`w-4 h-4 text-[#F5C518] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-4 flex-1">
        {/* Active Staff Profile Card */}
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#111827]">
              <UserCheck className="w-4 h-4 text-[#C0181A]" />
              <span className="text-xs font-extrabold uppercase tracking-wider">
                Current Active Staff Profile:
              </span>
            </div>
            {isNameSet && (
              <button
                onClick={() => setIsNameSet(false)}
                className="text-xs text-[#C0181A] hover:underline font-extrabold"
              >
                Switch Profile
              </button>
            )}
          </div>

          {isNameSet ? (
            <div className="bg-[#F8FAFC] border border-[#E2E6EA] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#111827] text-[#F5C518] font-black text-xs flex items-center justify-center shadow-sm">
                  {staffName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-black text-sm text-[#111827] block">{staffName}</span>
                  <span className="text-[10px] font-bold text-gray-500">Ready to log task completions</span>
                </div>
              </div>

              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Active
              </span>
            </div>
          ) : (
            <form onSubmit={handleSaveName} className="flex flex-col gap-2">
              {staffProfiles.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase">Select Created Staff Profile</label>
                  <div className="flex gap-2">
                    <select
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      className="flex-1 bg-[#F8FAFC] text-[#111827] text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#E2E6EA] outline-none focus:border-[#C0181A]"
                    >
                      {staffProfiles.map((sp) => (
                        <option key={sp._id} value={sp.name}>
                          👤 {sp.name} ({sp.role || 'Kitchen Staff'})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (staffName) {
                          setIsNameSet(true);
                          localStorage.setItem(`growlic_staff_name_${restaurantId}`, staffName);
                        }
                      }}
                      className="bg-[#C0181A] hover:bg-[#a51315] text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider shadow active:scale-95 transition-transform"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter your name (e.g., Rahul)"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    className="flex-1 bg-[#F8FAFC] text-[#111827] text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E6EA] outline-none focus:border-[#C0181A]"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-[#C0181A] hover:bg-[#a51315] text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider shadow"
                  >
                    Save
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* 7-DAY STREAK TRACKER LINE CARD */}
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E6EA] pb-2.5">
            <div className="flex items-center gap-2 text-[#111827]">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
              <h2 className="font-extrabold text-xs uppercase tracking-wider text-[#111827]">
                7-Day SOP Tracking Streak
              </h2>
            </div>
            <span className="text-[11px] font-black text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              🔥 {activeStreakDays} / 7 Days Active
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {streakDays.map((day) => {
              let dotBg = 'bg-gray-100 border-gray-200 text-gray-400';
              let statusBadge = 'line ()';

              if (day.status === 'completed') {
                dotBg = 'bg-emerald-500 border-emerald-600 text-white';
                statusBadge = 'Full';
              } else if (day.status === 'partial') {
                dotBg = 'bg-amber-500 border-amber-600 text-white';
                statusBadge = 'Part';
              }

              return (
                <div
                  key={day.dateStr}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    day.isToday ? 'ring-2 ring-[#C0181A] bg-red-50/30' : 'bg-[#F8FAFC]'
                  }`}
                >
                  <span className="text-[10px] font-extrabold uppercase text-gray-500">{day.dayName}</span>
                  <div className={`w-3.5 h-3.5 rounded-full border shadow-sm ${dotBg}`} />
                  <span className="text-[9px] font-black text-[#111827] mt-0.5 truncate w-full">
                    {day.count} done
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 pt-2 border-t border-[#E2E6EA]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Completed (15+ entries)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Partial (7+ entries)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"></span> Missed
            </span>
          </div>
        </div>

        {/* Dynamic Progress Bar Card */}
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-[#111827]">Today's SOP Progress</span>
            <span className="text-[#C0181A] font-extrabold">
              {completedCount} / {tasks.length} Completed ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div
              className="h-full bg-gradient-to-r from-[#C0181A] via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Batch Collapsible Checklist Accordions */}
        <div className="flex flex-col gap-3.5">
          {Object.entries(batchMap).map(([batchName, bTasks]) => {
            const isCollapsed = !!collapsedBatches[batchName];
            const bDoneCount = bTasks.filter((t) => isTaskCompletedToday(t)).length;
            const bTotal = bTasks.length;
            const bPct = bTotal > 0 ? Math.round((bDoneCount / bTotal) * 100) : 0;
            const isBatchComplete = bDoneCount === bTotal && bTotal > 0;

            return (
              <div
                key={batchName}
                className="bg-white border border-[#E2E6EA] rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow"
              >
                {/* Batch Header Accordion Bar */}
                <button
                  type="button"
                  onClick={() => toggleBatchCollapse(batchName)}
                  className="w-full bg-[#F8FAFC] hover:bg-gray-100 p-4 flex items-center justify-between text-left transition-colors border-b border-[#E2E6EA]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase text-[#111827] tracking-wider">
                      {batchName}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold bg-white border border-[#E2E6EA] px-2.5 py-0.5 rounded-lg">
                      {bTasks[0]?.batchWindow}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        isBatchComplete
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : bDoneCount > 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {bDoneCount}/{bTotal} ({bPct}%)
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Batch Tasks List */}
                {!isCollapsed && (
                  <div className="p-3 flex flex-col gap-2.5">
                    {bTasks.map((t) => {
                      const done = isTaskCompletedToday(t);
                      const isSaving = savingTaskId === t._id;

                      return (
                        <div
                          key={t._id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            done
                              ? 'bg-emerald-50/50 border-emerald-200 text-gray-600'
                              : 'bg-white border-[#E2E6EA] hover:border-gray-300 text-[#111827]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                                done
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'bg-[#F4F6F9] border border-[#E2E6EA] text-gray-500'
                              }`}
                            >
                              {done ? <Check className="w-4 h-4 stroke-[3]" /> : <Clock className="w-3.5 h-3.5" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3
                                className={`text-xs font-extrabold truncate ${
                                  done ? 'line-through text-gray-400' : 'text-[#111827]'
                                }`}
                              >
                                {t.taskName}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-extrabold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                  👤 {t.assignedStaffName || 'Unassigned'}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold">🎯 {t.targetMinutes}m</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {done ? (
                              <button
                                onClick={() => handleUndoTask(t)}
                                disabled={isSaving}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg border border-gray-300 flex items-center gap-1 transition-all active:scale-95"
                                title="Undo completion"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span>Undo</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSaveTask(t)}
                                disabled={isSaving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg transition-all active:scale-95 shadow flex items-center gap-1"
                              >
                                {isSaving ? 'Saving...' : 'Save Task'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* UNASSIGNED TASK SELECT ASSIGNEE MODAL */}
      {pendingStaffSelectTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#C0181A]" />
                <h3 className="font-extrabold text-sm">Select Who Completed This Task</h3>
              </div>
              <button
                onClick={() => setPendingStaffSelectTask(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-medium">
              Task: <span className="font-extrabold text-slate-900">{pendingStaffSelectTask.task.taskName}</span>
            </p>

            {staffProfiles.length === 0 ? (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold uppercase text-gray-500">Enter Staff Member Name</label>
                <input
                  type="text"
                  placeholder="e.g. Aman, Rahul, Pooja"
                  value={selectedAssigneeName}
                  onChange={(e) => setSelectedAssigneeName(e.target.value)}
                  className="px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-[#C0181A]"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {staffProfiles.map((profile) => (
                  <label
                    key={profile._id}
                    onClick={() => setSelectedAssigneeName(profile.name)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                      selectedAssigneeName === profile.name
                        ? 'border-[#C0181A] bg-red-50/50 text-[#C0181A] font-extrabold shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-slate-700 hover:bg-gray-100 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-[#111827] text-[#F5C518] font-bold text-xs flex items-center justify-center">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{profile.name}</span>
                    </div>

                    {selectedAssigneeName === profile.name && (
                      <CheckCircle2 className="w-4 h-4 text-[#C0181A]" />
                    )}
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setPendingStaffSelectTask(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedAssigneeName.trim()) {
                    alert('Please select or enter staff member name');
                    return;
                  }
                  const task = pendingStaffSelectTask.task;
                  const customName = selectedAssigneeName.trim();
                  setPendingStaffSelectTask(null);

                  const delayCheck = checkBatchTimingDelay(task.batchWindow);
                  if (delayCheck.isDelayed) {
                    setPendingDelayTask({ task, windowEndTimeStr: delayCheck.windowEndTimeStr, overrideStaffName: customName });
                    setStaffName(customName);
                    setDelayReason('');
                    setDelayReasonError(false);
                  } else {
                    executeSaveTask(task, '', customName);
                  }
                }}
                className="px-5 py-2 text-xs font-black text-white bg-[#C0181A] hover:bg-[#a51315] rounded-xl shadow active:scale-95 transition-transform"
              >
                Confirm & Save Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELAY REASON PROMPT MODAL */}
      {pendingDelayTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-red-600 border-b border-gray-100 pb-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-extrabold text-base">State Reason for Delay</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Task <span className="font-extrabold text-slate-900">{pendingDelayTask.task.taskName}</span> ({pendingDelayTask.task.batchName}) is saved outside the scheduled window (<span className="font-bold text-red-600">{pendingDelayTask.windowEndTimeStr}</span>).
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-gray-500">
                Why was there a delay? (Bottleneck Reason)
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Heavy customer rush, gas stove issue, delayed vegetable delivery..."
                value={delayReason}
                onChange={(e) => {
                  setDelayReason(e.target.value);
                  if (e.target.value.trim()) setDelayReasonError(false);
                }}
                className={`p-3 text-xs border rounded-xl outline-none transition-colors ${
                  delayReasonError ? 'border-red-500 bg-red-50/30' : 'border-gray-200 bg-gray-50 focus:border-[#C0181A]'
                }`}
                autoFocus
              />
              {delayReasonError && (
                <span className="text-[10px] text-red-600 font-bold">
                  * Reason for delay is mandatory before saving!
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setPendingDelayTask(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelayedSave}
                className="px-5 py-2 text-xs font-extrabold text-white bg-[#C0181A] hover:bg-[#a51315] rounded-xl shadow active:scale-95 transition-transform"
              >
                Submit Reason & Save Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
