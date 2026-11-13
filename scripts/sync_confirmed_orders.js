const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function syncData() {
  console.log('--- Starting Sync of Confirmed Orders & Operations Team Profile ---');

  // 1. Ensure Team Users (Including Ali)
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
  console.log(`Verified ${Object.keys(userMap).length} team users (Ali created with OPERATIONS role).`);

  const defaultUser = userMap['amna'] || userMap['zain'];

  // Helper to map locked_by string to user
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

  // Helper to parse dates like "19.10.26" or "01.11.26"
  function parseDateString(dStr) {
    if (!dStr) return null;
    const clean = dStr.trim();
    const parts = clean.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const standardDate = new Date(clean);
    return isNaN(standardDate.getTime()) ? null : standardDate;
  }

  // 2. Read Confirmed Orders JSON
  const ordersJsonPath = path.join(__dirname, '../prisma/confirmed_orders_data.json');
  if (!fs.existsSync(ordersJsonPath)) {
    console.error('File not found:', ordersJsonPath);
    return;
  }

  const confirmedOrders = JSON.parse(fs.readFileSync(ordersJsonPath, 'utf8'));
  console.log(`Loaded ${confirmedOrders.length} confirmed orders from JSON.`);

  let updatedCount = 0;
  let createdCount = 0;

  for (const order of confirmedOrders) {
    const assignedUser = getAssignedUser(order.locked_by);
    const orderDate = parseDateString(order.order_date) || new Date();
    const shippedDate = parseDateString(order.shipped_date) || (order.dispatch_status !== 'Ready' ? orderDate : null);
    const deliveredDate = order.dispatch_status === 'Delivered' ? (parseDateString(order.shipped_date) || orderDate) : null;

    // Normalize phone digits for matching
    const phoneDigits = (order.phone || '').replace(/\D/g, '');

    // Look for existing influencer by name or phone
    const existing = await prisma.influencer.findFirst({
      where: {
        OR: [
          { name: { equals: order.name.trim() } },
          { shippingName: { equals: order.name.trim() } },
          ...(phoneDigits.length >= 7 ? [{ phone: { contains: phoneDigits.slice(-7) } }] : []),
        ],
      },
    });

    if (existing) {
      // Update existing record
      await prisma.influencer.update({
        where: { id: existing.id },
        data: {
          phone: order.phone || existing.phone,
          address: order.address || existing.address,
          city: order.city || existing.city,
          products: order.products || existing.products,
          stage: order.stage,
          assignedToId: assignedUser.id,
          lastEditedById: userMap['ali']?.id || defaultUser.id,
        },
      });

      // Update or create dispatch
      await prisma.dispatch.upsert({
        where: { influencerId: existing.id },
        update: {
          status: order.dispatch_status,
          trackingNumber: order.tracking || null,
          shippedDate: shippedDate,
          deliveredDate: deliveredDate,
        },
        create: {
          influencerId: existing.id,
          status: order.dispatch_status,
          trackingNumber: order.tracking || null,
          shippedDate: shippedDate,
          deliveredDate: deliveredDate,
        },
      });

      updatedCount++;
    } else {
      // Create new record
      const cleanHandle = '@' + order.name.toLowerCase().replace(/[^a-z0-9_]/g, '');

      const newInf = await prisma.influencer.create({
        data: {
          name: order.name,
          igHandle: cleanHandle,
          followerCount: 15000,
          category: 'Skinfluencer',
          stars: '⭐⭐⭐⭐',
          shippingName: order.name,
          address: order.address,
          phone: order.phone || '0300-0000000',
          email: order.email || null,
          city: order.city,
          prPackage: order.products || 'Custom Package',
          products: order.products,
          stage: order.stage,
          isPaid: false,
          amount: 0,
          createdById: assignedUser.id,
          assignedToId: assignedUser.id,
          createdAt: orderDate,
        },
      });

      // Create Deliverable
      await prisma.deliverable.create({
        data: {
          influencerId: newInf.id,
          type: '1 Reel + 1 Story',
          dueDate: new Date(orderDate.getTime() + 14 * 24 * 60 * 60 * 1000),
          received: false,
        },
      });

      // Create Dispatch
      await prisma.dispatch.create({
        data: {
          influencerId: newInf.id,
          status: order.dispatch_status,
          trackingNumber: order.tracking || null,
          sentToOpsDate: orderDate,
          shippedDate: shippedDate,
          deliveredDate: deliveredDate,
        },
      });

      createdCount++;
    }
  }

  console.log(`Sync complete! Updated: ${updatedCount}, Created new: ${createdCount}`);
  const totalInDb = await prisma.influencer.count();
  const dispatchBreakdown = await prisma.dispatch.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log(`Total influencers in DB: ${totalInDb}`);
  console.log('Dispatch breakdown in DB:', dispatchBreakdown);

  await prisma.$disconnect();
}

syncData().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
