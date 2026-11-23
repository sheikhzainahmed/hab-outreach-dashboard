'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  MapPin,
  Phone,
  Package,
  Calendar,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  History,
  AlertCircle,
  FileText,
  User as UserIcon,
  Edit2,
  Check,
  Gift,
  DollarSign,
  Building,
  CreditCard,
  Ban,
  Trash2,
  ArrowRightLeft,
  UserCheck,
} from 'lucide-react';
import { STAGE_COLORS, PIPELINE_STAGES } from '@/lib/constants';

interface InfluencerDetailModalProps {
  influencer: any;
  currentUser: { id: string; role: string; name: string };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function InfluencerDetailModal({
  influencer,
  currentUser,
  isOpen,
  onClose,
  onUpdate,
}: InfluencerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'deliverables' | 'history'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [shippingName, setShippingName] = useState(influencer?.shippingName || '');
  const [address, setAddress] = useState(influencer?.address || '');
  const [phone, setPhone] = useState(influencer?.phone || '');
  const [city, setCity] = useState(influencer?.city || 'Lahore');
  const [notes, setNotes] = useState(influencer?.notes || '');

  // Team re-assignment state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(influencer?.assignedToId || '');

  // Deliverable proof modal state
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  const [proofInput, setProofInput] = useState('');

  // Fetch team members when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedAssigneeId(influencer?.assignedToId || '');
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            setTeamMembers(data.users.filter((u: any) => u.active !== false));
          }
        })
        .catch((err) => console.error('Failed to load team members:', err));
    }
  }, [isOpen, influencer]);

  if (!isOpen || !influencer) return null;

  const stageColor = STAGE_COLORS[influencer.stage] || STAGE_COLORS['Contacted'];
  const canEdit = (currentUser.role !== 'EXECUTOR' && currentUser.role !== 'COORDINATOR') || influencer.assignedToId === currentUser.id;

  const handleStageSelect = async (newStage: string) => {
    if (newStage === influencer.stage) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/influencers/${influencer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stage');
      setSuccessMsg(`Stage updated to "${newStage}"`);
      setTimeout(() => setSuccessMsg(null), 2500);
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShipping = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/influencers/${influencer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingName: shippingName.trim(),
          address: address.trim(),
          phone: phone.trim(),
          city: city.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save shipping info');
      setIsEditingShipping(false);
      setSuccessMsg('Shipping details saved successfully!');
      setTimeout(() => setSuccessMsg(null), 2500);
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedAssigneeId) {
      setError('Please select a team member to move this creator to.');
      return;
    }
    const targetUser = teamMembers.find((u) => u.id === selectedAssigneeId);
    if (
      !confirm(
        `Move creator "${influencer.name}" (@${influencer.igHandle}) to ${targetUser?.name || 'this team member'}'s profile?`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/influencers/${influencer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: selectedAssigneeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to move creator');
      setSuccessMsg(`Creator moved to ${targetUser?.name || 'new profile'} successfully!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
        onUpdate();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntirely = async () => {
    if (
      !confirm(
        `Are you sure you want to COMPLETELY delete "${influencer.name}" (@${influencer.igHandle})?\n\nThis will permanently remove the creator from your dashboard, the master CRM, spend approvals, and dispatch.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/influencers/${influencer.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete creator');
      onClose();
      onUpdate();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleToggleDeliverable = async (deliverable: any) => {
    setError(null);
    if (!deliverable.received) {
      setSelectedDeliverable(deliverable);
      setProofInput(deliverable.proofUrl || '');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/deliverables/${deliverable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ received: false }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProofAndReceive = async () => {
    if (!selectedDeliverable) return;
    if (!proofInput.trim()) {
      setError('Proof is mandatory: Please paste an Instagram story/reel link or screenshot URL.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deliverables/${selectedDeliverable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          received: true,
          proofUrl: proofInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedDeliverable(null);
      setProofInput('');
      setSuccessMsg('Deliverable verified and marked received!');
      setTimeout(() => setSuccessMsg(null), 2500);
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-slate-100">
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-rose-200">
                {influencer.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{influencer.name}</h2>
                  <span className="text-xs text-amber-500 font-medium">{influencer.stars}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <a
                    href={`https://instagram.com/${influencer.igHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-rose-600 hover:underline font-bold flex items-center gap-1"
                  >
                    {influencer.igHandle}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>•</span>
                  <span>{influencer.followerCount?.toLocaleString()} followers</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                    {influencer.category || 'Lifestyle'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={handleDeleteEntirely}
                  disabled={loading}
                  className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete creator entirely"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clean Interactive Stage Progression Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Pipeline Stage (Click to advance)
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PIPELINE_STAGES.filter((s) => s !== 'Removed / on hold').map((s) => {
                const isCurrent = influencer.stage === s;
                return (
                  <button
                    key={s}
                    disabled={!canEdit || loading}
                    onClick={() => handleStageSelect(s)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all border ${
                      isCurrent
                        ? `${stageColor.bg} ${stageColor.text} ${stageColor.border} shadow-sm ring-2 ring-rose-400/20`
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-bold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 px-6 border-b border-slate-100 text-xs font-bold text-slate-500">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'details' ? 'border-rose-600 text-rose-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Overview & Shipping
          </button>
          <button
            onClick={() => setActiveTab('deliverables')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'deliverables' ? 'border-rose-600 text-rose-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Deliverables ({influencer.deliverables?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'border-rose-600 text-rose-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit History
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Package & Terms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    PR Package
                  </span>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {influencer.products || influencer.prPackage}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Dispatch Status:{' '}
                    <span className="font-bold text-purple-700">{influencer.dispatch?.status || 'Ready'}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Commercial Terms
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {influencer.isPaid ? `PKR ${influencer.amount?.toLocaleString()}` : 'Gifted PR Package'}
                  </p>
                  {influencer.isPaid && influencer.paymentTerms && (
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      Terms: {influencer.paymentTerms}
                    </p>
                  )}
                  {influencer.isPaid && influencer.bankName && (
                    <div className="text-[10px] text-slate-700 bg-white p-1.5 rounded-lg border border-slate-200 mt-1.5 space-y-0.5">
                      <div className="font-bold flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{influencer.bankName}</span>
                      </div>
                      <div>Title: <span className="font-semibold">{influencer.accountTitle || 'N/A'}</span></div>
                      <div className="font-mono text-slate-600">Acc: {influencer.accountNumber || 'N/A'}</div>
                    </div>
                  )}
                  {influencer.approval && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      Approval:{' '}
                      <span className={`font-bold ${
                        influencer.approval.status === 'APPROVED' ? 'text-emerald-600' : influencer.approval.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {influencer.approval.status}
                      </span>
                    </p>
                  )}
                  {influencer.doNotShip && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 mt-1.5">
                      <Ban className="w-3 h-3" />
                      Do Not Ship (Payment Only)
                    </span>
                  )}
                  {influencer.isPaid && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-semibold text-slate-500">Payout Status:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        influencer.paymentStatus === 'FULLY_PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : influencer.paymentStatus === 'ADVANCE_PAID'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {influencer.paymentStatus === 'FULLY_PAID'
                          ? 'Fully Paid ✓'
                          : influencer.paymentStatus === 'ADVANCE_PAID'
                          ? 'Advance Paid'
                          : 'Pending Payout'}
                      </span>
                    </div>
                  )}
                  {influencer.paymentProofUrl && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      Payment Ref: {influencer.paymentProofUrl}
                    </p>
                  )}
                </div>
              </div>

              {/* Shipping Details Box (Editable) */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>Shipping Address</span>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setIsEditingShipping(!isEditingShipping)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      {isEditingShipping ? 'Cancel' : 'Edit Details'}
                    </button>
                  )}
                </div>

                {isEditingShipping ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Shipping Name
                      </label>
                      <input
                        type="text"
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Street Address
                      </label>
                      <textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveShipping}
                        disabled={loading}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                      >
                        {loading ? 'Saving...' : 'Save Shipping Info'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">{influencer.shippingName || influencer.name}</p>
                    <p className="text-slate-600">{influencer.address || 'Address not added yet'}</p>
                    <div className="flex items-center gap-4 pt-1 text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {influencer.phone || 'No phone'}
                      </span>
                      <span>City: {influencer.city || 'Lahore'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Assignment & Move Creator */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Assigned Team Member</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Originally added by {influencer.createdBy?.name || 'Team'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    disabled={!canEdit || loading}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>

                  {canEdit && selectedAssigneeId !== (influencer.assignedToId || '') && (
                    <button
                      type="button"
                      onClick={handleReassign}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5 transition-all shrink-0"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Move Creator
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                  <span>
                    Current profile: <strong className="text-slate-800">{influencer.assignedTo?.name || 'Unassigned'}</strong>
                  </span>
                  <span>
                    Last updated {new Date(influencer.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Danger Zone: Delete Creator Entirely */}
              {canEdit && (
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      Delete Creator Entirely
                    </span>
                    <p className="text-[11px] text-rose-800/80 mt-0.5">
                      Completely removes this creator from your dashboard, dispatch, spend approvals, and all CRM records.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteEntirely}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center justify-center gap-1.5 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Creator
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deliverables' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Check off items once posted. Proof link or screenshot URL is required.
              </p>

              {influencer.deliverables?.map((deliv: any) => (
                <div
                  key={deliv.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    deliv.received ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleDeliverable(deliv)}
                      disabled={!canEdit || loading}
                      className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                        deliv.received
                          ? 'bg-emerald-600 text-white'
                          : 'border-2 border-slate-300 hover:border-rose-500'
                      }`}
                    >
                      {deliv.received && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <p className={`text-xs font-bold ${deliv.received ? 'text-emerald-900 line-through' : 'text-slate-900'}`}>
                        {deliv.type}
                      </p>
                      {deliv.dueDate && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Due: {new Date(deliv.dueDate).toLocaleDateString()}
                        </p>
                      )}
                      {deliv.proofUrl && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600">
                          <span className="font-semibold text-[11px]">Proof:</span>
                          <a
                            href={deliv.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline flex items-center gap-1 truncate max-w-xs text-[11px]"
                          >
                            {deliv.proofUrl}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    deliv.received ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {deliv.received ? 'Completed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {influencer.activityLogs?.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                    {log.changedBy?.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{log.details || log.action}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {log.changedBy?.name} • {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deliverable Proof Sub-Modal */}
        {selectedDeliverable && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Attach Proof of Deliverable</h3>
                <button onClick={() => setSelectedDeliverable(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Paste the Instagram link or screenshot URL for &ldquo;{selectedDeliverable.type}&rdquo;:
              </p>
              <div>
                <input
                  type="url"
                  required
                  placeholder="https://www.instagram.com/reel/..."
                  value={proofInput}
                  onChange={(e) => setProofInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setSelectedDeliverable(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProofAndReceive}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {loading ? 'Verifying...' : 'Save & Mark Received'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
