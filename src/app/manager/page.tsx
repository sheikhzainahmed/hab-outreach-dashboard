'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import InfluencerDetailModal from '@/components/influencers/InfluencerDetailModal';
import PromoCodesSection from '@/components/codes/PromoCodesSection';
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
  Users,
  BarChart3,
  TrendingUp,
  Search,
  ArrowRight,
  Activity,
  Layers,
  Database,
  Tag,
} from 'lucide-react';

function ManagerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'dispatch';

  const [activeTab, setActiveTab] = useState<'dispatch' | 'codes' | 'performance' | 'health'>(
    tabParam === 'performance'
      ? 'performance'
      : tabParam === 'health'
      ? 'health'
      : tabParam === 'codes'
      ? 'codes'
      : 'dispatch'
  );

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>({ stuck: [], overdue: [], incomplete: [] });
  const [allInfluencers, setAllInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const statusParam = searchParams.get('status') || searchParams.get('filter') || 'Ready';
  const [statusFilter, setStatusFilter] = useState(
    statusParam.toLowerCase() === 'ready' ? 'Ready' : statusParam
  );
  const [copiedToast, setCopiedToast] = useState(false);
  const [execSearch, setExecSearch] = useState('');
  const [overdueExecutorFilter, setOverdueExecutorFilter] = useState('all');
  const [stuckExecutorFilter, setStuckExecutorFilter] = useState('all');
  const [dispatchExecutorFilter, setDispatchExecutorFilter] = useState('all');

  // Dispatch executor counts & filtered list
  const dispatchExecutors = useMemo(() => {
    const map: Record<string, number> = {};
    dispatches.forEach((d: any) => {
      const name = d.influencer?.assignedTo?.name || 'Unassigned';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [dispatches]);

  const filteredDispatches = useMemo(() => {
    if (dispatchExecutorFilter === 'all') return dispatches;
    return dispatches.filter(
      (d: any) => (d.influencer?.assignedTo?.name || 'Unassigned').toLowerCase() === dispatchExecutorFilter.toLowerCase()
    );
  }, [dispatches, dispatchExecutorFilter]);

  // Stuck executor counts & filtered list
  const stuckExecutors = useMemo(() => {
    const map: Record<string, number> = {};
    (healthData?.stuck || []).forEach((inf: any) => {
      const name = inf.assignedTo?.name || 'Unassigned';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [healthData?.stuck]);

  const filteredStuckList = useMemo(() => {
    if (stuckExecutorFilter === 'all') return healthData?.stuck || [];
    return (healthData?.stuck || []).filter(
      (inf: any) => (inf.assignedTo?.name || 'Unassigned').toLowerCase() === stuckExecutorFilter.toLowerCase()
    );
  }, [healthData?.stuck, stuckExecutorFilter]);

  // Overdue executor counts and filtered list
  const overdueExecutors = useMemo(() => {
    const map: Record<string, number> = {};
    (healthData?.overdue || []).forEach((inf: any) => {
      const name = inf.assignedTo?.name || 'Unassigned';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [healthData?.overdue]);

  const filteredOverdueList = useMemo(() => {
    if (overdueExecutorFilter === 'all') return healthData?.overdue || [];
    return (healthData?.overdue || []).filter(
      (inf: any) => (inf.assignedTo?.name || 'Unassigned').toLowerCase() === overdueExecutorFilter.toLowerCase()
    );
  }, [healthData?.overdue, overdueExecutorFilter]);

  // Modals
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);
  const [editingDispatch, setEditingDispatch] = useState<any>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tabParam === 'performance' || tabParam === 'health' || tabParam === 'dispatch' || tabParam === 'codes') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadDispatches();
      loadHealthAndAnalytics();
    }
  }, [currentUser, statusFilter]);

  const handleTabChange = (tab: 'dispatch' | 'codes' | 'performance' | 'health') => {
    setActiveTab(tab);
    router.push(`/manager?tab=${tab}`);
  };

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
        setAllInfluencers(infs);
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md animate-pulse">
          <BarChart3 className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
          Loading Manager Workspace...
        </p>
      </div>
    );
  }

  // Filtered executors for Team Performance Tab
  const rawExecList = analytics?.executorPerformance || [];
  const filteredExecutors = rawExecList.filter((e: any) =>
    e.name.toLowerCase().includes(execSearch.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(execSearch.toLowerCase())
  );

  const totalTeamOutreach = rawExecList.reduce((acc: number, e: any) => acc + (e.outreachVolume || 0), 0);
  const totalTeamAgreed = rawExecList.reduce((acc: number, e: any) => acc + (e.packagesAgreed || 0), 0);
  const totalTeamShipped = rawExecList.reduce((acc: number, e: any) => acc + (e.packagesShipped || 0), 0);
  const totalTeamReceived = rawExecList.reduce((acc: number, e: any) => acc + (e.deliverablesReceived || 0), 0);
  const totalTeamOverdue = rawExecList.reduce((acc: number, e: any) => acc + (e.deliverablesOverdue || 0), 0);
  const avgTeamConversion = totalTeamOutreach > 0 ? Math.round((totalTeamAgreed / totalTeamOutreach) * 100) : 0;

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
                Manager Operations & Team Center
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Oversee pipeline fulfillment, track team output, and manage operational SLAs.
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

              <a
                href="/api/backup"
                download
                title="Download complete JSON snapshot of all creators, dispatches, and users"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                Full DB Backup
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

          {/* Main Top Navigation Tabs */}
          <div className="flex items-center border-b border-slate-200 gap-1 sm:gap-2 overflow-x-auto">
            <button
              onClick={() => handleTabChange('dispatch')}
              className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'dispatch'
                  ? 'text-purple-700 border-b-2 border-purple-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Dispatch Fulfillment Queue</span>
              {dispatches.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                  {dispatches.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('codes')}
              className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'codes'
                  ? 'text-violet-700 border-b-2 border-violet-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tag className="w-4 h-4 text-violet-600" />
              <span>Promo Codes &amp; Shopify</span>
              {allInfluencers.filter(
                (i) =>
                  !i.codeQueueCleared &&
                  ['Package agreed', 'Ready to ship', 'Shipped', 'Content pending'].includes(i.stage) &&
                  (!i.discountCode || !i.discountCode.trim())
              ).length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800">
                  {
                    allInfluencers.filter(
                      (i) =>
                        !i.codeQueueCleared &&
                        ['Package agreed', 'Ready to ship', 'Shipped', 'Content pending'].includes(i.stage) &&
                        (!i.discountCode || !i.discountCode.trim())
                    ).length
                  }{' '}
                  new
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('performance')}
              className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'performance'
                  ? 'text-purple-700 border-b-2 border-purple-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-rose-600" />
              <span>Team Performance & Conversion</span>
              {totalTeamOverdue > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {totalTeamOverdue} overdue
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('health')}
              className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'health'
                  ? 'text-purple-700 border-b-2 border-purple-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Operational Health</span>
              {(healthData.stuck.length > 0 || healthData.overdue.length > 0) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {healthData.stuck.length + healthData.overdue.length} alerts
                </span>
              )}
            </button>
          </div>

          {/* TAB: PROMO CODES & SHOPIFY BATCH + ARCHIVE */}
          {activeTab === 'codes' && (
            <PromoCodesSection
              allUsers={allUsers}
              defaultSubTab="queue"
              onSelectInfluencer={(inf) => setSelectedInfluencer(inf)}
              onCodesUpdated={() => loadHealthAndAnalytics()}
            />
          )}

          {/* TAB 1: DISPATCH QUEUE */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              {/* Quick Summary Cards (Click to filter queue) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setStatusFilter('Ready')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    statusFilter === 'Ready'
                      ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">To Be Dispatched</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  </div>
                  <p className="text-2xl font-bold text-amber-900 mt-0.5">
                    {allInfluencers.filter((i) => i.stage === 'Ready to ship' || i.dispatch?.status === 'Ready').length}
                  </p>
                  <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                    {statusFilter === 'Ready' ? '✓ Currently filtered' : 'Click to filter'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('Sent to ops')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    statusFilter === 'Sent to ops'
                      ? 'bg-purple-50 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sent to Ops</span>
                  <p className="text-2xl font-bold text-purple-700 mt-0.5">
                    {allInfluencers.filter((i) => i.dispatch?.status === 'Sent to ops').length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Hand-off to Ali</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('Shipped')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    statusFilter === 'Shipped'
                      ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Transit</span>
                  <p className="text-2xl font-bold text-indigo-600 mt-0.5">
                    {allInfluencers.filter((i) => i.stage === 'Shipped' || i.dispatch?.status === 'Shipped').length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">With courier tracking</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('Delivered')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    statusFilter === 'Delivered'
                      ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                    {allInfluencers.filter((i) => i.dispatch?.status === 'Delivered' || ['Content pending', 'Content received'].includes(i.stage)).length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Received by creator</p>
                </button>
              </div>

              {/* Dispatch Queue Table */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-purple-600" />
                      Dispatch Fulfilment Queue
                      {statusFilter === 'Ready' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          To Be Dispatched
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Advance packages through Ready &rarr; Sent to Ops &rarr; Shipped &rarr; Delivered.
                    </p>
                  </div>

                  {/* Status Filter Tabs */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    {[
                      { id: 'Ready', label: 'To Be Dispatched' },
                      { id: 'Sent to ops', label: 'Sent to Ops' },
                      { id: 'Shipped', label: 'In Transit' },
                      { id: 'Delivered', label: 'Delivered' },
                      { id: 'all', label: 'All Packages' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${
                          statusFilter === tab.id
                            ? 'bg-white text-purple-700 shadow-sm font-bold'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
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
                          <th className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span>Executor</span>
                              <select
                                value={dispatchExecutorFilter}
                                onChange={(e) => setDispatchExecutorFilter(e.target.value)}
                                className="text-[10px] font-bold bg-white text-slate-700 border border-slate-300 rounded-lg px-2 py-0.5 normal-case tracking-normal shadow-2xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                              >
                                <option value="all">All ({dispatches.length})</option>
                                {dispatchExecutors.map((e) => (
                                  <option key={e.name} value={e.name}>
                                    {e.name} ({e.count})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </th>
                          <th className="px-4 py-3">Dispatch Status</th>
                          <th className="px-4 py-3">Tracking ID</th>
                          <th className="px-4 py-3 text-right">Advance Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredDispatches.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                              No packages for &quot;{dispatchExecutorFilter}&quot;.
                            </td>
                          </tr>
                        ) : filteredDispatches.map((d) => {
                          const inf = d.influencer;
                          return (
                            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedInfluencer(inf)}>
                                <div className="font-bold text-slate-900 hover:text-purple-600 transition-colors">
                                  {inf.shippingName || inf.name}
                                </div>
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                  {inf.assignedTo?.name || 'Unassigned'}
                                </span>
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
            </div>
          )}

          {/* TAB 2: TEAM PERFORMANCE & CONVERSION */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Summary Performance Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Outreach</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{totalTeamOutreach}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Creators Contacted</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deals Agreed</span>
                  <p className="text-2xl font-bold text-purple-700 mt-1">{totalTeamAgreed}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Packages Accepted</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion %</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{avgTeamConversion}%</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Outreach to Agreed</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Content Received</span>
                  <p className="text-2xl font-bold text-indigo-700 mt-1">{totalTeamReceived}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Posts live & verified</p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-sm col-span-2 md:col-span-1">
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Overdue Content</span>
                  <p className="text-2xl font-bold text-rose-950 mt-1">{totalTeamOverdue}</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">Follow-up needed</p>
                </div>
              </div>

              {/* Performance Table Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      Executor & Coordinator Performance
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitor output volume, conversion rates, and fulfillment accountability across team members.
                    </p>
                  </div>

                  {/* Search Executor */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search team member..."
                      value={execSearch}
                      onChange={(e) => setExecSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-48 sm:w-64"
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
                        <th className="px-4 py-3">Conversion Rate</th>
                        <th className="px-4 py-3">Shipped</th>
                        <th className="px-4 py-3">Content Received</th>
                        <th className="px-4 py-3">Overdue Posts</th>
                        <th className="px-4 py-3 text-right">View Pipeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredExecutors.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                            No team members found.
                          </td>
                        </tr>
                      ) : (
                        filteredExecutors.map((exec: any) => (
                          <tr key={exec.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                {exec.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-slate-900 font-bold">{exec.name}</div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                exec.role === 'COORDINATOR'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : exec.role === 'MANAGER'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}>
                                {exec.role === 'COORDINATOR' ? 'Coordinator' : 'Executor'}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-800">{exec.outreachVolume}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{exec.packagesAgreed}</td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-600 min-w-[2.5rem]">{exec.conversionRate}%</span>
                                <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                  <div
                                    className="bg-emerald-500 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, exec.conversionRate)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-slate-700">{exec.packagesShipped}</td>

                            <td className="px-4 py-3">
                              <span className="font-bold text-emerald-700">{exec.deliverablesReceived}</span>
                              <span className="text-slate-400 ml-1">
                                / {exec.deliverablesPending + exec.deliverablesReceived}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {exec.deliverablesOverdue > 0 ? (
                                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[11px] inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {exec.deliverablesOverdue} Overdue
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 0
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <a
                                href={`/executor?allTeam=true&executorId=${exec.id}`}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors inline-flex items-center gap-1"
                              >
                                View Pipeline <ChevronRight className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPERATIONAL HEALTH */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* Health Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between text-amber-900 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Stuck Packages</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-3xl font-bold text-amber-950">{healthData.stuck.length}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Ready to ship for &gt; 3 days without dispatch hand-off
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-sm">
                  <div className="flex items-center justify-between text-rose-900 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Overdue Deliverables</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-3xl font-bold text-rose-950">{healthData.overdue.length}</p>
                  <p className="text-xs text-rose-700 mt-1">
                    Content pending past the 7-day post-delivery SLA
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-700 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Incomplete Entries</span>
                    <ShieldAlert className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{healthData.incomplete.length}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Records missing required phone numbers or full address
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown for Stuck Packages */}
              {healthData.stuck.length > 0 && (
                <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Stuck Packages Requiring Hand-off ({healthData.stuck.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-50/60 text-amber-900 uppercase font-bold">
                        <tr>
                          <th className="p-2.5">Influencer</th>
                          <th className="p-2.5">City</th>
                          <th className="p-2.5">Products</th>
                          <th className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              <span>Assigned To</span>
                              <select
                                value={stuckExecutorFilter}
                                onChange={(e) => setStuckExecutorFilter(e.target.value)}
                                className="text-[10px] font-bold bg-white text-amber-900 border border-amber-300 rounded-lg px-2 py-0.5 normal-case tracking-normal shadow-2xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                              >
                                <option value="all">All ({healthData.stuck.length})</option>
                                {stuckExecutors.map((e) => (
                                  <option key={e.name} value={e.name}>
                                    {e.name} ({e.count})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {filteredStuckList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                              No stuck packages for &quot;{stuckExecutorFilter}&quot;.
                            </td>
                          </tr>
                        ) : filteredStuckList.map((inf: any) => (
                          <tr key={inf.id} className="hover:bg-amber-50/30">
                            <td className="p-2.5 font-bold text-slate-900">{inf.name} ({inf.igHandle})</td>
                            <td className="p-2.5">{inf.city || 'N/A'}</td>
                            <td className="p-2.5 truncate max-w-xs">{inf.products || inf.prPackage}</td>
                            <td className="p-2.5">{inf.assignedTo?.name || 'Unassigned'}</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => setSelectedInfluencer(inf)}
                                className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Breakdown for Overdue Deliverables */}
              {healthData.overdue.length > 0 && (
                <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Overdue Content Posts ({filteredOverdueList.length}
                      {overdueExecutorFilter !== 'all' ? ` of ${healthData.overdue.length}` : ''})
                    </h3>

                    {/* Assigned Executor Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-rose-900">Filter by Executor:</label>
                      <select
                        value={overdueExecutorFilter}
                        onChange={(e) => setOverdueExecutorFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-rose-300 text-xs font-bold text-rose-950 bg-rose-50/90 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
                      >
                        <option value="all">All Executors ({healthData.overdue.length})</option>
                        {overdueExecutors.map((e) => (
                          <option key={e.name} value={e.name}>
                            {e.name} ({e.count} overdue)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-50/60 text-rose-900 uppercase font-bold">
                        <tr>
                          <th className="p-2.5">Influencer</th>
                          <th className="p-2.5">Phone</th>
                          <th className="p-2.5">Deliverable</th>
                          <th className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              <span>Assigned Executor</span>
                              <select
                                value={overdueExecutorFilter}
                                onChange={(e) => setOverdueExecutorFilter(e.target.value)}
                                className="text-[10px] font-bold bg-white text-rose-900 border border-rose-300 rounded-lg px-2 py-0.5 normal-case tracking-normal shadow-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                              >
                                <option value="all">All</option>
                                {overdueExecutors.map((e) => (
                                  <option key={e.name} value={e.name}>
                                    {e.name} ({e.count})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {filteredOverdueList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                              No overdue deliverables found for &quot;{overdueExecutorFilter}&quot;.
                            </td>
                          </tr>
                        ) : (
                          filteredOverdueList.map((inf: any) => (
                            <tr key={inf.id} className="hover:bg-rose-50/30 transition-colors">
                              <td className="p-2.5 font-bold text-slate-900">{inf.name} ({inf.igHandle})</td>
                              <td className="p-2.5 font-mono">{inf.phone}</td>
                              <td className="p-2.5 truncate max-w-xs">{inf.deliverables?.[0]?.type || 'Post'}</td>
                              <td className="p-2.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                  {inf.assignedTo?.name || 'Unassigned'}
                                </span>
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  onClick={() => setSelectedInfluencer(inf)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                >
                                  Follow Up
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* Influencer Detail Modal */}
      {selectedInfluencer && (
        <InfluencerDetailModal
          influencer={selectedInfluencer}
          currentUser={currentUser}
          isOpen={true}
          onClose={() => setSelectedInfluencer(null)}
          onUpdate={() => {
            loadDispatches();
            loadHealthAndAnalytics();
          }}
        />
      )}
    </div>
  );
}

export default function ManagerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading Manager Center...</div>}>
      <ManagerPageContent />
    </Suspense>
  );
}
