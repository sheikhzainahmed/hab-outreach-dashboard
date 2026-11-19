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
      bankName,
      accountTitle,
      accountNumber,
      advancePercentage,
      completionPercentage,
      paymentTerms,
      doNotShip,
    } = body;

    // Fast, frictionless validation:
    // Instagram handle is the essential anchor
    if (!igHandle?.trim()) {
      return NextResponse.json({ error: 'Instagram Handle is required (e.g. @username)' }, { status: 400 });
    }

    const cleanHandle = igHandle.trim().startsWith('@')
      ? igHandle.trim()
      : `@${igHandle.trim()}`;

    // Robust Duplicate Prevention: Check handle, full name, phone number, and address
    // This prevents sending duplicate packages and incurring direct inventory losses
    const cleanPhoneDigits = (phone || '').replace(/\D/g, '');
    const cleanAddr = (address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const candidateName = (name || '').trim();

    const orConditions: any[] = [{ igHandle: cleanHandle }];
    if (candidateName && candidateName.length >= 3) {
      orConditions.push({ name: { equals: candidateName, mode: 'insensitive' } });
      orConditions.push({ shippingName: { equals: candidateName, mode: 'insensitive' } });
    }
    if (cleanPhoneDigits && cleanPhoneDigits.length >= 7) {
      orConditions.push({ phone: { contains: cleanPhoneDigits.slice(-7) } });
    }
    if (cleanAddr && cleanAddr.length >= 15 && cleanAddr !== 'tbd') {
      orConditions.push({ address: { contains: address.trim().slice(0, 20), mode: 'insensitive' } });
    }

    const existing = await prisma.influencer.findFirst({
      where: { OR: orConditions },
      include: { dispatch: true },
    });

    if (existing) {
      let matchedField = 'Handle';
      if (existing.igHandle.toLowerCase() === cleanHandle.toLowerCase()) matchedField = `Handle (${cleanHandle})`;
      else if (candidateName && (existing.name.toLowerCase() === candidateName.toLowerCase() || existing.shippingName.toLowerCase() === candidateName.toLowerCase())) matchedField = `Full Name ("${existing.name}")`;
      else if (cleanPhoneDigits && existing.phone.replace(/\D/g, '').includes(cleanPhoneDigits.slice(-7))) matchedField = `Phone Number (${existing.phone})`;
      else matchedField = `Delivery Address ("${existing.address.slice(0, 30)}...")`;

      return NextResponse.json(
        {
          error: `Double Entry Blocked! A creator with this ${matchedField} is already registered as "${existing.name}" (Stage: ${existing.stage}, Dispatch: ${existing.dispatch?.status || 'N/A'}). Duplicate entries are blocked to prevent sending multiple parcels and causing financial loss.`,
          duplicateId: existing.id,
        },
        { status: 409 }
      );
    }

    const isDoNotShip = Boolean(doNotShip);
    const finalName = name?.trim() || cleanHandle.replace('@', '');
    const finalShippingName = shippingName?.trim() || finalName;
    const finalAddress = isDoNotShip ? (address?.trim() || 'N/A - Payment Only') : (address?.trim() || 'TBD');
    const finalPhone = phone?.trim() || 'TBD';
    const finalPackage = isDoNotShip ? 'No Package (Payment Only)' : (prPackage?.trim() || 'Hair Revival Trio');

    // Payment calculations
    const numericAmount = isPaid ? parseFloat(amount) || 0 : 0;
    const advPct = isPaid ? (parseInt(advancePercentage, 10) || 0) : 0;
    const compPct = isPaid ? (parseInt(completionPercentage, 10) || (100 - advPct)) : 100;
    const advAmount = (numericAmount * advPct) / 100;
    const compAmount = (numericAmount * compPct) / 100;
    const terms = isPaid
      ? (paymentTerms?.trim() || (advPct > 0 ? `${advPct}% Advance / ${compPct}% on Completion` : '100% on Completion'))
      : null;

    // Determine initial stage intelligently
    let initialStage = explicitStage || 'Contacted';

    if (isPaid) {
      initialStage = 'Awaiting approval';
    } else if (!explicitStage) {
      if (isDoNotShip) {
        initialStage = 'Package agreed';
      } else if (address?.trim() && phone?.trim() && address.trim() !== 'TBD') {
        initialStage = 'Ready to ship';
      } else if (prPackage?.trim()) {
        initialStage = 'Package agreed';
      } else {
        initialStage = 'Contacted';
      }
    }

    // Guardrail: Cannot set to Ready to ship if shipping is missing or do not ship is selected
    if (initialStage === 'Ready to ship' && (isDoNotShip || !address?.trim() || address.trim() === 'TBD' || !phone?.trim() || phone.trim() === 'TBD')) {
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

        // Bank details & payment schedule
        bankName: bankName?.trim() || null,
        accountTitle: accountTitle?.trim() || null,
        accountNumber: accountNumber?.trim() || null,
        advancePercentage: advPct,
        advanceAmount: advAmount,
        completionPercentage: compPct,
        completionAmount: compAmount,
        paymentTerms: terms,
        paymentStatus: 'PENDING',

        // Shipping preference
        doNotShip: isDoNotShip,

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
        // Only create physical dispatch if physical shipment is required!
        dispatch: isDoNotShip
          ? undefined
          : {
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
            message: `${user.name} requested approval for ${cleanHandle} (PKR ${numericAmount.toLocaleString()}) - ${terms || 'Standard terms'}${isDoNotShip ? ' [No Dispatch]' : ''}`,
            link: '/owner?tab=approvals',
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
