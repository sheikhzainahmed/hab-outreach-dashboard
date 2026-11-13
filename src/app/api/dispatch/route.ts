import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const dispatches = await prisma.dispatch.findMany({
      where,
      include: {
        influencer: {
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ dispatches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'EXECUTOR') {
      return NextResponse.json(
        { error: 'Only the Manager (Zain) or Owner can update package dispatch statuses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, trackingNumber, shippingNotes } = body;

    const current = await prisma.dispatch.findUnique({
      where: { id },
      include: { influencer: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Dispatch record not found' }, { status: 404 });
    }

    const now = new Date();
    const updateData: any = {
      ...(status && { status }),
      ...(trackingNumber !== undefined && { trackingNumber }),
      ...(shippingNotes !== undefined && { shippingNotes }),
    };

    if (status === 'Sent to ops' && !current.sentToOpsDate) {
      updateData.sentToOpsDate = now;
    } else if (status === 'Shipped') {
      if (!current.shippedDate) updateData.shippedDate = now;
      // Advance influencer stage to Shipped
      await prisma.influencer.update({
        where: { id: current.influencerId },
        data: { stage: 'Shipped', lastEditedById: user.id },
      });
    } else if (status === 'Delivered') {
      if (!current.deliveredDate) updateData.deliveredDate = now;
      // Advance influencer stage to Content pending
      await prisma.influencer.update({
        where: { id: current.influencerId },
        data: { stage: 'Content pending', lastEditedById: user.id },
      });
    }

    const updated = await prisma.dispatch.update({
      where: { id },
      data: updateData,
      include: { influencer: true },
    });

    // Write Activity Log
    await prisma.activityLog.create({
      data: {
        entity: 'Dispatch',
        recordId: id,
        influencerId: current.influencerId,
        action: 'DISPATCH_ADVANCED',
        details: `Package status advanced to "${status}" by ${user.name}${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}`,
        changedById: user.id,
      },
    });

    return NextResponse.json({ success: true, dispatch: updated });
  } catch (error: any) {
    console.error('Dispatch update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
