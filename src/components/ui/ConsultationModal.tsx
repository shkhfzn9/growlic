'use client';

import React, { useState } from 'react';
import { submitConsultationForm } from '@/actions/consultation';
import {
  X,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Building2,
  Phone,
  Mail,
  DollarSign,
  Clock,
  Code2,
} from 'lucide-react';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId?: string;
}

const INDUSTRIES = [
  'Restaurant & Hospitality',
  'E-Commerce & Retail',
  'Healthcare & Medical',
  'Real Estate & Property',
  'Professional Services & Agency',
  'Tech Startup / SaaS',
  'Logistics & Supply Chain',
  'Education & EdTech',
  'Other / Industry Independent',
];

const PURPOSES = [
  { value: 'simple_website', label: 'Simple Business Website' },
  { value: 'ecommerce_store', label: 'E-Commerce / Online Store' },
  { value: 'custom_web_app', label: 'Custom Web Application & Client Portal' },
  { value: 'mobile_app', label: 'Mobile App (iOS & Android)' },
  { value: 'ai_automation', label: 'AI Automation & Chatbot System' },
  { value: 'booking_system', label: 'Booking, Scheduling & Reservation System' },
  { value: 'pos_billing', label: 'Billing, Invoicing & POS Software' },
  { value: 'crm_dashboard', label: 'CRM & Business Dashboard' },
  { value: 'startup_mvp', label: 'Full Startup MVP Development' },
  { value: 'software_upgrade', label: 'Software Upgrade, Refactoring & Bug Fixes' },
  { value: 'other', label: 'Other / Custom Software Need' },
];

const INCOME_BRACKETS = [
  'Under ₹50,000 / $600 monthly',
  '₹50,000 - ₹2 Lakhs / $600 - $2.5k monthly',
  '₹2 Lakhs - ₹10 Lakhs / $2.5k - $12k monthly',
  '₹10 Lakhs+ / $12k+ monthly (Enterprise)',
];

const BUDGET_RANGES = [
  '₹25,000 - ₹50,000 (Small Project / MVP Starter)',
  '₹50,000 - ₹1.5 Lakhs (Growth App / Portal)',
  '₹1.5 Lakhs - ₹5 Lakhs (Full Business Automation)',
  '₹5 Lakhs+ / Enterprise System',
];

const TIMELINES = [
  'Urgent (Within 2 weeks)',
  '1 Month',
  '1 - 3 Months',
  'Exploring options / Planning',
];

