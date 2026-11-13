import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function cleanPhoneDigits(str: string) {
  let digits = (str || '').replace(/\D/g, '');
  if (digits.startsWith('92')) digits = '0' + digits.slice(2);
  return digits.length >= 7 ? digits.slice(-10) : digits;
}

function cleanAddress(str: string) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim() || '';
    const phone = searchParams.get('phone')?.trim() || '';
    const address = searchParams.get('address')?.trim() || '';
    const excludeId = searchParams.get('excludeId')?.trim() || '';

    if (!name && !phone && !address) {
      return NextResponse.json({ isDuplicate: false });
    }

    const phoneDigits = cleanPhoneDigits(phone);
    const normAddr = cleanAddress(address);

    const orConditions: any[] = [];

    // 1. Name Check (Exact or close name)
    if (name.length >= 3) {
      orConditions.push({ name: { equals: name, mode: 'insensitive' } });
      orConditions.push({ shippingName: { equals: name, mode: 'insensitive' } });
    }

    // 2. Phone Check (Digits match)
    if (phoneDigits && phoneDigits.length >= 7) {
      orConditions.push({ phone: { contains: phoneDigits.slice(-7) } });
    }

    // 3. Address Check (Clean alphanumeric address match)
    if (normAddr && normAddr.length >= 15) {
      orConditions.push({ address: { contains: address.slice(0, 20), mode: 'insensitive' } });
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ isDuplicate: false });
    }

    const existing = await prisma.influencer.findFirst({
      where: {
        AND: [
          excludeId ? { id: { not: excludeId } } : {},
          { OR: orConditions },
        ],
      },
      include: {
        dispatch: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (existing) {
      // Determine what matched
      const matchedBy: string[] = [];
      if (name && (existing.name.toLowerCase() === name.toLowerCase() || existing.shippingName?.toLowerCase() === name.toLowerCase())) {
        matchedBy.push('Full Name');
      }
      if (phoneDigits && cleanPhoneDigits(existing.phone).includes(phoneDigits.slice(-7))) {
        matchedBy.push('Phone Number');
      }
      if (normAddr && cleanAddress(existing.address).includes(normAddr.slice(0, 15))) {
        matchedBy.push('Address');
      }

      return NextResponse.json({
        isDuplicate: true,
        matchedBy: matchedBy.join(', ') || 'Contact Details',
        duplicate: {
          id: existing.id,
          name: existing.name,
          igHandle: existing.igHandle,
          phone: existing.phone,
          address: existing.address,
          stage: existing.stage,
          dispatchStatus: existing.dispatch?.status || 'Not Dispatched',
          assignedTo: existing.assignedTo?.name || 'Unassigned',
        },
      });
    }

    return NextResponse.json({ isDuplicate: false });
  } catch (error: any) {
    console.error('Check duplicate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
