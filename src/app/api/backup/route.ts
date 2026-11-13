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

    // Only Managers and Owners can download the master database backup
    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden: Manager or Owner access required.' }, { status: 403 });
    }

    const [influencers, users, notifications] = await Promise.all([
      prisma.influencer.findMany({
        include: {
          dispatch: true,
          deliverables: true,
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    const backupPayload = {
      app: 'Hira Ali Beauty - Outreach Management System',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
      stats: {
        totalInfluencers: influencers.length,
        totalUsers: users.length,
        totalNotifications: notifications.length,
        readyToShip: influencers.filter((i) => i.dispatch?.status === 'Ready').length,
        shipped: influencers.filter((i) => i.dispatch?.status === 'Shipped').length,
        delivered: influencers.filter((i) => i.dispatch?.status === 'Delivered').length,
      },
      data: {
        influencers,
        users,
        notifications,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="HAB_Full_Database_Backup_${dateStr}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Backup API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