export default function ConsultationModal({
  isOpen,
  onClose,
  restaurantId,
}: ConsultationModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [purpose, setPurpose] = useState(PURPOSES[0].label);
  const [customPurpose, setCustomPurpose] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(INCOME_BRACKETS[1]);
  const [budgetRange, setBudgetRange] = useState(BUDGET_RANGES[1]);
  const [timeline, setTimeline] = useState(TIMELINES[0]);
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    leadId: string;
    qualificationScore: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !description.trim()) {
      setErrorMessage('Please fill in all required fields to proceed.');
      return;
    }

    if (purpose.includes('Other') && !customPurpose.trim()) {
      setErrorMessage('Please specify your custom software goal in the input box.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const finalPurpose =
      purpose.includes('Other') && customPurpose.trim()
        ? `Other: ${customPurpose.trim()}`
        : purpose;

    try {
      const res = await submitConsultationForm({
        name,
        email,
        phone,
        companyName,
        industry,
        purpose: finalPurpose,
        monthlyIncome,
        budgetRange,
        timeline,
        description,
        restaurantId,
      });

      if (res.success) {
        setSubmittedData({
          leadId: res.leadId,
          qualificationScore: res.qualificationScore,
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to submit consultation request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedData(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col border border-gray-100">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#2E1065] px-6 py-5 text-white flex justify-between items-center shrink-0 relative">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 tracking-wider mb-1">
              <Zap className="w-3 h-3 text-yellow-400" /> SERIOUS BUSINESS GROWTH ONLY
            </span>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white leading-snug">
              Book a Free Custom Software Consultation
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              Build proprietary software & AI workflows tailored 100% to your business goals.
            </p>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 bg-[#F8FAFC]">
          {submittedData ? (
            /* Submission Success View */
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 mb-1">
                Ref ID: #{submittedData.leadId.slice(-6).toUpperCase()}
              </span>
              <h3 className="text-2xl font-black text-[#1E293B] mb-2">
                Consultation Request Received!
              </h3>
              <div className="mb-4">
                <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-3 py-1 rounded-full">
                  {submittedData.qualificationScore}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Thank you, <strong>{name}</strong>! Our engineering and software architecture team is reviewing your requirements. We will connect with you via Phone / WhatsApp (<strong>{phone}</strong>) within <strong>12 hours</strong> to discuss your roadmap.
              </p>
              <button
                onClick={handleResetAndClose}
                className="w-full bg-[#1E1B4B] hover:bg-[#0F172A] text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all text-sm"
              >
                Close & Return to Menu
              </button>
            </div>
          ) : (
            <>
              {/* Educational Value Proposition & Mini Case Study */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Value Card */}
                <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-2 inline-block">
                      💡 Why Build Proprietary Software?
                    </span>
                    <h3 className="text-sm font-black text-[#0F172A] leading-snug mb-2">
                      Custom Software is an Asset, Not a Subscription Fee
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Off-the-shelf platforms force your business into rigid boxes and charge forever. Custom websites, web portals, mobile apps, and AI automations are designed around your exact workflows—eliminating operational bottlenecks, saving 40+ hours per week, and multiplying sales.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs font-semibold text-indigo-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>100% IP & Code Ownership</span>
                  </div>
                </div>

                {/* Mini Case Study Card */}
                <div className="bg-gradient-to-br from-[#0F172A] to-[#1E1B4B] text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full mb-2 inline-block">
                      📈 REAL CASE STUDY
                    </span>
                    <h4 className="text-sm font-black text-white leading-tight mb-1">
                      Traditional Business Modernization
                    </h4>
                    <p className="text-[11px] text-white/80 leading-relaxed mb-3">
                      Replaced 3 manual tracking tools with a custom web portal & AI lead qualifier.
                    </p>
                    <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                      <div>
                        <div className="text-base font-black text-emerald-400">+210%</div>
                        <div className="text-[9px] text-white/60 uppercase font-medium">Revenue Growth</div>
                      </div>
                      <div>
                        <div className="text-base font-black text-yellow-400">35 hrs</div>
                        <div className="text-[9px] text-white/60 uppercase font-medium">Saved / Week</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">
                  {errorMessage}
                </div>
              )}

              {/* Main Qualification Form */}
              <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-indigo-600" /> Qualification & Scope Questionnaire
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Help us understand your business goals so our lead architect can prepare a custom solution.
                    </p>
                  </div>
                </div>

                {/* Section 1: Contact Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-xs text-gray-900 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-xs text-gray-900 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-xs text-gray-900 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      Company / Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Nexus Tech Ltd."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-xs text-gray-900 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Section 2: Industry & Purpose */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      Business Industry
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-xs text-gray-900 outline-none transition-colors"
                    >
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      Primary Software Goal
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-xs text-gray-900 outline-none transition-colors"
                    >
                      {PURPOSES.map((p) => (
                        <option key={p.value} value={p.label}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    {purpose.includes('Other') && (
                      <input
                        type="text"
                        placeholder="Please specify your software goal (e.g. ERP, IoT app, Custom Integration)..."
                        value={customPurpose}
                        onChange={(e) => setCustomPurpose(e.target.value)}
                        className="mt-1 bg-[#F1F5F9] border border-indigo-300 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-xs text-gray-900 outline-none transition-all animate-in fade-in duration-200"
                        required
                      />
                    )}
                  </div>

                </div>

                {/* Section 3: Financials & Intent Qualification */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900">
                      Monthly Business Revenue
                    </label>
                    <select
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none font-medium"
                    >
                      {INCOME_BRACKETS.map((inc) => (
                        <option key={inc} value={inc}>
                          {inc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900">
                      Project Budget Range
                    </label>
                    <select
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none font-medium"
                    >
                      {BUDGET_RANGES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900">
                      Target Timeline
                    </label>
                    <select
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none font-medium"
                    >
                      {TIMELINES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section 4: Detailed Requirements */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                    Detailed Project Scope & Pain Points *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe what manual bottlenecks you want to automate, what core features your software must have, and what business outcomes you expect..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl px-4 py-3 text-xs text-gray-900 outline-none transition-colors resize-none"
                    required
                  />
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1E1B4B] hover:bg-[#0F172A] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  {submitting ? 'Submitting Requirements...' : 'Submit Qualification & Book Consultation'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
