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
      isPaid,
      amount,
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

    // Compute consistent commercial / split figures if any commercial field is being edited
    const nextIsPaid = isPaid !== undefined ? Boolean(isPaid) : current.isPaid;
    const nextAmount = amount !== undefined ? parseFloat(amount) || 0 : current.amount;
    const nextAdvPct =
      advancePercentage !== undefined
        ? Math.min(100, Math.max(0, parseInt(advancePercentage, 10) || 0))
        : current.advancePercentage || 0;
    const nextCompPct =
      completionPercentage !== undefined
        ? Math.min(100, Math.max(0, parseInt(completionPercentage, 10) || 0))
        : 100 - nextAdvPct;
    const commercialTouched =
      isPaid !== undefined ||
      amount !== undefined ||
      advancePercentage !== undefined ||
      completionPercentage !== undefined ||
      paymentTerms !== undefined;
    const computedAdvAmount =
      advanceAmount !== undefined ? parseFloat(advanceAmount) || 0 : (nextAmount * nextAdvPct) / 100;
    const computedCompAmount =
      completionAmount !== undefined ? parseFloat(completionAmount) || 0 : (nextAmount * nextCompPct) / 100;
    const computedTerms = nextIsPaid
      ? paymentTerms?.trim() ||
        (nextAdvPct > 0
          ? `${nextAdvPct}% Advance / ${nextCompPct}% on Completion`
          : '0% Advance / 100% on Completion')
      : null;

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
        ...(discountCode !== undefined && {
          discountCode: discountCode?.trim() ? discountCode.trim().toUpperCase() : null,
          codeAssignedAt: discountCode?.trim() ? new Date() : null,
        }),
        ...(salesGenerated !== undefined && { salesGenerated: parseFloat(salesGenerated) || 0 }),
        ...(isPaid !== undefined && { isPaid: nextIsPaid }),
        ...(amount !== undefined && { amount: nextIsPaid ? nextAmount : 0 }),
        ...(bankName !== undefined && { bankName: bankName?.trim() || null }),
        ...(accountTitle !== undefined && { accountTitle: accountTitle?.trim() || null }),
        ...(accountNumber !== undefined && { accountNumber: accountNumber?.trim() || null }),
        ...(commercialTouched && {
          advancePercentage: nextIsPaid ? nextAdvPct : 0,
          advanceAmount: nextIsPaid ? computedAdvAmount : 0,
          completionPercentage: nextIsPaid ? nextCompPct : 100,
          completionAmount: nextIsPaid ? computedCompAmount : 0,
          paymentTerms: computedTerms,
        }),
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

    // If a creator was newly switched to Paid or paid amount updated, keep Approval in sync
    if (nextIsPaid && (!current.approval || (amount !== undefined && nextAmount !== current.amount))) {
      await prisma.approval.upsert({
        where: { influencerId: id },
        update: { amount: nextAmount },
        create: {
          influencerId: id,
          amount: nextAmount,
          status: 'PENDING',
        },
      });

      // Notify Owner (Humza) if newly converted from Gifted to Paid
      if (!current.isPaid) {
        const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
        if (owner && owner.id !== user.id) {
          await prisma.notification.create({
            data: {
              userId: owner.id,
              title: 'New Paid Request Added',
              message: `${user.name} added paid collaboration terms for ${updated.name} (${updated.igHandle}) — PKR ${nextAmount.toLocaleString()} (${computedTerms || 'Standard terms'}).`,
              link: '/owner?tab=approvals',
              type: 'warning',
            },
          });
        }
      }
    }

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

    // Notify executor if promo code was added or changed from detail modal
    if (
      discountCode !== undefined &&
      updated.discountCode &&
      updated.discountCode !== current.discountCode &&
      updated.assignedToId &&
      updated.assignedToId !== user.id
    ) {
      await prisma.notification.create({
        data: {
          userId: updated.assignedToId,
          title: `🏷️ Promo Code Ready: ${updated.igHandle}`,
          message: `${user.name} assigned custom code "${updated.discountCode}" for ${updated.name} (${updated.igHandle}). Share it with the creator!`,
          link: '/executor',
          type: 'success',
        },
      });
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
