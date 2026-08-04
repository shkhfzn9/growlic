'use client';

import React, { useEffect, useState } from 'react';
import { getSuperAdminConsultations, updateConsultationStatus } from '@/actions/consultation';
import {
  Sparkles,
  Search,
  Filter,
  Flame,
  UserCheck,
  Building,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Briefcase,
  Layers,
  Clock,
  FileText,
  CheckCircle2,
  X,
  Edit3,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface LeadItem {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  industry: string;
  purpose: string;
  monthlyIncome: string;
  budgetRange: string;
  timeline: string;
  description: string;
  qualificationScore: 'High Intent 🔥' | 'Medium Intent' | 'Exploring';
  status: 'new' | 'contacted' | 'in_discussion' | 'qualified' | 'converted' | 'archived';
  notes?: string;
  restaurantId?: string;
  createdAt: string;
}

export default function ConsultationLeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');

  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [editStatus, setEditStatus] = useState<LeadItem['status']>('new');
  const [editNotes, setEditNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await getSuperAdminConsultations();
      setLeads(data);
    } catch (err) {
      console.error('Failed to load consultation leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const openLeadDetails = (lead: LeadItem) => {
    setSelectedLead(lead);
    setEditStatus(lead.status);
    setEditNotes(lead.notes || '');
    setSaveSuccess(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedLead) return;
    setSavingStatus(true);
    setSaveSuccess(false);

    try {
      await updateConsultationStatus(selectedLead._id, editStatus, editNotes);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadLeads();

      // Update selected lead locally
      setSelectedLead((prev) =>
        prev
          ? {
              ...prev,
              status: editStatus,
              notes: editNotes,
            }
          : null
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update lead status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSavingStatus(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      (lead.companyName && lead.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.purpose.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesScore = scoreFilter === 'all' || lead.qualificationScore === scoreFilter;

    return matchesSearch && matchesStatus && matchesScore;
  });

  const totalLeads = leads.length;
  const highIntentCount = leads.filter((l) => l.qualificationScore === 'High Intent 🔥').length;
  const inDiscussionCount = leads.filter((l) => ['contacted', 'in_discussion', 'qualified'].includes(l.status)).length;
  const convertedCount = leads.filter((l) => l.status === 'converted').length;

  const getScoreBadge = (score: string) => {
    if (score === 'High Intent 🔥') {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
          <Flame className="w-3 h-3" /> High Intent 🔥
        </span>
      );
    }
    if (score === 'Exploring') {
      return (
        <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Exploring
        </span>
      );
    }
    return (
      <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
        Medium Intent
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase">New Lead</span>;
      case 'contacted':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase">Contacted</span>;
      case 'in_discussion':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase">In Discussion</span>;
      case 'qualified':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">Qualified</span>;
      case 'converted':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase">Converted 🎉</span>;
      case 'archived':
        return <span className="bg-gray-100 text-gray-500 border border-gray-200 text-xs font-medium px-2.5 py-0.5 rounded-full uppercase">Archived</span>;
      default:
        return <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1E293B] tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" /> Consultation & Custom Software Leads
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Review inquiries from businesses looking to build custom websites, mobile apps, software, or AI automations.
          </p>
        </div>
        <button
          onClick={loadLeads}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl text-xs shadow-xs transition-all w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Submissions
        </button>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
            Total Submissions
          </span>
          <div className="text-2xl font-black text-gray-900">{totalLeads}</div>
          <span className="text-[11px] text-gray-500 font-medium">All qualification forms</span>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-rose-600 text-white rounded-2xl p-5 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-yellow-200 block mb-1">
            High Intent 🔥
          </span>
          <div className="text-2xl font-black text-white">{highIntentCount}</div>
          <span className="text-[11px] text-white/80 font-medium">Budget & Revenue Qualified</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
            Active Pipeline
          </span>
          <div className="text-2xl font-black text-indigo-600">{inDiscussionCount}</div>
          <span className="text-[11px] text-gray-500 font-medium">Contacted & Negotiating</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
            Converted Deals
          </span>
          <div className="text-2xl font-black text-emerald-600">{convertedCount}</div>
          <span className="text-[11px] text-gray-500 font-medium">Signed Software Clients</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 font-semibold text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-gray-900 font-bold outline-none cursor-pointer text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="in_discussion">In Discussion</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Intent Score Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-gray-500 font-semibold text-[11px]">Intent:</span>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="bg-transparent text-gray-900 font-bold outline-none cursor-pointer text-xs"
            >
              <option value="all">All Scores</option>
              <option value="High Intent 🔥">High Intent 🔥</option>
              <option value="Medium Intent">Medium Intent</option>
              <option value="Exploring">Exploring</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table / List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm animate-pulse">
            Loading consultation lead submissions...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-700">No Consultation Submissions Found</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              {searchQuery || statusFilter !== 'all' || scoreFilter !== 'all'
                ? 'Try clearing your search filters to view all leads.'
                : 'When prospective clients fill out the "Book a Free Consultation" form on the Developer Promo banner, their details will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Client Contact</th>
                  <th className="py-3.5 px-4">Company & Industry</th>
                  <th className="py-3.5 px-4">Intent Score</th>
                  <th className="py-3.5 px-4">Project Goal & Budget</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50/80 transition-colors group">
                    {/* Contact */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900 text-sm">{lead.name}</div>
                      <div className="text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{lead.phone}</span>
                      </div>
                      <div className="text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[160px]">{lead.email}</span>
                      </div>
                    </td>

                    {/* Company & Industry */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-800">
                        {lead.companyName || 'Individual / Founder'}
                      </div>
                      <span className="inline-block text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded mt-1">
                        {lead.industry}
                      </span>
                    </td>

                    {/* Qualification Score */}
                    <td className="py-4 px-4">{getScoreBadge(lead.qualificationScore)}</td>

                    {/* Goal & Budget */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-indigo-900">{lead.purpose}</div>
                      <div className="text-gray-600 font-medium text-[11px] mt-0.5">
                        💰 Budget: {lead.budgetRange}
                      </div>
                      <div className="text-gray-400 text-[10px] mt-0.5">
                        📊 Income: {lead.monthlyIncome}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-gray-500 font-mono text-[11px]">
                      {new Date(lead.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">{getStatusBadge(lead.status)}</td>

                    {/* Action */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => openLeadDetails(lead)}
                        className="inline-flex items-center gap-1 bg-[#1E1B4B] hover:bg-[#0F172A] text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-xs"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Details Modal / Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col border border-gray-200">
            {/* Header */}
            <div className="bg-[#0F172A] px-6 py-5 text-white flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getScoreBadge(selectedLead.qualificationScore)}
                  <span className="text-[10px] text-gray-400 font-mono">
                    ID: #{selectedLead._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">{selectedLead.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedLead.companyName ? `${selectedLead.companyName} • ` : ''}
                  {selectedLead.industry}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 bg-[#F8FAFC]">
              {saveSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Lead status and notes updated successfully!
                </div>
              )}

              {/* Grid 1: Contact & Profile */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Phone / WhatsApp</span>
                  <a href={`tel:${selectedLead.phone}`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {selectedLead.phone}
                  </a>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Email</span>
                  <a href={`mailto:${selectedLead.email}`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5 truncate">
                    <Mail className="w-3 h-3" /> {selectedLead.email}
                  </a>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Timeline Goal</span>
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-amber-500" /> {selectedLead.timeline}
                  </span>
                </div>
              </div>

              {/* Grid 2: Financials & Scope */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-indigo-900 block">Monthly Business Revenue</span>
                  <span className="text-xs font-bold text-indigo-950 block mt-0.5">{selectedLead.monthlyIncome}</span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase text-indigo-900 block">Project Budget Range</span>
                  <span className="text-xs font-bold text-indigo-950 block mt-0.5">{selectedLead.budgetRange}</span>
                </div>
              </div>

              {/* Project Goal & Detailed Description */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Primary Goal: <strong className="text-gray-900">{selectedLead.purpose}</strong>
                </span>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {selectedLead.description}
                </div>
              </div>

              {/* Admin Actions: Update Status & Notes */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase text-gray-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600" /> Super Admin Lead Management
                </h4>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-gray-500">Update Lead Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none"
                    >
                      <option value="new">New Lead</option>
                      <option value="contacted">Contacted</option>
                      <option value="in_discussion">In Discussion</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted Deals 🎉</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Internal Admin Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Add notes about call discussion, agreed pricing, follow-up dates..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none resize-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={handleUpdateStatus}
                  className="bg-[#1E1B4B] hover:bg-[#0F172A] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mt-1"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {savingStatus ? 'Saving Lead...' : 'Save Lead Status & Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
