'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  Package,
  MapPin,
  FileText,
  DollarSign,
  Gift,
  Check,
  Zap,
} from 'lucide-react';
import { PR_PACKAGES, CREATOR_CATEGORIES, PIPELINE_STAGES } from '@/lib/constants';

interface AddInfluencerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddInfluencerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddInfluencerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [igHandle, setIgHandle] = useState('');
  const [name, setName] = useState('');
  const [stage, setStage] = useState('Contacted');
  const [category, setCategory] = useState('Skinfluencer');
  const [followerCount, setFollowerCount] = useState('25000');
  const [stars, setStars] = useState('⭐⭐⭐⭐');

  // Package & Terms
  const [prPackage, setPrPackage] = useState(PR_PACKAGES[0]);
  const [customPackage, setCustomPackage] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [amount, setAmount] = useState('15000');

  // Agreed Deliverables
  const [deliverables, setDeliverables] = useState<Array<{ type: string; dueDate: string }>>([
    { type: '1 Reel', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
    { type: '2 Stories', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
  ]);

  // Shipping (Optional initially, required before dispatch)
  const [showShipping, setShowShipping] = useState(false);
  const [shippingName, setShippingName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore');
  const [notes, setNotes] = useState('');

  // Quick DM parse drawer
  const [dmPasteText, setDmPasteText] = useState('');
  const [showDmParser, setShowDmParser] = useState(false);

  if (!isOpen) return null;

  // Smart parser to auto-extract phone and address from a copied DM
  const handleParseDm = () => {
    if (!dmPasteText.trim()) return;

    // Extract phone
    const phoneMatch = dmPasteText.match(/(?:03\d{2}[- ]?\d{7}|\+?92\d{10}|\d{11})/);
    if (phoneMatch) {
      setPhone(phoneMatch[0].replace(/[- ]/g, ''));
    }

    // Extract city if mentioned
    const lower = dmPasteText.toLowerCase();
    if (lower.includes('lahore')) setCity('Lahore');
    else if (lower.includes('karachi')) setCity('Karachi');
    else if (lower.includes('islamabad')) setCity('Islamabad');
    else if (lower.includes('rawalpindi')) setCity('Rawalpindi');
    else if (lower.includes('faisalabad')) setCity('Faisalabad');
    else if (lower.includes('multan')) setCity('Multan');

    // Use full pasted text as address if address is blank
    if (!address) {
      setAddress(dmPasteText.trim());
    }

    setShowShipping(true);
    setShowDmParser(false);
    setDmPasteText('');
  };

  const handleQuickAddDeliverable = (delivType: string) => {
    setDeliverables([
      ...deliverables,
      { type: delivType, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
    ]);
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!igHandle.trim()) {
      return setError('Please enter the Instagram handle (@username).');
    }

    setLoading(true);
    try {
      const selectedPackage = prPackage === 'Custom Bundle' ? (customPackage || 'Custom PR Box') : prPackage;
      const finalName = name.trim() || igHandle.trim().replace('@', '');

      const res = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          igHandle: igHandle.trim(),
          followerCount: parseInt(followerCount, 10) || 0,
          category,
          stars,
          stage,
          shippingName: shippingName.trim() || finalName,
          address: address.trim() || 'TBD',
          phone: phone.trim() || 'TBD',
          city: city.trim() || 'Lahore',
          prPackage: selectedPackage,
          products: selectedPackage,
          isPaid,
          amount: isPaid ? parseFloat(amount) || 0 : 0,
          deliverables,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create influencer');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const popularDeliverables = ['1 Reel', '2 Stories', '1 Story', 'Reel + 2 Stories', 'Carousel Post'];
  const popularAmounts = ['8000', '10000', '15000', '20000', '25000', '35000'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Influencer</h2>
              <p className="text-[11px] text-slate-400">Quickly log outreach or an agreed collaboration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Core Profile */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instagram Handle <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">@</span>
                  <input
                    type="text"
                    required
                    placeholder="creatorhandle"
                    value={igHandle.replace('@', '')}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setIgHandle(val ? `@${val}` : '');
                      if (!name) setName(val);
                    }}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Creator Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hadi Irfan"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!shippingName) setShippingName(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Initial Stage & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option value="Contacted">1. Contacted (Just DM&apos;d)</option>
                  <option value="Replied">2. Replied (In Conversation)</option>
                  <option value="Package agreed">3. Package Agreed</option>
                  <option value="Ready to ship">4. Ready to Ship (Has Address)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  {CREATOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Commercial Terms (Gifted vs Paid) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Commercial Agreement</span>
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !isPaid ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  Gifted / Barter
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isPaid ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Paid Collab
                </button>
              </div>
            </div>

            {isPaid ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900">Amount (PKR):</span>
                  <input
                    type="number"
                    required
                    placeholder="15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Quick pick:</span>
                  {popularAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                        amount === amt
                          ? 'bg-amber-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {parseInt(amt) / 1000}k
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-amber-700 italic">
                  Note: Humza (Owner) will be notified to review and approve this spend before dispatch.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                100% Free PR gifting. No spend approval required — routes directly to the dispatch queue when address is entered.
              </p>
            )}
          </div>

          {/* PR Package & Agreed Deliverables */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PR Package to Send</label>
              <select
                value={prPackage}
                onChange={(e) => setPrPackage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              >
                {PR_PACKAGES.map((pkg) => (
                  <option key={pkg} value={pkg}>{pkg}</option>
                ))}
              </select>
            </div>

            {prPackage === 'Custom Bundle' && (
              <input
                type="text"
                placeholder="List products (e.g. Eyespresso + C2 Moisturiser)"
                value={customPackage}
                onChange={(e) => setCustomPackage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            )}

            {/* Deliverables */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Agreed Deliverables</label>
                <div className="flex items-center gap-1">
                  {popularDeliverables.slice(0, 3).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleQuickAddDeliverable(d)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-600 font-semibold text-slate-600 border border-slate-200 transition-colors"
                    >
                      + {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                {deliverables.map((deliv, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={deliv.type}
                      onChange={(e) => {
                        const updated = [...deliverables];
                        updated[index].type = e.target.value;
                        setDeliverables(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <input
                      type="date"
                      value={deliv.dueDate}
                      onChange={(e) => {
                        const updated = [...deliverables];
                        updated[index].dueDate = e.target.value;
                        setDeliverables(updated);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    {deliverables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(index)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shipping Details (Optional now, can be filled anytime later) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowShipping(!showShipping)}
                className="text-xs font-bold text-slate-700 hover:text-rose-600 flex items-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Shipping Address</span>
                <span className="text-[10px] font-normal text-slate-400">
                  {showShipping ? '(Click to collapse)' : '(Optional — can add later when agreed)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowDmParser(!showDmParser)}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                Auto-fill from DM text
              </button>
            </div>

            {/* Smart DM Parser Box */}
            {showDmParser && (
              <div className="mt-2.5 p-3 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                <p className="text-[11px] text-slate-700 font-medium">
                  Paste the influencer&apos;s Instagram message below to automatically extract phone and address:
                </p>
                <textarea
                  rows={2}
                  placeholder="Paste message (e.g. My name is Fatima, send to House 12, Street 4, DHA Lahore, 03001234567)..."
                  value={dmPasteText}
                  onChange={(e) => setDmPasteText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-rose-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDmParser(false)}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleParseDm}
                    className="px-3 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                  >
                    Extract & Fill
                  </button>
                </div>
              </div>
            )}

            {showShipping && (
              <div className="mt-3 space-y-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      placeholder="Shipping Name"
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="03014816622"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Complete Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="House #, Street #, Area / Colony, City"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Lahore / Karachi / Islamabad"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Assigned to you automatically
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-md shadow-rose-200 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {loading ? 'Saving...' : 'Save Creator'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
