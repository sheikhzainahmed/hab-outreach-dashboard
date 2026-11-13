'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Search,
} from 'lucide-react';

function OwnerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'overview';

  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'performance'>(
    tabParam === 'approvals' ? 'approvals' : tabParam === 'performance' ? 'performance' : 'overview'
  );

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [execSearch, setExecSearch] = useState('');

  // Modals & Action Notes
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);
  const [actionApproval, setActionApproval] = useState<any>(null); // { id, action: 'APPROVE' | 'REJECT' }
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tabParam === 'approvals' || tabParam === 'performance' || tabParam === 'overview') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    fetchSession();
  }, []);

  const handleTabChange = (tab: 'overview' | 'approvals' | 'performance') => {
    setActiveTab(tab);
    if (tab === 'overview') router.push('/owner');
    else router.push(`/owner?tab=${tab}`);
  };

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
  const rawExecList = analytics?.executorPerformance || [];
  const filteredExecutors = rawExecList.filter((e: any) =>
    e.name.toLowerCase().includes(execSearch.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(execSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentUser={currentUser} allUsers={allUsers} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role={currentUser.role} />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                Owner Executive Center
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

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-slate-200 gap-1 sm:gap-2">
            <button
              onClick={() => handleTabChange('overview')}
              className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'text-amber-800 border-b-2 border-amber-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-amber-600" />
              <span>Executive Overview</span>
            </button>

            <button
              onClick={() => handleTabChange('approvals')}
              className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'approvals'
                  ? 'text-amber-800 border-b-2 border-amber-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-rose-600" />
              <span>Approvals Queue</span>
              {pendingApprovals.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingApprovals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('performance')}
              className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'performance'
                  ? 'text-amber-800 border-b-2 border-amber-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Team Performance</span>
            </button>
          </div>

          {/* Headline KPI Cards */}
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
                <span className="text-xs font-bold uppercase tracking-wider">Agreed Deals</span>
                <Package className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {summary.packagesAgreedCount || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-bold text-purple-600">{summary.shippedCount || 0}</span> dispatched
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Content Return</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {summary.contentReceivedCount || 0}
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

          {/* Approvals Section */}
          {(activeTab === 'overview' || activeTab === 'approvals') && (
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
                <div className="py-10 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">All paid collaborations approved!</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    No requests waiting in the priority queue right now.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-4 py-3">Influencer</th>
                        <th className="px-4 py-3">Followers</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Deliverable Requested</th>
                        <th className="px-4 py-3">Fee / Cost</th>
                        <th className="px-4 py-3">Executor</th>
                        <th className="px-4 py-3 text-right">Owner Sign-off</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pendingApprovals.map((inf) => {
                        const fee = inf.amount || inf.approval?.amount || 0;
                        const deliverable = inf.deliverables?.[0]?.type || 'Post';
                        return (
                          <tr key={inf.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedInfluencer(inf)}
                                className="font-bold text-slate-900 hover:text-rose-600 text-left transition-colors"
                              >
                                {inf.name}
                              </button>
                              <div className="text-[11px] text-rose-600 font-semibold">{inf.igHandle}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{inf.followerCount.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                {inf.category || 'Lifestyle'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-800 font-semibold">{deliverable}</td>
                            <td className="px-4 py-3 font-bold text-amber-700">
                              PKR {fee.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{inf.assignedTo?.name || 'Unassigned'}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() =>
                                    setActionApproval({
                                      id: inf.approval.id,
                                      action: 'APPROVE',
                                      amount: fee,
                                      influencerName: inf.name,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() =>
                                    setActionApproval({
                                      id: inf.approval.id,
                                      action: 'REJECT',
                                      amount: fee,
                                      influencerName: inf.name,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Team Performance Section */}
          {(activeTab === 'overview' || activeTab === 'performance') && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <h2 className="text-lg font-serif font-bold text-slate-900">
                      Team Performance & Conversion
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Weekly Target: Maintain 15+ assigned deals and follow up within 30 days.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search team member..."
                    value={execSearch}
                    onChange={(e) => setExecSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-48 sm:w-60"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Team Member</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Outreached</th>
                      <th className="px-4 py-3">Agreed Deals</th>
                      <th className="px-4 py-3">Conversion %</th>
                      <th className="px-4 py-3">Shipped</th>
                      <th className="px-4 py-3">Content Received</th>
                      <th className="px-4 py-3">Overdue Posts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredExecutors.map((exec: any) => (
                      <tr key={exec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                            {exec.name.charAt(0)}
                          </div>
                          <span>{exec.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            exec.role === 'COORDINATOR'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : exec.role === 'MANAGER'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : exec.name === 'Amna'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            {exec.role === 'COORDINATOR' ? 'Coordinator' : exec.name === 'Amna' ? 'Lead' : exec.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{exec.outreachVolume}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{exec.packagesAgreed}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-emerald-600">{exec.conversionRate}%</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{exec.packagesShipped}</td>
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
          )}
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

      {/* Influencer Detail Modal */}
      {selectedInfluencer && (
        <InfluencerDetailModal
          influencer={selectedInfluencer}
          currentUser={currentUser}
          isOpen={true}
          onClose={() => setSelectedInfluencer(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

export default function OwnerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading Owner Overview...</div>}>
      <OwnerPageContent />
    </Suspense>
  );
}
