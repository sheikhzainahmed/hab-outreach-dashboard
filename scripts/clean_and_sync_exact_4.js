const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Helper to normalize strings for comparison
function norm(str) {
  return (str || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Helper to extract phone digits
function cleanPhone(str) {
  let digits = (str || '').replace(/\D/g, '');
  if (digits.startsWith('92')) digits = '0' + digits.slice(2);
  return digits.length >= 7 ? digits.slice(-10) : digits;
}

async function cleanAndSyncExact() {
  console.log('--- Cleaning Database & Syncing Confirmed Orders with Exact 4 Ready ---');

  // Load the parsed orders from Confirmed Orders sheet
  const rawOrdersPath = path.join(__dirname, '../prisma/confirmed_orders_latest.json');
  if (!fs.existsSync(rawOrdersPath)) {
    console.error('File not found:', rawOrdersPath);
    return;
  }

  const rawOrders = JSON.parse(fs.readFileSync(rawOrdersPath, 'utf8'));
  console.log(`Loaded ${rawOrders.length} raw orders from Confirmed Orders sheet.`);

  // 1. Deduplicate by clean phone & clean name
  const seenPhone = new Map();
  const seenName = new Map();
  const seenAddress = new Map();
  const uniqueOrders = [];

  for (const o of rawOrders) {
    const cPhone = cleanPhone(o.phone);
    const cName = norm(o.name);
    const cAddr = norm(o.address).slice(0, 25);

    // Check if duplicate of an earlier entry in sheet
    let isDup = false;
    if (cPhone && cPhone.length >= 7 && seenPhone.has(cPhone)) {
      console.log(`Duplicate phone found in sheet: ${o.name} (${o.phone}) matches ${seenPhone.get(cPhone).name}`);
      isDup = true;
    } else if (cName && seenName.has(cName)) {
      console.log(`Duplicate name found in sheet: ${o.name} matches ${seenName.get(cName).name}`);
      isDup = true;
    } else if (cAddr && cAddr.length >= 15 && seenAddress.has(cAddr)) {
      console.log(`Duplicate address found in sheet: ${o.name} (${o.address}) matches ${seenAddress.get(cAddr).name}`);
      isDup = true;
    }

    if (!isDup) {
      if (cPhone && cPhone.length >= 7) seenPhone.set(cPhone, o);
      if (cName) seenName.set(cName, o);
      if (cAddr && cAddr.length >= 15) seenAddress.set(cAddr, o);
      uniqueOrders.push(o);
    }
  }

  console.log(`Unique confirmed orders after deduplication: ${uniqueOrders.length}`);

  // Fetch users map
  const users = await prisma.user.findMany();
  const userMap = {};
  users.forEach((u) => {
    userMap[u.name.toLowerCase()] = u;
  });
  const defaultUser = userMap['amna'] || users[0];

  function getAssignedUser(lockedByStr) {
    if (!lockedByStr) return defaultUser;
    const clean = lockedByStr.trim().toLowerCase();
    if (userMap[clean]) return userMap[clean];
    if (clean.includes('amna')) return userMap['amna'];
    if (clean.includes('fatima')) return userMap['fatima'];
    if (clean.includes('minahil')) return userMap['minahil'];
    if (clean.includes('maryam')) return userMap['maryam'];
    if (clean.includes('sophia')) return userMap['sophia'];
    if (clean.includes('maimoona')) return userMap['maimoona'];
    return defaultUser;
  }

  // The EXACT 4 creators that must be in "To be dispatched" (Ready):
  const EXACT_4_READY_NAMES = ['dr nargis khan', 'dr hareem', 'minahil abrar', 'alishba amir'];

  function isExact4Ready(name) {
    const n = norm(name);
    return EXACT_4_READY_NAMES.some((target) => n.includes(norm(target)));
  }

  // Update or create each unique order in DB
  let updatedCount = 0;
  let createdCount = 0;

  for (const o of uniqueOrders) {
    const assignedUser = getAssignedUser(o.locked_by);
    const isReadyOrder = isExact4Ready(o.name);

    let dispatchStatus = 'Shipped';
    let stage = 'Shipped';

    if (isReadyOrder) {
      dispatchStatus = 'Ready';
      stage = 'Ready to ship';
    } else if (o.status && o.status.toLowerCase().includes('delivered')) {
      dispatchStatus = 'Delivered';
      stage = 'Content pending';
    } else {
      dispatchStatus = 'Shipped';
      stage = 'Shipped';
    }

    const cPhone = cleanPhone(o.phone);
    const cName = norm(o.name);

    // Find in DB
    const existing = await prisma.influencer.findFirst({
      where: {
        OR: [
          { name: { equals: o.name.trim() } },
          { shippingName: { equals: o.name.trim() } },
          ...(cPhone && cPhone.length >= 7 ? [{ phone: { contains: cPhone.slice(-7) } }] : []),
        ],
      },
    });

    if (existing) {
      await prisma.influencer.update({
        where: { id: existing.id },
        data: {
          name: o.name.trim(),
          shippingName: o.name.trim(),
          phone: o.phone || existing.phone,
          address: o.address || existing.address,
          products: o.products || existing.products,
          stage: stage,
          assignedToId: assignedUser.id,
        },
      });

      await prisma.dispatch.upsert({
        where: { influencerId: existing.id },
        update: {
          status: dispatchStatus,
          trackingNumber: o.tracking || null,
        },
        create: {
          influencerId: existing.id,
          status: dispatchStatus,
          trackingNumber: o.tracking || null,
        },
      });
      updatedCount++;
    } else {
      const cleanHandle = '@' + o.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const newInf = await prisma.influencer.create({
        data: {
          name: o.name.trim(),
          igHandle: cleanHandle,
          followerCount: 15000,
          category: 'Skinfluencer',
          stars: '⭐⭐⭐⭐',
          shippingName: o.name.trim(),
          address: o.address,
          phone: o.phone || '0300-0000000',
          email: o.email || null,
          prPackage: o.products || 'Custom Package',
          products: o.products,
          stage: stage,
          createdById: assignedUser.id,
          assignedToId: assignedUser.id,
        },
      });

      await prisma.deliverable.create({
        data: {
          influencerId: newInf.id,
          type: '1 Reel + 1 Story',
          received: false,
        },
      });

      await prisma.dispatch.create({
        data: {
          influencerId: newInf.id,
          status: dispatchStatus,
          trackingNumber: o.tracking || null,
        },
      });
      createdCount++;
    }
  }

  // 2. Clean up any leftover records in "Ready" that are NOT in the exact 4
  const allReadyDispatches = await prisma.dispatch.findMany({
    where: { status: 'Ready' },
    include: { influencer: true },
  });

  for (const d of allReadyDispatches) {
    if (!isExact4Ready(d.influencer.name)) {
      console.log(`Setting non-exact-4 record "${d.influencer.name}" from Ready -> Shipped/Agreed`);
      await prisma.dispatch.update({
        where: { id: d.id },
        data: { status: 'Shipped' },
      });
      await prisma.influencer.update({
        where: { id: d.influencerId },
        data: { stage: 'Shipped' },
      });
    }
  }

  // Check final count of Ready
  const finalReady = await prisma.dispatch.findMany({
    where: { status: 'Ready' },
    include: { influencer: true },
  });

  console.log(`\n=== FINAL READY COUNT: ${finalReady.length} ===`);
  finalReady.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.influencer.name} | Phone: ${r.influencer.phone} | Locked by: ${r.influencer.assignedToId}`);
  });

  const finalBreakdown = await prisma.dispatch.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('\nFinal Dispatch Breakdown:', finalBreakdown);

  await prisma.$disconnect();
}

cleanAndSyncExact().catch((e) => {
  console.error(e);
  process.exit(1);
});
