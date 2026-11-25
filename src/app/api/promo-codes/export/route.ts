import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Papa from 'papaparse';

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'queue'; // 'queue' | 'queue_uncoded' | 'archive'
    const month = searchParams.get('month') || 'all';
    const includeReceived = searchParams.get('includeReceived') === 'true';
    const format = searchParams.get('format') || 'csv'; // 'csv' | 'json'

    const dateStr = new Date().toISOString().slice(0, 10);

    if (scope === 'archive') {
      let archive = await prisma.influencer.findMany({
        where: {
          AND: [{ discountCode: { not: null } }, { NOT: { discountCode: '' } }],
        },
        include: {
          assignedTo: { select: { name: true } },
          deliverables: true,
        },
        orderBy: [{ codeAssignedAt: 'desc' }, { updatedAt: 'desc' }],
      });

      if (month && month !== 'all') {
        archive = archive.filter((inf) => {
          const refDate = inf.codeAssignedAt || inf.updatedAt || inf.createdAt;
          if (!refDate) return false;
          const d = new Date(refDate);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return ym === month;
        });
      }

      const rows = archive.map((inf) => {
        const receivedCount = inf.deliverables.filter((d) => d.received).length;
        const totalDelivs = inf.deliverables.length;
        const assignedDate = inf.codeAssignedAt
          ? new Date(inf.codeAssignedAt).toISOString().slice(0, 10)
          : new Date(inf.updatedAt).toISOString().slice(0, 10);

        return {
          'Promo Code': inf.discountCode || '',
          'Creator Name': inf.name || '',
          'IG Username': inf.igHandle || '',
          'Phone Number': inf.phone || '',
          'Assigned Executor': inf.assignedTo?.name || 'Unassigned',
          'Collab Type': inf.isPaid ? 'Paid' : 'Gifted / Barter',
          'Collab Cost (PKR)': inf.isPaid ? String(inf.amount || 0) : '0',
          'Sales Generated (PKR)': String(inf.salesGenerated || 0),
          'Code Assigned Date': assignedDate,
          'Stage': inf.stage,
          'Deliverables Posted': `${receivedCount}/${totalDelivs}`,
          'Review Notes': inf.codePerformanceNotes || '',
        };
      });

      if (format === 'json') {
        const headers = Object.keys(rows[0] || {
          'Promo Code': '',
          'Creator Name': '',
          'IG Username': '',
          'Phone Number': '',
          'Assigned Executor': '',
          'Sales Generated (PKR)': '',
          'Review Notes': '',
        });
        const tsvLines = rows.map((r: any) => headers.map((h) => r[h]).join('\t'));
        return NextResponse.json({
          count: rows.length,
          rows,
          clipboardText: [headers.join('\t'), ...tsvLines].join('\n'),
        });
      }

      const csv = Papa.unparse(rows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="HAB_Promo_Codes_Archive_${month}_${dateStr}.csv"`,
        },
      });
    }

    // Queue export (Shopify upload ready)
    const activeStages = includeReceived
      ? [...LOCKED_STAGES, 'Content received']
      : LOCKED_STAGES;

    let queue = await prisma.influencer.findMany({
      where: {
        stage: { in: activeStages },
        codeQueueCleared: false,
      },
      include: {
        assignedTo: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (scope === 'queue_uncoded') {
      queue = queue.filter((inf) => !inf.discountCode || !inf.discountCode.trim());
    }

    const rows = queue.map((inf) => ({
      'Name': inf.name || '',
      'Phone Number': inf.phone || '',
      'IG Username': inf.igHandle || '',
      'Promo Code': inf.discountCode || '',
      'Assigned Executor': inf.assignedTo?.name || 'Unassigned',
      'Stage': inf.stage,
      'Locked Date': new Date(inf.updatedAt).toISOString().slice(0, 10),
    }));

    if (format === 'json') {
      const headers = ['Name', 'Phone Number', 'IG Username', 'Promo Code', 'Assigned Executor', 'Stage', 'Locked Date'];
      const tsvLines = rows.map((r: any) => headers.map((h) => r[h]).join('\t'));
      return NextResponse.json({
        count: rows.length,
        rows,
        clipboardText: [headers.join('\t'), ...tsvLines].join('\n'),
      });
    }

    const csv = Papa.unparse(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="HAB_New_Collabs_Shopify_Codes_${dateStr}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Promo codes export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
