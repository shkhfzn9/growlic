'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { submitConsultationForm } from '@/actions/consultation';
import {
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
  Check,
  ChevronRight,
  Layers,
  Bot,
  Globe,
  Smartphone,
  Calendar,
  CreditCard,
  Lock,
} from 'lucide-react';

const INDUSTRIES = [
  'Restaurant & Hospitality',
  'Salon, Spa & Beauty',
  'E-Commerce & Retail',
  'Healthcare & Medical Clinic',
  'Real Estate & Property',
  'Professional Services & Agency',
  'Tech Startup & SaaS',
  'Logistics & Supply Chain',
  'Education & EdTech',
  'Fitness & Gym',
  'Other / Custom Industry',
];

const PURPOSES = [
  { value: 'custom_web_app', label: 'Custom Web Application & Client Portal', icon: Globe },
  { value: 'booking_system', label: 'Booking, Scheduling & Reservation System', icon: Calendar },
  { value: 'pos_billing', label: 'Billing, Invoicing & POS Software', icon: CreditCard },
  { value: 'mobile_app', label: 'Mobile App (iOS & Android)', icon: Smartphone },
  { value: 'ai_automation', label: 'AI Automation, WhatsApp Bot & Workflows', icon: Bot },
  { value: 'ecommerce_store', label: 'E-Commerce / Online Store', icon: Layers },
  { value: 'simple_website', label: 'High-Converting Business Website', icon: Code2 },
  { value: 'software_upgrade', label: 'Software Upgrade, Refactoring & Bug Fixes', icon: Zap },
  { value: 'other', label: 'Other Custom Software Need', icon: Sparkles },
];

const INCOME_BRACKETS = [
  'Under ₹50,000 / $600 monthly',
  '₹50,000 - ₹2 Lakhs / $600 - $2.5k monthly',
  '₹2 Lakhs - ₹10 Lakhs / $2.5k - $12k monthly',
  '₹10 Lakhs+ / $12k+ monthly (Enterprise)',
];

const BUDGET_RANGES = [
  '₹25,000 - ₹50,000 (Starter MVP)',
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

export default function FreeAuditConsultationPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !description.trim()) {
      setErrorMessage('Please fill in all required fields (Name, Email, Phone, Project Details).');
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
      });

      if (res.success) {
        setSubmittedData({
          leadId: res.leadId,
          qualificationScore: res.qualificationScore,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Error submitting consultation audit form:', err);
      setErrorMessage(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#0A0E1A] text-white flex flex-col justify-between selection:bg-[#F5C518] selection:text-black">
      {/* Top Navigation Bar */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C0181A] to-[#F5C518] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="font-black text-xl tracking-tight text-white">
              GROWLIC<span className="text-[#F5C518]">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Free Audits Open This Month
            </span>
            <a
              href="#audit-form"
              className="bg-[#F5C518] hover:bg-[#E5B508] text-gray-950 font-black text-xs px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1"
            >
              <span>Get Audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10 w-full flex-1">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5C518]/15 border border-[#F5C518]/30 text-[#F5C518] text-xs font-black uppercase tracking-wider mb-4 animate-in fade-in duration-500">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            SOFTWARE &amp; DIGITAL SOLUTIONS
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
            Your Business Deserves <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5C518] via-amber-200 to-yellow-400">
              Better Software.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-300 font-medium leading-relaxed">
            Custom websites, web portals, mobile apps &amp; AI automation built to grow your business.
            Fill out the form below to receive a <strong className="text-white">100% free engineering &amp; workflow audit</strong>.
          </p>

          {/* Value Props Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
              <h3 className="font-extrabold text-xs text-white">Full Code Ownership</h3>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Zero vendor lock-in. You own 100% of your source code and IP.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
              <Zap className="w-5 h-5 text-yellow-400 mb-2" />
              <h3 className="font-extrabold text-xs text-white">Rapid 7–14 Day Delivery</h3>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Production MVPs deployed quickly so your business starts growing immediately.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
              <TrendingUp className="w-5 h-5 text-purple-400 mb-2" />
              <h3 className="font-extrabold text-xs text-white">ROI &amp; Automation First</h3>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Eliminate manual hours and scale revenue with intelligent automation.</p>
            </div>
          </div>
        </div>

        {/* Audit Form Container */}
        <div id="audit-form" className="bg-slate-900/80 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {submittedData ? (
            /* Success State */
            <div className="py-12 text-center flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400 rounded-3xl flex items-center justify-center text-emerald-400 mb-6 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-[#F5C518] mb-2">
                AUDIT REQUEST CONFIRMED
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                Thank You, {name}!
              </h2>
              <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed mb-6">
                Our software architects will analyze your business workflow and contact you directly on{' '}
                <strong className="text-white font-bold">{phone}</strong> within 24 hours with your free audit report.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-w-sm w-full text-left mb-6">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/10">
                  <span className="text-gray-400">Request ID:</span>
                  <span className="font-mono font-bold text-white">#{submittedData.leadId.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2">
                  <span className="text-gray-400">Qualification:</span>
                  <span className="font-bold text-emerald-400">{submittedData.qualificationScore}</span>
                </div>
              </div>

              <Link
                href="/"
                className="bg-[#F5C518] hover:bg-[#E5B508] text-gray-950 font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider shadow-lg transition-all active:scale-95"
              >
                Return to Home
              </Link>
            </div>
          ) : (
            /* Interactive Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span>Book Free Consultation &amp; System Audit</span>
                  <Sparkles className="w-4 h-4 text-[#F5C518]" />
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Tell us about your business and goals. We will prepare an architectural roadmap tailored to you.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl font-semibold">
                  {errorMessage}
                </div>
              )}

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    WhatsApp / Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Business Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@yourcompany.com"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Business / Store Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Tokyo Momos / Glamour Salon"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518] transition-colors"
                  />
                </div>
              </div>

              {/* Industry & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Your Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C518] transition-colors cursor-pointer"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind} className="bg-slate-900 text-white">
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Software You Need
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C518] transition-colors cursor-pointer"
                  >
                    {PURPOSES.map((p) => (
                      <option key={p.value} value={p.label} className="bg-slate-900 text-white">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {purpose.includes('Other') && (
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Specify Custom Software Need <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="Describe your software requirement..."
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518] transition-colors"
                  />
                </div>
              )}

              {/* Financial & Timeline Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Current Monthly Revenue
                  </label>
                  <select
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5C518] transition-colors cursor-pointer"
                  >
                    {INCOME_BRACKETS.map((inc) => (
                      <option key={inc} value={inc} className="bg-slate-900 text-white">
                        {inc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Project Budget Range
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5C518] transition-colors cursor-pointer"
                  >
                    {BUDGET_RANGES.map((b) => (
                      <option key={b} value={b} className="bg-slate-900 text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Target Timeline
                  </label>
                  <select
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5C518] transition-colors cursor-pointer"
                  >
                    {TIMELINES.map((t) => (
                      <option key={t} value={t} className="bg-slate-900 text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Project Description */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Tell Us About Your Business &amp; Challenges <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What bottlenecks are you facing? What features or automation do you need built?"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518] transition-colors resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-[#F5C518] to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-gray-950 font-black text-sm py-3.5 px-6 rounded-2xl uppercase tracking-wider shadow-xl shadow-yellow-500/10 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing &amp; Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Book Free Consultation &amp; Audit</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>100% Confidential. No obligation. Fast WhatsApp response.</span>
                </p>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-400">
        <p>© 2026 Growlic Inc. All rights reserved. Custom Software, Automation &amp; POS Systems.</p>
      </footer>
    </div>
  );
}
