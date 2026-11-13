'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  BarChart3,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  Award,
  ArrowRight,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setAllUsers(data.allUsers || []);
        loadAnalytics();
      } else {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  const funnel = analytics?.funnel || [];
  const packages = analytics?.packageBreakdown || [];
  const summary = analytics?.summary || {};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentUser={currentUser} allUsers={allUsers} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role={currentUser.role} />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                Outreach Analytics & Reporting
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Conversion funnel drop-off, campaign ROI, and PR package performance.
              </p>
            </div>
            <button
              onClick={loadAnalytics}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Section 1: Outreach Conversion Funnel */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-rose-600" />
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Outreach Conversion Funnel
              </h2>
            </div>

            <div className="space-y-4">
              {funnel.map((step: any, idx: number) => {
                const maxCount = funnel[0]?.count || 1;
                const widthPercent = Math.max(12, Math.round((step.count / maxCount) * 100));

                return (
                  <div key={step.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>
                        {idx + 1}. {step.name}
                      </span>
                      <span>
                        {step.count} creators ({step.rate}% conversion)
                      </span>
                    </div>
                    <div className="h-8 bg-slate-100 rounded-xl overflow-hidden flex items-center p-1">
                      <div
                        style={{ width: `${widthPercent}%` }}
                        className={`h-full rounded-lg transition-all flex items-center px-3 text-xs font-bold text-white shadow-sm ${
                          idx === 0
                            ? 'bg-blue-600'
                            : idx === 1
                            ? 'bg-sky-500'
                            : idx === 2
                            ? 'bg-amber-500'
                            : idx === 3
                            ? 'bg-purple-600'
                            : 'bg-emerald-600'
                        }`}
                      >
                        {step.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: PR Package Analysis */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-serif font-bold text-slate-900">
                PR Package Distribution & Content Return
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Package / Bundle</th>
                    <th className="px-4 py-3">Total Agreed</th>
                    <th className="px-4 py-3">Dispatched</th>
                    <th className="px-4 py-3">Content Received</th>
                    <th className="px-4 py-3">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {packages.slice(0, 10).map((pkg: any) => (
                    <tr key={pkg.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{pkg.name}</td>
                      <td className="px-4 py-3">{pkg.total}</td>
                      <td className="px-4 py-3">{pkg.shipped}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{pkg.contentReceived}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-600">{pkg.completionRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
