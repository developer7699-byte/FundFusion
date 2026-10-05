import { PrismaClient, RoleName, UserStatus, MerchantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Nexora!Demo1', 12);

  const roles = await Promise.all(
    [RoleName.CUSTOMER, RoleName.MERCHANT, RoleName.ADMIN].map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const role = (name: RoleName) => roles.find((r) => r.name === name)!.id;

  const usdt = await prisma.asset.upsert({
    where: { symbol: 'USDT' },
    update: {},
    create: { symbol: 'USDT', name: 'Tether USD (simulated)', decimals: 6, kind: 'STABLE' },
  });
  await prisma.asset.upsert({
    where: { symbol: 'INR' },
    update: {},
    create: { symbol: 'INR', name: 'Indian Rupee (display only)', decimals: 2, kind: 'FIAT_DISPLAY' },
  });
  await prisma.blockchainNetwork.upsert({
    where: { assetId_code: { assetId: usdt.id, code: 'TRX' } },
    update: {},
    create: { assetId: usdt.id, code: 'TRX', name: 'TRON mock rail', mockOnly: true },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@nexorapay.dev' },
    update: {},
    create: {
      email: 'customer@nexorapay.dev',
      displayName: 'Aanya Shah',
      passwordHash: password,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: role(RoleName.CUSTOMER) } },
      customer: { create: { referralCode: 'NXAANYA1', kycStatus: 'UNVERIFIED' } },
    },
  });

  const merchantUser = await prisma.user.upsert({
    where: { email: 'merchant@nexorapay.dev' },
    update: {},
    create: {
      email: 'merchant@nexorapay.dev',
      displayName: 'Orbit Desk Merchant',
      passwordHash: password,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: role(RoleName.MERCHANT) } },
      merchant: {
        create: { businessName: 'Orbit Desk LLP', status: MerchantStatus.ACTIVE, commissionBps: 150 },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@nexorapay.dev' },
    update: {},
    create: {
      email: 'admin@nexorapay.dev',
      displayName: 'Nexora Operator',
      passwordHash: password,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: role(RoleName.ADMIN) } },
    },
  });

  const wallet = await prisma.wallet.upsert({
    where: { userId_label: { userId: customer.id, label: 'PRIMARY' } },
    update: {},
    create: { userId: customer.id, label: 'PRIMARY' },
  });

  await prisma.walletAccount.upsert({
    where: { walletId_assetId: { walletId: wallet.id, assetId: usdt.id } },
    update: { available: '1284.500000000000000000', locked: '75.000000000000000000', simulated: true },
    create: {
      walletId: wallet.id,
      assetId: usdt.id,
      available: '1284.500000000000000000',
      locked: '75.000000000000000000',
      simulated: true,
    },
  });

  await prisma.wallet.upsert({
    where: { userId_label: { userId: merchantUser.id, label: 'PRIMARY' } },
    update: {},
    create: { userId: merchantUser.id, label: 'PRIMARY' },
  });

  await prisma.transaction.deleteMany({ where: { userId: customer.id } });
  await prisma.transaction.createMany({
    data: [
      {
        userId: customer.id,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        assetSymbol: 'USDT',
        amount: '250.000000000000000000',
        inrDisplay: '21062.50',
        simulated: true,
      },
      {
        userId: customer.id,
        type: 'P2P_SELL',
        status: 'FUNDS_LOCKED',
        assetSymbol: 'USDT',
        amount: '75.000000000000000000',
        inrDisplay: '6318.75',
        simulated: true,
      },
      {
        userId: customer.id,
        type: 'UPI_PAY',
        status: 'COMPLETED',
        assetSymbol: 'USDT',
        amount: '12.400000000000000000',
        inrDisplay: '1044.70',
        simulated: true,
      },
    ],
  });

  await prisma.giftCardBrand.upsert({
    where: { slug: 'northline-audio' },
    update: {},
    create: { slug: 'northline-audio', name: 'Northline Audio', category: 'Entertainment' },
  });
  await prisma.utilityService.upsert({
    where: { code: 'MOBILE' },
    update: {},
    create: { code: 'MOBILE', name: 'Mobile recharge', category: 'telecom' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'prototype.mode' },
    update: { value: { enabled: true, label: 'All balances are simulated' } },
    create: { key: 'prototype.mode', value: { enabled: true, label: 'All balances are simulated' } },
  });

  console.log('Seed complete. Demo password for all seeded users: Nexora!Demo1');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
