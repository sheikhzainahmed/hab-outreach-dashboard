'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
  MessageSquare,
  Database,
  CreditCard,
  Download,
  Copy,
  Building,
  Upload,
  FileSpreadsheet,
  Percent,
} from 'lucide-react';

function OwnerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'overview';

  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'payments' | 'performance'>(
    tabParam === 'approvals' ? 'approvals' : tabParam === 'payments' ? 'payments' : tabParam === 'performance' ? 'performance' : 'overview'
  );

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [payableData, setPayableData] = useState<any>({ summary: {}, payables: [] });
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'advance_due' | 'completion_due' | 'paid'>('all');
  const [loading, setLoading] = useState(true);
  const [execSearch, setExecSearch] = useState('');

  // Modals & Action Notes
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);
  const [actionApproval, setActionApproval] = useState<any>(null); // { id, action: 'APPROVE' | 'REJECT' | 'NOTE' }
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Payment Payout Modal
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; item: any; action: 'MARK_ADVANCE_PAID' | 'MARK_FULLY_PAID' } | null>(null);
  const [paymentProofRef, setPaymentProofRef] = useState('');
  const [paymentProofNotes, setPaymentProofNotes] = useState('');
  const [paymentUpdating, setPaymentUpdating] = useState(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam === 'approvals' || tabParam === 'payments' || tabParam === 'performance' || tabParam === 'overview') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    fetchSession();
  }, []);

  const handleTabChange = (tab: 'overview' | 'approvals' | 'payments' | 'performance') => {
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
      const [analyticsRes, infRes, payRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/influencers?stage=Awaiting approval&allTeam=true'),
        fetch('/api/payments?filter=all'),
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

      if (payRes.ok) {
        const pData = await payRes.json();
        setPayableData(pData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentModal) return;
    setPaymentUpdating(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencerId: paymentModal.item.id,
          action: paymentModal.action,
          paymentProofUrl: paymentProofRef.trim() || undefined,
          paymentNotes: paymentProofNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to update payment');
        return;
      }

      setPaymentModal(null);
      setPaymentProofRef('');
      setPaymentProofNotes('');
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Error updating payment status');
    } finally {
      setPaymentUpdating(false);
    }
  };

  const handleCopyBank = (text: string, id: string) => {
    if (!text || text === 'Not Provided') return;
    navigator.clipboard.writeText(text);
    setCopiedBankId(id);
    setTimeout(() => setCopiedBankId(null), 1800);
  };

  const filteredPayables = useMemo(() => {
    const list = payableData?.payables || [];
    if (paymentFilter === 'advance_due') {
      return list.filter((p: any) => p.isApproved && p.paymentStage === 'Advance Payment Due');
    }
    if (paymentFilter === 'completion_due') {
      return list.filter((p: any) => p.isApproved && p.paymentStage === 'Work Complete Due');
    }
    if (paymentFilter === 'paid') {
      return list.filter((p: any) => p.paymentStatus === 'FULLY_PAID' || p.paymentStatus === 'ADVANCE_PAID');
    }
    return list;
  }, [payableData?.payables, paymentFilter]);

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
                Executive Leadership Center
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Real-time commercial spend, approval decisions, and team conversion metrics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/backup"
                download
                title="Download complete JSON snapshot of all creators, dispatches, and users"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                Full DB Backup
              </a>
              <button
                onClick={loadData}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
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
              onClick={() => handleTabChange('payments')}
              className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'payments'
                  ? 'text-amber-800 border-b-2 border-amber-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Approved &amp; Payable Sheet</span>
              {((payableData?.summary?.advanceDueCount || 0) + (payableData?.summary?.completionDueCount || 0)) > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {(payableData?.summary?.advanceDueCount || 0) + (payableData?.summary?.completionDueCount || 0)} Due
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
                        <th className="px-4 py-3 text-right">Executive Sign-off</th>
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
                            <td className="px-4 py-3 text-slate-800 font-semibold">
                              <div>{deliverable}</div>
                              {inf.approval?.note && (
                                <div className="mt-1 text-[11px] font-normal text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200 inline-flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span className="truncate max-w-[180px]">Note: "{inf.approval.note}"</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-amber-700">
                                PKR {fee.toLocaleString()}
                              </div>
                              {inf.paymentTerms && (
                                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                  {inf.paymentTerms}
                                </div>
                              )}
                              {inf.bankName && (
                                <div className="text-[10px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-flex items-center gap-1 font-mono">
                                  <Building className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate max-w-[170px]">{inf.bankName} - {inf.accountTitle || ''}</span>
                                </div>
                              )}
                              {inf.doNotShip && (
                                <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 mt-1 block font-bold">
                                  No Dispatch (Payment Only)
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{inf.assignedTo?.name || 'Unassigned'}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setActionNote(inf.approval?.note || '');
                                    setActionApproval({
                                      id: inf.approval.id,
                                      action: 'NOTE',
                                      amount: fee,
                                      influencerName: inf.name,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors"
                                  title="Add guidance or feedback for executor"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Note
                                </button>
                                <button
                                  onClick={() => {
                                    setActionNote('');
                                    setActionApproval({
                                      id: inf.approval.id,
                                      action: 'APPROVE',
                                      amount: fee,
                                      influencerName: inf.name,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setActionNote('');
                                    setActionApproval({
                                      id: inf.approval.id,
                                      action: 'REJECT',
                                      amount: fee,
                                      influencerName: inf.name,
                                    });
                                  }}
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

          {/* Approved & Payable Sheet Section */}
          {(activeTab === 'overview' || activeTab === 'payments') && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
                      Approved &amp; Payable Sheet
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {filteredPayables.length} Listed
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bank details, advance payouts, work completion payments, and 1-click accounting export.
                    </p>
                  </div>
                </div>

                {/* 1-Click Export for Online Banking / Accounts */}
                <div className="flex items-center gap-2">
                  <a
                    href="/api/payments?format=csv"
                    download
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-200 flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Payment Sheet (CSV / Excel)
                  </a>
                </div>
              </div>

              {/* Payment Summary KPI Mini-cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Approved Spend
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    PKR {(payableData.summary?.totalCommittedPkr || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {payableData.summary?.approvedCollabs || 0} approved collaborations
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    Advance Payments Due
                  </span>
                  <p className="text-lg font-bold text-amber-900 mt-0.5">
                    PKR {(payableData.summary?.advanceDueAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5 font-semibold">
                    {payableData.summary?.advanceDueCount || 0} creators awaiting advance
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    Work Complete Payments Due
                  </span>
                  <p className="text-lg font-bold text-blue-900 mt-0.5">
                    PKR {(payableData.summary?.completionDueAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-blue-700 mt-0.5 font-semibold">
                    {payableData.summary?.completionDueCount || 0} content posts verified
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Total Disbursed / Paid
                  </span>
                  <p className="text-lg font-bold text-emerald-900 mt-0.5">
                    PKR {(payableData.summary?.fullyPaidAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5 font-semibold">
                    {payableData.summary?.fullyPaidCount || 0} fully settled
                  </p>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setPaymentFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    paymentFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({payableData.payables?.length || 0})
                </button>
                <button
                  onClick={() => setPaymentFilter('advance_due')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    paymentFilter === 'advance_due'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Advance Due ({payableData.summary?.advanceDueCount || 0})
                </button>
                <button
                  onClick={() => setPaymentFilter('completion_due')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    paymentFilter === 'completion_due'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  Work Complete Due ({payableData.summary?.completionDueCount || 0})
                </button>
                <button
                  onClick={() => setPaymentFilter('paid')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    paymentFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Settled / Paid ({payableData.summary?.fullyPaidCount || 0})
                </button>
              </div>

              {/* Payable Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3 min-w-[150px]">Creator</th>
                      <th className="px-4 py-3 min-w-[200px]">Bank Details</th>
                      <th className="px-3 py-3 min-w-[90px]">Fee (PKR)</th>
                      <th className="px-3 py-3 min-w-[120px]">Terms / Split</th>
                      <th className="px-4 py-3 min-w-[150px]">Payment Stage</th>
                      <th className="px-3 py-3 min-w-[90px]">Content</th>
                      <th className="px-3 py-3 min-w-[90px]">Executor</th>
                      <th className="px-4 py-3 min-w-[140px] text-right">Payout Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPayables.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          No collaborations in this payable filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPayables.map((item: any) => {
                        const isAdvanceDue = item.isApproved && item.paymentStage === 'Advance Payment Due';
                        const isCompletionDue = item.isApproved && item.paymentStage === 'Work Complete Due';
                        const isFullyPaid = item.paymentStatus === 'FULLY_PAID';
                        const isAdvancePaid = item.paymentStatus === 'ADVANCE_PAID';

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Creator */}
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedInfluencer(item)}
                                className="font-bold text-slate-900 hover:text-rose-600 text-left transition-colors"
                              >
                                {item.name}
                              </button>
                              <div className="text-[11px] text-rose-600 font-semibold">{item.igHandle}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.phone}</div>
                            </td>

                            {/* Bank Details */}
                            <td className="px-4 py-3">
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-800 flex items-center gap-1">
                                  <Building className="w-3 h-3 text-slate-400" />
                                  <span>{item.bankName}</span>
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  Title: <span className="font-semibold text-slate-800">{item.accountTitle}</span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-700 flex items-center gap-1.5">
                                  <span>{item.accountNumber}</span>
                                  {item.accountNumber && item.accountNumber !== 'Not Provided' && (
                                    <button
                                      onClick={() => handleCopyBank(item.accountNumber, item.id)}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                      title="Copy Account Number / IBAN"
                                    >
                                      {copiedBankId === item.id ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="px-3 py-3 font-bold text-slate-900">
                              PKR {item.amount.toLocaleString()}
                            </td>

                            {/* Payment Terms */}
                            <td className="px-3 py-3">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 block w-fit">
                                {item.paymentTerms}
                              </span>
                              {item.advancePercentage > 0 && (
                                <div className="text-[10px] text-slate-500 mt-1">
                                  Adv: PKR {item.advanceAmount.toLocaleString()} | Comp: PKR {item.completionAmount.toLocaleString()}
                                </div>
                              )}
                            </td>

                            {/* Payment Stage */}
                            <td className="px-4 py-3">
                              {isAdvanceDue && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  Advance Due: PKR {item.advanceAmount.toLocaleString()}
                                </span>
                              )}
                              {isCompletionDue && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  <CheckCircle2 className="w-3 h-3 text-blue-700" />
                                  Final Due: PKR {item.completionAmount.toLocaleString()}
                                </span>
                              )}
                              {isFullyPaid && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  Fully Settled
                                </span>
                              )}
                              {isAdvancePaid && !isCompletionDue && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                  <Clock className="w-3 h-3 text-teal-600" />
                                  Adv Paid • Awaiting Post
                                </span>
                              )}
                              {!item.isApproved && (
                                <span className="text-[11px] text-slate-400 italic">
                                  Awaiting Approval
                                </span>
                              )}
                            </td>

                            {/* Content Deliverable Status */}
                            <td className="px-3 py-3">
                              {item.deliverablesReceived ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Received
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  Pending Post
                                </span>
                              )}
                            </td>

                            {/* Executor */}
                            <td className="px-3 py-3 text-slate-600 text-xs">
                              {item.assignedTo}
                            </td>

                            {/* Action / Mark Paid */}
                            <td className="px-4 py-3 text-right">
                              {isFullyPaid ? (
                                <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>Paid</span>
                                  {item.paymentProofUrl && (
                                    <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded ml-1">
                                      {item.paymentProofUrl}
                                    </span>
                                  )}
                                </div>
                              ) : isAdvancePaid ? (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    Adv Paid (PKR {(item.advanceAmount || (item.amount * 0.5)).toLocaleString()})
                                  </span>
                                  <button
                                    onClick={() => {
                                      setPaymentProofRef('');
                                      setPaymentProofNotes('');
                                      setPaymentModal({ open: true, item, action: 'MARK_FULLY_PAID' });
                                    }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Mark Final Paid (PKR {(item.completionAmount || (item.amount * 0.5)).toLocaleString()})
                                  </button>
                                </div>
                              ) : item.advancePercentage > 0 ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setPaymentProofRef('');
                                      setPaymentProofNotes('');
                                      setPaymentModal({ open: true, item, action: 'MARK_ADVANCE_PAID' });
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 shadow-xs transition-all whitespace-nowrap"
                                  >
                                    Mark Adv Paid ({item.advancePercentage}%)
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPaymentProofRef('');
                                      setPaymentProofNotes('');
                                      setPaymentModal({ open: true, item, action: 'MARK_FULLY_PAID' });
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all whitespace-nowrap flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    Mark Full Paid
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setPaymentProofRef('');
                                    setPaymentProofNotes('');
                                    setPaymentModal({ open: true, item, action: 'MARK_FULLY_PAID' });
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm flex items-center gap-1.5 transition-all ml-auto"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Mark as Paid (PKR {item.amount.toLocaleString()})
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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

      {/* Decision / Feedback Note Modal */}
      {actionApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-serif font-bold text-slate-900">
              {actionApproval.action === 'APPROVE'
                ? 'Approve Spend'
                : actionApproval.action === 'REJECT'
                ? 'Reject Collaboration'
                : 'Add Instruction / Feedback Note'}
            </h3>
            <p className="text-xs text-slate-600">
              {actionApproval.action === 'APPROVE'
                ? `Confirming approval of PKR ${actionApproval.amount.toLocaleString()} for ${actionApproval.influencerName}. This will advance the package into the dispatch queue.`
                : actionApproval.action === 'REJECT'
                ? `Rejecting collaboration request for ${actionApproval.influencerName}. The influencer will be moved to "Removed / on hold".`
                : `Add a guidance or negotiation note for ${actionApproval.influencerName}. The collaboration stays pending and the executor is notified.`}
            </p>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {actionApproval.action === 'NOTE' ? 'Guidance for Executor (Required)' : 'Feedback Note (Optional)'}
                </label>
              </div>

              {/* 1-Click Quick Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {[
                  'Quote is too high, negotiate for lower price',
                  'Counter-offer PKR 10k + extra PR products',
                  'Ask for 1 extra Reel & 2 Stories before signing',
                  'Verify follower engagement & authenticity first',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setActionNote(chip)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors text-left"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder={
                  actionApproval.action === 'NOTE'
                    ? "e.g., Quote is too high, negotiate for lower price, or counter-offer with..."
                    : "Optional note or reason for the executor..."
                }
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setActionApproval(null);
                  setActionNote('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDecision}
                disabled={submitting || (actionApproval.action === 'NOTE' && !actionNote.trim())}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-colors ${
                  actionApproval.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionApproval.action === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submitting
                  ? 'Submitting...'
                  : actionApproval.action === 'APPROVE'
                  ? 'Confirm Approval'
                  : actionApproval.action === 'REJECT'
                  ? 'Confirm Rejection'
                  : 'Send Note to Executor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Payment & Optional Proof Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              {paymentModal.action === 'MARK_ADVANCE_PAID' ? 'Confirm Advance Payment' : 'Confirm Full / Final Payment'}
            </h3>

            {/* Payment Type Selection */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentModal({ ...paymentModal, action: 'MARK_ADVANCE_PAID' })}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  paymentModal.action === 'MARK_ADVANCE_PAID'
                    ? 'bg-white text-amber-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Advance Payment ({paymentModal.item.advancePercentage || 50}%)
              </button>
              <button
                type="button"
                onClick={() => setPaymentModal({ ...paymentModal, action: 'MARK_FULLY_PAID' })}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  paymentModal.action === 'MARK_FULLY_PAID'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {paymentModal.item.advancePercentage > 0 ? 'Final Payment' : '100% Full Payment'}
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>Creator:</strong> {paymentModal.item.name} ({paymentModal.item.igHandle})</div>
              <div><strong>Bank:</strong> {paymentModal.item.bankName} - {paymentModal.item.accountTitle}</div>
              <div><strong>Account #:</strong> <span className="font-mono">{paymentModal.item.accountNumber}</span></div>
              <div>
                <strong>Amount Payable Now:</strong>{' '}
                <span className="font-bold text-emerald-700 text-sm">
                  PKR{' '}
                  {Math.round(
                    paymentModal.action === 'MARK_ADVANCE_PAID'
                      ? (paymentModal.item.advanceAmount || (paymentModal.item.amount * (paymentModal.item.advancePercentage || 50)) / 100)
                      : (paymentModal.item.paymentStatus === 'ADVANCE_PAID'
                          ? (paymentModal.item.completionAmount || (paymentModal.item.amount - (paymentModal.item.advanceAmount || 0)))
                          : paymentModal.item.amount)
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Reference / Slip Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Meezan Trx #928374 or link to slip"
                value={paymentProofRef}
                onChange={(e) => setPaymentProofRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Optional: You can paste a transaction ID, banking screenshot link, or leave blank.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Disbursed via mobile banking"
                value={paymentProofNotes}
                onChange={(e) => setPaymentProofNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPaymentModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={paymentUpdating}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-colors"
              >
                {paymentUpdating ? 'Updating...' : 'Confirm Payment Sent'}
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
