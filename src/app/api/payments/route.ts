import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only Owner (Humza) and Manager (Zain) have access to payment registers.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, advance_due, completion_due, paid
    const format = searchParams.get('format') || 'json';

    // Fetch all paid influencers with approval details and deliverables
    const influencers = await prisma.influencer.findMany({
      where: {
        isPaid: true,
      },
      include: {
        approval: {
          include: { approver: { select: { id: true, name: true } } },
        },
        deliverables: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        dispatch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const payableRecords = influencers.map((inf) => {
      const isApproved = inf.approval?.status === 'APPROVED';
      const amount = inf.amount || 0;
      const advancePct = inf.advancePercentage || 0;
      const compPct = inf.completionPercentage || (100 - advancePct);
      const advAmount = inf.advanceAmount || (amount * advancePct) / 100;
      const compAmount = inf.completionAmount || (amount * compPct) / 100;

      const deliverablesReceived = inf.deliverables.some((d) => d.received);
      const paymentStatus = inf.paymentStatus || 'PENDING';

      let paymentStage = 'Pending Approval';
      let currentPayableType = 'N/A';
      let currentPayableAmount = 0;

      if (isApproved) {
        if (paymentStatus === 'FULLY_PAID') {
          paymentStage = 'Fully Paid';
          currentPayableType = 'Completed';
          currentPayableAmount = 0;
        } else if (paymentStatus === 'ADVANCE_PAID') {
          if (deliverablesReceived) {
            paymentStage = 'Work Complete Due';
            currentPayableType = 'Work Complete Payment';
            currentPayableAmount = compAmount;
          } else {
            paymentStage = 'Work in Progress';
            currentPayableType = 'Awaiting Deliverable for Final Payout';
            currentPayableAmount = compAmount;
          }
        } else {
          // PENDING payment
          if (advancePct > 0) {
            paymentStage = 'Advance Payment Due';
            currentPayableType = `Advance Payment (${advancePct}%)`;
            currentPayableAmount = advAmount;
          } else if (deliverablesReceived) {
            paymentStage = 'Work Complete Due';
            currentPayableType = '100% Full Payment (Content Received)';
            currentPayableAmount = amount;
          } else {
            paymentStage = 'Payable on Completion';
            currentPayableType = 'Full Payment Due on Delivery';
            currentPayableAmount = amount;
          }
        }
      }

      return {
        id: inf.id,
        name: inf.name,
        igHandle: inf.igHandle,
        phone: inf.phone,
        city: inf.city,
        isApproved,
        approvalStatus: inf.approval?.status || 'PENDING',
        approvalNote: inf.approval?.note,
        approvedAt: inf.approval?.decidedAt,
        amount,
        advancePercentage: advancePct,
        advanceAmount: advAmount,
        completionPercentage: compPct,
        completionAmount: compAmount,
        paymentTerms: inf.paymentTerms || `${advancePct}% Adv / ${compPct}% Comp`,
        paymentStatus,
        paymentStage,
        currentPayableType,
        currentPayableAmount,
        bankName: inf.bankName || 'Not Provided',
        accountTitle: inf.accountTitle || 'Not Provided',
        accountNumber: inf.accountNumber || 'Not Provided',
        paymentProofUrl: inf.paymentProofUrl,
        paymentNotes: inf.paymentNotes,
        advancePaidAt: inf.advancePaidAt,
        fullyPaidAt: inf.fullyPaidAt,
        doNotShip: inf.doNotShip,
        deliverablesReceived,
        deliverablesCount: inf.deliverables.length,
        receivedDeliverablesCount: inf.deliverables.filter((d) => d.received).length,
        assignedTo: inf.assignedTo?.name || 'Unassigned',
        createdAt: inf.createdAt,
      };
    });

    // Apply Filter
    let filtered = payableRecords;
    if (filter === 'advance_due') {
      filtered = payableRecords.filter((r) => r.isApproved && r.paymentStage === 'Advance Payment Due');
    } else if (filter === 'completion_due') {
      filtered = payableRecords.filter((r) => r.isApproved && r.paymentStage === 'Work Complete Due');
    } else if (filter === 'paid') {
      filtered = payableRecords.filter((r) => r.paymentStatus === 'FULLY_PAID' || r.paymentStatus === 'ADVANCE_PAID');
    } else if (filter === 'pending_approval') {
      filtered = payableRecords.filter((r) => !r.isApproved);
    }

    // Export as CSV if requested
    if (format === 'csv') {
      const csvRows = filtered.map((r) => ({
        'Creator Name': r.name,
        'Instagram Handle': r.igHandle,
        'Phone Number': r.phone,
        'Bank Name': r.bankName,
        'Account Title': r.accountTitle,
        'Account Number / IBAN': r.accountNumber,
        'Total Fee (PKR)': r.amount,
        'Advance %': `${r.advancePercentage}%`,
        'Advance Amount (PKR)': r.advanceAmount,
        'Completion %': `${r.completionPercentage}%`,
        'Completion Amount (PKR)': r.completionAmount,
        'Payment Terms': r.paymentTerms,
        'Payment Stage': r.paymentStage,
        'Payment Status': r.paymentStatus,
        'Current Payable (PKR)': r.currentPayableAmount,
        'Deliverables Received?': r.deliverablesReceived ? 'YES' : 'NO',
        'Approval Status': r.approvalStatus,
        'Assigned Executor': r.assignedTo,
        'Payment Reference / Proof': r.paymentProofUrl || '',
      }));

      const csv = Papa.unparse(csvRows);
      const dateStr = new Date().toISOString().slice(0, 10);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="HAB_Payable_Sheet_${dateStr}.csv"`,
        },
      });
    }

    // Summary KPIs
    const summary = {
      totalCollabs: payableRecords.length,
      approvedCollabs: payableRecords.filter((r) => r.isApproved).length,
      totalCommittedPkr: payableRecords.filter((r) => r.isApproved).reduce((sum, r) => sum + r.amount, 0),
      advanceDueCount: payableRecords.filter((r) => r.isApproved && r.paymentStage === 'Advance Payment Due').length,
      advanceDueAmount: payableRecords
        .filter((r) => r.isApproved && r.paymentStage === 'Advance Payment Due')
        .reduce((sum, r) => sum + r.advanceAmount, 0),
      completionDueCount: payableRecords.filter((r) => r.isApproved && r.paymentStage === 'Work Complete Due').length,
      completionDueAmount: payableRecords
        .filter((r) => r.isApproved && r.paymentStage === 'Work Complete Due')
        .reduce((sum, r) => sum + r.completionAmount, 0),
      fullyPaidCount: payableRecords.filter((r) => r.paymentStatus === 'FULLY_PAID').length,
      fullyPaidAmount: payableRecords
        .filter((r) => r.paymentStatus === 'FULLY_PAID')
        .reduce((sum, r) => sum + r.amount, 0),
    };

    return NextResponse.json({
      summary,
      payables: filtered,
    });
  } catch (error: any) {
    console.error('Payments API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only Owner (Humza) and Manager (Zain) can update payment statuses.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { influencerId, action, paymentProofUrl, paymentNotes } = body;

    if (!influencerId || !action) {
      return NextResponse.json({ error: 'Influencer ID and Action are required' }, { status: 400 });
    }

    const inf = await prisma.influencer.findUnique({
      where: { id: influencerId },
      include: { assignedTo: true },
    });

    if (!inf) {
      return NextResponse.json({ error: 'Influencer record not found' }, { status: 404 });
    }

    const now = new Date();
    let newStatus = inf.paymentStatus || 'PENDING';
    let updateFields: any = {
      ...(paymentProofUrl !== undefined && { paymentProofUrl: paymentProofUrl.trim() || null }),
      ...(paymentNotes !== undefined && { paymentNotes: paymentNotes.trim() || null }),
      lastEditedById: user.id,
    };

    let logMessage = '';

    if (action === 'MARK_ADVANCE_PAID') {
      newStatus = 'ADVANCE_PAID';
      updateFields.paymentStatus = newStatus;
      updateFields.advancePaidAt = now;
      logMessage = `Humza marked ADVANCE payment (PKR ${inf.advanceAmount?.toLocaleString() || 0}) as PAID for ${inf.name}${paymentProofUrl ? ` (Ref: ${paymentProofUrl})` : ''}`;
    } else if (action === 'MARK_FULLY_PAID') {
      newStatus = 'FULLY_PAID';
      updateFields.paymentStatus = newStatus;
      updateFields.fullyPaidAt = now;
      logMessage = `Humza marked FINAL payment as FULLY PAID for ${inf.name}${paymentProofUrl ? ` (Ref: ${paymentProofUrl})` : ''}`;
    } else if (action === 'RESET_PENDING') {
      newStatus = 'PENDING';
      updateFields.paymentStatus = newStatus;
      logMessage = `Payment status reset to PENDING by ${user.name}`;
    }

    const updated = await prisma.influencer.update({
      where: { id: influencerId },
      data: updateFields,
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        entity: 'Influencer',
        recordId: influencerId,
        influencerId: influencerId,
        action: 'EDITED',
        details: logMessage,
        changedById: user.id,
      },
    });

    // Notify assigned executor
    if (inf.assignedToId) {
      await prisma.notification.create({
        data: {
          userId: inf.assignedToId,
          title: `💰 Payment Sent: ${inf.igHandle}`,
          message: `${user.name} has processed the ${action === 'MARK_ADVANCE_PAID' ? 'Advance Payment' : 'Final Payment'} for ${inf.name}!${paymentProofUrl ? ` Reference: ${paymentProofUrl}` : ''}`,
          link: '/executor',
          type: 'success',
        },
      });
    }

    return NextResponse.json({ success: true, influencer: updated });
  } catch (error: any) {
    console.error('Payments update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
