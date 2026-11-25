'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import InfluencerDetailModal from '@/components/influencers/InfluencerDetailModal';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Copy,
  Check,
  FileSpreadsheet,
  Phone,
  MapPin,
  ExternalLink,
  Save,
  AlertCircle,
  RefreshCw,
  X,
  Trash2,
} from 'lucide-react';

interface DispatchItem {
  id: string;
  status: string; // 'Ready' | 'Sent to ops' | 'Shipped' | 'Delivered'
  sentToOpsDate: string | null;
  shippedDate: string | null;
  deliveredDate: string | null;
  trackingNumber: string | null;
  shippingNotes: string | null;
  createdAt: string;
  influencer: {
    id: string;
    name: string;
    igHandle: string;
    shippingName: string;
    address: string;
    phone: string;
    city: string | null;
    products: string | null;
    prPackage: string;
    stage: string;
    createdAt: string;
    assignedTo: {
      id: string;
      name: string;
    } | null;
  };
}

function OperationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status') || 'all';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [executorFilter, setExecutorFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'Ready' | 'Shipped' | 'Delivered'>(
    statusParam === 'Ready' || statusParam === 'Shipped' || statusParam === 'Delivered'
      ? statusParam
      : 'all'
  );

  // Inline Tracking inputs (keyed by dispatch ID)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [savingTrackingId, setSavingTrackingId] = useState<string | null>(null);

  // Copy Feedback
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);

  useEffect(() => {
    if (statusParam === 'Ready' || statusParam === 'Shipped' || statusParam === 'Delivered') {
      setActiveTab(statusParam);
    } else {
      setActiveTab('all');
    }
  }, [statusParam]);

  useEffect(() => {
    fetchSession();
    loadDispatches();
  }, []);

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
      const res = await fetch('/api/dispatch?status=all');
      if (res.ok) {
        const data = await res.json();
        const items: DispatchItem[] = data.dispatches || [];
        setDispatches(items);

        // Prepopulate tracking inputs
        const initialTracking: Record<string, string> = {};
        items.forEach((item) => {
          initialTracking[item.id] = item.trackingNumber || '';
        });
        setTrackingInputs(initialTracking);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Status Counts
  const counts = useMemo(() => {
    let ready = 0;
    let shipped = 0;
    let delivered = 0;

    dispatches.forEach((d) => {
      if (d.status === 'Ready' || d.status === 'Sent to ops') ready++;
      else if (d.status === 'Shipped') shipped++;
      else if (d.status === 'Delivered') delivered++;
    });

    return {
      all: dispatches.length,
      ready,
      shipped,
      delivered,
    };
  }, [dispatches]);

  // Double Entry Detection: Identify any orders that share a phone number or name
  const duplicatePhoneSet = useMemo(() => {
    const counts: Record<string, number> = {};
    dispatches.forEach((d) => {
      const p = (d.influencer?.phone || '').replace(/\D/g, '');
      if (p.length >= 7) {
        counts[p] = (counts[p] || 0) + 1;
      }
    });
    return new Set(Object.keys(counts).filter((p) => counts[p] > 1));
  }, [dispatches]);

  // Executor list with counts for dropdown filter
  const dispatchExecutors = useMemo(() => {
    const map: Record<string, number> = {};
    dispatches.forEach((d) => {
      const name = d.influencer?.assignedTo?.name || 'Unassigned';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [dispatches]);

  // Filtered & Searched Orders
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((item) => {
      // Tab filter
      if (activeTab === 'Ready' && item.status !== 'Ready' && item.status !== 'Sent to ops') {
        return false;
      }
      if (activeTab === 'Shipped' && item.status !== 'Shipped') {
        return false;
      }
      if (activeTab === 'Delivered' && item.status !== 'Delivered') {
        return false;
      }

      // Executor filter
      if (
        executorFilter !== 'all' &&
        (item.influencer?.assignedTo?.name || 'Unassigned').toLowerCase() !== executorFilter.toLowerCase()
      ) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (item.influencer?.name || '').toLowerCase();
        const handle = (item.influencer?.igHandle || '').toLowerCase();
        const phone = (item.influencer?.phone || '').toLowerCase();
        const city = (item.influencer?.city || '').toLowerCase();
        const addr = (item.influencer?.address || '').toLowerCase();
        const pro = (item.influencer?.products || item.influencer?.prPackage || '').toLowerCase();
        const trk = (item.trackingNumber || '').toLowerCase();
        const exec = (item.influencer?.assignedTo?.name || '').toLowerCase();

        return (
          name.includes(q) ||
          handle.includes(q) ||
          phone.includes(q) ||
          city.includes(q) ||
          addr.includes(q) ||
          pro.includes(q) ||
          trk.includes(q) ||
          exec.includes(q)
        );
      }

      return true;
    });
  }, [dispatches, activeTab, executorFilter, search]);

  // Update Status Action (Mark Dispatched / Mark Delivered)
  const handleUpdateStatus = async (dispatchId: string, newStatus: string) => {
    setUpdatingId(dispatchId);
    try {
      const tracking = trackingInputs[dispatchId]?.trim() || undefined;
      const res = await fetch('/api/dispatch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dispatchId,
          status: newStatus,
          ...(tracking && { trackingNumber: tracking }),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
        return;
      }

      await loadDispatches();
    } catch (e) {
      console.error(e);
      alert('Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete Dispatch Row (Remove demo / cancelled order from dispatch queue)
  const handleDeleteRow = async (dispatchId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the dispatch order for "${name}"?\nThis will remove it from Ali's dispatch queue.`)) {
      return;
    }
    setDeletingId(dispatchId);
    try {
      const res = await fetch(`/api/dispatch?id=${dispatchId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDispatches((prev) => prev.filter((d) => d.id !== dispatchId));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete dispatch order');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting row');
    } finally {
      setDeletingId(null);
    }
  };

  // Save Tracking Number Inline
  const handleSaveTracking = async (dispatchId: string) => {
    setSavingTrackingId(dispatchId);
    try {
      const tracking = trackingInputs[dispatchId]?.trim() || '';
      const res = await fetch('/api/dispatch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dispatchId,
          trackingNumber: tracking,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save tracking number');
        return;
      }

      // Update local state directly
      setDispatches((prev) =>
        prev.map((d) => (d.id === dispatchId ? { ...d, trackingNumber: tracking } : d))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSavingTrackingId(null);
    }
  };

  // Copy Ops Sheet in Exact Confirmed Orders Google Sheet Format
  const handleCopyOpsSheet = () => {
    const headers = ['NAME', 'Address', 'Number', 'Pro ', 'Amount', 'Qty', 'City', 'Order'];
    const rows = filteredDispatches.map((d) => [
      d.influencer.shippingName || d.influencer.name,
      d.influencer.address,
      d.influencer.phone,
      d.influencer.products || d.influencer.prPackage,
      '0', // PR package amount = 0
      '1', // Standard quantity = 1
      d.influencer.city || 'Lahore',
      d.status === 'Ready' || d.status === 'Sent to ops'
        ? 'To be dispatched'
        : d.status === 'Shipped'
        ? 'Dispatched'
        : 'Delivered',
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 2500);
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const headers = ['NAME', 'Address', 'Number', 'Products', 'Tracking', 'City', 'Status', 'LockedBy'];
    const rows = filteredDispatches.map((d) => [
      `"${(d.influencer.shippingName || d.influencer.name).replace(/"/g, '""')}"`,
      `"${(d.influencer.address || '').replace(/"/g, '""')}"`,
      `"${(d.influencer.phone || '').replace(/"/g, '""')}"`,
      `"${(d.influencer.products || d.influencer.prPackage || '').replace(/"/g, '""')}"`,
      `"${(d.trackingNumber || '').replace(/"/g, '""')}"`,
      `"${(d.influencer.city || '').replace(/"/g, '""')}"`,
      `"${d.status}"`,
      `"${(d.influencer.assignedTo?.name || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HAB_Confirmed_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
    } catch {
      return dateStr;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-800 flex items-center justify-center text-white shadow-md animate-pulse">
          <Package className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
          Loading Operations Workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar currentUser={currentUser} allUsers={allUsers} />

      <div className="flex">
        <Sidebar role={currentUser.role} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/30 text-teal-100 border border-teal-400/30">
                  Operations & Physical Dispatch
                </span>
                <span className="text-xs text-teal-200">Confirmed Orders Master</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                Physical Dispatch Dashboard
              </h1>
              <p className="text-xs text-teal-100/80 mt-1 max-w-2xl">
                Simple view modeled directly after the Confirmed Orders sheet. Pack products, assign tracking numbers, and advance orders into dispatch.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyOpsSheet}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-teal-900 hover:bg-teal-50 shadow-md flex items-center gap-1.5 transition-colors"
                title="Copy formatted 8 columns for TCS / PostEx / Courier"
              >
                {copiedTsv ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-teal-700" />}
                {copiedTsv ? 'Copied to Clipboard!' : 'Copy Courier Sheet'}
              </button>
              <button
                onClick={handleDownloadCsv}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal-800/80 hover:bg-teal-800 text-teal-100 border border-teal-600/40 flex items-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={loadDispatches}
                disabled={loading}
                className="p-2 rounded-xl bg-teal-800/80 hover:bg-teal-800 text-teal-100 border border-teal-600/40 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => {
                setActiveTab('all');
                router.push('/operations');
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeTab === 'all'
                  ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">All Confirmed</span>
                <Package className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{counts.all}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Total orders in pipeline</p>
            </button>

            <button
              onClick={() => {
                setActiveTab('Ready');
                router.push('/operations?status=Ready');
              }}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                activeTab === 'Ready'
                  ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">To Be Dispatched</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-900">{counts.ready}</p>
              <p className="text-[11px] text-amber-700 mt-0.5 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Action required (needs packing)
              </p>
            </button>

            <button
              onClick={() => {
                setActiveTab('Shipped');
                router.push('/operations?status=Shipped');
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeTab === 'Shipped'
                  ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Dispatched</span>
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{counts.shipped}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">In courier transit</p>
            </button>

            <button
              onClick={() => {
                setActiveTab('Delivered');
                router.push('/operations?status=Delivered');
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeTab === 'Delivered'
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Delivered</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-900">{counts.delivered}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Products delivered to creators</p>
            </button>
          </div>

          {/* Controls Bar: Search & Status Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Search Input & Executor Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search creator, phone, city, product, tracking #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={executorFilter}
                onChange={(e) => setExecutorFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50/70 text-xs font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Executors ({dispatches.length})</option>
                {dispatchExecutors.map((e) => (
                  <option key={e.name} value={e.name}>
                    {e.name} ({e.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => {
                  setActiveTab('all');
                  router.push('/operations');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => {
                  setActiveTab('Ready');
                  router.push('/operations?status=Ready');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'Ready'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                To Be Dispatched ({counts.ready})
              </button>
              <button
                onClick={() => {
                  setActiveTab('Shipped');
                  router.push('/operations?status=Shipped');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'Shipped'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                Dispatched ({counts.shipped})
              </button>
              <button
                onClick={() => {
                  setActiveTab('Delivered');
                  router.push('/operations?status=Delivered');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'Delivered'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Delivered ({counts.delivered})
              </button>
            </div>
          </div>

          {/* Orders Data Table (Spreadsheet View) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center">#</th>
                    <th className="px-3 py-3 w-20">Date</th>
                    <th className="px-4 py-3 min-w-[150px]">Creator / Recipient</th>
                    <th className="px-4 py-3 min-w-[140px]">Phone Number</th>
                    <th className="px-3 py-3 min-w-[90px]">City</th>
                    <th className="px-4 py-3 min-w-[200px]">Delivery Address</th>
                    <th className="px-4 py-3 min-w-[180px]">Products to Pack</th>
                    <th className="px-4 py-3 min-w-[170px]">Courier Tracking #</th>
                    <th className="px-4 py-3 min-w-[150px] text-center">Dispatch Status</th>
                    <th className="px-3 py-3 min-w-[150px]">
                      <div className="flex items-center gap-1.5">
                        <span>Locked By</span>
                        <select
                          value={executorFilter}
                          onChange={(e) => setExecutorFilter(e.target.value)}
                          className="text-[10px] font-bold bg-white text-slate-700 border border-slate-300 rounded-lg px-2 py-0.5 normal-case tracking-normal shadow-2xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="all">All</option>
                          {dispatchExecutors.map((e) => (
                            <option key={e.name} value={e.name}>
                              {e.name} ({e.count})
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="px-2 py-3 w-10 text-center" title="Delete demo/order row"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDispatches.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        No orders match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDispatches.map((item, idx) => {
                      const isReady = item.status === 'Ready' || item.status === 'Sent to ops';
                      const isShipped = item.status === 'Shipped';
                      const isDelivered = item.status === 'Delivered';
                      const orderDateFormatted = formatDate(item.sentToOpsDate || item.influencer.createdAt);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isReady ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* Row Index */}
                          <td className="px-3 py-3 text-center text-slate-400 text-[11px] font-mono">
                            {idx + 1}
                          </td>

                          {/* Order Date */}
                          <td className="px-3 py-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                            {orderDateFormatted}
                          </td>

                          {/* Creator Name */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedInfluencer(item.influencer)}
                              className="font-bold text-slate-900 hover:text-teal-700 text-left transition-colors block"
                            >
                              {item.influencer.shippingName || item.influencer.name}
                            </button>
                            <span className="text-[11px] text-teal-700 font-medium">
                              {item.influencer.igHandle}
                            </span>
                          </td>

                          {/* Phone / WhatsApp */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-slate-800">
                                {item.influencer.phone}
                              </span>
                              {duplicatePhoneSet.has((item.influencer.phone || '').replace(/\D/g, '')) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title="Another order exists with this phone number">
                                  Duplicate
                                </span>
                              )}
                              {item.influencer.phone && (
                                <a
                                  href={`https://wa.me/${item.influencer.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded"
                                  title="Open WhatsApp"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* City */}
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] whitespace-nowrap">
                              {item.influencer.city || 'Lahore'}
                            </span>
                          </td>

                          {/* Delivery Address */}
                          <td className="px-4 py-3 text-xs text-slate-700 max-w-xs">
                            <div className="line-clamp-2" title={item.influencer.address}>
                              {item.influencer.address || '-'}
                            </div>
                          </td>

                          {/* Products */}
                          <td className="px-4 py-3">
                            <div className="inline-block px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-100 text-teal-900 font-semibold text-[11px] max-w-xs">
                              {item.influencer.products || item.influencer.prPackage || 'PR Package'}
                            </div>
                          </td>

                          {/* Inline Tracking Number */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Enter tracking..."
                                value={trackingInputs[item.id] ?? ''}
                                onChange={(e) =>
                                  setTrackingInputs((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveTracking(item.id);
                                }}
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                              />
                              {(trackingInputs[item.id] ?? '') !== (item.trackingNumber ?? '') && (
                                <button
                                  onClick={() => handleSaveTracking(item.id)}
                                  disabled={savingTrackingId === item.id}
                                  className="p-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm shrink-0"
                                  title="Save Tracking"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Dispatch Status & 1-Click Action */}
                          <td className="px-4 py-3 text-center">
                            {isReady && (
                              <button
                                onClick={() => handleUpdateStatus(item.id, 'Shipped')}
                                disabled={updatingId === item.id}
                                className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                title="Click to advance status to Dispatched"
                              >
                                <Truck className="w-3.5 h-3.5 text-amber-800" />
                                {updatingId === item.id ? 'Updating...' : 'Mark Dispatched'}
                              </button>
                            )}

                            {isShipped && (
                              <button
                                onClick={() => handleUpdateStatus(item.id, 'Delivered')}
                                disabled={updatingId === item.id}
                                className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                title="Click when courier confirms delivery. This will notify the assigned executor!"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-800" />
                                {updatingId === item.id ? 'Updating...' : 'Mark Delivered'}
                              </button>
                            )}

                            {isDelivered && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                Delivered
                              </span>
                            )}
                          </td>

                          {/* Locked By / Executor */}
                          <td className="px-3 py-3 text-slate-600 font-semibold text-xs whitespace-nowrap">
                            {item.influencer.assignedTo?.name || 'Amna'}
                          </td>

                          {/* Delete Row (Small Cross) */}
                          <td className="px-2 py-3 text-center">
                            <button
                              onClick={() => handleDeleteRow(item.id, item.influencer.name)}
                              disabled={deletingId === item.id}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              title="Delete this demo/order from dispatch queue"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <div>
                Showing <span className="font-bold text-slate-800">{filteredDispatches.length}</span> of{' '}
                <span className="font-bold text-slate-800">{dispatches.length}</span> total confirmed orders
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> To be dispatched: {counts.ready}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> In transit: {counts.shipped}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Delivered: {counts.delivered}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Influencer Detail Modal */}
      {selectedInfluencer && (
        <InfluencerDetailModal
          influencer={selectedInfluencer}
          currentUser={currentUser}
          isOpen={true}
          onClose={() => setSelectedInfluencer(null)}
          onUpdate={loadDispatches}
        />
      )}
    </div>
  );
}

export default function OperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
          Loading Operations Center...
        </div>
      }
    >
      <OperationsContent />
    </Suspense>
  );
}
