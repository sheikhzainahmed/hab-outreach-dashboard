import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        deliverables: { orderBy: { createdAt: 'asc' } },
        approval: {
          include: { approver: { select: { id: true, name: true } } },
        },
        dispatch: true,
        activityLogs: {
          include: { changedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    return NextResponse.json({ influencer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const current = await prisma.influencer.findUnique({
      where: { id },
      include: { approval: true, dispatch: true, assignedTo: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    // Role check: Executors/Coordinators can only edit their own records unless Manager/Owner
    if ((user.role === 'EXECUTOR' || user.role === 'COORDINATOR') && current.assignedToId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to edit records assigned to other executors' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      igHandle,
      followerCount,
      category,
      stars,
      shippingName,
      address,
      phone,
      email,
      city,
      prPackage,
      products,
      stage,
      notes,
      assignedToId,
      discountCode,
      salesGenerated,
      bankName,
      accountTitle,
      accountNumber,
      advancePercentage,
      advanceAmount,
      completionPercentage,
      completionAmount,
      paymentTerms,
      paymentStatus,
      paymentProofUrl,
      paymentNotes,
      doNotShip,
    } = body;

    // Guardrail Check:
    // If advancing to "Ready to ship" or downstream:
    if (
      stage &&
      stage !== current.stage &&
      (stage === 'Ready to ship' || stage === 'Shipped')
    ) {
      // 1. Paid collaboration must be approved by Owner
      if (current.isPaid && (!current.approval || current.approval.status !== 'APPROVED')) {
        return NextResponse.json(
          {
            error:
              'Hard Guardrail: Paid collaborations must be officially approved by Humza (Director) before advancing to dispatch.',
          },
          { status: 403 }
        );
      }

      // 2. Shipping address and phone must be provided
      const targetAddress = address !== undefined ? address : current.address;
      const targetPhone = phone !== undefined ? phone : current.phone;
      if (!targetAddress || targetAddress === 'TBD' || !targetPhone || targetPhone === 'TBD') {
        return NextResponse.json(
          {
            error:
              'Shipping details required: Please provide a complete shipping address and phone number before moving this influencer to Ready to Ship.',
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.influencer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(igHandle !== undefined && { igHandle: igHandle.trim() }),
        ...(followerCount !== undefined && { followerCount: parseInt(followerCount, 10) }),
        ...(category !== undefined && { category }),
        ...(stars !== undefined && { stars }),
        ...(shippingName !== undefined && { shippingName: shippingName.trim() }),
        ...(address !== undefined && { address: address.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || 'Lahore' }),
        ...(prPackage !== undefined && { prPackage: prPackage.trim() }),
        ...(products !== undefined && { products: products?.trim() }),
        ...(stage !== undefined && { stage }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(discountCode !== undefined && { discountCode: discountCode?.trim() || null }),
        ...(salesGenerated !== undefined && { salesGenerated: parseFloat(salesGenerated) || 0 }),
        ...(bankName !== undefined && { bankName: bankName?.trim() || null }),
        ...(accountTitle !== undefined && { accountTitle: accountTitle?.trim() || null }),
        ...(accountNumber !== undefined && { accountNumber: accountNumber?.trim() || null }),
        ...(advancePercentage !== undefined && { advancePercentage: parseInt(advancePercentage, 10) || 0 }),
        ...(advanceAmount !== undefined && { advanceAmount: parseFloat(advanceAmount) || 0 }),
        ...(completionPercentage !== undefined && { completionPercentage: parseInt(completionPercentage, 10) || 0 }),
        ...(completionAmount !== undefined && { completionAmount: parseFloat(completionAmount) || 0 }),
        ...(paymentTerms !== undefined && { paymentTerms: paymentTerms?.trim() || null }),
        ...(paymentStatus !== undefined && { paymentStatus }),
        ...(paymentProofUrl !== undefined && { paymentProofUrl: paymentProofUrl?.trim() || null }),
        ...(paymentNotes !== undefined && { paymentNotes: paymentNotes?.trim() || null }),
        ...(doNotShip !== undefined && { doNotShip: Boolean(doNotShip) }),
        lastEditedById: user.id,
      },
      include: {
        deliverables: true,
        approval: true,
        dispatch: true,
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });

    // Check if creator was reassigned to another person
    let reassignedLog: string | null = null;
    if (assignedToId !== undefined && assignedToId !== current.assignedToId) {
      const prevName = current.assignedTo?.name || 'Unassigned';
      const newName = updated.assignedTo?.name || 'Unassigned';
      reassignedLog = `Moved creator profile from ${prevName} to ${newName} by ${user.name}`;

      // Send notification to newly assigned executor
      if (updated.assignedToId && updated.assignedToId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: updated.assignedToId,
            title: 'Creator Moved to Your Profile',
            message: `${user.name} moved creator ${current.name} (${current.igHandle}) to your workspace.`,
            link: '/executor',
            type: 'info',
          },
        });
      }
    }

    // Log Activity
    const action = reassignedLog ? 'EDITED' : stage && stage !== current.stage ? 'STAGE_CHANGED' : 'EDITED';
    const details = reassignedLog
      ? reassignedLog
      : stage && stage !== current.stage
      ? `Stage changed from "${current.stage}" to "${stage}" by ${user.name}`
      : `Record updated by ${user.name}`;

    await prisma.activityLog.create({
      data: {
        entity: 'Influencer',
        recordId: id,
        influencerId: id,
        action,
        details,
        changedById: user.id,
      },
    });

    return NextResponse.json({ success: true, influencer: updated });
  } catch (error: any) {
    console.error('Error updating influencer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const current = await prisma.influencer.findUnique({
      where: { id },
      include: { assignedTo: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    // Role check: Executors/Coordinators can delete creators assigned to them or unassigned,
    // while Managers and Directors can delete any creator.
    const isOwnerOrManager = user.role === 'OWNER' || user.role === 'MANAGER';
    const isAssigned = current.assignedToId === user.id || current.createdById === user.id || !current.assignedToId;

    if (!isOwnerOrManager && !isAssigned) {
      return NextResponse.json(
        { error: 'You can only delete creators that are assigned to your profile.' },
        { status: 403 }
      );
    }

    // Delete creator (Prisma cascades delete to Deliverable, Approval, Dispatch, ActivityLog)
    await prisma.influencer.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id, name: current.name });
  } catch (error: any) {
    console.error('Error deleting influencer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
