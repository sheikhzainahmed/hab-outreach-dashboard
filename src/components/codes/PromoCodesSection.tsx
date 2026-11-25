'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Download,
  Copy,
  Check,
  Save,
  Trash2,
  Archive,
  Sparkles,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Calendar,
  X,
  Wand2,
  Phone,
  Users,
} from 'lucide-react';
import { STAGE_COLORS } from '@/lib/constants';

interface PromoCodesSectionProps {
  allUsers: any[];
  defaultSubTab?: 'queue' | 'archive';
  onSelectInfluencer?: (inf: any) => void;
  onCodesUpdated?: () => void;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (isNaN(d.getTime())) return ym;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function suggestCode(name: string, igHandle: string) {
  const base = (name || igHandle || 'HAB')
    .replace('@', '')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 10);
  return `${base || 'HAB'}10`;
}

export default function PromoCodesSection({
  allUsers,
  defaultSubTab = 'queue',
  onSelectInfluencer,
  onCodesUpdated,
}: PromoCodesSectionProps) {
  const [subTab, setSubTab] = useState<'queue' | 'archive'>(defaultSubTab);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [stats, setStats] = useState({
    queueCount: 0,
    queueUncodedCount: 0,
    queueCodedCount: 0,
    archiveTotalCount: 0,
    archiveFilteredCount: 0,
    archiveTotalSales: 0,
    archiveTotalCost: 0,
  });

  // Queue filters & state
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStageFilter, setQueueStageFilter] = useState('all');
  const [queueExecutorFilter, setQueueExecutorFilter] = useState('all');
  const [includeReceived, setIncludeReceived] = useState(false);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});

  // Archive filters & review drafts
  const [archiveMonth, setArchiveMonth] = useState('all');
  const [archiveExecutor, setArchiveExecutor] = useState('all');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveSort, setArchiveSort] = useState<'newest' | 'sales' | 'code'>('newest');
  const [salesDrafts, setSalesDrafts] = useState<Record<string, string>>({});
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});

  // Feedback & actions
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTable, setCopiedTable] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (includeReceived) params.set('includeReceived', 'true');
      if (archiveMonth !== 'all') params.set('month', archiveMonth);
      if (archiveExecutor !== 'all') params.set('executorId', archiveExecutor);

      const res = await fetch(`/api/promo-codes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const qList = data.queue || [];
        const aList = data.archive || [];
        setQueue(qList);
        setArchive(aList);
        setAvailableMonths(data.availableMonths || []);
        setStats(data.stats || stats);

        // Initialize drafts from fresh server state
        const nextCodeDrafts: Record<string, string> = {};
        qList.forEach((inf: any) => {
          nextCodeDrafts[inf.id] = inf.discountCode || '';
        });
        setCodeDrafts(nextCodeDrafts);

        const nextSales: Record<string, string> = {};
        const nextNotes: Record<string, string> = {};
        aList.forEach((inf: any) => {
          nextSales[inf.id] = inf.salesGenerated ? String(inf.salesGenerated) : '';
          nextNotes[inf.id] = inf.codePerformanceNotes || '';
        });
        setSalesDrafts(nextSales);
        setNotesDrafts(nextNotes);
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to load promo codes data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [includeReceived, archiveMonth, archiveExecutor]);

  // Queue executors with counts
  const queueExecutors = useMemo(() => {
    const map: Record<string, number> = {};
    queue.forEach((inf) => {
      const name = inf.assignedTo?.name || 'Unassigned';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [queue]);

  // Filtered queue list
  const filteredQueue = useMemo(() => {
    return queue.filter((inf) => {
      if (queueStageFilter !== 'all' && inf.stage !== queueStageFilter) return false;
      if (
        queueExecutorFilter !== 'all' &&
        (inf.assignedTo?.name || 'Unassigned').toLowerCase() !== queueExecutorFilter.toLowerCase()
      ) {
        return false;
      }
      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase();
        return (
          (inf.name || '').toLowerCase().includes(q) ||
          (inf.igHandle || '').toLowerCase().includes(q) ||
          (inf.phone || '').toLowerCase().includes(q) ||
          (inf.assignedTo?.name || '').toLowerCase().includes(q) ||
          (codeDrafts[inf.id] || inf.discountCode || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [queue, queueStageFilter, queueExecutorFilter, queueSearch, codeDrafts]);

  // Dirty queue items (edited codes not yet saved)
  const dirtyQueueIds = useMemo(() => {
    return queue
      .filter((inf) => {
        const draft = (codeDrafts[inf.id] ?? '').trim().toUpperCase();
        const saved = (inf.discountCode || '').trim().toUpperCase();
        return draft !== saved;
      })
      .map((inf) => inf.id);
  }, [queue, codeDrafts]);

  // Filtered & sorted archive list
  const filteredArchive = useMemo(() => {
    let list = [...archive];
    if (archiveSearch.trim()) {
      const q = archiveSearch.toLowerCase();
      list = list.filter(
        (inf) =>
          (inf.discountCode || '').toLowerCase().includes(q) ||
          (inf.name || '').toLowerCase().includes(q) ||
          (inf.igHandle || '').toLowerCase().includes(q) ||
          (inf.phone || '').toLowerCase().includes(q) ||
          (inf.assignedTo?.name || '').toLowerCase().includes(q) ||
          (inf.codePerformanceNotes || '').toLowerCase().includes(q)
      );
    }

    if (archiveSort === 'sales') {
      list.sort((a, b) => (b.salesGenerated || 0) - (a.salesGenerated || 0));
    } else if (archiveSort === 'code') {
      list.sort((a, b) => (a.discountCode || '').localeCompare(b.discountCode || ''));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.codeAssignedAt || b.updatedAt).getTime() -
          new Date(a.codeAssignedAt || a.updatedAt).getTime()
      );
    }
    return list;
  }, [archive, archiveSearch, archiveSort]);

  // Dirty archive review items (sales or notes modified)
  const dirtyArchiveIds = useMemo(() => {
    return archive
      .filter((inf) => {
        const draftSales = parseFloat(salesDrafts[inf.id] || '0') || 0;
        const savedSales = inf.salesGenerated || 0;
        const draftNotes = (notesDrafts[inf.id] ?? '').trim();
        const savedNotes = (inf.codePerformanceNotes || '').trim();
        return draftSales !== savedSales || draftNotes !== savedNotes;
      })
      .map((inf) => inf.id);
  }, [archive, salesDrafts, notesDrafts]);

  // Save single or bulk codes from queue
  const handleSaveCodes = async (targetIds?: string[]) => {
    const idsToSave = targetIds || dirtyQueueIds;
    if (idsToSave.length === 0) return;

    setSaving(true);
    try {
      const updates = idsToSave.map((id) => ({
        influencerId: id,
        discountCode: (codeDrafts[id] ?? '').trim().toUpperCase(),
      }));

      const res = await fetch('/api/promo-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to save promo codes');
        return;
      }

      showToast(
        'success',
        `Saved ${data.updatedCount} promo code${data.updatedCount === 1 ? '' : 's'}! ${
          data.notifiedCount > 0
            ? `Notified ${data.notifiedCount} executor${data.notifiedCount === 1 ? '' : 's'}.`
            : 'Visible on executor dashboards & stored in Master Archive.'
        }`
      );
      await fetchData();
      onCodesUpdated?.();
    } catch (e) {
      console.error(e);
      showToast('error', 'Network error while saving promo codes.');
    } finally {
      setSaving(false);
    }
  };

  // Auto-fill suggested codes for all uncoded rows in current view
  const handleAutoFillVisible = () => {
    const next = { ...codeDrafts };
    const used = new Set(
      Object.values(next)
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean)
    );
    archive.forEach((a) => {
      if (a.discountCode) used.add(a.discountCode.trim().toUpperCase());
    });

    let filled = 0;
    filteredQueue.forEach((inf) => {
      if (!(next[inf.id] || '').trim()) {
        let candidate = suggestCode(inf.name, inf.igHandle);
        let suffix = 2;
        while (used.has(candidate)) {
          candidate = `${suggestCode(inf.name, inf.igHandle).replace(/10$/, '')}${suffix}0`;
          suffix++;
        }
        next[inf.id] = candidate;
        used.add(candidate);
        filled++;
      }
    });

    setCodeDrafts(next);
    if (filled > 0) {
      showToast('success', `Suggested ${filled} unique code${filled === 1 ? '' : 's'}. Review and click "Save All Codes" to confirm.`);
    }
  };

  // Clear queue (coded only, entire list, or single row)
  const handleClearQueue = async (mode: 'coded' | 'all' | 'ids', ids?: string[]) => {
    if (dirtyQueueIds.length > 0 && mode !== 'ids') {
      if (!confirm(`You have ${dirtyQueueIds.length} unsaved promo code(s). Continue clearing without saving them first?`)) {
        return;
      }
    }

    if (mode === 'all') {
      const ok = confirm(
        `Clear all ${queue.length} creator(s) from your active batch list?\n\nDon't worry: any promo codes you added will STAY permanently on each executor's dashboard and inside the Master Codes Archive.`
      );
      if (!ok) return;
    } else if (mode === 'coded') {
      const ok = confirm(
        `Clear ${stats.queueCodedCount} creator(s) that already have codes from your active list?\n\nTheir codes will remain visible to their executors and saved permanently in the Master Codes Archive.`
      );
      if (!ok) return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          mode,
          influencerIds: ids,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to clear queue');
        return;
      }

      showToast(
        'success',
        `Cleared ${data.clearedCount} creator${data.clearedCount === 1 ? '' : 's'} from your active list. All assigned codes remain saved for executors & monthly review!`
      );
      await fetchData();
      onCodesUpdated?.();
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to clear list');
    } finally {
      setClearing(false);
    }
  };

  // Save monthly review updates (sales & notes)
  const handleSaveArchiveReview = async (targetIds?: string[]) => {
    const idsToSave = targetIds || dirtyArchiveIds;
    if (idsToSave.length === 0) return;

    setSaving(true);
    try {
      const updates = idsToSave.map((id) => ({
        influencerId: id,
        salesGenerated: parseFloat(salesDrafts[id] || '0') || 0,
        codePerformanceNotes: (notesDrafts[id] ?? '').trim(),
      }));

      const res = await fetch('/api/promo-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to save review updates');
        return;
      }

      showToast('success', `Saved monthly performance review for ${data.updatedCount} code${data.updatedCount === 1 ? '' : 's'}!`);
      await fetchData();
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to save review notes');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = async (text: string, idKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(idKey);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyExportTsv = async (scope: 'queue' | 'archive') => {
    try {
      const params = new URLSearchParams({ scope, format: 'json' });
      if (includeReceived) params.set('includeReceived', 'true');
      if (scope === 'archive' && archiveMonth !== 'all') params.set('month', archiveMonth);

      const res = await fetch(`/api/promo-codes/export?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.clipboardText);
        setCopiedTable(true);
        setTimeout(() => setCopiedTable(false), 2500);
        showToast('success', `Copied ${data.count} row(s) to clipboard! Ready to paste into Sheets / Excel / Shopify.`);
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to copy table');
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setSubTab('queue')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            subTab === 'queue'
              ? 'bg-amber-50/90 border-amber-400 shadow-sm ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Code</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.queueUncodedCount}</p>
          <p className="text-[11px] text-amber-800/80 mt-0.5 font-medium">
            Out of {stats.queueCount} in active batch
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('queue')}
          className="p-4 rounded-2xl border bg-white border-slate-200 hover:border-emerald-300 text-left transition-all"
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Coded in Batch</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.queueCodedCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Synced to executors · ready to clear
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('archive')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            subTab === 'archive'
              ? 'bg-violet-50/90 border-violet-400 shadow-sm ring-2 ring-violet-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-violet-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">All Codes Archive</span>
            <Archive className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-bold text-violet-900 mt-1">{stats.archiveTotalCount}</p>
          <p className="text-[11px] text-violet-700/80 mt-0.5 font-medium">
            Stored permanently for monthly review
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('archive')}
          className="p-4 rounded-2xl border bg-white border-slate-200 hover:border-rose-300 text-left transition-all"
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Code Sales Tracked</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            PKR {stats.archiveTotalSales.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {archiveMonth === 'all' ? 'All-time Shopify review' : formatMonthLabel(archiveMonth)}
          </p>
        </button>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              subTab === 'queue'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>New Locked Collabs Queue</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                subTab === 'queue'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {stats.queueCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('archive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              subTab === 'archive'
                ? 'bg-violet-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Master Codes Archive (Monthly Review)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                subTab === 'archive'
                  ? 'bg-white/20 text-white'
                  : 'bg-violet-100 text-violet-800'
              }`}
            >
              {stats.archiveTotalCount}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: NEW LOCKED COLLABS QUEUE (SHOPIFY EXPORT + INLINE CODING) */}
      {/* ===================================================================== */}
      {subTab === 'queue' && (
        <div className="space-y-4">
          {/* Quick 3-Step Shopify Workflow Guide */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-rose-50 border border-indigo-200/70 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Shopify Custom Promo Code Workflow</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Step 1:</strong> Export this list as CSV &amp; upload to Shopify to generate codes.{' '}
                <strong>Step 2:</strong> Enter each creator&apos;s code right below &amp; click <strong>Save All Codes</strong> — their executor immediately sees it &amp; gets notified.{' '}
                <strong>Step 3:</strong> Click <strong>Clear List</strong> to reset your queue; all codes stay permanently on executors&apos; dashboards and in the Master Archive.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyExportTsv('queue')}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition-all"
              >
                {copiedTable ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy List</span>
                  </>
                )}
              </button>

              <a
                href={`/api/promo-codes/export?scope=queue&format=csv${includeReceived ? '&includeReceived=true' : ''}`}
                download
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV for Shopify</span>
              </a>
            </div>
          </div>

          {/* Queue Controls & Action Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, @handle, phone, executor..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={queueStageFilter}
                onChange={(e) => setQueueStageFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Locked Stages ({queue.length})</option>
                <option value="Package agreed">Package agreed</option>
                <option value="Ready to ship">Ready to ship</option>
                <option value="Shipped">Shipped</option>
                <option value="Content pending">Content pending</option>
                {includeReceived && <option value="Content received">Content received</option>}
              </select>

              <select
                value={queueExecutorFilter}
                onChange={(e) => setQueueExecutorFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Executors ({queue.length})</option>
                {queueExecutors.map((e) => (
                  <option key={e.name} value={e.name}>
                    {e.name} ({e.count})
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none px-2">
                <input
                  type="checkbox"
                  checked={includeReceived}
                  onChange={(e) => setIncludeReceived(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Include Content Received
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {stats.queueUncodedCount > 0 && (
                <button
                  type="button"
                  onClick={handleAutoFillVisible}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 flex items-center gap-1.5 transition-all"
                  title="Auto-suggest unique promo codes like NAME10 for empty rows"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Auto-Suggest Codes
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSaveCodes()}
                disabled={saving || dirtyQueueIds.length === 0}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                  dirtyQueueIds.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {saving
                    ? 'Saving...'
                    : dirtyQueueIds.length > 0
                    ? `Save All Codes (${dirtyQueueIds.length})`
                    : 'All Saved'}
                </span>
              </button>

              {stats.queueCodedCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearQueue('coded')}
                  disabled={clearing}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition-all"
                  title="Clear only creators who already have codes assigned"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Clear Coded ({stats.queueCodedCount})
                </button>
              )}

              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearQueue('all')}
                  disabled={clearing}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-all"
                  title="Clear entire list from your dashboard (assigned codes stay on executors' dashboards & archive)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear List
                </button>
              )}
            </div>
          </div>

          {/* Active Batch Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                <p className="text-xs font-medium">Loading locked collaborations...</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {queue.length === 0
                    ? 'All caught up! No pending collaborations in your promo code list.'
                    : 'No creators match your search or stage filter.'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Whenever an executor locks a new collaboration, they will automatically appear here ready to export to Shopify. All previously made codes are safely stored in the{' '}
                  <button
                    type="button"
                    onClick={() => setSubTab('archive')}
                    className="text-violet-700 font-bold underline"
                  >
                    Master Codes Archive
                  </button>
                  .
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Influencer Name</th>
                      <th className="px-4 py-3">Phone Number</th>
                      <th className="px-4 py-3">IG Username</th>
                      <th className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span>Executor</span>
                          <select
                            value={queueExecutorFilter}
                            onChange={(e) => setQueueExecutorFilter(e.target.value)}
                            className="text-[10px] font-bold bg-white text-slate-700 border border-slate-300 rounded-lg px-2 py-0.5 normal-case tracking-normal shadow-2xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="all">All</option>
                            {queueExecutors.map((e) => (
                              <option key={e.name} value={e.name}>
                                {e.name} ({e.count})
                              </option>
                            ))}
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 w-64">Custom Promo Code</th>
                      <th className="px-4 py-3 text-right">Status / Clear</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQueue.map((inf) => {
                      const draftVal = codeDrafts[inf.id] ?? '';
                      const savedVal = inf.discountCode || '';
                      const isDirty = draftVal.trim().toUpperCase() !== savedVal.trim().toUpperCase();
                      const hasSavedCode = Boolean(savedVal.trim());
                      const stageColor = STAGE_COLORS[inf.stage] || STAGE_COLORS['Package agreed'];

                      return (
                        <tr
                          key={inf.id}
                          className={`transition-colors ${
                            isDirty
                              ? 'bg-amber-50/40'
                              : hasSavedCode
                              ? 'bg-emerald-50/25 hover:bg-emerald-50/50'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Name */}
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => onSelectInfluencer?.(inf)}
                              className="text-left group"
                            >
                              <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                                {inf.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Locked {new Date(inf.updatedAt).toLocaleDateString()}
                              </span>
                            </button>
                          </td>

                          {/* Phone Number */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-mono text-slate-700 font-semibold">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{inf.phone && inf.phone !== 'TBD' ? inf.phone : '—'}</span>
                            </div>
                          </td>

                          {/* IG Username */}
                          <td className="px-4 py-3">
                            <a
                              href={`https://instagram.com/${(inf.igHandle || '').replace('@', '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-rose-600 hover:underline"
                            >
                              {inf.igHandle}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>

                          {/* Executor & Stage */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                <Users className="w-3 h-3 text-slate-400" />
                                {inf.assignedTo?.name || 'Unassigned'}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${stageColor.bg} ${stageColor.text} ${stageColor.border}`}
                              >
                                {inf.stage}
                              </span>
                            </div>
                          </td>

                          {/* Promo Code Inline Input */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                <input
                                  type="text"
                                  placeholder="e.g. AYESHA10"
                                  value={draftVal}
                                  onChange={(e) =>
                                    setCodeDrafts((prev) => ({
                                      ...prev,
                                      [inf.id]: e.target.value.toUpperCase(),
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isDirty) {
                                      e.preventDefault();
                                      handleSaveCodes([inf.id]);
                                    }
                                  }}
                                  className={`w-full pl-8 pr-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wide focus:outline-none focus:ring-2 transition-all ${
                                    isDirty
                                      ? 'border-amber-400 bg-white focus:ring-amber-500 text-slate-900'
                                      : hasSavedCode
                                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 focus:ring-emerald-500'
                                      : 'border-slate-200 bg-white text-slate-900 focus:ring-indigo-500'
                                  }`}
                                />
                              </div>

                              {isDirty ? (
                                <button
                                  type="button"
                                  onClick={() => handleSaveCodes([inf.id])}
                                  disabled={saving}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shrink-0 transition-colors"
                                  title="Save this code & notify executor"
                                >
                                  Save
                                </button>
                              ) : hasSavedCode ? (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(savedVal, `q-${inf.id}`)}
                                  className="p-1.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shrink-0"
                                  title="Copy promo code"
                                >
                                  {copiedId === `q-${inf.id}` ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCodeDrafts((prev) => ({
                                      ...prev,
                                      [inf.id]: suggestCode(inf.name, inf.igHandle),
                                    }))
                                  }
                                  className="p-1.5 rounded-xl text-violet-600 hover:bg-violet-50 border border-slate-200 transition-colors shrink-0"
                                  title="Suggest a code"
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Status & Clear Row */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isDirty ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Unsaved
                                </span>
                              ) : hasSavedCode ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Sent to {inf.assignedTo?.name || 'Exec'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                  Needs Code
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleClearQueue('ids', [inf.id])}
                                disabled={clearing}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Remove from this active list (keeps code on executor dashboard & archive)"
                              >
                                <X className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: MASTER CODES ARCHIVE (MONTHLY PERFORMANCE REVIEW)          */}
      {/* ===================================================================== */}
      {subTab === 'archive' && (
        <div className="space-y-4">
          {/* Monthly Review Banner */}
          <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-900 text-white rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-violet-100 border border-white/20">
                  Collective Promo Codes Vault
                </span>
                <span className="text-[11px] text-violet-200">
                  Permanent record · Never cleared
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold">
                Monthly Promo Code Performance Review
              </h3>
              <p className="text-xs text-violet-200/90 mt-0.5 max-w-2xl">
                Every custom promo code ever created stays stored here permanently. Come back once a month, log Shopify sales generated per code, sort by top performers, and decide which creators to re-book.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyExportTsv('archive')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Archive
              </button>
              <a
                href={`/api/promo-codes/export?scope=archive&format=csv&month=${archiveMonth}`}
                download
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-violet-950 hover:bg-violet-50 shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export Archive CSV
              </a>
            </div>
          </div>

          {/* Archive Filter & Save Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search code, creator, @handle, notes..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={archiveMonth}
                  onChange={(e) => setArchiveMonth(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="all">All Months ({stats.archiveTotalCount})</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={archiveExecutor}
                onChange={(e) => setArchiveExecutor(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Executors</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              <select
                value={archiveSort}
                onChange={(e) => setArchiveSort(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="newest">Sort: Newest Created</option>
                <option value="sales">Sort: Top Performing (Sales)</option>
                <option value="code">Sort: Code A–Z</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleSaveArchiveReview()}
              disabled={saving || dirtyArchiveIds.length === 0}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                dirtyArchiveIds.length > 0
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saving
                ? 'Saving...'
                : dirtyArchiveIds.length > 0
                ? `Save Review Updates (${dirtyArchiveIds.length})`
                : 'Review Saved'}
            </button>
          </div>

          {/* Master Archive Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-violet-500" />
                <p className="text-xs">Loading promo codes archive...</p>
              </div>
            ) : filteredArchive.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                  <Tag className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  No promo codes in the archive yet.
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Add custom codes in the{' '}
                  <button
                    type="button"
                    onClick={() => setSubTab('queue')}
                    className="text-indigo-600 font-bold underline"
                  >
                    New Locked Collabs Queue
                  </button>{' '}
                  and they will automatically appear here for monthly tracking and ROI review.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Promo Code</th>
                      <th className="px-4 py-3">Creator &amp; Contact</th>
                      <th className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span>Executor</span>
                          <select
                            value={archiveExecutor}
                            onChange={(e) => setArchiveExecutor(e.target.value)}
                            className="text-[10px] font-bold bg-white text-slate-700 border border-slate-300 rounded-lg px-2 py-0.5 normal-case tracking-normal shadow-2xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                          >
                            <option value="all">All</option>
                            {allUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 w-44">Sales Generated (PKR)</th>
                      <th className="px-4 py-3 min-w-[220px]">Monthly Review Notes</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredArchive.map((inf) => {
                      const draftSales = parseFloat(salesDrafts[inf.id] || '0') || 0;
                      const savedSales = inf.salesGenerated || 0;
                      const draftNote = (notesDrafts[inf.id] ?? '').trim();
                      const savedNote = (inf.codePerformanceNotes || '').trim();
                      const isRowDirty = draftSales !== savedSales || draftNote !== savedNote;
                      const postedDelivs = (inf.deliverables || []).filter((d: any) => d.received).length;
                      const totalDelivs = (inf.deliverables || []).length;

                      return (
                        <tr
                          key={inf.id}
                          className={`transition-colors ${
                            isRowDirty ? 'bg-violet-50/40' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Promo Code */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-900 border border-violet-200 font-mono font-bold text-xs tracking-wide">
                                {inf.discountCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(inf.discountCode, `a-${inf.id}`)}
                                className="p-1 rounded-lg text-slate-400 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                                title="Copy code"
                              >
                                {copiedId === `a-${inf.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Added{' '}
                              {new Date(inf.codeAssignedAt || inf.updatedAt).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Creator & Contact */}
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => onSelectInfluencer?.(inf)}
                              className="text-left group"
                            >
                              <span className="font-bold text-slate-900 group-hover:text-violet-700 block">
                                {inf.name}
                              </span>
                            </button>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              <a
                                href={`https://instagram.com/${(inf.igHandle || '').replace('@', '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-rose-600 font-bold hover:underline"
                              >
                                {inf.igHandle}
                              </a>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-500">{inf.phone}</span>
                            </div>
                          </td>

                          {/* Executor & Deal */}
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800 block">
                              {inf.assignedTo?.name || 'Unassigned'}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  inf.isPaid
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {inf.isPaid
                                  ? `Paid PKR ${(inf.amount || 0).toLocaleString()}`
                                  : 'Gifted'}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                                {postedDelivs}/{totalDelivs} posted
                              </span>
                            </div>
                          </td>

                          {/* Sales Generated */}
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={salesDrafts[inf.id] ?? ''}
                              onChange={(e) =>
                                setSalesDrafts((prev) => ({
                                  ...prev,
                                  [inf.id]: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-emerald-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            {inf.isPaid && inf.amount > 0 && draftSales > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                                {(draftSales / inf.amount).toFixed(1)}x ROAS
                              </span>
                            )}
                          </td>

                          {/* Monthly Review Notes */}
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="e.g. 18 orders, top converter, re-book..."
                              value={notesDrafts[inf.id] ?? ''}
                              onChange={(e) =>
                                setNotesDrafts((prev) => ({
                                  ...prev,
                                  [inf.id]: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </td>

                          {/* Save / View Action */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isRowDirty && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveArchiveReview([inf.id])}
                                  disabled={saving}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-xs transition-colors"
                                >
                                  Save
                                </button>
                              )}
                              {onSelectInfluencer && (
                                <button
                                  type="button"
                                  onClick={() => onSelectInfluencer(inf)}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                  Profile
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
