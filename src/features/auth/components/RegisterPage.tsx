'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [designation, setDesignation] = useState('owner');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      setError('The selected Restaurant ID is already taken. Please choose another one.');
      return;
    }

    if (!name.trim() || !slug.trim() || !email.trim() || !password.trim() || !phone.trim() || !designation) {
      setError('Please fill in all fields.');
      return;
    }

    if (slug.length < 3) {
      setError('Restaurant ID slug must be at least 3 characters.');
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
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom text-center">
        <div className="w-full max-w-md border border-black p-8 bg-white flex flex-col gap-6 shadow-md">
          {/* Success Header */}
          <div className="border-b border-black pb-4 text-center">
            <h1 className="text-xl font-bold uppercase tracking-tight">Registration Complete!</h1>
            <span className="text-[10px] text-zinc-500 uppercase">Restaurant Multi-Tenant System</span>
          </div>

          <p className="text-xs text-zinc-655 text-left leading-relaxed">
            Your restaurant <strong>{name.toUpperCase()}</strong> (ID: <code>{slug}</code>) has been successfully registered on the platform!
          </p>

          <div className="border border-dashed border-black p-4 bg-zinc-50 text-left text-xs space-y-2 uppercase">
            <strong className="text-[10px] text-black">🚀 Seeding Complete:</strong>
            <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[10px] normal-case">
              <li>Created default menu items (Veg Steamed Momos, Chicken Fried Momos, Soda, Spicy Noodles).</li>
              <li>Setup initial 10% Discount Tier rule at ₹399.</li>
              <li>Setup default category pairing rules and a 50% discount combo rule.</li>
            </ul>
          </div>

          <p className="text-[11px] text-zinc-500 text-left leading-relaxed">
            You can now immediately scan your table QR code to start receiving test orders, or log in to the admin panel to update your custom pricing and menu dishes.
          </p>

          <Link
            href="/admin/login"
            className="border-2 border-black w-full py-3 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all cursor-pointer text-center"
          >
            [ LOG IN TO YOUR PANEL ]
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom">
      <div className="w-full max-w-md border border-black p-5 sm:p-8 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-black pb-4 mb-6 text-center">
          <h1 className="text-xl font-bold uppercase tracking-tighter">Register Restaurant</h1>
          <span className="text-[10px] text-zinc-500 uppercase">Onboard your restaurant to Growlic platform</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase mb-4">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Restaurant Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase">Restaurant Name</label>
            <input
              type="text"
              placeholder="e.g. Srinagar Dumpling House"
              value={name}
              onChange={handleNameChange}
              disabled={loading}
              className="w-full text-xs font-mono-custom"
              required
              autoFocus
            />
          </div>

          {/* Restaurant ID (Slug) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase">Restaurant ID / URL Slug</label>
              {slug.length >= 3 && (
                <span className="text-[9px] font-bold uppercase">
                  {slugChecking ? (
                    <span className="text-zinc-500">Checking...</span>
                  ) : slugAvailable === true ? (
                    <span className="text-green-600">✔ Available</span>
                  ) : slugAvailable === false ? (
                    <span className="text-red-650">❌ Already Taken</span>
                  ) : null}
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. srinagar-dumplings"
              value={slug}
              onChange={handleSlugChange}
              disabled={loading}
              className={`w-full text-xs font-mono-custom lowercase ${
                slugAvailable === true ? 'border-green-600 focus:border-green-600' :
                slugAvailable === false ? 'border-red-650 focus:border-red-650' : ''
              }`}
              required
            />
            <span className="text-[9px] text-zinc-400 uppercase leading-normal">
              Used in table QR URLs: <code>growlic.com/menu/{slug || 'your-slug'}</code>
            </span>
          </div>

          {/* Contact details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">Phone Number</label>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                className="w-full text-xs font-mono-custom"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">Designation</label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                disabled={loading}
                className="w-full text-xs border border-black p-2 bg-white rounded-none uppercase font-mono-custom"
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase">Admin Email</label>
            <input
              type="email"
              placeholder="manager@myrestaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full text-xs font-mono-custom"
              required
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase">Password</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full text-xs font-mono-custom pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-black cursor-pointer bg-transparent border-0 focus:outline-none flex items-center justify-center"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="border-2 border-black w-full py-2.5 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'CREATING PROFILE...' : '[ REGISTER RESTAURANT ]'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-dashed border-black/20 text-center font-mono-custom">
          <Link
            href="/admin/login"
            className="inline-block text-xs font-bold uppercase underline hover:no-underline hover:text-zinc-650 transition-colors"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
