'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: string;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  pageSize?: number;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedRowId?: string;
  toolbar?: React.ReactNode;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  pageSize = 20,
  totalCount,
  currentPage = 1,
  onPageChange,
  onSort,
  sortKey,
  sortDirection,
  emptyMessage = 'No data found.',
  emptyIcon,
  rowActions,
  onRowClick,
  selectedRowId,
  toolbar,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState('');

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
        {(searchable || toolbar) && (
          <div className="p-4 border-b border-[#E2E6EA] flex items-center gap-3">
            <div className="h-9 w-64 bg-[#E2E6EA] rounded-lg animate-pulse" />
          </div>
        )}
        <div className="divide-y divide-[#E2E6EA]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4 animate-pulse">
              {columns.map((col, ci) => (
                <div key={ci} className="h-4 bg-[#E2E6EA] rounded flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
      {(searchable || toolbar) && (
        <div className="p-4 border-b border-[#E2E6EA] flex flex-wrap items-center gap-3">
          {searchable && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                value={localSearch}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {data.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center gap-3">
          {emptyIcon && <div className="text-[#E2E6EA]">{emptyIcon}</div>}
          <p className="text-sm text-[#6B7280]">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] whitespace-nowrap ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.sortable ? 'cursor-pointer select-none hover:text-[#111827]' : ''}`}
                      style={col.width ? { width: col.width } : undefined}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {col.sortable && (
                          <span className="inline-flex flex-col">
                            {sortKey === col.key ? (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                  {rowActions && (
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EA]">
                {data.map((row, rowIndex) => (
                  <tr
                    key={row[keyField]}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${
                      selectedRowId === row[keyField]
                        ? 'bg-[#FEF2F2]'
                        : 'hover:bg-[#F4F6F9]/50'
                    }`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 text-[14px] text-[#111827] ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(row, rowIndex) : row[col.key]}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3.5 text-right">
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {onPageChange && totalCount && totalCount > pageSize && (
            <div className="px-4 py-3 border-t border-[#E2E6EA] flex items-center justify-between bg-[#F4F6F9]/50">
              <span className="text-xs text-[#6B7280]">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-[#E2E6EA] bg-white text-[#6B7280] hover:bg-[#F4F6F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-medium text-[#111827]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-[#E2E6EA] bg-white text-[#6B7280] hover:bg-[#F4F6F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
