import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Owner (Humza) or Manager (Zain) can approve spend
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only the Owner (Humza) has authority to approve paid influencer spend' },
        { status: 403 }
      );
    }

    const { id: approvalId } = await params;
    const body = await request.json();
    const { action, note } = body; // action: 'APPROVE' | 'REJECT' | 'NOTE'

    if (action !== 'APPROVE' && action !== 'REJECT' && action !== 'NOTE') {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE, REJECT, or NOTE' },
        { status: 400 }
      );
    }

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        influencer: {
          include: { assignedTo: true },
        },
      },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }

    // 1. Handling NOTE ONLY (e.g. "quote is too high, negotiate lower")
    if (action === 'NOTE') {
      if (!note || !note.trim()) {
        return NextResponse.json({ error: 'Please enter a note or instruction' }, { status: 400 });
      }

      const updatedApproval = await prisma.approval.update({
        where: { id: approvalId },
        data: {
          note: note.trim(),
          approverId: user.id,
        },
      });

      // Write audit trail
      await prisma.activityLog.create({
        data: {
          entity: 'Approval',
          recordId: approvalId,
          influencerId: approval.influencerId,
          action: 'NOTE_ADDED',
          details: `Humza added feedback note: "${note.trim()}" for ${approval.influencer.name}`,
          changedById: user.id,
        },
      });

      // Notify requesting executor specifically
      if (approval.influencer.assignedToId) {
        await prisma.notification.create({
          data: {
            userId: approval.influencer.assignedToId,
            title: `💬 Note from Humza: ${approval.influencer.igHandle}`,
            message: `Humza left guidance for ${approval.influencer.name} (PKR ${approval.amount.toLocaleString()}): "${note.trim()}"`,
            link: '/executor',
            type: 'alert',
          },
        });
      }

      return NextResponse.json({ success: true, approval: updatedApproval });
    }

    // 2. Handling APPROVE or REJECT
    const isApprove = action === 'APPROVE';
    const newStatus = isApprove ? 'APPROVED' : 'REJECTED';
    const newStage = isApprove ? 'Ready to ship' : 'Removed / on hold';

    // Update approval record
    const updatedApproval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: newStatus,
        approverId: user.id,
        note: note?.trim() || null,
        decidedAt: new Date(),
      },
    });

    // Advance or halt influencer stage
    await prisma.influencer.update({
      where: { id: approval.influencerId },
      data: {
        stage: newStage,
        lastEditedById: user.id,
      },
    });

    // Ensure dispatch is ready if approved
    if (isApprove) {
      await prisma.dispatch.upsert({
        where: { influencerId: approval.influencerId },
        update: { status: 'Ready' },
        create: {
          influencerId: approval.influencerId,
          status: 'Ready',
        },
      });
    }

    // Write audit trail
    await prisma.activityLog.create({
      data: {
        entity: 'Approval',
        recordId: approvalId,
        influencerId: approval.influencerId,
        action: newStatus,
        details: `${isApprove ? 'Approved' : 'Rejected'} spend of PKR ${approval.amount.toLocaleString()} by ${user.name}${note ? `: "${note}"` : ''}`,
        changedById: user.id,
      },
    });

    // Notify requesting executor specifically
    if (approval.influencer.assignedToId) {
      await prisma.notification.create({
        data: {
          userId: approval.influencer.assignedToId,
          title: `${isApprove ? '✅ Collab Approved' : '❌ Collab Rejected'}: ${approval.influencer.igHandle}`,
          message: `${user.name} has ${isApprove ? 'approved' : 'rejected'} your request for ${approval.influencer.name} (PKR ${approval.amount.toLocaleString()})${note ? ` — Note: "${note.trim()}"` : ''}`,
          link: '/executor',
          type: isApprove ? 'success' : 'alert',
        },
      });
    }

    return NextResponse.json({ success: true, approval: updatedApproval });
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
