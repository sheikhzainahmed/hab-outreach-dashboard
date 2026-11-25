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
  Tag,
  Copy,
  Percent,
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

  // Custom Promo Code state
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState(influencer?.discountCode || '');
  const [displayedPromoCode, setDisplayedPromoCode] = useState(influencer?.discountCode || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDm, setCopiedDm] = useState(false);

  // Editable Payment & Bank Details state
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [editIsPaid, setEditIsPaid] = useState(Boolean(influencer?.isPaid));
  const [editAmount, setEditAmount] = useState(String(influencer?.amount || 0));
  const [editAdvancePct, setEditAdvancePct] = useState(String(influencer?.advancePercentage || 0));
  const [editCompletionPct, setEditCompletionPct] = useState(
    String(
      influencer?.completionPercentage !== undefined && influencer?.completionPercentage !== null
        ? influencer.completionPercentage
        : 100 - (influencer?.advancePercentage || 0)
    )
  );
  const [editBankName, setEditBankName] = useState(
    influencer?.bankName && influencer.bankName !== 'Not Provided' ? influencer.bankName : ''
  );
  const [editAccountTitle, setEditAccountTitle] = useState(
    influencer?.accountTitle && influencer.accountTitle !== 'Not Provided' ? influencer.accountTitle : ''
  );
  const [editAccountNumber, setEditAccountNumber] = useState(
    influencer?.accountNumber && influencer.accountNumber !== 'Not Provided' ? influencer.accountNumber : ''
  );
  const [editDoNotShip, setEditDoNotShip] = useState(Boolean(influencer?.doNotShip));

  // Local display snapshot for commercial terms (updates immediately upon save)
  const [savedPaymentView, setSavedPaymentView] = useState({
    isPaid: Boolean(influencer?.isPaid),
    amount: influencer?.amount || 0,
    advancePercentage: influencer?.advancePercentage || 0,
    completionPercentage:
      influencer?.completionPercentage !== undefined && influencer?.completionPercentage !== null
        ? influencer.completionPercentage
        : 100 - (influencer?.advancePercentage || 0),
    paymentTerms: influencer?.paymentTerms || '',
    bankName: influencer?.bankName && influencer.bankName !== 'Not Provided' ? influencer.bankName : '',
    accountTitle: influencer?.accountTitle && influencer.accountTitle !== 'Not Provided' ? influencer.accountTitle : '',
    accountNumber: influencer?.accountNumber && influencer.accountNumber !== 'Not Provided' ? influencer.accountNumber : '',
    doNotShip: Boolean(influencer?.doNotShip),
  });

  // Deliverable proof modal state
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  const [proofInput, setProofInput] = useState('');

  // Fetch team members when opened
  useEffect(() => {
    if (isOpen && influencer) {
      setSelectedAssigneeId(influencer?.assignedToId || '');
      setPromoCodeInput(influencer?.discountCode || '');
      setDisplayedPromoCode(influencer?.discountCode || '');
      setIsEditingCode(false);

      const cleanBank = influencer?.bankName && influencer.bankName !== 'Not Provided' ? influencer.bankName : '';
      const cleanTitle = influencer?.accountTitle && influencer.accountTitle !== 'Not Provided' ? influencer.accountTitle : '';
      const cleanAcc = influencer?.accountNumber && influencer.accountNumber !== 'Not Provided' ? influencer.accountNumber : '';
      const advP = influencer?.advancePercentage || 0;
      const compP =
        influencer?.completionPercentage !== undefined && influencer?.completionPercentage !== null
          ? influencer.completionPercentage
          : 100 - advP;

      setIsEditingPayment(false);
      setEditIsPaid(Boolean(influencer?.isPaid));
      setEditAmount(String(influencer?.amount || 0));
      setEditAdvancePct(String(advP));
      setEditCompletionPct(String(compP));
      setEditBankName(cleanBank);
      setEditAccountTitle(cleanTitle);
      setEditAccountNumber(cleanAcc);
      setEditDoNotShip(Boolean(influencer?.doNotShip));
      setSavedPaymentView({
        isPaid: Boolean(influencer?.isPaid),
        amount: influencer?.amount || 0,
        advancePercentage: advP,
        completionPercentage: compP,
        paymentTerms: influencer?.paymentTerms || '',
        bankName: cleanBank,
        accountTitle: cleanTitle,
        accountNumber: cleanAcc,
        doNotShip: Boolean(influencer?.doNotShip),
      });

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
  const canEdit = Boolean(
    currentUser &&
    ((currentUser.role !== 'EXECUTOR' && currentUser.role !== 'COORDINATOR') ||
      influencer.assignedToId === currentUser.id)
  );

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

  const handleSavePromoCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/promo-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencerId: influencer.id,
          discountCode: promoCodeInput.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save promo code');
      const finalCode = promoCodeInput.trim().toUpperCase();
      setDisplayedPromoCode(finalCode);
      setIsEditingCode(false);
      setSuccessMsg(finalCode ? 'Custom promo code updated and synced to executor!' : 'Promo code removed.');
      setTimeout(() => setSuccessMsg(null), 2500);
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentDetails = async () => {
    setError(null);
    setLoading(true);
    try {
      const numericAmount = editIsPaid ? parseFloat(editAmount) || 0 : 0;
      const advPct = editIsPaid ? Math.min(100, Math.max(0, parseInt(editAdvancePct, 10) || 0)) : 0;
      const compPct = editIsPaid ? Math.min(100, Math.max(0, parseInt(editCompletionPct, 10) || 100 - advPct)) : 100;
      const computedTerms = editIsPaid
        ? advPct > 0
          ? `${advPct}% Advance / ${compPct}% on Completion`
          : '0% Advance / 100% on Completion'
        : null;

      const res = await fetch(`/api/influencers/${influencer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaid: editIsPaid,
          amount: numericAmount,
          advancePercentage: advPct,
          completionPercentage: compPct,
          paymentTerms: computedTerms,
          bankName: editIsPaid ? editBankName.trim() : null,
          accountTitle: editIsPaid ? editAccountTitle.trim() : null,
          accountNumber: editIsPaid ? editAccountNumber.trim() : null,
          doNotShip: editDoNotShip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save payment details');

      setSavedPaymentView({
        isPaid: editIsPaid,
        amount: numericAmount,
        advancePercentage: advPct,
        completionPercentage: compPct,
        paymentTerms: computedTerms || '',
        bankName: editIsPaid ? editBankName.trim() : '',
        accountTitle: editIsPaid ? editAccountTitle.trim() : '',
        accountNumber: editIsPaid ? editAccountNumber.trim() : '',
        doNotShip: editDoNotShip,
      });
      setIsEditingPayment(false);
      setSuccessMsg('Payment & bank details saved successfully!');
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
              {PIPELINE_STAGES.filter((s) => !['Contacted', 'Removed / on hold'].includes(s)).map((s) => {
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

                <div className={`p-4 rounded-2xl bg-slate-50 border border-slate-200/80 ${isEditingPayment ? 'sm:col-span-2' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Commercial Terms &amp; Payment Details
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setIsEditingPayment(!isEditingPayment)}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        {isEditingPayment
                          ? 'Cancel'
                          : savedPaymentView.bankName || savedPaymentView.isPaid
                          ? 'Edit Payment'
                          : 'Add Payment Details'}
                      </button>
                    )}
                  </div>

                  {isEditingPayment ? (
                    <div className="space-y-3 pt-2">
                      {/* Gifted vs Paid Toggle */}
                      <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs w-fit">
                        <button
                          type="button"
                          onClick={() => setEditIsPaid(false)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            !editIsPaid ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Gift className="w-3.5 h-3.5" />
                          Gifted / Barter
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditIsPaid(true)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            editIsPaid ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Paid Collab
                        </button>
                      </div>

                      {editIsPaid && (
                        <div className="space-y-3">
                          {/* Fee Amount */}
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Agreed Fee (PKR)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              placeholder="e.g. 15000"
                              className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <div className="flex flex-wrap items-center gap-1">
                              {['8000', '10000', '15000', '20000', '25000', '30000', '35000'].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setEditAmount(amt)}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                                    editAmount === amt
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {parseInt(amt, 10) / 1000}k
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Payment Split (% Advance / % on Completion) */}
                          <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-1.5">
                              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                <Percent className="w-3 h-3 text-amber-600" />
                                Payment Schedule (% Split)
                              </span>
                              <div className="flex items-center gap-1">
                                {[
                                  { label: '50% / 50%', adv: '50', comp: '50' },
                                  { label: '0% / 100%', adv: '0', comp: '100' },
                                  { label: '100% Adv', adv: '100', comp: '0' },
                                ].map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                      setEditAdvancePct(preset.adv);
                                      setEditCompletionPct(preset.comp);
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold border transition-colors ${
                                      editAdvancePct === preset.adv && editCompletionPct === preset.comp
                                        ? 'bg-amber-600 text-white border-amber-600'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  % In Advance
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editAdvancePct}
                                  onChange={(e) => {
                                    const v = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                                    setEditAdvancePct(String(v));
                                    setEditCompletionPct(String(100 - v));
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  PKR {Math.round(((parseFloat(editAmount) || 0) * (parseInt(editAdvancePct, 10) || 0)) / 100).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  % On Completion
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editCompletionPct}
                                  onChange={(e) => {
                                    const v = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                                    setEditCompletionPct(String(v));
                                    setEditAdvancePct(String(100 - v));
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  PKR {Math.round(((parseFloat(editAmount) || 0) * (parseInt(editCompletionPct, 10) || 0)) / 100).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bank Account Details */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-slate-500" />
                              Creator Bank / Wallet Details
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  Bank Name / Wallet
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Meezan Bank, HBL, SadaPay"
                                  value={editBankName}
                                  onChange={(e) => setEditBankName(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  Account Title
                                </label>
                                <input
                                  type="text"
                                  placeholder="Account holder name"
                                  value={editAccountTitle}
                                  onChange={(e) => setEditAccountTitle(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Account Number / IBAN
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. PK36 MEZN 0002 1234 5678 9012"
                                value={editAccountNumber}
                                onChange={(e) => setEditAccountNumber(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Do Not Ship toggle */}
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer pt-0.5">
                        <input
                          type="checkbox"
                          checked={editDoNotShip}
                          onChange={(e) => setEditDoNotShip(e.target.checked)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Do not ship product (Payment / Digital Only)</span>
                      </label>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingPayment(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePaymentDetails}
                          disabled={loading}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          {loading ? 'Saving...' : 'Save Payment Details'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-900">
                        {savedPaymentView.isPaid ? `PKR ${savedPaymentView.amount?.toLocaleString()}` : 'Gifted PR Package'}
                      </p>
                      {savedPaymentView.isPaid && savedPaymentView.paymentTerms && (
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          Terms: {savedPaymentView.paymentTerms}
                        </p>
                      )}
                      {savedPaymentView.isPaid && (savedPaymentView.bankName || savedPaymentView.accountTitle || savedPaymentView.accountNumber) ? (
                        <div className="text-[10px] text-slate-700 bg-white p-1.5 rounded-lg border border-slate-200 mt-1.5 space-y-0.5">
                          <div className="font-bold flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{savedPaymentView.bankName || 'Bank not set'}</span>
                          </div>
                          <div>Title: <span className="font-semibold">{savedPaymentView.accountTitle || 'N/A'}</span></div>
                          <div className="font-mono text-slate-600">Acc: {savedPaymentView.accountNumber || 'N/A'}</div>
                        </div>
                      ) : savedPaymentView.isPaid && canEdit ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingPayment(true)}
                          className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 hover:bg-amber-100/80 text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1 transition-colors"
                        >
                          <CreditCard className="w-3 h-3" />
                          + Add Bank Details &amp; Payment Split
                        </button>
                      ) : null}
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
                      {savedPaymentView.doNotShip && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 mt-1.5">
                          <Ban className="w-3 h-3" />
                          Do Not Ship (Payment Only)
                        </span>
                      )}
                      {savedPaymentView.isPaid && (
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
                    </>
                  )}
                </div>
              </div>

              {/* Custom Promo Code Banner (Visible to Executor to Share with Influencer) */}
              {(displayedPromoCode || currentUser?.role === 'MANAGER' || currentUser?.role === 'OWNER') && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-violet-950">
                      <Tag className="w-4 h-4 text-violet-600" />
                      <span>Custom Creator Promo Code</span>
                    </div>
                    {(currentUser?.role === 'MANAGER' || currentUser?.role === 'OWNER') && (
                      <button
                        type="button"
                        onClick={() => setIsEditingCode(!isEditingCode)}
                        className="text-[11px] text-violet-700 hover:text-violet-900 font-bold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        {isEditingCode ? 'Cancel' : displayedPromoCode ? 'Edit Code' : 'Assign Code'}
                      </button>
                    )}
                  </div>

                  {isEditingCode ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. AYESHA10"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-violet-300 bg-white text-xs font-mono font-bold uppercase text-violet-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        type="button"
                        onClick={handleSavePromoCode}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-sm"
                      >
                        {loading ? 'Saving...' : 'Save Code'}
                      </button>
                    </div>
                  ) : displayedPromoCode ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-violet-300 shadow-2xs">
                          <span className="font-mono text-sm font-extrabold text-violet-900 tracking-wider">
                            {displayedPromoCode}
                          </span>
                        </div>
                        <p className="text-[10px] text-violet-700/80 mt-1">
                          Share this code with {influencer.name} to promote in their content.
                          {influencer.codeAssignedAt &&
                            ` Added ${new Date(influencer.codeAssignedAt).toLocaleDateString()}.`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(displayedPromoCode);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-xs flex items-center gap-1 transition-colors"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode ? 'Copied!' : 'Copy Code'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Hi ${influencer.name}! Here is your custom Hira Ali Beauty promo code to share with your audience: ${displayedPromoCode}`;
                            navigator.clipboard.writeText(msg);
                            setCopiedDm(true);
                            setTimeout(() => setCopiedDm(false), 2000);
                          }}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white hover:bg-violet-100 text-violet-800 border border-violet-200 flex items-center gap-1 transition-colors"
                        >
                          {copiedDm ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedDm ? 'DM Copied!' : 'Copy DM'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-violet-800/70 italic">
                      No promo code assigned yet. Click &quot;Assign Code&quot; above or manage in Manager → Promo Codes.
                    </p>
                  )}
                </div>
              )}

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
