import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import {
  ProtoAccount,
  ProtoActivity,
  ProtoAddress,
  ProtoAudit,
  ProtoDeposit,
  ProtoDispute,
  ProtoGiftBrand,
  ProtoGiftOrder,
  ProtoLedgerTx,
  ProtoNotice,
  ProtoOrder,
  ProtoOtp,
  ProtoQuote,
  ProtoSession,
  ProtoTicket,
  ProtoUser,
  ProtoUtilOrder,
} from './types';

const DEMO_PASSWORD = 'Nexora!Demo1';

@Injectable()
export class PrototypeStore implements OnModuleInit {
  private readonly log = new Logger(PrototypeStore.name);
  readonly users = new Map<string, ProtoUser>();
  readonly usersByEmail = new Map<string, string>();
  readonly sessions: ProtoSession[] = [];
  readonly otps: ProtoOtp[] = [];
  readonly accounts = new Map<string, ProtoAccount>();
  readonly ledger: ProtoLedgerTx[] = [];
  readonly idempotency = new Map<string, string>();
  readonly activity: ProtoActivity[] = [];
  readonly deposits: ProtoDeposit[] = [];
  readonly quotes: ProtoQuote[] = [];
  readonly addresses: ProtoAddress[] = [];
  readonly orders: ProtoOrder[] = [];
  readonly notices: ProtoNotice[] = [];
  readonly tickets: ProtoTicket[] = [];
  readonly giftBrands: ProtoGiftBrand[] = [];
  readonly giftOrders: ProtoGiftOrder[] = [];
  readonly utilOrders: ProtoUtilOrder[] = [];
  readonly disputes: ProtoDispute[] = [];
  readonly audits: ProtoAudit[] = [];
  readonly settings = new Map<string, string>([
    ['fees.p2pBps', '40'],
    ['limits.dailyUsdt', '25000'],
  ]);
  ready = false;

  async onModuleInit() {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    this.seedUser({
      id: 'user-customer',
      email: 'customer@nexorapay.dev',
      displayName: 'Aanya Shah',
      passwordHash,
      status: 'ACTIVE',
      roles: ['CUSTOMER'],
      failedLoginCount: 0,
      emailVerifiedAt: new Date(),
      lastLoginAt: null,
    });
    this.seedUser({
      id: 'user-merchant',
      email: 'merchant@nexorapay.dev',
      displayName: 'Orbit Desk Merchant',
      passwordHash,
      status: 'ACTIVE',
      roles: ['MERCHANT'],
      failedLoginCount: 0,
      emailVerifiedAt: new Date(),
      lastLoginAt: null,
    });
    this.seedUser({
      id: 'user-admin',
      email: 'admin@nexorapay.dev',
      displayName: 'Nexora Operator',
      passwordHash,
      status: 'ACTIVE',
      roles: ['ADMIN'],
      failedLoginCount: 0,
      emailVerifiedAt: new Date(),
      lastLoginAt: null,
    });
    this.ensureAccount('user-customer', 'USDT', '1284.500000', '75.000000');
    this.ensureAccount('user-customer', 'INR', '0.00', '0.00');
    this.ensureAccount('user-merchant', 'USDT', '5000.000000', '0.000000');
    this.ensureAccount('user-merchant', 'INR', '0.00', '0.00');
    this.addresses.push({
      id: 'addr-default',
      userId: 'user-customer',
      asset: 'USDT',
      network: 'TRX',
      address: 'NXMOCK_TRX_customer_primary',
      isDefault: true,
    });
    this.activity.push(
      {
        id: 'act-1',
        userId: 'user-customer',
        type: 'DEPOSIT',
        status: 'COMPLETED',
        asset: 'USDT',
        amount: '250.000000',
        createdAt: new Date(Date.now() - 86400000),
        simulated: true,
      },
      {
        id: 'act-2',
        userId: 'user-customer',
        type: 'P2P_SELL',
        status: 'FUNDS_LOCKED',
        asset: 'USDT',
        amount: '75.000000',
        createdAt: new Date(Date.now() - 3600000),
        simulated: true,
      },
      {
        id: 'act-3',
        userId: 'user-customer',
        type: 'UPI_PAY',
        status: 'COMPLETED',
        asset: 'USDT',
        amount: '12.400000',
        createdAt: new Date(Date.now() - 1800000),
        simulated: true,
      },
    );
    this.orders.push({
      id: 'order-seed-lock',
      customerId: 'user-customer',
      kind: 'SELL',
      status: 'FUNDS_LOCKED',
      usdtAmount: '75.000000',
      inrAmount: '6318.75',
      feeAmount: '25.28',
      timeline: [
        { at: new Date(Date.now() - 3600000), status: 'CREATED', note: 'Seed mock sell' },
        { at: new Date(Date.now() - 3590000), status: 'FUNDS_LOCKED', note: '75 USDT locked (simulated)' },
      ],
      createdAt: new Date(Date.now() - 3600000),
    });
    this.giftBrands.push(
      {
        id: 'brand-northline',
        slug: 'northline-audio',
        name: 'Northline Audio',
        category: 'Entertainment',
        products: [
          { id: 'p-nl-500', denominationInr: '500.00', usdtPrice: '6.000000' },
          { id: 'p-nl-1000', denominationInr: '1000.00', usdtPrice: '11.900000' },
        ],
      },
      {
        id: 'brand-paper',
        slug: 'paper-trail',
        name: 'Paper Trail Books',
        category: 'Retail',
        products: [{ id: 'p-pt-250', denominationInr: '250.00', usdtPrice: '3.050000' }],
      },
    );
    this.notices.push({
      id: 'n-1',
      userId: 'user-customer',
      type: 'DEPOSIT',
      title: 'Mock deposit confirmed',
      body: '250 USDT credited on the simulated ledger.',
      readAt: null,
      createdAt: new Date(Date.now() - 86400000),
    });
    this.ready = true;
    this.log.log('Mock prototype store seeded. Demo password Nexora!Demo1. No live rails.');
  }

