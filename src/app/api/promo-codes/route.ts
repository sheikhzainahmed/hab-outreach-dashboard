import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const LOCKED_STAGES = [
  'Package agreed',
  'Ready to ship',
  'Shipped',
  'Content pending',
];

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden: Manager or Director access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeContentReceived = searchParams.get('includeReceived') === 'true';
    const month = searchParams.get('month') || 'all'; // YYYY-MM or 'all'
    const executorId = searchParams.get('executorId') || 'all';
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const activeQueueStages = includeContentReceived
      ? [...LOCKED_STAGES, 'Content received']
      : LOCKED_STAGES;

    const [rawQueue, rawArchive] = await Promise.all([
      prisma.influencer.findMany({
        where: {
          stage: { in: activeQueueStages },
          codeQueueCleared: false,
        },
        include: {
          assignedTo: { select: { id: true, name: true, role: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          deliverables: true,
          dispatch: true,
          approval: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.influencer.findMany({
        where: {
          AND: [
            { discountCode: { not: null } },
            { NOT: { discountCode: '' } },
          ],
        },
        include: {
          assignedTo: { select: { id: true, name: true, role: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          deliverables: true,
          dispatch: true,
          approval: true,
        },
        orderBy: [
          { codeAssignedAt: 'desc' },
          { updatedAt: 'desc' },
        ],
      }),
    ]);

    // Build available months list from all archived codes (YYYY-MM)
    const monthSet = new Set<string>();
    rawArchive.forEach((inf) => {
      const refDate = inf.codeAssignedAt || inf.updatedAt || inf.createdAt;
      if (refDate) {
        const d = new Date(refDate);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(ym);
      }
    });
    const availableMonths = Array.from(monthSet).sort().reverse();

    // Filter archive by month, executorId, and search
    let filteredArchive = rawArchive;
    if (month && month !== 'all') {
      filteredArchive = filteredArchive.filter((inf) => {
        const refDate = inf.codeAssignedAt || inf.updatedAt || inf.createdAt;
        if (!refDate) return false;
        const d = new Date(refDate);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return ym === month;
      });
    }

    if (executorId && executorId !== 'all') {
      filteredArchive = filteredArchive.filter((inf) => inf.assignedToId === executorId);
    }

    if (search) {
      filteredArchive = filteredArchive.filter((inf) => {
        return (
          (inf.name || '').toLowerCase().includes(search) ||
          (inf.igHandle || '').toLowerCase().includes(search) ||
          (inf.phone || '').toLowerCase().includes(search) ||
          (inf.discountCode || '').toLowerCase().includes(search) ||
          (inf.assignedTo?.name || '').toLowerCase().includes(search) ||
          (inf.codePerformanceNotes || '').toLowerCase().includes(search)
        );
      });
    }

    const queueUncodedCount = rawQueue.filter((i) => !i.discountCode || !i.discountCode.trim()).length;
    const queueCodedCount = rawQueue.length - queueUncodedCount;
    const archiveTotalSales = filteredArchive.reduce((acc, i) => acc + (i.salesGenerated || 0), 0);
    const archiveTotalCost = filteredArchive.reduce((acc, i) => acc + (i.isPaid ? i.amount || 0 : 0), 0);

    return NextResponse.json({
      queue: rawQueue,
      archive: filteredArchive,
      availableMonths,
      stats: {
        queueCount: rawQueue.length,
        queueUncodedCount,
        queueCodedCount,
        archiveTotalCount: rawArchive.length,
        archiveFilteredCount: filteredArchive.length,
        archiveTotalSales,
        archiveTotalCost,
      },
    });
  } catch (error: any) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only Manager or Director can assign or review promo codes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Array<{
      influencerId: string;
      discountCode?: string | null;
      salesGenerated?: number;
      codePerformanceNotes?: string | null;
    }> = Array.isArray(body.updates) ? body.updates : [body];

    if (updates.length === 0 || !updates[0]?.influencerId) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Fetch all existing codes to prevent accidental duplicate codes across different creators
    const existingWithCodes = await prisma.influencer.findMany({
      where: {
        AND: [{ discountCode: { not: null } }, { NOT: { discountCode: '' } }],
      },
      select: { id: true, name: true, igHandle: true, discountCode: true },
    });

    const codeOwnerMap = new Map<string, { id: string; name: string; igHandle: string }>();
    existingWithCodes.forEach((row) => {
      if (row.discountCode) {
        codeOwnerMap.set(row.discountCode.trim().toUpperCase(), {
          id: row.id,
          name: row.name,
          igHandle: row.igHandle,
        });
      }
    });

    // Check duplicates within this batch and against DB
    const seenInBatch = new Map<string, string>();
    for (const item of updates) {
      if (item.discountCode !== undefined && item.discountCode !== null) {
        const cleaned = item.discountCode.trim().toUpperCase();
        if (cleaned) {
          const existingOwner = codeOwnerMap.get(cleaned);
          if (existingOwner && existingOwner.id !== item.influencerId) {
            return NextResponse.json(
              {
                error: `Duplicate promo code "${cleaned}": already assigned to ${existingOwner.name} (${existingOwner.igHandle}). Each creator must have a unique code.`,
              },
              { status: 409 }
            );
          }
          if (seenInBatch.has(cleaned) && seenInBatch.get(cleaned) !== item.influencerId) {
            return NextResponse.json(
              {
                error: `Duplicate promo code "${cleaned}" entered twice in this batch. Please make each code unique.`,
              },
              { status: 409 }
            );
          }
          seenInBatch.set(cleaned, item.influencerId);
        }
      }
    }

    let updatedCount = 0;
    let notifiedCount = 0;

    for (const item of updates) {
      const current = await prisma.influencer.findUnique({
        where: { id: item.influencerId },
        include: { assignedTo: true },
      });
      if (!current) continue;

      const data: any = { lastEditedById: user.id };
      let codeChanged = false;
      let newCodeValue: string | null = current.discountCode;

      if (item.discountCode !== undefined) {
        const cleaned = item.discountCode ? item.discountCode.trim().toUpperCase() : null;
        if (cleaned !== (current.discountCode || null)) {
          data.discountCode = cleaned;
          data.codeAssignedAt = cleaned ? new Date() : null;
          codeChanged = true;
          newCodeValue = cleaned;
        }
      }

      if (item.salesGenerated !== undefined) {
        const parsed = parseFloat(String(item.salesGenerated));
        data.salesGenerated = isNaN(parsed) ? 0 : parsed;
      }

      if (item.codePerformanceNotes !== undefined) {
        data.codePerformanceNotes = item.codePerformanceNotes?.trim() || null;
      }

      // Skip DB write if nothing actually changed
      if (Object.keys(data).length <= 1) continue;

      await prisma.influencer.update({
        where: { id: item.influencerId },
        data,
      });
      updatedCount++;

      if (codeChanged) {
        await prisma.activityLog.create({
          data: {
            entity: 'Influencer',
            recordId: current.id,
            influencerId: current.id,
            action: 'CODE_ASSIGNED',
            details: newCodeValue
              ? `Assigned promo code "${newCodeValue}" by ${user.name}`
              : `Removed promo code by ${user.name}`,
            changedById: user.id,
          },
        });

        // Notify assigned executor when a new/updated code is assigned
        if (newCodeValue && current.assignedToId && current.assignedToId !== user.id) {
          await prisma.notification.create({
            data: {
              userId: current.assignedToId,
              title: `🏷️ Promo Code Ready: ${current.igHandle}`,
              message: `${user.name} assigned custom code "${newCodeValue}" for ${current.name} (${current.igHandle}). You can now share it with the creator!`,
              link: '/executor',
              type: 'success',
            },
          });
          notifiedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      notifiedCount,
    });
  } catch (error: any) {
    console.error('Error saving promo codes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only Manager or Director can manage the promo code queue' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, mode, influencerIds } = body;

    if (action === 'clear') {
      const now = new Date();
      let where: any = {
        codeQueueCleared: false,
      };

      if (mode === 'ids' && Array.isArray(influencerIds) && influencerIds.length > 0) {
        where = { id: { in: influencerIds } };
      } else if (mode === 'coded') {
        where = {
          codeQueueCleared: false,
          AND: [{ discountCode: { not: null } }, { NOT: { discountCode: '' } }],
        };
      } else {
        // mode === 'all': clear all active locked-stage items currently in the queue
        where = {
          codeQueueCleared: false,
          stage: { in: [...LOCKED_STAGES, 'Content received'] },
        };
      }

      const result = await prisma.influencer.updateMany({
        where,
        data: {
          codeQueueCleared: true,
          codeClearedAt: now,
        },
      });

      return NextResponse.json({
        success: true,
        clearedCount: result.count,
      });
    }

    if (action === 'restore' && Array.isArray(influencerIds) && influencerIds.length > 0) {
      const result = await prisma.influencer.updateMany({
        where: { id: { in: influencerIds } },
        data: {
          codeQueueCleared: false,
          codeClearedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        restoredCount: result.count,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error clearing promo code queue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
