'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import PromoCodesSection from '@/components/codes/PromoCodesSection';
import InfluencerDetailModal from '@/components/influencers/InfluencerDetailModal';
import { Tag, RefreshCw } from 'lucide-react';

function CodesPageContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);

  useEffect(() => {
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
    fetchSession();
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md animate-pulse">
          <Tag className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600" />
          Loading Promo Codes Vault...
        </p>
      </div>
    );
  }

  const defaultSubTab =
    viewParam === 'queue'
      ? 'queue'
      : viewParam === 'archive'
      ? 'archive'
      : currentUser.role === 'OWNER'
      ? 'archive'
      : 'queue';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentUser={currentUser} allUsers={allUsers} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role={currentUser.role} />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">
              Custom Promo Codes &amp; Monthly Vault
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage Shopify promo codes for newly locked collaborations and review collective monthly performance.
            </p>
          </div>

          <PromoCodesSection
            allUsers={allUsers}
            defaultSubTab={defaultSubTab}
            onSelectInfluencer={(inf) => setSelectedInfluencer(inf)}
          />
        </main>
      </div>

      {selectedInfluencer && (
        <InfluencerDetailModal
          influencer={selectedInfluencer}
          currentUser={currentUser}
          isOpen={true}
          onClose={() => setSelectedInfluencer(null)}
          onUpdate={() => setSelectedInfluencer(null)}
        />
      )}
    </div>
  );
}

export default function CodesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-400">
          Loading Promo Codes...
        </div>
      }
    >
      <CodesPageContent />
    </Suspense>
  );
}
