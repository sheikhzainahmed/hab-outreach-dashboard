'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import KanbanBoard from '@/components/pipeline/KanbanBoard';
import AddInfluencerModal from '@/components/influencers/AddInfluencerModal';
import InfluencerDetailModal from '@/components/influencers/InfluencerDetailModal';
import {
  Plus,
  Search,
  Users,
  AlertCircle,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  Zap,
  Check,
  ChevronDown,
  ArrowRight,
  Trash2,
  UserCheck,
  ArrowRightLeft,
  Tag,
  Copy,
} from 'lucide-react';
import { PIPELINE_STAGES, STAGE_COLORS } from '@/lib/constants';

function ExecutorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allTeamParam = searchParams.get('allTeam') === 'true';
  const viewParam = searchParams.get('view');
  const needsActionParam = searchParams.get('needsAction') === 'true' || viewParam === 'needs-action';
  const executorParam = searchParams.get('executorId') || 'all';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [allTeam, setAllTeam] = useState(allTeamParam);
  const [needsActionOnly, setNeedsActionOnly] = useState(needsActionParam);
  const [executorFilter, setExecutorFilter] = useState(executorParam);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');

  // Quick Inline Add Bar
  const [quickHandle, setQuickHandle] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState(false);

  // Modals & Copy feedback
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Sync state with URL search parameters
  useEffect(() => {
    const isTeam = searchParams.get('allTeam') === 'true';
    const isNeedsAction = searchParams.get('needsAction') === 'true' || searchParams.get('view') === 'needs-action';
    setAllTeam(isTeam);
    setNeedsActionOnly(isNeedsAction);
    setExecutorFilter(searchParams.get('executorId') || 'all');
  }, [searchParams]);

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadInfluencers();
    }
  }, [currentUser, allTeam, needsActionOnly, executorFilter, selectedStage, search]);

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

  const loadInfluencers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (allTeam) params.append('allTeam', 'true');
      if (allTeam && executorFilter !== 'all') params.append('executorId', executorFilter);
      if (needsActionOnly) params.append('needsAction', 'true');
      if (selectedStage !== 'all') params.append('stage', selectedStage);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/influencers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInfluencers(data.influencers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-second creator add
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickHandle.trim()) return;

    setQuickAdding(true);
    try {
      const cleanHandle = quickHandle.trim().startsWith('@')
        ? quickHandle.trim()
        : `@${quickHandle.trim()}`;

      const res = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          igHandle: cleanHandle,
          name: cleanHandle.replace('@', ''),
          stage: 'Package agreed',
          category: 'Lifestyle',
        }),
      });

      if (res.ok) {
        setQuickHandle('');
        setQuickSuccess(true);
        setTimeout(() => setQuickSuccess(false), 2000);
        loadInfluencers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add creator');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setQuickAdding(false);
    }
  };

  const handleInlineStageChange = async (id: string, newStage: string) => {
    try {
      const res = await fetch(`/api/influencers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        loadInfluencers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update stage');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteInline = async (inf: any) => {
    if (
      !confirm(
        `Are you sure you want to COMPLETELY delete "${inf.name}" (@${inf.igHandle.replace('@', '')})?\n\nThis will permanently remove the creator from your dashboard, the master CRM, spend approvals, and dispatch.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/influencers/${inf.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInfluencers((prev) => prev.filter((i) => i.id !== inf.id));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete creator');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting creator');
    }
  };

  const handleInlineReassign = async (infId: string, newAssigneeId: string) => {
    const targetUser = allUsers.find((u) => u.id === newAssigneeId);
    if (!confirm(`Move this creator to ${targetUser?.name || 'Unassigned'}'s profile?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/influencers/${infId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: newAssigneeId || null }),
      });
      if (res.ok) {
        loadInfluencers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to move creator');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while reassigning creator');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
          Loading your workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentUser={currentUser} allUsers={allUsers} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role={currentUser.role} />

        <main className="flex-1 p-6 overflow-y-auto space-y-5">
          {/* Top Title & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {allTeam ? 'All Team Influencers' : 'My Influencers'}
                </h1>
                {allTeam && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                    Team View
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {allTeam
                  ? 'Viewing all team outreach records.'
                  : `Personal workspace for ${currentUser.name}.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const next = !allTeam;
                  setAllTeam(next);
                  router.push(next ? '/executor?allTeam=true' : '/executor');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  allTeam
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {allTeam ? 'My Records' : 'All Team'}
              </button>

              <button
                onClick={() => {
                  const next = !needsActionOnly;
                  setNeedsActionOnly(next);
                  router.push(next ? '/executor?view=needs-action' : '/executor');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  needsActionOnly
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Needs Action
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Influencer
              </button>
            </div>
          </div>

          {/* Quick-Add Single-Line Bar (Lightning Fast Data Entry) */}
          <form
            onSubmit={handleQuickAdd}
            className="bg-white p-2.5 px-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 shrink-0">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Add:</span>
            </div>

            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">@</span>
              <input
                type="text"
                placeholder="Enter Instagram handle and press Enter (e.g. skinwithhira)..."
                value={quickHandle}
                onChange={(e) => setQuickHandle(e.target.value.replace('@', ''))}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-100 bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all font-medium text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={quickAdding || !quickHandle.trim()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1 shrink-0"
            >
              {quickAdding ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : quickSuccess ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <span>Add</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </form>

          {/* Filter & View Switcher Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter handle, name, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">All Stages ({influencers.length})</option>
                {PIPELINE_STAGES.filter((s) => !['Contacted', 'Replied'].includes(s)).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {allTeam && (
                <select
                  value={executorFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExecutorFilter(val);
                    if (val === 'all') router.push('/executor?allTeam=true');
                    else router.push(`/executor?allTeam=true&executorId=${val}`);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Team Members</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                <button
                  onClick={() => setViewMode('board')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    viewMode === 'board' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Kanban Board View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    viewMode === 'table' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Helpful Empty State Banner for Executors with 0 Assigned Records */}
          {!loading && !allTeam && influencers.length === 0 && !search && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">No creators in your personal queue right now.</p>
                  <p className="text-[11px] text-amber-800">
                    Switch to &quot;All Team&quot; view to browse all team creators, or click &quot;+ New Influencer&quot; to add one.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setAllTeam(true);
                    router.push('/executor?allTeam=true');
                  }}
                  className="px-3 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-all text-xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  View All Team
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-all text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Creator
                </button>
              </div>
            </div>
          )}

          {/* Main Display: Board or Table */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
              <p className="text-xs">Updating records...</p>
            </div>
          ) : viewMode === 'board' ? (
            <KanbanBoard
              influencers={influencers}
              currentUser={currentUser}
              onSelectInfluencer={(inf) => setSelectedInfluencer(inf)}
              onStageChange={() => loadInfluencers()}
            />
          ) : (
            /* Clean Table View */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Creator</th>
                      <th className="px-4 py-3">Stage (Click to change)</th>
                      <th className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span>Assigned Profile</span>
                          {allTeam && (
                            <select
                              value={executorFilter}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExecutorFilter(val);
                                if (val === 'all') router.push('/executor?allTeam=true');
                                else router.push(`/executor?allTeam=true&executorId=${val}`);
                              }}
                              className="text-[10px] font-bold bg-white text-slate-700 border border-slate-300 rounded-lg px-2 py-0.5 normal-case tracking-normal shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="all">All</option>
                              {allUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3">PR Package</th>
                      <th className="px-4 py-3">Promo Code</th>
                      <th className="px-4 py-3">Shipping Address</th>
                      <th className="px-4 py-3">Deliverables</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {influencers.map((inf) => {
                      const color = STAGE_COLORS[inf.stage] || STAGE_COLORS['Contacted'];
                      const completedCount = inf.deliverables?.filter((d: any) => d.received).length || 0;
                      const totalDelivs = inf.deliverables?.length || 0;
                      const canEditInf =
                        (currentUser?.role !== 'EXECUTOR' && currentUser?.role !== 'COORDINATOR') ||
                        inf.assignedToId === currentUser?.id ||
                        inf.createdById === currentUser?.id ||
                        !inf.assignedToId;

                      return (
                        <tr key={inf.id} className="hover:bg-slate-50/70 transition-colors">
                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => setSelectedInfluencer(inf)}
                          >
                            <span className="font-bold text-slate-900 block">{inf.name}</span>
                            <span className="text-[11px] text-rose-600 font-bold">{inf.igHandle}</span>
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={inf.stage}
                              disabled={!canEditInf}
                              onChange={(e) => handleInlineStageChange(inf.id, e.target.value)}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs cursor-pointer ${color.bg} ${color.text} ${color.border}`}
                            >
                              {PIPELINE_STAGES.filter(
                                (s) => !['Contacted', 'Replied'].includes(s) || s === inf.stage
                              ).map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            {canEditInf ? (
                              <select
                                value={inf.assignedToId || ''}
                                onChange={(e) => handleInlineReassign(inf.id, e.target.value)}
                                className="text-[11px] font-bold bg-white text-slate-800 border border-slate-200 rounded-lg px-2 py-1 shadow-2xs focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                title="Move creator to another person's profile"
                              >
                                <option value="">Unassigned</option>
                                {allUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {inf.assignedTo?.name || 'Unassigned'}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 max-w-xs truncate text-slate-800">
                            {inf.products || inf.prPackage}
                          </td>

                          <td className="px-4 py-3">
                            {inf.discountCode ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-violet-50 border border-violet-200">
                                <Tag className="w-3 h-3 text-violet-600 shrink-0" />
                                <span className="font-mono font-bold text-[11px] text-violet-900">
                                  {inf.discountCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(inf.discountCode);
                                    setCopiedCodeId(inf.id);
                                    setTimeout(() => setCopiedCodeId(null), 1800);
                                  }}
                                  className="text-violet-600 hover:text-violet-800"
                                  title="Copy promo code"
                                >
                                  {copiedCodeId === inf.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                            {inf.address && inf.address !== 'TBD' ? (
                              <span>{inf.address}</span>
                            ) : (
                              <span className="text-slate-400 italic">No address yet</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              completedCount === totalDelivs && totalDelivs > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {completedCount}/{totalDelivs} posted
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedInfluencer(inf)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                              >
                                View &rarr;
                              </button>
                              {canEditInf && (
                                <button
                                  onClick={() => handleDeleteInline(inf)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete creator entirely"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Influencer Modal */}
      <AddInfluencerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => loadInfluencers()}
      />

      {/* Influencer Detail Modal */}
      {selectedInfluencer && (
        <InfluencerDetailModal
          influencer={selectedInfluencer}
          currentUser={currentUser}
          isOpen={Boolean(selectedInfluencer)}
          onClose={() => setSelectedInfluencer(null)}
          onUpdate={() => {
            loadInfluencers();
            setSelectedInfluencer(null);
          }}
        />
      )}
    </div>
  );
}

export default function ExecutorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-400">Loading...</div>}>
      <ExecutorContent />
    </Suspense>
  );
}
