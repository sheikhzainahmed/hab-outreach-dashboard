'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import { PIPELINE_STAGES, STAGE_COLORS } from '@/lib/constants';

interface KanbanBoardProps {
  influencers: any[];
  currentUser: any;
  onSelectInfluencer: (inf: any) => void;
  onStageChange: (id: string, newStage: string) => void;
}

export default function KanbanBoard({
  influencers,
  currentUser,
  onSelectInfluencer,
  onStageChange,
}: KanbanBoardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const now = new Date();

  const handleCopyCode = async (e: React.MouseEvent, infId: string, code: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(infId);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 select-none min-h-[600px]">
      {PIPELINE_STAGES.filter((s) => !['Contacted', 'Replied', 'Removed / on hold'].includes(s)).map((stage) => {
        const stageInfs = influencers.filter((i) => i.stage === stage);
        const color = STAGE_COLORS[stage] || STAGE_COLORS['Contacted'];

        return (
          <div
            key={stage}
            className="w-72 shrink-0 flex flex-col bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3"
          >
            {/* Stage Column Header */}
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                <h3 className="font-bold text-xs text-slate-800 tracking-tight">{stage}</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {stageInfs.length}
              </span>
            </div>

            {/* Stage Cards Container */}
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[72vh] pr-1">
              {stageInfs.length === 0 ? (
                <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400 font-medium">
                  Empty stage
                </div>
              ) : (
                stageInfs.map((inf) => {
                  const hasOverdue = inf.deliverables?.some(
                    (d: any) => !d.received && d.dueDate && new Date(d.dueDate) < now
                  );
                  const isApproved = inf.approval?.status === 'APPROVED';
                  const isAwaitingApproval = inf.stage === 'Awaiting approval';

                  return (
                    <div
                      key={inf.id}
                      onClick={() => onSelectInfluencer(inf)}
                      className="group bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer relative"
                    >
                      {/* Top Row: Handle & Star */}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-rose-600 transition-colors truncate">
                          {inf.igHandle}
                        </span>
                        <span className="text-[10px] text-amber-500 shrink-0 font-medium">{inf.stars}</span>
                      </div>

                      {/* Name & Followers */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                        <span className="truncate">{inf.name}</span>
                        <span className="font-semibold text-slate-600">
                          {inf.followerCount?.toLocaleString()}
                        </span>
                      </div>

                      {/* Package Tag */}
                      <div className="mb-2">
                        <span className="inline-block text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-full">
                          {inf.products || inf.prPackage}
                        </span>
                      </div>

                      {/* Custom Promo Code Badge (Convey to Influencer) */}
                      {inf.discountCode && (
                        <div className="flex items-center justify-between gap-1.5 mb-2 px-2 py-1 rounded-lg bg-violet-50 border border-violet-200 text-[10px]">
                          <div className="flex items-center gap-1 text-violet-900 font-bold truncate">
                            <Tag className="w-3 h-3 text-violet-600 shrink-0" />
                            <span className="text-violet-600 font-semibold">Code:</span>
                            <span className="font-mono tracking-wide truncate">{inf.discountCode}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(e, inf.id, inf.discountCode)}
                            className="p-0.5 rounded text-violet-700 hover:bg-violet-100 transition-colors shrink-0"
                            title="Copy promo code to share with creator"
                          >
                            {copiedId === inf.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Commercial Tag */}
                      {inf.isPaid && (
                        <div className="flex items-center justify-between mb-2 text-[10px]">
                          <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            PKR {inf.amount?.toLocaleString()}
                          </span>
                          {inf.paymentStatus === 'FULLY_PAID' ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              ✓ Paid
                            </span>
                          ) : inf.paymentStatus === 'ADVANCE_PAID' ? (
                            <span className="text-teal-700 font-bold bg-teal-50 border border-teal-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              Adv Paid
                            </span>
                          ) : isAwaitingApproval ? (
                            <span className="text-orange-600 font-bold flex items-center gap-0.5">
                              <ShieldAlert className="w-3 h-3" />
                              Awaiting Director
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                              Payable
                            </span>
                          )}
                        </div>
                      )}

                      {/* Overdue Deliverables Warning */}
                      {hasOverdue && (
                        <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold mb-1.5 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>Deliverable Overdue</span>
                        </div>
                      )}

                      {/* Footer: Assignee & Next Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>By {inf.assignedTo?.name || 'Unassigned'}</span>
                        <span className="text-rose-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                          View
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
