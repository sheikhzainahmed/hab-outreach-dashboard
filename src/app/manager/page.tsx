'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import InfluencerDetailModal from '@/components/influencers/InfluencerDetailModal';
import {
  Truck,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  MapPin,
  Phone,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { DISPATCH_STATUSES } from '@/lib/constants';

export default function ManagerPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>({ stuck: [], overdue: [], incomplete: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('Ready');
  const [copiedToast, setCopiedToast] = useState(false);

  // Detail Modal & Tracking Update Modal
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);
  const [editingDispatch, setEditingDispatch] = useState<any>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadDispatches();
      loadHealthAndAnalytics();
    }
  }, [currentUser, statusFilter]);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setAllUsers(data.allUsers || []);
      } else {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDispatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dispatch?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setDispatches(data.dispatches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthAndAnalytics = async () => {
    try {
      const [analyticsRes, allInfRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/influencers?allTeam=true'),
      ]);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData);
      }

      if (allInfRes.ok) {
        const iData = await allInfRes.json();
        const infs = iData.influencers || [];
        const now = new Date();

        // 1. Stuck records: Ready to ship for more than 3 days
        const stuck = infs.filter((i: any) => {
          if (i.stage === 'Ready to ship') {
            const daysSince = Math.floor((now.getTime() - new Date(i.updatedAt).getTime()) / (1000 * 3600 * 24));
            return daysSince >= 3;
          }
          return false;
        });

        // 2. Overdue deliverables
        const overdue = infs.filter((i: any) =>
          i.deliverables?.some((d: any) => !d.received && d.dueDate && new Date(d.dueDate) < now)
        );

        // 3. Incomplete entries
        const incomplete = infs.filter(
          (i: any) => !i.address || i.address === 'TBD' || !i.phone || i.phone === '03001234567'
        );

        setHealthData({ stuck, overdue, incomplete });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdvanceStatus = async (dispatchId: string, currentStatus: string) => {
    let nextStatus = 'Sent to ops';
    if (currentStatus === 'Ready') nextStatus = 'Sent to ops';
    else if (currentStatus === 'Sent to ops') nextStatus = 'Shipped';
    else if (currentStatus === 'Shipped') nextStatus = 'Delivered';
    else return;

    try {
      const res = await fetch('/api/dispatch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dispatchId, status: nextStatus }),
      });
      if (res.ok) {
        loadDispatches();
        loadHealthAndAnalytics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTracking = async () => {
    if (!editingDispatch) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDispatch.id,
          trackingNumber: trackingInput.trim() || undefined,
          shippingNotes: notesInput.trim() || undefined,
        }),
      });
      if (res.ok) {
        setEditingDispatch(null);
        setTrackingInput('');
        setNotesInput('');
        loadDispatches();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportOpsClipboard = async () => {
    try {
      const res = await fetch('/api/dispatch/export?status=Ready&format=json');
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.clipboardText);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3000);
      }
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentUser={currentUser} allUsers={allUsers} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role={currentUser.role} />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                Manager Operations & Dispatch Center
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Oversee pipeline health, dispatch ready-to-ship packages, and export directly to the Ops sheet.
              </p>
            </div>

            {/* 1-Click Operations Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportOpsClipboard}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm flex items-center gap-1.5 transition-all"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    Copy for Ops Sheet
                  </>
                )}
              </button>

              <a
                href="/api/dispatch/export?status=Ready&format=csv"
                download
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-200 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Ops CSV
              </a>
            </div>
          </div>

          {/* Toast Notification */}
          {copiedToast && (
            <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span>
                Formatted TSV copied! You can now paste straight into the Operations Manager&apos;s Google Sheet (NAME, Address, Number, Pro, Amount, Qty, City, Order).
              </span>
              <button onClick={() => setCopiedToast(false)}>
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Section 1: Operational Health Monitor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center justify-between text-amber-900 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Stuck Packages</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-950">{healthData.stuck.length}</p>
              <p className="text-xs text-amber-700 mt-1">
                Ready to ship for &gt; 3 days without dispatch hand-off
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
              <div className="flex items-center justify-between text-rose-900 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Overdue Deliverables</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-rose-950">{healthData.overdue.length}</p>
              <p className="text-xs text-rose-700 mt-1">
                Content pending past the 7-day post-delivery SLA
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Incomplete Entries</span>
                <ShieldAlert className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{healthData.incomplete.length}</p>
              <p className="text-xs text-slate-600 mt-1">
                Records missing required phone numbers or full address
              </p>
            </div>
          </div>

          {/* Section 2: Dispatch Queue */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-serif font-bold text-slate-900">
                    Dispatch Fulfilment Queue
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Advance packages through Ready &rarr; Sent to Ops &rarr; Shipped &rarr; Delivered.
                </p>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {['Ready', 'Sent to ops', 'Shipped', 'Delivered', 'all'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${
                      statusFilter === st
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st === 'all' ? 'All Packages' : st}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : dispatches.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-1.5">
                <Package className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No packages in this queue</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Recipient & Handle</th>
                      <th className="px-4 py-3">Shipping Address</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Package Contents</th>
                      <th className="px-4 py-3">Dispatch Status</th>
                      <th className="px-4 py-3">Tracking ID</th>
                      <th className="px-4 py-3 text-right">Advance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dispatches.map((d) => {
                      const inf = d.influencer;
                      return (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{inf.shippingName || inf.name}</div>
                            <div className="text-[11px] text-rose-600 font-semibold">{inf.igHandle}</div>
                          </td>
                          <td className="px-4 py-3 max-w-xs text-slate-600 truncate" title={inf.address}>
                            {inf.address}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{inf.phone}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate">
                            {inf.products || inf.prPackage}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              d.status === 'Ready'
                                ? 'bg-purple-100 text-purple-800'
                                : d.status === 'Sent to ops'
                                ? 'bg-amber-100 text-amber-800'
                                : d.status === 'Shipped'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {d.trackingNumber ? (
                              <button
                                onClick={() => {
                                  setEditingDispatch(d);
                                  setTrackingInput(d.trackingNumber || '');
                                  setNotesInput(d.shippingNotes || '');
                                }}
                                className="font-mono text-purple-700 hover:underline font-bold"
                              >
                                {d.trackingNumber}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingDispatch(d);
                                  setTrackingInput('');
                                  setNotesInput('');
                                }}
                                className="text-slate-400 hover:text-purple-600 italic text-[11px]"
                              >
                                + Add Tracking
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {d.status !== 'Delivered' ? (
                              <button
                                onClick={() => handleAdvanceStatus(d.id, d.status)}
                                className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-colors"
                              >
                                {d.status === 'Ready'
                                  ? 'Send to Ops'
                                  : d.status === 'Sent to ops'
                                  ? 'Mark Shipped'
                                  : 'Mark Delivered'}
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-bold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Delivered
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Tracking Number Modal */}
      {editingDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900">
              Update Parcel Tracking Info
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tracking Number / Courier Slip ID
              </label>
              <input
                type="text"
                placeholder="e.g. 127164866"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shipping Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. TCS / Leopard / Trax"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingDispatch(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTracking}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Tracking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
