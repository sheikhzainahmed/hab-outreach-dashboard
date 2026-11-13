const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding HAB Outreach Dashboard...');

  // 1. Create Team Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    { name: 'Humza', email: 'humza@hiraalibeauty.com', role: 'OWNER' },
    { name: 'Zain', email: 'zain@hiraalibeauty.com', role: 'MANAGER' },
    { name: 'Fatima', email: 'fatima@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Minahil', email: 'minahil@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Amna', email: 'amna@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Maryam', email: 'maryam@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Sophia', email: 'sophia@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Maimoona', email: 'maimoona@hiraalibeauty.com', role: 'EXECUTOR' },
    { name: 'Huzaifa', email: 'huzaifa@hiraalibeauty.com', role: 'EXECUTOR' },
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
  console.log(`Created/updated ${Object.keys(userMap).length} users.`);

  const defaultUser = userMap['amna'] || userMap['zain'];

  // 2. Parse Raw CSV Data
  const existingCount = await prisma.influencer.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} influencers. Skipping initial data seeding.`);
    return;
  }

  let csvPath = path.join(__dirname, 'raw_sheets_data.csv');
  if (!fs.existsSync(csvPath)) {
    csvPath = path.join(__dirname, '../../raw_sheets_data.csv');
  }
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    console.log(`Read ${parsed.data.length} records from raw_sheets_data.csv.`);

    let count = 0;
    for (const row of parsed.data) {
      const name = (row['Name'] || row['Creator'] || row['NAME'] || '').trim();
      const rawIg = (row['Instagram Id'] || row['Instagram'] || '').trim();
      if (!name && !rawIg) continue;

      let igHandle = (row['_handle_helper'] || '').trim();
      if (!igHandle && rawIg) {
        const match = rawIg.match(/instagram\.com\/([^/?#]+)/i);
        igHandle = match ? match[1] : rawIg.replace('@', '');
      }
      if (!igHandle) igHandle = name.toLowerCase().replace(/[^a-z0-9_.]/g, '');

      // Assignee or Contacted By
      const contactedByStr = (row['Contacted By'] || row['Managed by'] || row['Assignee'] || '').trim().toLowerCase();
      const ownerUser = userMap[contactedByStr] || defaultUser;

      const phone = (row['Contact Number'] || row['Number'] || '').trim();
      const address = (row['Address'] || '').trim();
      const products = (row['Products To Send'] || row['Products to send'] || row['Pro '] || 'Hair Revival Trio').trim();
      const reqWhat = (row['Required What, are they charging'] || row['Required What'] || '').trim();
      const category = (row['Category'] || 'Lifestyle').trim();
      const stars = (row['Stars'] || '').trim();
      const statusRaw = (row['Status'] || '').trim();
      const shippedRaw = (row['Shipped'] || '').trim();
      const notes = (row['Additional Notes'] || row['Notes'] || '').trim();
      const discountCode = (row['Discount Code'] || '').trim();
      const salesGen = parseFloat(row['Sales Generated'] || '0') || 0;

      // Determine stage
      let stage = 'Contacted';
      let isPaid = false;
      let amount = 0;

      // Check if paid in reqWhat
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
      } else if (address && phone) {
        if (isPaid) {
          stage = 'Awaiting approval';
        } else {
          stage = 'Ready to ship';
        }
      } else if (products || reqWhat) {
        stage = 'Package agreed';
      } else if (row['Reaced Out'] === 'Yes' || row['Reached Out'] === 'Yes') {
        stage = 'Replied';
      }

      // Extract city from address
      let city = (row['City'] || '').trim();
      if (!city && address) {
        const lowerAddr = address.toLowerCase();
        if (lowerAddr.includes('lahore') || lowerAddr.includes('lhr')) city = 'Lahore';
        else if (lowerAddr.includes('karachi') || lowerAddr.includes('khi')) city = 'Karachi';
        else if (lowerAddr.includes('islamabad') || lowerAddr.includes('isb')) city = 'Islamabad';
        else if (lowerAddr.includes('rawalpindi') || lowerAddr.includes('rwp')) city = 'Rawalpindi';
        else if (lowerAddr.includes('faisalabad')) city = 'Faisalabad';
        else if (lowerAddr.includes('hyderabad')) city = 'Hyderabad';
        else if (lowerAddr.includes('sialkot')) city = 'Sialkot';
        else if (lowerAddr.includes('gujranwala')) city = 'Gujranwala';
        else if (lowerAddr.includes('peshawar')) city = 'Peshawar';
        else city = 'Lahore';
      }

      try {
        const influencer = await prisma.influencer.create({
          data: {
            name: name || igHandle,
            igHandle: igHandle.startsWith('@') ? igHandle : `@${igHandle}`,
            followerCount: Math.floor(Math.random() * 80000) + 15000,
            category: category || 'Lifestyle',
            stars: stars || '⭐⭐⭐⭐',
            shippingName: name || igHandle,
            address: address || 'TBD',
            phone: phone || '03001234567',
            email: (row['Email Address'] && row['Email Address'] !== '-') ? row['Email Address'] : null,
            city: city || 'Lahore',
            prPackage: products || 'Hair Revival Trio',
            products: products,
            isPaid: isPaid,
            amount: amount,
            stage: stage,
            notes: notes,
            discountCode: discountCode || null,
            salesGenerated: salesGen,
            createdById: ownerUser.id,
            assignedToId: ownerUser.id,
            lastEditedById: ownerUser.id,
            deliverables: {
              create: [
                {
                  type: reqWhat || '1 Reel + 1 Story',
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  received: stage === 'Content received',
                  proofUrl: (notes && notes.includes('instagram.com/reel')) ? notes : (stage === 'Content received' ? 'https://www.instagram.com/p/DBh8_sample' : null),
                  receivedAt: stage === 'Content received' ? new Date() : null,
                }
              ]
            },
            dispatch: {
              create: {
                status: (stage === 'Shipped' || stage === 'Content pending' || stage === 'Content received') ? 'Delivered' : (stage === 'Ready to ship' ? 'Ready' : 'Ready'),
                shippedDate: (stage === 'Shipped' || stage === 'Content pending' || stage === 'Content received') ? new Date('2026-10-25') : null,
                deliveredDate: (stage === 'Content pending' || stage === 'Content received') ? new Date('2026-10-28') : null,
                trackingNumber: row['Notes/Tracking ID'] || (stage === 'Shipped' ? '127164' + Math.floor(100 + Math.random() * 899) : null),
              }
            },
            approval: isPaid ? {
              create: {
                amount: amount,
                status: (stage === 'Awaiting approval') ? 'PENDING' : 'APPROVED',
                approverId: (stage !== 'Awaiting approval') ? userMap['humza'].id : null,
                decidedAt: (stage !== 'Awaiting approval') ? new Date() : null,
                note: 'Approved for campaign reach & target demographic',
              }
            } : undefined
          }
        });

        // Add initial activity log
        await prisma.activityLog.create({
          data: {
            entity: 'Influencer',
            recordId: influencer.id,
            influencerId: influencer.id,
            action: 'CREATED',
            details: `Imported from Google Master Sheet by ${ownerUser.name}`,
            changedById: ownerUser.id,
          }
        });

        count++;
        if (count >= 150) break; // Seed the top 150 representative influencers
      } catch (err) {
        // Skip duplicate or validation errors
      }
    }
    console.log(`Seeded ${count} influencers with deliverables, dispatches and approvals!`);
  }

  // Add initial notifications for demo
  const humza = userMap['humza'];
  const zain = userMap['zain'];
  const amna = userMap['amna'];

  if (humza) {
    await prisma.notification.create({
      data: {
        userId: humza.id,
        title: 'New Paid Requests Awaiting Approval',
        message: '3 influencers require your spend approval before dispatch.',
        type: 'warning',
        link: '/owner',
      }
    });
  }

  if (zain) {
    await prisma.notification.create({
      data: {
        userId: zain.id,
        title: 'Dispatch Queue Updated',
        message: '22 packages are Ready to ship for operations hand-off.',
        type: 'info',
        link: '/manager',
      }
    });
  }

  if (amna) {
    await prisma.notification.create({
      data: {
        userId: amna.id,
        title: 'Deliverables Due',
        message: '4 influencers have content pending past the 7-day delivery window.',
        type: 'alert',
        link: '/executor',
      }
    });
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
