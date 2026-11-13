import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Papa from 'papaparse';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { csvText } = await request.json();
    if (!csvText) {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 });
    }

    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (!parsed.data || parsed.data.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 });
    }

    // Get all team users for name matching
    const teamUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    const userMap: Record<string, string> = {};
    for (const u of teamUsers) {
      userMap[u.name.toLowerCase().trim()] = u.id;
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const row of parsed.data as any[]) {
      const name = (row['Name'] || row['Creator'] || row['NAME'] || '').trim();
      const rawIg = (row['Instagram Id'] || row['Instagram'] || '').trim();
      if (!name && !rawIg) continue;

      let igHandle = (row['_handle_helper'] || '').trim();
      if (!igHandle && rawIg) {
        const match = rawIg.match(/instagram\.com\/([^/?#]+)/i);
        igHandle = match ? match[1] : rawIg.replace('@', '');
      }
      if (!igHandle) igHandle = name.toLowerCase().replace(/[^a-z0-9_.]/g, '');
      const cleanHandle = igHandle.startsWith('@') ? igHandle : `@${igHandle}`;

      // Check duplicate
      const existing = await prisma.influencer.findFirst({
        where: { igHandle: cleanHandle },
      });
      if (existing) {
        skippedCount++;
        continue;
      }

      const contactedByStr = (row['Contacted By'] || row['Managed by'] || row['Assignee'] || '').trim().toLowerCase();
      const assignedToId = userMap[contactedByStr] || user.id;

      const phone = (row['Contact Number'] || row['Number'] || '03001234567').trim();
      const address = (row['Address'] || 'TBD').trim();
      const products = (row['Products To Send'] || row['Products to send'] || row['Pro '] || 'Hair Revival Trio').trim();
      const reqWhat = (row['Required What, are they charging'] || row['Required What'] || '').trim();
      const category = (row['Category'] || 'Lifestyle').trim();
      const stars = (row['Stars'] || '⭐⭐⭐⭐').trim();
      const statusRaw = (row['Status'] || '').trim();
      const shippedRaw = (row['Shipped'] || '').trim();
      const notes = (row['Additional Notes'] || row['Notes'] || '').trim();

      let stage = 'Contacted';
      let isPaid = false;
      let amount = 0;

      const amountMatch = reqWhat.match(/(\d+)k/i);
      if (amountMatch) {
        isPaid = true;
        amount = parseInt(amountMatch[1], 10) * 1000;
      } else if (reqWhat.toLowerCase().includes('charge') || reqWhat.toLowerCase().includes('paid')) {
        isPaid = true;
        amount = 15000;
      }

      if (statusRaw.toLowerCase() === 'delivered') {
        stage = row['Influencer posted'] === 'Yes' || (notes && notes.includes('http')) ? 'Content received' : 'Content pending';
      } else if (statusRaw.toLowerCase() === 'dispatched' || shippedRaw.toLowerCase() === 'yes') {
        stage = 'Shipped';
      } else if (statusRaw.toLowerCase() === 'to be dispatched') {
        stage = 'Ready to ship';
      } else if (address && address !== 'TBD' && phone) {
        stage = isPaid ? 'Awaiting approval' : 'Ready to ship';
      } else if (row['Reached Out'] === 'Yes' || row['Reaced Out'] === 'Yes') {
        stage = 'Replied';
      }

      let city = (row['City'] || '').trim();
      if (!city && address) {
        const lower = address.toLowerCase();
        if (lower.includes('lahore') || lower.includes('lhr')) city = 'Lahore';
        else if (lower.includes('karachi') || lower.includes('khi')) city = 'Karachi';
        else if (lower.includes('islamabad') || lower.includes('isb')) city = 'Islamabad';
        else if (lower.includes('rawalpindi') || lower.includes('rwp')) city = 'Rawalpindi';
        else city = 'Lahore';
      }

      try {
        const inf = await prisma.influencer.create({
          data: {
            name: name || cleanHandle,
            igHandle: cleanHandle,
            followerCount: 25000,
            category: category || 'Lifestyle',
            stars: stars || '⭐⭐⭐⭐',
            shippingName: name || cleanHandle,
            address: address || 'TBD',
            phone: phone || '03001234567',
            email: (row['Email Address'] && row['Email Address'] !== '-') ? row['Email Address'] : null,
            city: city || 'Lahore',
            prPackage: products || 'Hair Revival Trio',
            products: products,
            isPaid,
            amount,
            stage,
            notes: notes || null,
            createdById: user.id,
            assignedToId,
            lastEditedById: user.id,
            deliverables: {
              create: [
                {
                  type: reqWhat || '1 Reel + 1 Story',
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  received: stage === 'Content received',
                  proofUrl: (notes && notes.includes('http')) ? notes : null,
                },
              ],
            },
            dispatch: {
              create: {
                status: (stage === 'Shipped' || stage === 'Content pending' || stage === 'Content received') ? 'Delivered' : 'Ready',
              },
            },
            approval: isPaid
              ? {
                  create: {
                    amount,
                    status: stage === 'Awaiting approval' ? 'PENDING' : 'APPROVED',
                    note: 'Imported from Google Master Sheet',
                  },
                }
              : undefined,
          },
        });

        await prisma.activityLog.create({
          data: {
            entity: 'Influencer',
            recordId: inf.id,
            influencerId: inf.id,
            action: 'CREATED',
            details: `Imported via CSV migration by ${user.name}`,
            changedById: user.id,
          },
        });

        createdCount++;
      } catch (err: any) {
        errors.push(`${cleanHandle}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount,
      errors: errors.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
