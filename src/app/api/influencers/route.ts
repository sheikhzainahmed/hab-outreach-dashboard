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
    const stage = searchParams.get('stage');
    const executorId = searchParams.get('executorId');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const prPackage = searchParams.get('package');
    const allTeam = searchParams.get('allTeam') === 'true';
    const needsAction = searchParams.get('needsAction') === 'true';

    const where: any = {};

    // Permission scoping:
    // Executors and Coordinators see only their own by default, unless allTeam=true is passed (for read-only view)
    if ((user.role === 'EXECUTOR' || user.role === 'COORDINATOR') && !allTeam && !executorId) {
      where.assignedToId = user.id;
    } else if (executorId && executorId !== 'all') {
      where.assignedToId = executorId;
    }

    if (stage && stage !== 'all') {
      where.stage = stage;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (prPackage && prPackage !== 'all') {
      where.prPackage = prPackage;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { igHandle: { contains: search } },
        { phone: { contains: search } },
        { address: { contains: search } },
        { city: { contains: search } },
      ];
    }

    // Fetch influencers with relations
    let influencers = await prisma.influencer.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        deliverables: true,
        approval: {
          include: {
            approver: { select: { id: true, name: true } },
          },
        },
        dispatch: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Handle "needs action" filter in-memory for rich composite logic:
    // Overdue deliverables, incomplete shipping fields, or pending approval
    if (needsAction) {
      const now = new Date();
      influencers = influencers.filter((inf) => {
        const hasOverdueDeliverable = inf.deliverables.some(
          (d) => !d.received && d.dueDate && new Date(d.dueDate) < now
        );
        const isIncomplete =
          !inf.address || inf.address === 'TBD' || !inf.phone || inf.phone === '03001234567';
        const isAwaitingReply = inf.stage === 'Contacted';
        const isAwaitingApproval = inf.stage === 'Awaiting approval';

        return hasOverdueDeliverable || isIncomplete || isAwaitingReply || isAwaitingApproval;
      });
    }

    return NextResponse.json({ influencers });
  } catch (error: any) {
    console.error('Error fetching influencers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      isPaid,
      amount,
      deadline,
      deliverables,
      stage: explicitStage,
      notes,
    } = body;

    // Fast, frictionless validation:
    // Instagram handle is the essential anchor
    if (!igHandle?.trim()) {
      return NextResponse.json({ error: 'Instagram Handle is required (e.g. @username)' }, { status: 400 });
    }

    const cleanHandle = igHandle.trim().startsWith('@')
      ? igHandle.trim()
      : `@${igHandle.trim()}`;

    // Duplicate handle check
    const existing = await prisma.influencer.findFirst({
      where: { igHandle: cleanHandle },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Influencer ${cleanHandle} is already in the dashboard! You can search and edit their existing record.` },
        { status: 409 }
      );
    }

    const finalName = name?.trim() || cleanHandle.replace('@', '');
    const finalShippingName = shippingName?.trim() || finalName;
    const finalAddress = address?.trim() || 'TBD';
    const finalPhone = phone?.trim() || 'TBD';
    const finalPackage = prPackage?.trim() || 'Hair Revival Trio';

    // Determine initial stage intelligently
    const numericAmount = isPaid ? parseFloat(amount) || 0 : 0;
    let initialStage = explicitStage || 'Contacted';

    if (isPaid) {
      initialStage = 'Awaiting approval';
    } else if (!explicitStage) {
      // If address and phone are filled and package is agreed, can go to Ready to ship
      if (address?.trim() && phone?.trim() && address.trim() !== 'TBD') {
        initialStage = 'Ready to ship';
      } else if (prPackage?.trim()) {
        initialStage = 'Package agreed';
      } else {
        initialStage = 'Contacted';
      }
    }

    // Guardrail: Cannot set to Ready to ship if shipping is missing
    if (initialStage === 'Ready to ship' && (!address?.trim() || address.trim() === 'TBD' || !phone?.trim() || phone.trim() === 'TBD')) {
      initialStage = 'Package agreed';
    }

    const influencer = await prisma.influencer.create({
      data: {
        name: finalName,
        igHandle: cleanHandle,
        followerCount: parseInt(followerCount, 10) || 0,
        category: category || 'Lifestyle',
        stars: stars || '⭐⭐⭐⭐',
        shippingName: finalShippingName,
        address: finalAddress,
        phone: finalPhone,
        email: email?.trim() || null,
        city: city?.trim() || 'Lahore',
        prPackage: finalPackage,
        products: products?.trim() || finalPackage,
        isPaid: Boolean(isPaid),
        amount: numericAmount,
        deadline: deadline ? new Date(deadline) : null,
        stage: initialStage,
        notes: notes?.trim() || null,
        createdById: user.id,
        assignedToId: user.id,
        lastEditedById: user.id,
        deliverables: {
          create: Array.isArray(deliverables) && deliverables.length > 0
            ? deliverables.map((d: any) => ({
                type: d.type || '1 Reel + 1 Story',
                dueDate: d.dueDate ? new Date(d.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                received: false,
                notes: d.notes || null,
              }))
            : [
                {
                  type: '1 Reel + 1 Story',
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  received: false,
                },
              ],
        },
        dispatch: {
          create: {
            status: 'Ready',
          },
        },
        approval: isPaid
          ? {
              create: {
                amount: numericAmount,
                status: 'PENDING',
                note: notes || null,
              },
            }
          : undefined,
      },
      include: {
        deliverables: true,
        dispatch: true,
        approval: true,
        createdBy: true,
        assignedTo: true,
      },
    });

    // Write Activity Log
    await prisma.activityLog.create({
      data: {
        entity: 'Influencer',
        recordId: influencer.id,
        influencerId: influencer.id,
        action: 'CREATED',
        details: `Created by ${user.name} (${user.role}). Stage: ${initialStage}`,
        changedById: user.id,
      },
    });

    // If paid request, notify the Owner (Humza)
    if (isPaid) {
      const owner = await prisma.user.findFirst({
        where: { role: 'OWNER' },
      });
      if (owner) {
        await prisma.notification.create({
          data: {
            userId: owner.id,
            title: 'New Paid Request',
            message: `${user.name} requested approval for ${cleanHandle} (PKR ${numericAmount.toLocaleString()})`,
            link: '/owner',
            type: 'warning',
          },
        });
      }
    }

    return NextResponse.json({ success: true, influencer });
  } catch (error: any) {
    console.error('Error creating influencer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
