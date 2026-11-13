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
      include: { approval: true, dispatch: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    // Role check: Executors can only edit their own records unless Manager/Owner
    if (user.role === 'EXECUTOR' && current.assignedToId !== user.id) {
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
              'Hard Guardrail: Paid collaborations must be officially approved by Humza (Owner) before advancing to dispatch.',
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
        lastEditedById: user.id,
      },
      include: {
        deliverables: true,
        approval: true,
        dispatch: true,
      },
    });

    // Log Activity
    const action = stage && stage !== current.stage ? 'STAGE_CHANGED' : 'EDITED';
    const details =
      stage && stage !== current.stage
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

    if (user.role === 'EXECUTOR') {
      return NextResponse.json(
        { error: 'Executors cannot delete records. Please contact Zain or Humza.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.influencer.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
