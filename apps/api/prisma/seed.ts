import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('StampPerk123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@stampperk.app' },
    update: {},
    create: {
      email: 'admin@stampperk.app',
      name: 'Stamp Perk Admin',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      language: 'en',
      timezone: 'Asia/Kathmandu',
      currency: 'NPR',
    },
  });

  const merchantOwner = await prisma.user.upsert({
    where: { email: 'merchant@stampperk.app' },
    update: {},
    create: {
      email: 'merchant@stampperk.app',
      name: 'Brew Owner',
      passwordHash,
      role: UserRole.MERCHANT_OWNER,
      phone: '+9779867305385',
      language: 'en',
      timezone: 'Asia/Kathmandu',
      currency: 'NPR',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@stampperk.app' },
    update: {},
    create: {
      email: 'customer@stampperk.app',
      name: 'Loyal Customer',
      passwordHash,
      role: UserRole.CUSTOMER,
      language: 'ne',
      timezone: 'Asia/Kathmandu',
      currency: 'NPR',
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@stampperk.app' },
    update: {},
    create: {
      email: 'staff@stampperk.app',
      name: 'Counter Staff',
      passwordHash,
      role: UserRole.STAFF,
      language: 'en',
      timezone: 'Asia/Kathmandu',
      currency: 'NPR',
    },
  });

  let merchant = await prisma.merchant.findFirst({ where: { ownerId: merchantOwner.id } });
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        ownerId: merchantOwner.id,
        businessName: 'Brew & Bliss Coffee',
        slug: 'brew-bliss',
        category: 'Coffee',
        description: 'Specialty coffee and warm loyalty in Lalitpur.',
        phone: '+9779867305385',
        email: 'hello@brewbliss.example',
        address: 'M8FQ+MMH, Lalitpur 44600, Nepal',
        city: 'Lalitpur',
        country: 'NP',
        latitude: 27.6588,
        longitude: 85.3247,
        status: 'ACTIVE',
        hoursJson: {
          monFri: '7:00 AM – 8:00 PM',
          saturday: '8:00 AM – 6:00 PM',
          sunday: 'Closed',
        },
        currency: 'NPR',
        timezone: 'Asia/Kathmandu',
        branches: { create: { name: 'Main Branch', address: 'Lalitpur', latitude: 27.6588, longitude: 85.3247 } },
        subscription: { create: { plan: 'FREE', status: 'ACTIVE', provider: 'MANUAL' } },
        gallery: {
          create: [{ url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', sortOrder: 0 }],
        },
        menuItems: {
          create: [
            { name: 'Flat White', description: 'Silky microfoam', price: 280 },
            { name: 'Cappuccino', description: 'Classic foam', price: 260 },
          ],
        },
        publicLinks: {
          create: [{ label: 'Public Profile', url: 'http://localhost:3000/b/brew-bliss' }],
        },
      },
    });
  }

  const program =
    (await prisma.loyaltyProgram.findFirst({ where: { merchantId: merchant.id } })) ||
    (await prisma.loyaltyProgram.create({
      data: {
        merchantId: merchant.id,
        title: 'Coffee Stamp Card',
        description: 'Buy 10 drinks, get 1 free',
        totalStamps: 10,
        rewardTitle: 'Free drink',
        rewardDescription: 'Any regular-size coffee on us',
        expiryDays: 365,
      },
    }));

  await prisma.staffMember.upsert({
    where: { merchantId_userId: { merchantId: merchant.id, userId: staffUser.id } },
    update: { permissions: JSON.stringify(['SCAN', 'REDEEM']), active: true },
    create: {
      merchantId: merchant.id,
      userId: staffUser.id,
      permissions: JSON.stringify(['SCAN', 'REDEEM']),
      acceptedAt: new Date(),
    },
  });

  await prisma.loyaltyCard.upsert({
    where: { programId_customerId: { programId: program.id, customerId: customer.id } },
    update: {},
    create: { programId: program.id, customerId: customer.id, stampCount: 3 },
  });

  await prisma.campaign.upsert({
    where: { id: 'seed-campaign-1' },
    update: {},
    create: {
      id: 'seed-campaign-1',
      merchantId: merchant.id,
      title: '20% OFF Weekend Pastries',
      description: 'Enjoy 20% off all pastries this weekend.',
      badgeText: '20% OFF',
      offerType: 'PERCENTAGE',
      discountValue: 20,
      status: 'ACTIVE',
    },
  });

  await prisma.supportTicket.deleteMany({});
  await prisma.supportTicket.createMany({
    data: [
      {
        subject: 'Cannot scan customer QR',
        body: 'Camera freezes on Android when scanning loyalty codes at the counter.',
        status: 'OPEN',
        priority: 'HIGH',
        requesterEmail: 'merchant@stampperk.app',
        requesterName: 'Brew Owner',
      },
      {
        subject: 'Billing plan upgrade question',
        body: 'We want to move from FREE to YEARLY — does the allowance reset immediately?',
        status: 'IN_PROGRESS',
        priority: 'NORMAL',
        requesterEmail: 'merchant@stampperk.app',
        requesterName: 'Brew Owner',
      },
      {
        subject: 'Wrong stamp count on wallet',
        body: 'Customer sees 3 stamps but staff issued 4 yesterday evening.',
        status: 'RESOLVED',
        priority: 'URGENT',
        requesterEmail: 'customer@stampperk.app',
        requesterName: 'Loyal Customer',
      },
    ],
  });

  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'Stamp Perk',
      tagline: 'Digital Loyalty Cards for Growing Businesses',
      seoTitleTemplate: '{companyName} | {tagline}',
      metaDescription:
        'Create a digital punch card, earn repeat customers, and manage your loyalty program from mobile and desktop. One account. Everything stays in sync.',
      metaKeywords: 'loyalty, stamp card, digital punch card, rewards, Stamp Perk',
      contactEmail: 'hello@stampperk.app',
      supportEmail: 'support@stampperk.app',
    },
  });

  const leafletSeeds = [
    {
      name: 'Hero A5',
      description: 'Photo on top with logo, headline, offer and QR',
      layoutId: 'hero-a5',
      categoryTags: 'general,food',
      sortOrder: 0,
    },
    {
      name: 'Story Square',
      description: 'Square layout for social stories',
      layoutId: 'story-square',
      categoryTags: 'social',
      sortOrder: 1,
    },
    {
      name: 'Offer Band',
      description: 'Bold offer strip with logo and QR',
      layoutId: 'offer-band',
      categoryTags: 'promo',
      sortOrder: 2,
    },
    {
      name: 'Minimal QR',
      description: 'Clean logo, short offer, large QR',
      layoutId: 'minimal-qr',
      categoryTags: 'qr',
      sortOrder: 3,
    },
  ];

  for (const seed of leafletSeeds) {
    const existing = await prisma.leafletTemplate.findFirst({
      where: { layoutId: seed.layoutId, name: seed.name },
    });
    if (!existing) {
      await prisma.leafletTemplate.create({
        data: {
          ...seed,
          active: true,
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seeded Stamp Perk demo data', {
    admin: admin.email,
    merchant: merchantOwner.email,
    customer: customer.email,
    staff: staffUser.email,
    business: merchant.slug,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
