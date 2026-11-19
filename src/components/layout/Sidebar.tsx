'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Truck,
  Users,
  BarChart3,
  FileSpreadsheet,
  AlertCircle,
  Layers,
  Sparkles,
  Package,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';

interface SidebarProps {
  role: string;
}

function SidebarNav({ role }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isOwner = role === 'OWNER';
  const isManager = role === 'MANAGER';
  const isOperations = role === 'OPERATIONS';
  const isCoordinator = role === 'COORDINATOR';
  const isExecutor = role === 'EXECUTOR' || isCoordinator;

  const currentTab = searchParams.get('tab');
  const currentView = searchParams.get('view');
  const currentAllTeam = searchParams.get('allTeam');

  const navItemClass = (targetPath: string) => {
    const [path, queryString] = targetPath.split('?');
    const params = new URLSearchParams(queryString || '');
    const targetTab = params.get('tab');
    const targetView = params.get('view');
    const targetAllTeam = params.get('allTeam');

    let active = false;
    if (pathname === path) {
      if (targetTab) {
        active = currentTab === targetTab;
      } else if (targetView) {
        active = currentView === targetView;
      } else if (targetAllTeam) {
        active = currentAllTeam === targetAllTeam;
      } else {
        // Default root of that path (no tab or special view)
        active = !currentTab && !currentView && !currentAllTeam;
      }
    }

    return `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      active
        ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-100'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;
  };

  return (
    <div className="space-y-6">
      {/* Role Workspace Section */}
      <div>
        <div className="px-3 mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isOwner
              ? 'Owner Workspace'
              : isManager
              ? 'Manager Workspace'
              : isOperations
              ? 'Operations Workspace'
              : isCoordinator
              ? 'Coordinator Workspace'
              : 'Executor Workspace'}
          </span>
        </div>

        <nav className="space-y-1">
          {isOperations && (
            <>
              <Link href="/operations" className={navItemClass('/operations')}>
                <Truck className="w-4 h-4 text-teal-600" />
                <span>Confirmed Orders</span>
              </Link>
              <Link href="/operations?status=Ready" className={navItemClass('/operations?status=Ready')}>
                <Package className="w-4 h-4 text-amber-600" />
                <span>To Be Dispatched</span>
              </Link>
              <Link href="/operations?status=Shipped" className={navItemClass('/operations?status=Shipped')}>
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Dispatched (In Transit)</span>
              </Link>
              <Link href="/operations?status=Delivered" className={navItemClass('/operations?status=Delivered')}>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Delivered</span>
              </Link>
            </>
          )}

          {isExecutor && (
            <>
              <Link href="/executor" className={navItemClass('/executor')}>
                <Layers className="w-4 h-4 text-rose-600" />
                <span>My Influencers</span>
              </Link>
              <Link href="/executor?view=needs-action" className={navItemClass('/executor?view=needs-action')}>
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Needs Action</span>
              </Link>
              <Link href="/executor?allTeam=true" className={navItemClass('/executor?allTeam=true')}>
                <Users className="w-4 h-4 text-blue-600" />
                <span>All Team (Read-only)</span>
              </Link>
            </>
          )}

          {isOwner && (
            <>
              <Link href="/owner" className={navItemClass('/owner')}>
                <LayoutDashboard className="w-4 h-4 text-amber-600" />
                <span>Overview & KPIs</span>
              </Link>
              <Link href="/owner?tab=approvals" className={navItemClass('/owner?tab=approvals')}>
                <CheckSquare className="w-4 h-4 text-rose-600" />
                <span>Approvals Queue</span>
              </Link>
              <Link href="/owner?tab=payments" className={navItemClass('/owner?tab=payments')}>
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Payable Sheet & Banks</span>
              </Link>
              <Link href="/owner?tab=performance" className={navItemClass('/owner?tab=performance')}>
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Executor Performance</span>
              </Link>
            </>
          )}

          {isManager && (
            <>
              <Link href="/manager?tab=dispatch" className={navItemClass('/manager?tab=dispatch')}>
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Dispatch Queue</span>
              </Link>
              <Link href="/manager?tab=dispatch&status=Ready" className={navItemClass('/manager?tab=dispatch&status=Ready')}>
                <Package className="w-4 h-4 text-amber-600" />
                <span>To Be Dispatched (4)</span>
              </Link>
              <Link href="/manager?tab=performance" className={navItemClass('/manager?tab=performance')}>
                <BarChart3 className="w-4 h-4 text-rose-600" />
                <span>Team Performance</span>
              </Link>
              <Link href="/manager?tab=health" className={navItemClass('/manager?tab=health')}>
                <LayoutDashboard className="w-4 h-4 text-purple-600" />
                <span>Operational Health</span>
              </Link>
              <Link href="/settings" className={navItemClass('/settings')}>
                <Users className="w-4 h-4 text-slate-600" />
                <span>User Management</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Global Operations & Reporting */}
      <div>
        <div className="px-3 mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Operations & Analytics
          </span>
        </div>

        <nav className="space-y-1">
          <Link href="/analytics" className={navItemClass('/analytics')}>
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <span>Conversion Funnel</span>
          </Link>

          <Link href="/import" className={navItemClass('/import')}>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Master Sheet Migration</span>
          </Link>
        </nav>
      </div>

      {/* Quick Tips / HAB Outreach Rules */}
      <div className="pt-4 border-t border-slate-100">
        <div className="rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 p-3.5 border border-rose-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>HAB Rule Guardrail</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Paid collaborations require Humza&apos;s approval before dispatch. Deliverables require a proof URL or screenshot before receiving.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 hidden md:block bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4">
      <Suspense fallback={<div className="w-full h-32 animate-pulse bg-slate-50 rounded-xl" />}>
        <SidebarNav role={role} />
      </Suspense>
    </aside>
  );
}
