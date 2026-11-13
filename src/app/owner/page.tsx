'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import InfluencerDetailModal from '@/components/influencers/InfluencerDetailModal';
import {
  DollarSign,
  TrendingUp,
  Package,
  Send,
  CheckCircle2,
  Clock,
  Check,
  X,
  ExternalLink,
  Users,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function OwnerPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Action Notes
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);
  const [actionApproval, setActionApproval] = useState<any>(null); // { id, action: 'APPROVE' | 'REJECT' }
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        loadData();
      } else {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, infRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/influencers?stage=Awaiting approval&allTeam=true'),
      ]);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData);
      }

      if (infRes.ok) {
        const iData = await infRes.json();
        const pending = (iData.influencers || []).filter(
          (inf: any) => inf.approval && inf.approval.status === 'PENDING'
        );
        setPendingApprovals(pending);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async () => {
    if (!actionApproval) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${actionApproval.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionApproval.action,
          note: actionNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to submit decision');
        return;
      }

      setActionApproval(null);
      setActionNote('');
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) return null;

  const summary = analytics?.summary || {};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentUser={currentUser} allUsers={allUsers} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role={currentUser.role} />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                Owner Executive Overview
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Real-time commercial spend, approval decisions, and team conversion metrics.
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm self-start"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Section 1: Headline KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Outreach & Replies</span>
                <Send className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {summary.totalOutreach || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-bold text-emerald-600">{summary.repliesCount || 0}</span> replied
                ({summary.totalOutreach > 0 ? Math.round(((summary.repliesCount || 0) / summary.totalOutreach) * 100) : 0}% reply rate)
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Packages Shipped</span>
                <Package className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {summary.shippedCount || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-bold text-indigo-600">{summary.packagesAgreedCount || 0}</span> agreed in pipeline
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Deliverables</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {summary.deliverablesReceived || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-bold text-amber-600">{summary.deliverablesPending || 0}</span> pending
                {summary.deliverablesOverdue > 0 && (
                  <span className="text-rose-600 font-bold ml-1">({summary.deliverablesOverdue} overdue)</span>
                )}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Commercial Spend</span>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                PKR {(summary.approvedSpend || 0).toLocaleString()}
              </p>
              <p className="text-xs text-amber-600 font-bold mt-1">
                PKR {(summary.pendingSpend || 0).toLocaleString()} pending approval
              </p>
            </div>
          </div>

          {/* Section 2: Priority Approvals Queue */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-serif font-bold text-slate-900">
                  Paid Collaborations Approvals Queue
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingApprovals.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Paid influencers are hard-blocked from dispatch until approved.
              </p>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="text-sm font-bold text-slate-700">Approvals Queue is Clear!</p>
                <p className="text-xs text-slate-400">All paid influencer requests have been reviewed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.map((inf) => (
                  <div
                    key={inf.id}
                    className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{inf.name}</h3>
                          <a
                            href={`https://instagram.com/${inf.igHandle.replace('@', '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-rose-600 hover:underline font-semibold flex items-center gap-1 mt-0.5"
                          >
                            {inf.igHandle}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 font-medium block">Proposed Fee</span>
                          <span className="text-base font-extrabold text-amber-900">
                            PKR {inf.approval?.amount?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-200/60 text-xs">
                        <div>
                          <span className="text-slate-500">Package: </span>
                          <span className="font-semibold text-slate-800">{inf.prPackage}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Followers: </span>
                          <span className="font-semibold text-slate-800">
                            {inf.followerCount?.toLocaleString()}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500">Deliverables: </span>
                          <span className="font-semibold text-slate-800">
                            {inf.deliverables?.map((d: any) => d.type).join(', ') || '1 Reel + 1 Story'}
                          </span>
                        </div>
                        <div className="col-span-2 text-slate-500">
                          Requested by <span className="font-bold text-slate-700">{inf.assignedTo?.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                      <button
                        onClick={() =>
                          setActionApproval({
                            id: inf.approval.id,
                            influencerName: inf.name,
                            amount: inf.approval.amount,
                            action: 'APPROVE',
                          })
                        }
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          setActionApproval({
                            id: inf.approval.id,
                            influencerName: inf.name,
                            amount: inf.approval.amount,
                            action: 'REJECT',
                          })
                        }
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Per-Executor Performance Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-serif font-bold text-slate-900">
                  Team Performance & Conversion
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Weekly Target: Maintain 15+ assigned deals and follow up within 30 days
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Team Member</th>
                    <th className="px-4 py-3">Outreached</th>
                    <th className="px-4 py-3">Agreed Deals</th>
                    <th className="px-4 py-3">Conversion %</th>
                    <th className="px-4 py-3">Shipped</th>
                    <th className="px-4 py-3">Content Received</th>
                    <th className="px-4 py-3">Overdue Posts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(analytics?.executorPerformance || []).map((exec: any) => (
                    <tr key={exec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {exec.name.charAt(0)}
                        </div>
                        <span>{exec.name}</span>
                        {exec.name === 'Amna' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                            Lead
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{exec.outreachVolume}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{exec.packagesAgreed}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-600">{exec.conversionRate}%</span>
                      </td>
                      <td className="px-4 py-3">{exec.packagesShipped}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-700">{exec.deliverablesReceived}</span>
                        <span className="text-slate-400 ml-1">/ {exec.deliverablesPending + exec.deliverablesReceived}</span>
                      </td>
                      <td className="px-4 py-3">
                        {exec.deliverablesOverdue > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {exec.deliverablesOverdue} Overdue
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Decision Note Modal */}
      {actionApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-serif font-bold text-slate-900">
              {actionApproval.action === 'APPROVE' ? 'Approve Spend' : 'Reject Collaboration'}
            </h3>
            <p className="text-xs text-slate-600">
              {actionApproval.action === 'APPROVE'
                ? `Confirming approval of PKR ${actionApproval.amount.toLocaleString()} for ${actionApproval.influencerName}. This will advance the package into the Manager dispatch queue.`
                : `Rejecting collaboration request for ${actionApproval.influencerName}. The influencer will be moved to "Removed / on hold".`}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Feedback Note (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Reason or guidance for the executor..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActionApproval(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDecision}
                disabled={submitting}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm ${
                  actionApproval.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Submitting...' : `Confirm ${actionApproval.action === 'APPROVE' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
