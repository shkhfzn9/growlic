'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { PageHeader } from '@/components/ui';
import {
  Wallet,
  ShoppingCart,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Zap,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  PlainExpenseCategory,
  PlainExpenseItem,
  PlainExpenseLog,
  ExpenseDashboardSummary,
} from '@/features/expense';
import {
  getExpenseCategoriesAction,
  getExpenseItemsAction,
  getExpenseLogsPaginatedAction,
  getExpenseSummaryAnalyticsAction,
} from '@/actions/expense';

import ItemsAndCategoriesTab from './components/ItemsAndCategoriesTab';
import LogPurchaseTab from './components/LogPurchaseTab';
import DashboardTrendsTab from './components/DashboardTrendsTab';

type ActiveTab = 'items' | 'log' | 'dashboard';

function ExpenseTrackerContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [categories, setCategories] = useState<PlainExpenseCategory[]>([]);
  const [items, setItems] = useState<PlainExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseDashboardSummary | null>(null);

  const [logs, setLogs] = useState<PlainExpenseLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<PlainExpenseLog[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);

  // Toast Notification System State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, itemRes, sumRes, logsRes, recentLogsRes] = await Promise.all([
        getExpenseCategoriesAction().catch(() => []),
        getExpenseItemsAction().catch(() => []),
        getExpenseSummaryAnalyticsAction().catch(() => null),
        getExpenseLogsPaginatedAction({ page: currentPage, limit: 20 }).catch(() => ({ logs: [], totalCount: 0 })),
        getExpenseLogsPaginatedAction({ page: 1, limit: 15 }).catch(() => ({ logs: [], totalCount: 0 })),
      ]);

      setCategories(catRes || []);
      setItems(itemRes || []);
      setSummary(sumRes || null);
      setLogs(logsRes?.logs || []);
      setRecentLogs(recentLogsRes?.logs || []);
      setTotalLogsCount(logsRes?.totalCount || 0);
    } catch (err) {
      console.error('Failed to load expense tracker data:', err);
      showToast('Failed to load expense tracker data', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl pb-16 font-sans">
      {/* Floating Glassmorphic Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-red-950/90 text-red-100 border-red-800'
                : toast.type === 'info'
                ? 'bg-slate-900/90 text-slate-100 border-slate-700'
                : 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="ml-2 text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Page Header with Public Shareable Staff Link */}
      <PageHeader
        title="Expense Tracker"
        subtitle="Log daily raw material purchases, monitor per-unit costs, and track weekly/monthly rate inflation trends"
        actions={
          <a
            href="/expense-tracker/tokyo-momos"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Public Staff Logger 🔗</span>
          </a>
        }
      />

      {/* Tab Selector Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'dashboard'
              ? 'bg-slate-900 text-[#F5C518] shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard & Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('log')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'log'
              ? 'bg-[#C0181A] text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Log Daily Purchase</span>
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'items'
              ? 'bg-slate-900 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Items & Categories ({items.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-xs text-slate-400 font-bold">
          Loading Expense Tracker module...
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardTrendsTab
              categories={categories}
              items={items}
              summary={summary}
              logs={logs}
              totalLogsCount={totalLogsCount}
              currentPage={currentPage}
              onPageChange={(page) => setCurrentPage(page)}
              onRefresh={loadData}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'log' && (
            <LogPurchaseTab
              categories={categories}
              items={items}
              recentLogs={recentLogs}
              onRefresh={loadData}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'items' && (
            <ItemsAndCategoriesTab
              categories={categories}
              items={items}
              onRefresh={loadData}
              onShowToast={showToast}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function ExpenseTrackerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Expense Tracker...</div>}>
      <ExpenseTrackerContent />
    </Suspense>
  );
}
