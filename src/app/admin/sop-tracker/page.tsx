'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  getAdminSopAnalyticsAction,
  addAdminSopTaskAction,
  updateAdminSopTaskAction,
  deleteAdminSopTaskAction,
  reorderAdminSopTasksAction,
  assignBatchStaffAction,
  resetDefaultSopAction,
  createStaffProfileAction,
  deleteStaffProfileAction,
  seedSampleSopDataAction,
} from '@/actions/sop';
import { computeStaffPerformanceMetrics, formatExecutionTime, deduplicateSopLogs } from '@/features/sop/analyticsEngine';
import { PageHeader, AdminButton } from '@/components/ui';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  RefreshCw,
  UserCheck,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Zap,
  Users,
  User,
  X,
  Target,
  UserPlus,
  ShieldCheck,
  BarChart2,
  Database,
  Sparkles,
} from 'lucide-react';

interface PlainSopTask {
  _id: string;
  restaurantId: string;
  batchName: string;
  batchWindow: string;
  taskName: string;
  description?: string;
  targetMinutes: number;
  assignedStaffName?: string;
  active: boolean;
  orderIndex?: number;
}

interface PlainSopLog {
  _id?: string;
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

interface PlainSopStaff {
  _id: string;
  restaurantId: string;
  name: string;
  role?: string;
  active: boolean;
  createdAt?: string;
}

interface TaskBottleneck {
  taskId: string;
  taskName: string;
  batchName: string;
  targetMinutes: number;
  totalExecutions: number;
  delayedExecutions: number;
  avgActualMinutes: number;
  avgDelayMinutes: number;
  delayRatePct: number;
  reasons: string[];
  staffList: string[];
}

interface StaffProfileDetail {
  _id?: string;
  name: string;
  role?: string;
  assignedTasks: PlainSopTask[];
  logs: PlainSopLog[];
  todayLogs: PlainSopLog[];
  todayDelaysCount: number;
  delayedLogs: PlainSopLog[];
  onTimeCount: number;
  delayedCount: number;
  penaltyDeductions: number;
  score: number;
  pendingTodayTasks: PlainSopTask[];
  dailyBreakdown: { dateStr: string; total: number; delayed: number; score: number }[];
}

export default function AdminSopTrackerPage() {
  const auth = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | '6months' | 'year'>('day');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const [analytics, setAnalytics] = useState<{
    totalCompleted: number;
    totalDelayed: number;
    onTimeRate: number;
    logs: PlainSopLog[];
    taskBottlenecks: TaskBottleneck[];
    tasks: PlainSopTask[];
    staffProfiles: PlainSopStaff[];
  } | null>(null);

  // Create Staff Profile Form state
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [newStaffNameInput, setNewStaffNameInput] = useState('');
  const [newStaffRoleInput, setNewStaffRoleInput] = useState('Kitchen Staff');
  const [creatingProfile, setCreatingProfile] = useState(false);

  // New task form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('BATCH 1 — MOMO PREP');
  const [newBatchWindow, setNewBatchWindow] = useState('10:00 AM – 1:00 PM');
  const [newTaskName, setNewTaskName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTargetMinutes, setNewTargetMinutes] = useState(15);
  const [newStaffName, setNewStaffName] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Edit task state
  const [editingTask, setEditingTask] = useState<PlainSopTask | null>(null);

  // Batch Assign Modal state
  const [batchAssignModal, setBatchAssignModal] = useState<{
    batchName: string;
    staffName: string;
  } | null>(null);

  // Interactive Selected Staff Profile Modal state
  const [selectedStaffProfile, setSelectedStaffProfile] = useState<StaffProfileDetail | null>(null);

  // Accordion expander state for staff delay details
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});

  const [publicStaffUrl, setPublicStaffUrl] = useState(`/staff-tracker/${auth.restaurantId || 'tokyo-momos'}`);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPublicStaffUrl(`${window.location.origin}/staff-tracker/${auth.restaurantId || 'tokyo-momos'}`);
    }
  }, [auth.restaurantId]);

  // Helper to compute date range ISO strings
  const getDateRangeStrings = (tf: string) => {
    const today = new Date();
    const endDateStr = today.toISOString().split('T')[0];

    const start = new Date();
    if (tf === 'day') {
      // today
    } else if (tf === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (tf === 'month') {
      start.setDate(today.getDate() - 30);
    } else if (tf === '6months') {
      start.setDate(today.getDate() - 180);
    } else if (tf === 'year') {
      start.setDate(today.getDate() - 365);
    }

    const startDateStr = start.toISOString().split('T')[0];
    return { startDateStr, endDateStr };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const endDateStr = today.toISOString().split('T')[0];
      const start = new Date();
      start.setDate(today.getDate() - 100);
      const startDateStr = start.toISOString().split('T')[0];

      const res = await getAdminSopAnalyticsAction(startDateStr, endDateStr, selectedBatch);
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load SOP analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBatch]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicStaffUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCreateStaffProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffNameInput.trim()) return;
    try {
      setCreatingProfile(true);
      await createStaffProfileAction({
        name: newStaffNameInput.trim(),
        role: newStaffRoleInput.trim() || 'Kitchen Staff',
      });
      showToast('Staff profile created successfully!', 'success');
      setNewStaffNameInput('');
      setShowCreateProfileModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to create staff profile: ' + (err instanceof Error ? err.message : 'Error'), 'error');
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleDeleteStaffProfile = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove staff profile "${name}"?`)) return;
    try {
      await deleteStaffProfileAction(id);
      showToast(`Removed staff profile "${name}"`, 'info');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete staff profile', 'error');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    try {
      setSavingTask(true);
      await addAdminSopTaskAction({
        batchName: newBatchName,
        batchWindow: newBatchWindow,
        taskName: newTaskName,
        description: newDesc,
        targetMinutes: Number(newTargetMinutes) || 15,
        assignedStaffName: newStaffName,
      });
      showToast('New SOP task added successfully!', 'success');
      setShowAddModal(false);
      setNewTaskName('');
      setNewDesc('');
      setNewStaffName('');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to add task: ' + (err instanceof Error ? err.message : 'Error'), 'error');
    } finally {
      setSavingTask(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      setSavingTask(true);
      await updateAdminSopTaskAction(editingTask._id, {
        taskName: editingTask.taskName,
        batchName: editingTask.batchName,
        batchWindow: editingTask.batchWindow,
        description: editingTask.description,
        targetMinutes: editingTask.targetMinutes,
        assignedStaffName: editingTask.assignedStaffName,
      });
      showToast('Task updated successfully!', 'success');
      setEditingTask(null);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update task', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  const handleAssignBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchAssignModal || !batchAssignModal.staffName.trim()) return;

    try {
      setSavingTask(true);
      await assignBatchStaffAction(batchAssignModal.batchName, batchAssignModal.staffName.trim());
      showToast(`Batch assigned to ${batchAssignModal.staffName.trim()}`, 'success');
      setBatchAssignModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to assign batch staff', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to remove this SOP task?')) return;
    try {
      await deleteAdminSopTaskAction(id);
      showToast('SOP task deleted', 'info');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete task', 'error');
    }
  };

  const handleMoveTask = async (index: number, direction: 'up' | 'down') => {
    if (!analytics?.tasks) return;
    const currentTasks = [...analytics.tasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentTasks.length) return;

    // Swap tasks
    const temp = currentTasks[index];
    currentTasks[index] = currentTasks[targetIndex];
    currentTasks[targetIndex] = temp;

    const orderedIds = currentTasks.map((t) => t._id);
    try {
      setAnalytics((prev) => (prev ? { ...prev, tasks: currentTasks } : null));
      await reorderAdminSopTasksAction(orderedIds);
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  const handleResetDefaultSop = async () => {
    if (!confirm('Reset & Seed the complete Tokyo Momos 4-Batch SOP checklist for your restaurant?')) return;
    try {
      setLoading(true);
      await resetDefaultSopAction();
      await loadData();
      showToast('SOP checklist reset & seeded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to reset SOP', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── STRICT CREATED STAFF PROFILES & SCORING ENGINE (MEMOIZED) ──
  const now = new Date();
  const todayUtcStr = now.toISOString().split('T')[0];
  const todayLocalStr = now.toLocaleDateString('en-CA');

  const { todayLogsList, createdStaffList, staffProfilesList } = useMemo(() => {
    // Filter logs strictly by dateStr matching today's local date or UTC date
    const rawTodayLogs = (analytics?.logs || []).filter((l) => {
      if (!l || !l.dateStr) return false;
      return l.dateStr === todayUtcStr || l.dateStr === todayLocalStr;
    });

    // Deduplicate today's logs so 1 task = 1 completion per employee per day
    const todayLogs = deduplicateSopLogs(rawTodayLogs);

    const createdStaff = analytics?.staffProfiles || [];

    const allStaffMap = new Map<string, { id?: string; name: string; role?: string }>();
    createdStaff.forEach((sp) => {
      allStaffMap.set(sp.name.trim().toLowerCase(), { id: sp._id, name: sp.name.trim(), role: sp.role });
    });

    (analytics?.tasks || []).forEach((t) => {
      if (t.assignedStaffName?.trim()) {
        const key = t.assignedStaffName.trim().toLowerCase();
        if (!allStaffMap.has(key)) {
          allStaffMap.set(key, { name: t.assignedStaffName.trim() });
        }
      }
    });

    (analytics?.logs || []).forEach((l) => {
      if (l.employeeName?.trim()) {
        const key = l.employeeName.trim().toLowerCase();
        if (!allStaffMap.has(key)) {
          allStaffMap.set(key, { name: l.employeeName.trim() });
        }
      }
    });

    const profilesList: StaffProfileDetail[] = Array.from(allStaffMap.values()).map((staffItem) => {
      const sName = staffItem.name;

      const assignedTasks = (analytics?.tasks || []).filter(
        (t) => t.assignedStaffName?.trim().toLowerCase() === sName.toLowerCase()
      );

      const logs = (analytics?.logs || []).filter(
        (l) => l.employeeName?.trim().toLowerCase() === sName.toLowerCase()
      );

      const todayLogsForStaff = todayLogs.filter(
        (l) => l.employeeName?.trim().toLowerCase() === sName.toLowerCase()
      );

      const todayDelaysForStaff = todayLogsForStaff.filter(
        (l) => l.status === 'delayed' || Boolean(l.delayReason?.trim())
      );

      // Leaderboard Card Score is TODAY'S SCORE starting at 100 (-5 per today delay)
      const todayScore = Math.max(0, 100 - (todayDelaysForStaff.length * 5));

      const delayedLogs = logs.filter((l) => l.status === 'delayed' || Boolean(l.delayReason?.trim()));
      const onTimeCount = logs.length - delayedLogs.length;

      const todayCompletedTaskIds = new Set(todayLogsForStaff.map((l) => l.taskId).filter(Boolean));
      const pendingTodayTasks = assignedTasks.filter((t) => !todayCompletedTaskIds.has(t._id));

      return {
        _id: staffItem.id,
        name: sName,
        role: staffItem.role,
        assignedTasks,
        logs,
        todayLogs: todayLogsForStaff,
        todayDelaysCount: todayDelaysForStaff.length,
        delayedLogs,
        onTimeCount,
        delayedCount: delayedLogs.length,
        penaltyDeductions: todayDelaysForStaff.length * 5,
        score: todayScore,
        pendingTodayTasks,
        dailyBreakdown: [],
      };
    });

    profilesList.sort((a, b) => b.score - a.score || b.todayLogs.length - a.todayLogs.length);

    return {
      todayLogsList: todayLogs,
      createdStaffList: createdStaff,
      staffProfilesList: profilesList,
    };
  }, [analytics, todayUtcStr, todayLocalStr]);

  const handleSeedSampleData = async () => {
    if (!confirm('Seed multi-day sample SOP execution history to test timeframe performance graphs & score breakdown?')) return;
    try {
      setLoading(true);
      await seedSampleSopDataAction();
      await loadData();
      showToast('Sample multi-day historical performance data seeded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to seed sample data: ' + (err instanceof Error ? err.message : 'Error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 font-sans">
      {/* Page Header Bar with Link to In-Depth Charts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="SOP Staff Profiles & Operational Tracking"
          subtitle="Create staff profiles, assign tasks, track execution timelines & timing delays"
        />
        <Link
          href="/admin/sop-tracker/analytics"
          className="bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2 shadow-md shrink-0 w-fit active:scale-95 transition-transform"
        >
          <BarChart3 className="w-4 h-4 text-[#F5C518]" />
          <span>Charts with Detailed Analysis 📈</span>
        </Link>
      </div>

      {/* Shareable Employee Link Box */}
      <div className="bg-[#0F172A] border border-slate-800 text-white rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#F5C518] text-slate-950 px-2 py-0.5 rounded">
              Employee Shareable Tracker Link
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 font-mono break-all">{publicStaffUrl}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Share this link with kitchen staff. Unassigned tasks will prompt them to pick their created profile name!
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCopyLink}
            className="bg-[#F5C518] hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-transform shadow"
          >
            {copiedLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </button>
          <a
            href={publicStaffUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 border border-slate-700"
          >
            <ExternalLink className="w-4 h-4 text-[#F5C518]" />
            Open Tracker
          </a>
        </div>
      </div>

      {/* CREATE & MANAGE CREATED STAFF PROFILES BAR */}
      <div className="bg-white border border-[#E2E6EA] rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6EA] pb-3">
          <div className="flex items-center gap-2 text-[#111827]">
            <UserPlus className="w-5 h-5 text-[#C0181A]" />
            <div>
              <h3 className="font-extrabold text-base uppercase tracking-tight">Staff Profiles Registry</h3>
              <p className="text-xs text-[#6B7280]">
                Create staff profiles so tasks can only be assigned to validated team members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AdminButton
              onClick={() => setShowCreateProfileModal(true)}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Create Staff Profile
            </AdminButton>
          </div>
        </div>

        {/* List of Created Staff Profiles */}
        <div className="flex flex-wrap gap-2">
          {createdStaffList.length === 0 ? (
            <div className="text-xs text-gray-500 italic bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E6EA] w-full text-center">
              No staff profiles created yet. Click "Create Staff Profile" above to add team members (e.g. Rahul, Aman, Pooja).
            </div>
          ) : (
            createdStaffList.map((sp) => (
              <div
                key={sp._id}
                className="bg-[#F8FAFC] border border-[#E2E6EA] hover:border-gray-300 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-sm"
              >
                <div className="w-6 h-6 rounded-lg bg-[#111827] text-[#F5C518] font-bold text-xs flex items-center justify-center">
                  {sp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs text-[#111827]">{sp.name}</span>
                  <span className="text-[9px] font-medium text-gray-500">{sp.role || 'Kitchen Staff'}</span>
                </div>
                <button
                  onClick={() => handleDeleteStaffProfile(sp._id, sp.name)}
                  className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                  title="Remove Profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Interactive Time Range Period Filter Bar */}
      <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-[#111827]">
          <Calendar className="w-5 h-5 text-[#C0181A]" />
          <h3 className="font-extrabold text-sm uppercase tracking-wide">Select Analytics Timeframe</h3>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-[#F4F6F9] p-1.5 rounded-xl border border-[#E2E6EA]">
          {[
            { id: 'day', label: '📅 Today' },
            { id: 'week', label: '🗓️ Last 7 Days' },
            { id: 'month', label: '📆 Last 30 Days' },
            { id: '6months', label: '📈 6 Months' },
            { id: 'year', label: '🏆 1 Year' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeframe(item.id as any)}
              className={`text-xs font-black px-3.5 py-2 rounded-lg transition-all ${
                timeframe === item.id
                  ? 'bg-[#111827] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-white/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* STAFF PROFILES & PERFORMANCE LEADERBOARD (Score Out of 100) */}
      <div className="bg-white border border-[#E2E6EA] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6EA] pb-4">
          <div>
            <div className="flex items-center gap-2 text-[#111827]">
              <Award className="w-5 h-5 text-[#F5C518]" />
              <h2 className="text-base font-black uppercase tracking-tight">
                Staff Profiles & Daily Score Performance (Score Out of 100)
              </h2>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5 font-medium">
              Click any staff profile to view detailed today activity, assigned tasks, and delay messages. Base score starts at{' '}
              <span className="font-extrabold text-emerald-600">100</span> (-5 per delay).
            </p>
          </div>

          <span className="text-xs font-extrabold bg-[#F4F6F9] border border-[#E2E6EA] px-3 py-1.5 rounded-xl text-[#111827]">
            {staffProfilesList.length} Active Profiles
          </span>
        </div>

        {staffProfilesList.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">
            No staff task completions or assigned tasks recorded yet. Create staff profiles above to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffProfilesList.map((staff) => {
              let scoreBadgeBg = 'bg-emerald-500 text-white';
              let scoreGrade = 'Grade A (Excellent)';
              if (staff.score < 75) {
                scoreBadgeBg = 'bg-red-600 text-white';
                scoreGrade = 'Grade C (Needs Improvement)';
              } else if (staff.score < 90) {
                scoreBadgeBg = 'bg-amber-500 text-white';
                scoreGrade = 'Grade B (Good)';
              }

              return (
                <button
                  key={staff.name}
                  type="button"
                  onClick={() => setSelectedStaffProfile(staff)}
                  className="bg-[#F8FAFC] hover:bg-white border border-[#E2E6EA] hover:border-[#C0181A] rounded-2xl p-5 flex flex-col gap-4 text-left transition-all shadow-sm active:scale-[0.98] group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#111827] group-hover:bg-[#C0181A] text-[#F5C518] group-hover:text-white font-black text-base flex items-center justify-center shadow transition-colors flex-shrink-0">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-[#111827] group-hover:text-[#C0181A] transition-colors truncate">
                          {staff.name}
                        </h4>
                        <span className="text-[10px] text-[#6B7280] font-bold block truncate">{scoreGrade}</span>
                      </div>
                    </div>

                    <div className={`px-2.5 py-1 rounded-xl font-black text-xs shadow-sm flex items-center gap-1 flex-shrink-0 ${scoreBadgeBg}`}>
                      <span>{staff.score}</span>
                      <span className="text-[9px] opacity-80">/ 100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-center bg-white border border-[#E2E6EA] p-2.5 rounded-xl text-xs">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-[#6B7280] font-bold uppercase">Assigned</span>
                      <span className="font-black text-[#111827]">{staff.assignedTasks.length}</span>
                    </div>

                    <div className="flex flex-col border-x border-[#E2E6EA]">
                      <span className="text-[9px] text-emerald-700 font-bold uppercase">Completed</span>
                      <span className="font-black text-emerald-600">{staff.todayLogs.length}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[9px] text-red-700 font-bold uppercase">Delays (-5)</span>
                      <span className="font-black text-red-600">{staff.todayDelaysCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-black text-[#C0181A] group-hover:underline pt-1 border-t border-[#E2E6EA]">
                    <span>View Today Profile & Timeline →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Checklist Manager with Batch-Wide & Single Task Staff Assignment */}
      <div className="bg-white border border-[#E2E6EA] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E6EA] pb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#111827]">SOP Task Checklist & Batch Staff Manager</h2>
            <p className="text-xs text-[#6B7280]">
              Assign staff to entire batches or override single tasks using created staff profiles.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleResetDefaultSop}
              className="px-3 py-2 bg-[#F4F6F9] hover:bg-[#E2E6EA] text-xs font-bold text-[#111827] rounded-xl border border-[#E2E6EA] transition-colors"
            >
              Reset to Default SOP
            </button>
            <AdminButton onClick={() => setShowAddModal(true)} icon={<Plus className="w-4 h-4" />}>
              Add Custom Task
            </AdminButton>
          </div>
        </div>

        {/* Batch-Grouped Tasks List with Assign Whole Batch Option */}
        <div className="flex flex-col gap-4">
          {Object.entries(
            (analytics?.tasks || []).reduce((acc, t) => {
              if (!acc[t.batchName]) acc[t.batchName] = [];
              acc[t.batchName].push(t);
              return acc;
            }, {} as Record<string, PlainSopTask[]>)
          ).map(([bName, bTasks]) => (
            <div key={bName} className="flex flex-col gap-2.5 bg-[#F8FAFC] border border-[#E2E6EA] rounded-2xl p-4">
              {/* Batch Header with Quick Assign Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E6EA] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-[#111827] uppercase tracking-wider">{bName}</span>
                  <span className="text-[10px] font-bold bg-white text-[#6B7280] px-2 py-0.5 rounded border border-[#E2E6EA]">
                    {bTasks[0]?.batchWindow}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setBatchAssignModal({ batchName: bName, staffName: bTasks[0]?.assignedStaffName || '' })}
                  className="self-start sm:self-auto bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm active:scale-95 cursor-pointer"
                  title="Assign all tasks in this batch to a created staff profile"
                >
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  <span>Assign Whole Batch</span>
                </button>
              </div>

              {/* Tasks inside this batch */}
              <div className="flex flex-col gap-2.5 mt-1">
                {bTasks.map((t) => {
                  const globalIdx = (analytics?.tasks || []).findIndex((x) => x._id === t._id);

                  return (
                    <div key={t._id} className="bg-white border border-[#E2E6EA] hover:border-gray-300 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors shadow-sm">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleMoveTask(globalIdx, 'up')}
                            disabled={globalIdx === 0}
                            className="p-1 rounded hover:bg-gray-100 border border-gray-200 text-gray-600 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveTask(globalIdx, 'down')}
                            disabled={globalIdx === (analytics?.tasks?.length || 1) - 1}
                            className="p-1 rounded hover:bg-gray-100 border border-gray-200 text-gray-600 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-sm text-[#111827]">{t.taskName}</h4>
                          {t.description && <p className="text-xs text-[#6B7280] mt-0.5">{t.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold text-[#111827] bg-[#F4F6F9] border border-[#E2E6EA] px-2.5 py-1 rounded-lg">
                          🎯 {t.targetMinutes}m
                        </span>

                        <span className="text-[10px] font-extrabold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          👤 {t.assignedStaffName || 'Unassigned'}
                        </span>

                        <div className="flex gap-1 ml-1">
                          <button
                            onClick={() => setEditingTask(t)}
                            className="p-1.5 text-[#475569] hover:bg-[#F4F6F9] rounded-lg border border-transparent hover:border-[#E2E6EA]"
                            title="Single Task Staff Override"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(t._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE STAFF PROFILE MODAL */}
      {showCreateProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateStaffProfile} className="bg-white rounded-3xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#C0181A]">
              <UserPlus className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-[#111827]">
                Create New Staff Profile
              </h3>
            </div>

            <p className="text-xs text-[#6B7280]">
              Create a staff member profile so tasks and daily analytics map 1:1 to validated team members.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Staff Member Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma, Aman, Pooja"
                value={newStaffNameInput}
                onChange={(e) => setNewStaffNameInput(e.target.value)}
                className="px-3.5 py-2.5 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9] outline-none focus:border-[#C0181A]"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Role / Specialty</label>
              <input
                type="text"
                placeholder="e.g. Head Momo Prep, Boiling Specialist, Kitchen Staff"
                value={newStaffRoleInput}
                onChange={(e) => setNewStaffRoleInput(e.target.value)}
                className="px-3.5 py-2.5 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9]"
              />
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowCreateProfileModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F4F6F9] rounded-xl"
              >
                Cancel
              </button>
              <AdminButton type="submit" loading={creatingProfile}>
                Create Staff Profile
              </AdminButton>
            </div>
          </form>
        </div>
      )}

      {/* SIMPLE & READABLE STAFF PERFORMANCE PROFILE & TIMELINE MODAL */}
      {selectedStaffProfile && (() => {
        const staffName = selectedStaffProfile.name;
        const assignedTasks = selectedStaffProfile.assignedTasks || [];
        const totalAssigned = assignedTasks.length;

        // Today's logs for staff
        const todayLogsForStaff = (todayLogsList || []).filter(
          (l) => l.employeeName?.trim().toLowerCase() === staffName.trim().toLowerCase()
        );

        // Sort execution timeline by completion time desc
        const todayTimeline = [...todayLogsForStaff].sort((a, b) => {
          const tA = a.completedAtIso || a.createdAt || '';
          const tB = b.completedAtIso || b.createdAt || '';
          return tB.localeCompare(tA);
        });

        const completedTodayCount = todayTimeline.length;

        // Delays logged today
        const todayDelays = todayTimeline.filter(
          (l) => l.status === 'delayed' || Boolean(l.delayReason?.trim())
        );
        const delaysCount = todayDelays.length;
        const penaltyScore = -1 * (delaysCount * 5);
        const todayScore = Math.max(0, 100 + penaltyScore);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 text-slate-900">
              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6EA] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#111827] text-[#F5C518] font-black text-xl flex items-center justify-center shadow shrink-0">
                    {staffName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#111827]">
                      {staffName}'s Performance Profile
                    </h3>
                    <p className="text-xs text-[#6B7280] font-medium">
                      {selectedStaffProfile.role || 'Kitchen Staff'} • Detailed activity & delay logs
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <div className="flex flex-col items-end bg-slate-900 text-white px-4 py-1.5 rounded-2xl shadow-sm">
                    <span className="font-black text-lg text-[#F5C518]">{todayScore} <span className="text-xs text-white opacity-80">/ 100</span></span>
                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">Today Score</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStaffProfile(null)}
                    className="p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 4 Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-gray-500">Assigned Tasks</span>
                  <span className="text-xl font-black text-slate-900">{totalAssigned}</span>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800">Completed Today</span>
                  <span className="text-xl font-black text-emerald-700">{completedTodayCount}</span>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-amber-800">Timing Delays</span>
                  <span className="text-xl font-black text-amber-700">{delaysCount}</span>
                </div>
                <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-red-800">Penalty Score</span>
                  <span className="text-xl font-black text-red-600">{penaltyScore} pts</span>
                </div>
              </div>


              {/* Batch-by-Batch Today Execution & Task Tracker */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C0181A]" />
                    <span>Batch-by-Batch Progress & Checklist ({totalAssigned} Assigned Tasks)</span>
                  </h4>
                </div>

                {(() => {
                  const allTasks = analytics?.tasks || [];
                  const groupedBatches = allTasks.reduce((acc, t) => {
                    const b = t.batchName || 'General SOP';
                    if (!acc[b]) acc[b] = [];
                    acc[b].push(t);
                    return acc;
                  }, {} as Record<string, PlainSopTask[]>);

                  if (allTasks.length === 0) {
                    return (
                      <p className="text-xs italic text-gray-500 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        No SOP tasks currently defined in the system.
                      </p>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1">
                      {Object.entries(groupedBatches).map(([batchName, bTasks]) => {
                        const batchWindow = bTasks[0]?.batchWindow || '';

                        // Count completed tasks in this batch for this staff member today
                        const batchCompletedCount = bTasks.filter((t) => {
                          return todayLogsList.some(
                            (l) =>
                              l.employeeName?.trim().toLowerCase() === staffName.trim().toLowerCase() &&
                              ((l.taskId && l.taskId === t._id) || (l.taskName.trim().toLowerCase() === t.taskName.trim().toLowerCase()))
                          );
                        }).length;

                        const progressPct = bTasks.length > 0 ? Math.round((batchCompletedCount / bTasks.length) * 100) : 0;

                        return (
                          <div key={batchName} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-2xs">
                            {/* Batch Header Bar */}
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-slate-900 uppercase tracking-wider">{batchName}</span>
                                <span className="text-[10px] font-bold bg-white text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                  {batchWindow}
                                </span>
                              </div>

                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                batchCompletedCount === bTasks.length
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : batchCompletedCount > 0
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-slate-200 text-slate-600 border-slate-300'
                              }`}>
                                {batchCompletedCount} / {bTasks.length} Done ({progressPct}%)
                              </span>
                            </div>

                            {/* Batch Tasks List */}
                            <div className="flex flex-col gap-1.5">
                              {bTasks.map((t) => {
                                const completedLog = todayLogsList.find(
                                  (l) =>
                                    l.employeeName?.trim().toLowerCase() === staffName.trim().toLowerCase() &&
                                    ((l.taskId && l.taskId === t._id) || (l.taskName.trim().toLowerCase() === t.taskName.trim().toLowerCase()))
                                );

                                const isDone = Boolean(completedLog);
                                const isDel = completedLog && (completedLog.status === 'delayed' || Boolean(completedLog.delayReason?.trim()));
                                const isAssignedToThisStaff = t.assignedStaffName?.trim().toLowerCase() === staffName.trim().toLowerCase();

                                return (
                                  <div
                                    key={t._id}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                      isDone
                                        ? isDel
                                          ? 'bg-red-50/70 border-red-200'
                                          : 'bg-emerald-50/70 border-emerald-200'
                                        : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                          <span>{t.taskName}</span>
                                          {isAssignedToThisStaff && (
                                            <span className="text-[9px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                                              Assigned
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      {isDone ? (
                                        isDel ? (
                                          <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-red-200 font-mono">
                                            🔴 Delayed ({formatExecutionTime(completedLog?.completedAtIso, completedLog?.createdAt)})
                                          </span>
                                        ) : (
                                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                                            🟢 Completed ({formatExecutionTime(completedLog?.completedAtIso, completedLog?.createdAt)})
                                          </span>
                                        )
                                      ) : (
                                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border border-slate-200">
                                          ⏳ Pending
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Stated Delay Reasons (N Delays) */}
              <div className="flex flex-col gap-2.5">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Stated Delay Reasons ({todayDelays.length} Delays)</span>
                </h4>

                {todayDelays.length === 0 ? (
                  <p className="text-xs italic text-emerald-700 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
                    🟢 Zero delays recorded today for {staffName}! Perfect execution.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {todayDelays.map((del) => (
                      <div key={del._id} className="bg-red-50 p-3 rounded-2xl border border-red-200 flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-center font-extrabold text-red-950">
                          <span>
                            {del.taskName} <span className="text-[10px] text-gray-500 font-normal">({del.batchName})</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-red-700">
                            {formatExecutionTime(del.completedAtIso, del.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-red-900 bg-white p-2.5 rounded-xl border border-red-200 italic mt-0.5">
                          "{del.delayReason || 'No reason provided'}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Link Button to Advanced Analytics */}
              <div className="border-t border-[#E2E6EA] pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStaffProfile(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl text-center"
                >
                  Close Profile
                </button>

                <Link
                  href={`/admin/sop-tracker/analytics?staff=${encodeURIComponent(staffName)}`}
                  className="bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
                >
                  <BarChart3 className="w-4 h-4 text-[#F5C518]" />
                  <span>Charts with Detailed Analysis 📈</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Assign Whole Batch Modal with Created Staff Select Dropdown */}
      {batchAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAssignBatchSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-800">
              <Users className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-[#111827]">
                Assign Staff to Entire Batch
              </h3>
            </div>

            <p className="text-xs text-[#6B7280]">
              Assign all tasks in <span className="font-extrabold text-[#111827]">{batchAssignModal.batchName}</span> to a created staff profile.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Select Created Staff Profile</label>
              {createdStaffList.length === 0 ? (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                  No staff profiles created yet. Please create a staff profile first using the "Create Staff Profile" button above!
                </div>
              ) : (
                <select
                  value={batchAssignModal.staffName}
                  onChange={(e) => setBatchAssignModal({ ...batchAssignModal, staffName: e.target.value })}
                  className="px-3.5 py-2.5 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9] outline-none focus:border-[#C0181A] font-bold"
                  required
                >
                  <option value="">-- Select Created Staff Profile --</option>
                  {createdStaffList.map((sp) => (
                    <option key={sp._id} value={sp.name}>
                      👤 {sp.name} ({sp.role || 'Kitchen Staff'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setBatchAssignModal(null)}
                className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F4F6F9] rounded-xl"
              >
                Cancel
              </button>
              <AdminButton type="submit" loading={savingTask} disabled={createdStaffList.length === 0}>
                Assign Entire Batch
              </AdminButton>
            </div>
          </form>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddTask} className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-[#111827]">Add New SOP Task</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Batch Name</label>
              <input
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Task Name</label>
              <input
                type="text"
                placeholder="e.g., Chopping Onions"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Description</label>
              <input
                type="text"
                placeholder="Brief instructions"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Target (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={newTargetMinutes}
                  onChange={(e) => setNewTargetMinutes(parseInt(e.target.value) || 1)}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9]"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Assign Staff Profile</label>
                <select
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9] font-bold"
                >
                  <option value="">Unassigned</option>
                  {createdStaffList.map((sp) => (
                    <option key={sp._id} value={sp.name}>
                      👤 {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F4F6F9] rounded-xl"
              >
                Cancel
              </button>
              <AdminButton type="submit" loading={savingTask}>
                Save Task
              </AdminButton>
            </div>
          </form>
        </div>
      )}

      {/* Edit Task & Staff Assignment Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateTask} className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-[#111827]">Edit Task Name & Single Task Override</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Task Name</label>
              <input
                type="text"
                value={editingTask.taskName}
                onChange={(e) => setEditingTask({ ...editingTask, taskName: e.target.value })}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Assigned Staff Profile (Single Task Override)</label>
              <select
                value={editingTask.assignedStaffName || ''}
                onChange={(e) => setEditingTask({ ...editingTask, assignedStaffName: e.target.value })}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9] font-bold"
              >
                <option value="">Unassigned</option>
                {createdStaffList.map((sp) => (
                  <option key={sp._id} value={sp.name}>
                    👤 {sp.name} ({sp.role || 'Kitchen Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Target (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={editingTask.targetMinutes}
                  onChange={(e) => setEditingTask({ ...editingTask, targetMinutes: parseInt(e.target.value) || 1 })}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9]"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-[#6B7280]">Batch Window</label>
                <input
                  type="text"
                  value={editingTask.batchWindow || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, batchWindow: e.target.value })}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-xl bg-[#F4F6F9]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F4F6F9] rounded-xl"
              >
                Cancel
              </button>
              <AdminButton type="submit" loading={savingTask}>
                Update Task
              </AdminButton>
            </div>
          </form>
        </div>
      )}

      {/* Animated Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] max-w-md px-4 py-3.5 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toast.type === 'error'
              ? 'bg-red-950 text-red-100 border-red-800'
              : toast.type === 'info'
              ? 'bg-slate-900 text-slate-100 border-slate-700'
              : 'bg-emerald-950 text-emerald-100 border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-black tracking-wide">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
