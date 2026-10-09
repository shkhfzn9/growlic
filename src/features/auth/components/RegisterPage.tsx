'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Sparkles, CheckCircle, AlertCircle, Building2, Check, X, ArrowRight, Scissors, Car, ShoppingBag, Briefcase, Utensils } from 'lucide-react';
import { BUSINESS_CATEGORIES } from '@/config/themes';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessCategory, setBusinessCategory] = useState('restaurant');
  const [designation, setDesignation] = useState('owner');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const checkSlugAvailability = async () => {
      setSlugChecking(true);
      try {
        const res = await fetch(`/api/auth/register/check-slug?slug=${slug}`);
        const data = await res.json();
        if (data.success) {
          setSlugAvailable(data.available);
        }
      } catch (err) {
        console.error('Error checking slug:', err);
      } finally {
        setSlugChecking(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      checkSlugAvailability();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [slug]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    
    // Auto-slugify: lowercase, remove non-alphanumeric, replace spaces/dashes with single dash
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-');
    setSlug(generatedSlug);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Enforce slug character constraints strictly
    const sanitizedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    setSlug(sanitizedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (slugAvailable === false) {
      setError('The selected Business ID is already taken. Please choose another one.');
      return;
    }

    if (!name.trim() || !slug.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !phone.trim() || !designation) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    if (slug.length < 3) {
      setError('Business ID slug must be at least 3 characters.');
      return;
    }

    if (phone.replace(/\D/g, '').length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: name,
          restaurantId: slug,
          email,
          password,
          phone,
          designation,
          businessCategory,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('Unable to connect to registration service. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getBusinessTitle = () => {
    switch (businessCategory) {
      case 'salon': return 'Salon / Spa Name';
      case 'detailing': return 'Studio / Showroom Name';
      case 'retail': return 'Store / Boutique Name';
      case 'services': return 'Business / Agency Name';
      default: return 'Restaurant / Cafe Name';
    }
  };

  const getBusinessPlaceholder = () => {
    switch (businessCategory) {
      case 'salon': return 'e.g. Velvet Touch Salon & Spa';
      case 'detailing': return 'e.g. Apex Auto Detailing Studio';
      case 'retail': return 'e.g. Urban Threads Apparel';
      case 'services': return 'e.g. Horizon Media Solutions';
      default: return 'e.g. Srinagar Dumpling House';
    }
  };

  const getBusinessCardDesc = () => {
    switch (businessCategory) {
      case 'salon': return 'Create your digital service catalog & appointment system';
      case 'detailing': return 'Create your detailing package catalog & booking system';
      case 'retail': return 'Create your digital product catalog & order system';
      case 'services': return 'Create your service package & client billing system';
      default: return 'Create your digital menu & order management account';
    }
  };

  const getBusinessHeaderSub = () => {
    switch (businessCategory) {
      case 'salon': return 'Register Salon & Spa';
      case 'detailing': return 'Register Detailing Studio';
      case 'retail': return 'Register Store & Boutique';
      case 'services': return 'Register Business Profile';
      default: return 'Register Restaurant';
    }
  };

  const getBusinessSubmitText = () => {
    switch (businessCategory) {
      case 'salon': return 'Register Salon & Spa';
      case 'detailing': return 'Register Detailing Studio';
      case 'retail': return 'Register Store & Boutique';
      case 'services': return 'Register Business Profile';
      default: return 'Register Restaurant';
    }
  };

  const getBusinessCatalogLabel = () => {
    switch (businessCategory) {
      case 'salon': return 'digital catalog';
      case 'detailing': return 'detailing catalog';
      case 'retail': return 'store catalog';
      case 'services': return 'service catalog';
      default: return 'digital menu';
    }
  };

  const getBusinessSeedSummary = () => {
    switch (businessCategory) {
      case 'salon':
        return [
          'Seeded sample treatments (Haircut & Styling, Keratin Therapy, Hydra Facial).',
          'Setup initial 10% Package Discount Tier at ₹399.',
          'Created cross-pairing rules for Hair & Spa therapy.',
        ];
      case 'detailing':
        return [
          'Seeded sample packages (9H Ceramic Coating, Interior Spa, Foam Wash).',
          'Setup initial 10% Package Discount Tier at ₹399.',
          'Created cross-pairing rules for Coating & Detailing washes.',
        ];
      case 'retail':
        return [
          'Seeded sample products (Hoodies, Jackets, Sneakers).',
          'Setup initial 10% Discount Tier at ₹399.',
          'Created category combo discount rules.',
        ];
      default:
        return [
          'Seeded sample menu items (Momos, Soda, Biryani).',
          'Setup initial 10% Discount Tier at ₹399.',
          'Created 50% discount category combo rules.',
        ];
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#1C2333] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1C2333] via-[#111827] to-[#0A0F1D]" />
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#C0181A]/10 to-transparent" />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              Growlic
              <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide leading-none">Beta</span>
            </h1>
            <p className="text-white/50 text-xs mt-1 font-medium uppercase tracking-wider">Multi-Tenant Platform</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 text-center border border-gray-100">
            <div className="bg-emerald-50 text-emerald-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Registration Successful
              </span>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mt-3">
                {name}
              </h2>
              <p className="text-xs text-gray-500 font-mono mt-1">ID: {slug}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-gray-900 font-extrabold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-yellow-500 fill-current animate-pulse" />
                <span>Automatic Setup Complete</span>
              </div>
              <ul className="space-y-1.5 text-gray-600 text-[11px] font-medium pt-1">
                {getBusinessSeedSummary().map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Your {getBusinessCatalogLabel()} is live at <code className="text-[#C0181A] font-bold">growlic.com/menu/{slug}</code>. Log in to manage orders, customize pricing, or set up themes.
            </p>

            <Link
              href="/admin/login"
              className="w-full bg-gradient-to-r from-[#C0181A] to-[#8B0000] hover:from-[#A01012] hover:to-[#6B0000] text-white font-extrabold text-sm py-4 rounded-2xl uppercase tracking-wider transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Log In To Admin Panel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C2333] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1C2333] via-[#111827] to-[#0A0F1D]" />
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#C0181A]/10 to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            Growlic
            <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide leading-none">Beta</span>
          </h1>
          <p className="text-white/50 text-xs mt-1 font-semibold uppercase tracking-wider">{getBusinessHeaderSub()}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#C0181A] flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Onboard Your Business</h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">{getBusinessCardDesc()}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 text-xs font-semibold rounded-2xl p-3.5 mb-5 border border-red-200/60 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-4">
            {/* Business Industry Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Business Type / Industry</label>
              <select
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                disabled={loading}
                className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold uppercase outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all cursor-pointer"
              >
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Business Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">{getBusinessTitle()}</label>
              <input
                type="text"
                name="new_business_name"
                autoComplete="off"
                placeholder={getBusinessPlaceholder()}
                value={name}
                onChange={handleNameChange}
                disabled={loading}
                className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all"
                required
                autoFocus
              />
            </div>

            {/* Business ID (Slug) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Business ID / Slug</label>
                {slug.length >= 3 && (
                  <span className="text-[10px] font-black uppercase flex items-center gap-1">
                    {slugChecking ? (
                      <span className="text-gray-400">Checking...</span>
                    ) : slugAvailable === true ? (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    ) : slugAvailable === false ? (
                      <span className="text-red-600 flex items-center gap-0.5">
                        <X className="w-3 h-3" /> Already Taken
                      </span>
                    ) : null}
                  </span>
                )}
              </div>
              <input
                type="text"
                name="new_business_slug"
                autoComplete="off"
                placeholder="e.g. srinagar-dumplings"
                value={slug}
                onChange={handleSlugChange}
                disabled={loading}
                className={`w-full text-xs px-4 py-3 rounded-xl border bg-gray-50/50 text-gray-900 font-mono font-semibold lowercase outline-none focus:bg-white transition-all ${
                  slugAvailable === true
                    ? 'border-emerald-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10'
                    : slugAvailable === false
                    ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10'
                    : 'border-gray-200 focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10'
                }`}
                required
              />
              <span className="text-[10px] text-gray-400 font-medium leading-tight">
                Menu URL: <code className="text-gray-700 font-semibold">growlic.com/menu/{slug || 'your-id'}</code>
              </span>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="new_user_phone"
                  autoComplete="off"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all"
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Role</label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  disabled={loading}
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-bold uppercase outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all cursor-pointer"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            {/* Admin Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Admin Email</label>
              <input
                type="email"
                name="new_user_email"
                autoComplete="off"
                placeholder="e.g. owner@mybusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="new_user_password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full text-xs px-4 py-3 pr-10 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Confirm Password</label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="new_user_confirm_password"
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className={`w-full text-xs px-4 py-3 pr-10 rounded-xl border bg-gray-50/50 text-gray-900 font-semibold outline-none focus:bg-white transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10'
                      : confirmPassword && confirmPassword === password
                      ? 'border-emerald-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10'
                      : 'border-gray-200 focus:border-[#C0181A] focus:ring-4 focus:ring-[#C0181A]/10'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#C0181A] to-[#8B0000] hover:from-[#A01012] hover:to-[#6B0000] text-white font-extrabold text-xs py-4 rounded-2xl uppercase tracking-wider transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Profile...</span>
                </>
              ) : (
                <span>{getBusinessSubmitText()}</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <Link
              href="/admin/login"
              className="inline-block text-xs font-extrabold text-gray-500 hover:text-[#C0181A] transition-colors uppercase tracking-wider"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
