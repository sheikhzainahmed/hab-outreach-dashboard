import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
    const body = await request.json();
    const { received, proofUrl, notes, type, dueDate } = body;

    const current = await prisma.deliverable.findUnique({
      where: { id },
      include: { influencer: { include: { deliverables: true } } },
    });

    if (!current) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // Role check: Executors can only update deliverables for their own influencers
    if (user.role === 'EXECUTOR' && current.influencer.assignedToId !== user.id) {
      return NextResponse.json(
        { error: 'You can only update deliverables for your own influencers' },
        { status: 403 }
      );
    }

    // Strict Guardrail (Section 7 & 10):
    // Proof of deliverable (link or screenshot) is strictly mandatory before marking received!
    if (received === true) {
      const activeProof = proofUrl?.trim() || current.proofUrl?.trim();
      if (!activeProof) {
        return NextResponse.json(
          {
            error:
              'Proof-of-Deliverable Guardrail: A valid Instagram link (Reel, Story, Post) or screenshot URL is strictly required before marking this deliverable as received.',
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        ...(received !== undefined && {
          received: Boolean(received),
          receivedAt: received ? new Date() : null,
        }),
        ...(proofUrl !== undefined && { proofUrl: proofUrl?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(type !== undefined && { type: type.trim() }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });

    // Check if all deliverables for this influencer are now received
    // If so, automatically update influencer pipeline stage to "Content received"!
    if (received === true) {
      const allDeliverables = await prisma.deliverable.findMany({
        where: { influencerId: current.influencerId },
      });
      const allDone = allDeliverables.every((d) => d.id === id || d.received);
      if (allDone) {
        await prisma.influencer.update({
          where: { id: current.influencerId },
          data: { stage: 'Content received', lastEditedById: user.id },
        });
      }
    }

    // Write Activity Log
    await prisma.activityLog.create({
      data: {
        entity: 'Deliverable',
        recordId: id,
        influencerId: current.influencerId,
        action: received ? 'DELIVERABLE_RECEIVED' : 'DELIVERABLE_UPDATED',
        details: received
          ? `Deliverable "${current.type}" marked received with proof by ${user.name}`
          : `Deliverable updated by ${user.name}`,
        changedById: user.id,
      },
    });

    return NextResponse.json({ success: true, deliverable: updated });
  } catch (error: any) {
    console.error('Deliverable update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
