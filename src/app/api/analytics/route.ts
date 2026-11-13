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
    const executorId = searchParams.get('executorId');
    const prPackage = searchParams.get('package');

    const where: any = {};
    if (executorId && executorId !== 'all') {
      where.assignedToId = executorId;
    }
    if (prPackage && prPackage !== 'all') {
      where.prPackage = prPackage;
    }

    const influencers = await prisma.influencer.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        deliverables: true,
        approval: true,
        dispatch: true,
      },
    });

    const totalOutreach = influencers.length;
    const repliesCount = influencers.filter((i) => i.stage !== 'Contacted').length;
    const packagesAgreedCount = influencers.filter((i) =>
      ['Package agreed', 'Awaiting approval', 'Ready to ship', 'Shipped', 'Content pending', 'Content received'].includes(i.stage)
    ).length;

    const shippedCount = influencers.filter((i) =>
      ['Shipped', 'Content pending', 'Content received'].includes(i.stage) ||
      (i.dispatch && ['Shipped', 'Delivered'].includes(i.dispatch.status))
    ).length;

    const allDeliverables = influencers.flatMap((i) => i.deliverables);
    const deliverablesReceived = allDeliverables.filter((d) => d.received).length;
    const deliverablesPending = allDeliverables.filter((d) => !d.received).length;

    const now = new Date();
    const deliverablesOverdue = allDeliverables.filter(
      (d) => !d.received && d.dueDate && new Date(d.dueDate) < now
    ).length;

    // Spend calculations
    const approvals = influencers.map((i) => i.approval).filter(Boolean);
    const approvedSpend = approvals
      .filter((a) => a?.status === 'APPROVED')
      .reduce((sum, a) => sum + (a?.amount || 0), 0);
    const pendingSpend = approvals
      .filter((a) => a?.status === 'PENDING')
      .reduce((sum, a) => sum + (a?.amount || 0), 0);

    const totalSalesGenerated = influencers.reduce((sum, i) => sum + (i.salesGenerated || 0), 0);

    // Funnel stages
    const contentReceivedCount = influencers.filter((i) => i.stage === 'Content received').length;
    const funnel = [
      { name: 'Reached Out', count: totalOutreach, rate: 100 },
      { name: 'Replied', count: repliesCount, rate: totalOutreach > 0 ? Math.round((repliesCount / totalOutreach) * 100) : 0 },
      { name: 'Package Agreed', count: packagesAgreedCount, rate: repliesCount > 0 ? Math.round((packagesAgreedCount / repliesCount) * 100) : 0 },
      { name: 'Shipped', count: shippedCount, rate: packagesAgreedCount > 0 ? Math.round((shippedCount / packagesAgreedCount) * 100) : 0 },
      { name: 'Content Received', count: contentReceivedCount, rate: shippedCount > 0 ? Math.round((contentReceivedCount / shippedCount) * 100) : 0 },
    ];

    // Per-Executor Performance
    const executors = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
    });

    const executorPerformance = executors.map((exec) => {
      const repInfluencers = influencers.filter((i) => i.assignedToId === exec.id);
      const repTotal = repInfluencers.length;
      const repAgreed = repInfluencers.filter((i) =>
        ['Package agreed', 'Awaiting approval', 'Ready to ship', 'Shipped', 'Content pending', 'Content received'].includes(i.stage)
      ).length;
      const repShipped = repInfluencers.filter((i) =>
        ['Shipped', 'Content pending', 'Content received'].includes(i.stage)
      ).length;

      const repDeliverables = repInfluencers.flatMap((i) => i.deliverables);
      const repReceived = repDeliverables.filter((d) => d.received).length;
      const repPending = repDeliverables.filter((d) => !d.received).length;
      const repOverdue = repDeliverables.filter(
        (d) => !d.received && d.dueDate && new Date(d.dueDate) < now
      ).length;

      const convRate = repTotal > 0 ? Math.round((repAgreed / repTotal) * 100) : 0;
      const fulfillmentRate = repDeliverables.length > 0 ? Math.round((repReceived / repDeliverables.length) * 100) : 0;

      return {
        id: exec.id,
        name: exec.name,
        role: exec.role,
        outreachVolume: repTotal,
        packagesAgreed: repAgreed,
        conversionRate: convRate,
        packagesShipped: repShipped,
        deliverablesReceived: repReceived,
        deliverablesPending: repPending,
        deliverablesOverdue: repOverdue,
        fulfillmentRate,
      };
    }).filter((e) => e.outreachVolume > 0 || e.role === 'EXECUTOR' || e.role === 'COORDINATOR');

    // Package type breakdown
    const packageMap: Record<string, { total: number; shipped: number; received: number }> = {};
    for (const inf of influencers) {
      const pkg = inf.prPackage || 'Hair Revival Trio';
      if (!packageMap[pkg]) {
        packageMap[pkg] = { total: 0, shipped: 0, received: 0 };
      }
      packageMap[pkg].total++;
      if (['Shipped', 'Content pending', 'Content received'].includes(inf.stage)) {
        packageMap[pkg].shipped++;
      }
      if (inf.stage === 'Content received') {
        packageMap[pkg].received++;
      }
    }

    const packageBreakdown = Object.entries(packageMap).map(([name, stats]) => ({
      name,
      total: stats.total,
      shipped: stats.shipped,
      contentReceived: stats.received,
      completionRate: stats.shipped > 0 ? Math.round((stats.received / stats.shipped) * 100) : 0,
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      summary: {
        totalOutreach,
        repliesCount,
        packagesAgreedCount,
        shippedCount,
        deliverablesReceived,
        deliverablesPending,
        deliverablesOverdue,
        approvedSpend,
        pendingSpend,
        totalSalesGenerated,
      },
      funnel,
      executorPerformance,
      packageBreakdown,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
