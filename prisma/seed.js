const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function norm(str) {
  return (str || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function cleanPhone(str) {
  let digits = (str || '').replace(/\D/g, '');
  if (digits.startsWith('92')) digits = '0' + digits.slice(2);
  return digits.length >= 7 ? digits.slice(-10) : digits;
}

async function main() {
  console.log('Checking database state before seeding...');

  // Data Protection Guardrail: If database is already populated, skip seed to prevent overwriting live operational data
  const existingCount = await prisma.influencer.count();
  if (existingCount >= 50 && process.env.FORCE_SEED !== 'true') {
    console.log(`\n🛡️ [DATA GUARD] Database already contains ${existingCount} influencers.`);
    console.log('Skipping seed to protect live team data, new creators, and operational statuses.');
    return;
  }

  console.log('Seeding & Syncing HAB Outreach Dashboard with Confirmed Orders...');

  // 1. Create Team Users (Including Ali with OPERATIONS role)
  const passwordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    { name: 'Humza', email: 'humza@hiraalibeauty.com', role: 'OWNER' },
    { name: 'Zain', email: 'zain@hiraalibeauty.com', role: 'MANAGER' },
    { name: 'Ali', email: 'ali@hiraalibeauty.com', role: 'OPERATIONS' },
    { name: 'Huzaifa', email: 'huzaifa@hiraalibeauty.com', role: 'COORDINATOR' },
    { name: 'Fatima', email: 'fatima@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Minahil', email: 'minahil@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Amna', email: 'amna@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Maryam', email: 'maryam@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Sophia', email: 'sophia@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Maimoona', email: 'maimoona@hiraalibeauty.com', role: 'EXECUTOR' },
  ];

  const userMap = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name },
      create: {
        name: u.name,
        email: u.email,
        password: passwordHash,
        role: u.role,
        active: true,
      },
    });
    userMap[u.name.toLowerCase()] = user;
  }
  console.log(`Created/updated ${Object.keys(userMap).length} team users (Ali created with OPERATIONS role).`);

  const defaultUser = userMap['amna'] || userMap['zain'];

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
    if (clean.includes('huzaifa')) return userMap['huzaifa'];
    return defaultUser;
  }

  // 2. Load and Deduplicate Confirmed Orders
  const ordersJsonPath = path.join(__dirname, 'confirmed_orders_latest.json');
  if (!fs.existsSync(ordersJsonPath)) {
    console.error('File not found:', ordersJsonPath);
    return;
  }

  const rawOrders = JSON.parse(fs.readFileSync(ordersJsonPath, 'utf8'));
  console.log(`Loaded ${rawOrders.length} raw confirmed orders.`);

  // Strict deduplication by phone, name, and address
  const seenPhone = new Map();
  const seenName = new Map();
  const seenAddress = new Map();
  const uniqueOrders = [];

  for (const o of rawOrders) {
    const cPhone = cleanPhone(o.phone);
    const cName = norm(o.name);
    const cAddr = norm(o.address).slice(0, 25);

    let isDup = false;
    if (cPhone && cPhone.length >= 7 && seenPhone.has(cPhone)) {
      isDup = true;
    } else if (cName && seenName.has(cName)) {
      isDup = true;
    } else if (cAddr && cAddr.length >= 15 && seenAddress.has(cAddr)) {
      isDup = true;
    }

    if (!isDup) {
      if (cPhone && cPhone.length >= 7) seenPhone.set(cPhone, o);
      if (cName) seenName.set(cName, o);
      if (cAddr && cAddr.length >= 15) seenAddress.set(cAddr, o);
      uniqueOrders.push(o);
    }
  }

  console.log(`Deduplicated to ${uniqueOrders.length} clean orders.`);

  // The EXACT 4 creators that must be in "To be dispatched" (Ready):
  const EXACT_4_READY_NAMES = ['dr nargis khan', 'dr hareem', 'minahil abrar', 'alishba amir'];

  function isExact4Ready(name) {
    const n = norm(name);
    return EXACT_4_READY_NAMES.some((target) => n.includes(norm(target)));
  }

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
          isPaid: false,
          amount: 0,
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

  // Ensure any other records in Ready are moved to Shipped
  const allReady = await prisma.dispatch.findMany({
    where: { status: 'Ready' },
    include: { influencer: true },
  });

  for (const d of allReady) {
    if (!isExact4Ready(d.influencer.name)) {
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

  const finalReady = await prisma.dispatch.findMany({
    where: { status: 'Ready' },
    include: { influencer: true },
  });

  console.log(`\n=== VERIFIED READY COUNT: ${finalReady.length} (Target: 4) ===`);
  finalReady.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.influencer.name} | Phone: ${r.influencer.phone}`);
  });

  const totalInDb = await prisma.influencer.count();
  console.log(`Total influencers in DB: ${totalInDb}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