  seedUser(user: ProtoUser) {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user.id);
  }

  ensureAccount(userId: string, asset: 'USDT' | 'INR', available = '0', locked = '0') {
    const key = `${userId}:${asset}`;
    if (!this.accounts.has(key)) {
      this.accounts.set(key, { userId, asset, available, locked });
    }
    return this.accounts.get(key)!;
  }

  account(userId: string, asset: 'USDT' | 'INR') {
    return this.ensureAccount(userId, asset);
  }

  findUserByEmail(email: string) {
    const id = this.usersByEmail.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  createUser(input: Omit<ProtoUser, 'id' | 'failedLoginCount' | 'lastLoginAt'> & { id?: string }) {
    const user: ProtoUser = {
      ...input,
      id: input.id ?? randomUUID(),
      email: input.email.toLowerCase(),
      failedLoginCount: 0,
      lastLoginAt: null,
    };
    this.seedUser(user);
    this.ensureAccount(user.id, 'USDT');
    this.ensureAccount(user.id, 'INR');
    return user;
  }

  addActivity(row: Omit<ProtoActivity, 'id' | 'createdAt' | 'simulated'> & { id?: string }) {
    const item: ProtoActivity = {
      ...row,
      id: row.id ?? randomUUID(),
      createdAt: new Date(),
      simulated: true,
    };
    this.activity.unshift(item);
    return item;
  }

  notify(userId: string, type: string, title: string, body: string) {
    const row: ProtoNotice = {
      id: randomUUID(),
      userId,
      type,
      title,
      body,
      readAt: null,
      createdAt: new Date(),
    };
    this.notices.unshift(row);
    return row;
  }

  audit(actorId: string, action: string, entity: string, entityId: string, reason: string) {
    this.audits.unshift({
      id: randomUUID(),
      actorId,
      action,
      entity,
      entityId,
      reason,
      createdAt: new Date(),
    });
  }
}
