'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, Shield, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (loginEmail?: string) => {
    setError(null);
    setLoading(true);

    const targetEmail = loginEmail || email;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      if (data.user.role === 'OWNER') router.push('/owner');
      else if (data.user.role === 'MANAGER') router.push('/manager');
      else if (data.user.role === 'OPERATIONS') router.push('/operations');
      else router.push('/executor');

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { name: 'Humza', role: 'Director', email: 'humza@hiraalibeauty.com', color: 'from-amber-500 to-orange-600' },
    { name: 'Zain', role: 'Manager', email: 'zain@hiraalibeauty.com', color: 'from-purple-600 to-indigo-600' },
    { name: 'Ali', role: 'Operations', email: 'ali@hiraalibeauty.com', color: 'from-teal-600 to-emerald-600' },
    { name: 'Huzaifa', role: 'Coordinator', email: 'huzaifa@hiraalibeauty.com', color: 'from-blue-600 to-cyan-600' },
    { name: 'Amna', role: 'Executor', email: 'amna@hiraalibeauty.com', color: 'from-rose-500 to-pink-600' },
    { name: 'Fatima', role: 'Executor', email: 'fatima@hiraalibeauty.com', color: 'from-rose-500 to-pink-600' },
    { name: 'Minahil', role: 'Executor', email: 'minahil@hiraalibeauty.com', color: 'from-rose-500 to-pink-600' },
    { name: 'Sophia', role: 'Executor', email: 'sophia@hiraalibeauty.com', color: 'from-rose-500 to-pink-600' },
    { name: 'Maryam', role: 'Executor', email: 'maryam@hiraalibeauty.com', color: 'from-rose-500 to-pink-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 animate-in fade-in zoom-in-95">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-900/30 mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            Hira Ali Beauty
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            HAB Outreach & PR Fulfilment Dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="name@hiraalibeauty.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Fast Login for Testing Roles */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick 1-Click Role Profiles (Seed Accounts)
          </p>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  handleLogin(acc.email);
                }}
                className="p-2 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 transition-all text-left flex items-center gap-2 text-xs"
              >
                <div
                  className={`w-6 h-6 rounded-lg bg-gradient-to-br ${acc.color} text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm`}
                >
                  {acc.name.charAt(0)}
                </div>
                <div className="truncate">
                  <p className="font-bold text-slate-900 leading-tight truncate">{acc.name}</p>
                  <p className="text-[10px] text-slate-500">{acc.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
