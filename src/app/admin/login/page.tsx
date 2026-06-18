'use client';

import React, { useState, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '@/redux/authSlice';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      // Dispatch success details
      dispatch(
        loginSuccess({
          token: data.token,
          restaurantId: data.restaurantId,
          restaurantName: data.restaurantName,
          email: data.email,
        })
      );

      // Determine redirect URL
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom">
      <div className="w-full max-w-sm border border-black p-8 bg-white">
        {/* Header */}
        <div className="border-b border-black pb-4 mb-6 text-center">
          <h1 className="text-xl font-bold uppercase tracking-tighter">Admin Login</h1>
          <span className="text-[10px] text-zinc-500 uppercase">Restaurant QR Ordering System</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase mb-4">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase">Email</label>
            <input
              type="email"
              placeholder="admin@growlic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full text-xs font-mono-custom"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full text-xs font-mono-custom"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="border-2 border-black w-full py-2.5 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'LOGGING IN...' : '[ LOGIN ]'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="font-mono-custom text-xs text-center p-8">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
