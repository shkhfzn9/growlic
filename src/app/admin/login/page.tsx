'use client';

import React, { useState, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '@/redux/authSlice';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

function LoginForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      dispatch(
        loginSuccess({
          token: data.token,
          restaurantId: data.restaurantId,
          restaurantName: data.restaurantName,
          email: data.email,
        })
      );

      const redirectUrl = searchParams.get('redirect') || '/admin/dashboard';
      router.push(redirectUrl);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C2333] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1C2333] to-[#111827]" />
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#C0181A]/5 to-transparent" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Growlic</h1>
          <p className="text-white/50 text-sm mt-1">Admin Panel</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-[#111827] text-center mb-1">Welcome Back</h2>
          <p className="text-[#6B7280] text-sm text-center mb-6">Sign in to manage your restaurant</p>

          {error && (
            <div className="bg-[#FEF2F2] text-[#DC2626] text-sm font-medium rounded-lg p-3 mb-4 border border-[#DC2626]/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Email</label>
              <input
                type="email"
                placeholder="admin@growlic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-[#F4F6F9] border border-[#E2E6EA] rounded-lg px-4 py-3 text-sm text-[#111827] outline-none transition-colors focus:border-[#C0181A] focus:ring-2 focus:ring-[#C0181A]/20 placeholder:text-[#6B7280]/60"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#F4F6F9] border border-[#E2E6EA] rounded-lg px-4 py-3 pr-11 text-sm text-[#111827] outline-none transition-colors focus:border-[#C0181A] focus:ring-2 focus:ring-[#C0181A]/20 placeholder:text-[#6B7280]/60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C0181A] text-white font-semibold text-sm py-3 rounded-lg mt-2 hover:bg-[#A01416] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#C0181A]/30"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E2E6EA] text-center">
            <span className="text-xs text-[#6B7280] block mb-2">Want to register a new restaurant?</span>
            <Link href="/admin/register" className="text-[#C0181A] font-semibold text-sm hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1C2333] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
