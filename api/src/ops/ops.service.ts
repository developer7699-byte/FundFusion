import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { d, inrAmount, moneyString, usdtAmount } from '../money/decimal';
import { LedgerService } from '../ledger/ledger.service';
import { PrototypeStore } from '../prototype/prototype.store';
import { MockRateProvider } from '../providers/mock-rate.provider';
import { OrderStatus, ProtoOrder } from '../prototype/types';

@Injectable()
export class OpsService {
  constructor(
    private readonly store: PrototypeStore,
    private readonly ledger: LedgerService,
    private readonly rates: MockRateProvider,
  ) {}

  createOrder(
    userId: string,
    input: { kind: 'SELL' | 'UPI_PAY'; usdtAmount?: string; inrAmount?: string; upiId?: string; beneficiary?: string },
  ) {
    const rate = d(this.rates.usdtInr());
    let usdt = usdtAmount(input.usdtAmount ?? '0');
    let inr = inrAmount(input.inrAmount ?? '0');
    if (input.kind === 'UPI_PAY') {
      if (!inr.gt(0)) throw this.fail('INVALID_AMOUNT', 'Enter a mock INR amount.');
      usdt = usdtAmount(inr.div(rate));
    } else if (!usdt.gt(0)) {
      throw this.fail('INVALID_AMOUNT', 'Enter a mock USDT amount.');
    } else {
      inr = inrAmount(usdt.mul(rate));
    }
    const fee = inrAmount(inr.mul('0.004'));
    this.ledger.post({
      memo: `Lock ${input.kind}`,
      idempotency: `lock:${userId}:${randomUUID()}`,
      entries: [
        { accountType: 'AVAILABLE', direction: 'DEBIT', amount: moneyString(usdt, 6), asset: 'USDT', userId },
        { accountType: 'LOCKED', direction: 'CREDIT', amount: moneyString(usdt, 6), asset: 'USDT', userId },
      ],
      activity: {
        userId,
        type: input.kind,
        status: 'FUNDS_LOCKED',
        asset: 'USDT',
        amount: moneyString(usdt, 6),
      },
    });
    const order: ProtoOrder = {
      id: randomUUID(),
      customerId: userId,
      kind: input.kind,
      status: 'MATCHING',
      usdtAmount: moneyString(usdt, 6),
      inrAmount: moneyString(inr, 2),
      feeAmount: moneyString(fee, 2),
      upiId: input.upiId,
      beneficiary: input.beneficiary,
      timeline: [
        { at: new Date(), status: 'CREATED', note: 'Mock order created' },
        { at: new Date(), status: 'FUNDS_LOCKED', note: 'Available USDT moved to locked' },
        { at: new Date(), status: 'MATCHING', note: 'Waiting for a mock merchant' },
      ],
      createdAt: new Date(),
    };
    this.store.orders.unshift(order);
    this.store.notify(userId, 'ORDER', 'Order created', `Mock ${input.kind} ${order.usdtAmount} USDT locked.`);
    this.store.notify('user-merchant', 'ORDER', 'New available order', `Mock ${order.kind} ${order.usdtAmount} USDT`);
    return { ...order, simulated: true };
  }

  customerOrders(userId: string) {
    return this.store.orders.filter((o) => o.customerId === userId);
  }

  order(id: string) {
    const row = this.store.orders.find((o) => o.id === id);
    if (!row) throw this.missing('Order');
    return row;
  }

  cancel(userId: string, id: string) {
    const order = this.order(id);
    if (order.customerId !== userId) throw this.forbid();
    if (!['CREATED', 'FUNDS_LOCKED', 'MATCHING'].includes(order.status)) {
      throw this.fail('ORDER_STATE', 'This mock order can no longer be cancelled.');
    }
    this.releaseToCustomer(order, 'CANCELLED', 'Customer cancelled');
    return order;
  }

  merchantAvailable() {
    return this.store.orders.filter((o) => ['FUNDS_LOCKED', 'MATCHING'].includes(o.status) && !o.merchantId);
  }

  merchantOrders(merchantId: string) {
    return this.store.orders.filter((o) => o.merchantId === merchantId);
  }

  accept(merchantId: string, id: string) {
    const order = this.order(id);
    if (!['FUNDS_LOCKED', 'MATCHING'].includes(order.status) || order.merchantId) {
      throw this.fail('ORDER_STATE', 'Order is not available to accept.');
    }
    order.merchantId = merchantId;
    this.push(order, 'SELLER_ASSIGNED', 'Orbit desk accepted (simulated)');
    this.push(order, 'PAYMENT_PENDING', 'Awaiting mock INR rail / UTR');
    this.store.notify(order.customerId, 'ORDER', 'Merchant assigned', 'A mock merchant accepted your order.');
    return order;
  }

  submitUtr(merchantId: string, id: string, utr: string, note?: string) {
    const order = this.order(id);
    if (order.merchantId !== merchantId) throw this.forbid();
    if (!['PAYMENT_PENDING', 'SELLER_ASSIGNED'].includes(order.status)) {
      throw this.fail('ORDER_STATE', 'UTR cannot be submitted in this state.');
    }
    order.utr = utr;
    order.proofNote = note;
    this.push(order, 'PAYMENT_SUBMITTED', `Mock UTR ${utr}`);
    this.push(order, 'VERIFICATION', 'Awaiting verification (simulated)');
    this.store.notify(order.customerId, 'ORDER', 'Payment submitted', 'Mock UTR recorded. Not a bank credit.');
    return order;
  }

  complete(actorId: string, id: string, as: 'MERCHANT' | 'ADMIN') {
    const order = this.order(id);
    if (as === 'MERCHANT' && order.merchantId !== actorId) throw this.forbid();
    if (!['VERIFICATION', 'PAYMENT_SUBMITTED'].includes(order.status)) {
      throw this.fail('ORDER_STATE', 'Order is not ready to complete.');
    }
    const merchantId = order.merchantId ?? 'user-merchant';
    this.ledger.post({
      memo: `Escrow release ${order.id}`,
      idempotency: `release:${order.id}`,
      entries: [
        {
          accountType: 'LOCKED',
          direction: 'DEBIT',
          amount: order.usdtAmount,
          asset: 'USDT',
          userId: order.customerId,
        },
        {
          accountType: 'AVAILABLE',
          direction: 'CREDIT',
          amount: order.usdtAmount,
          asset: 'USDT',
          userId: merchantId,
        },
      ],
      activity: {
        userId: order.customerId,
        type: order.kind,
        status: 'COMPLETED',
        asset: 'USDT',
        amount: order.usdtAmount,
      },
    });
    this.push(order, 'COMPLETED', 'Escrow released on mock ledger. No INR moved.');
    this.store.notify(order.customerId, 'ORDER', 'Order completed', 'Simulated settlement recorded.');
    this.store.notify(merchantId, 'ORDER', 'Order completed', 'Mock USDT credited to merchant available.');
    this.store.audit(actorId, 'ESCROW_RELEASE', 'P2POrder', order.id, 'Authorized mock completion');
    return order;
  }

  refund(adminId: string, id: string) {
    const order = this.order(id);
    if (['COMPLETED', 'REFUNDED'].includes(order.status)) {
      throw this.fail('ORDER_STATE', 'Already finished.');
    }
    this.releaseToCustomer(order, 'REFUNDED', 'Admin refunded locked funds');
    this.store.audit(adminId, 'ESCROW_REFUND', 'P2POrder', order.id, 'Authorized mock refund');
    return order;
  }

  dispute(userId: string, id: string, reason: string) {
    const order = this.order(id);
    if (order.customerId !== userId && order.merchantId !== userId) throw this.forbid();
    if (order.status === 'COMPLETED') throw this.fail('ORDER_STATE', 'Completed orders cannot dispute.');
    this.push(order, 'DISPUTED', reason);
    const ticket = this.openTicket(userId, 'DISPUTE', `Dispute ${order.id}`, reason);
    const dispute = {
      id: randomUUID(),
      orderId: order.id,
      ticketId: ticket.id,
      status: 'OPEN' as const,
      reason,
      createdAt: new Date(),
    };
    this.store.disputes.unshift(dispute);
    return dispute;
  }

  merchantDesk(merchantId: string) {
    const usdt = this.store.account(merchantId, 'USDT');
    const mine = this.merchantOrders(merchantId);
    const completed = mine.filter((o) => o.status === 'COMPLETED');
    const volume = completed.reduce((sum, o) => sum.add(d(o.usdtAmount)), d('0'));
    return {
      simulated: true,
      wallet: usdt,
      todayEarnings: moneyString(
        completed
          .filter((o) => o.createdAt.toDateString() === new Date().toDateString())
          .reduce((sum, o) => sum.add(inrAmount(o.feeAmount)), d('0')),
        2,
      ),
      totalEarningsNote: 'Fee figures are simulated, not guaranteed profit.',
      active: mine.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)).length,
      completed: completed.length,
      available: this.merchantAvailable().length,
      completionRate: mine.length ? Math.round((completed.length / mine.length) * 100) : 0,
      grossVolumeUsdt: moneyString(volume, 6),
    };
  }

  giftCatalog() {
    return this.store.giftBrands;
  }

  buyGift(userId: string, productId: string) {
    const brand = this.store.giftBrands.find((b) => b.products.some((p) => p.id === productId));
    const product = brand?.products.find((p) => p.id === productId);
    if (!brand || !product) throw this.missing('Gift card product');
    this.ledger.post({
      memo: `Gift ${productId}`,
      idempotency: `gift:${userId}:${randomUUID()}`,
      entries: [
        { accountType: 'AVAILABLE', direction: 'DEBIT', amount: product.usdtPrice, asset: 'USDT', userId },
        { accountType: 'EXTERNAL', direction: 'CREDIT', amount: product.usdtPrice, asset: 'USDT' },
      ],
      activity: {
        userId,
        type: 'GIFT_CARD',
        status: 'COMPLETED',
        asset: 'USDT',
        amount: product.usdtPrice,
      },
    });
    const order = {
      id: randomUUID(),
      userId,
      brandId: brand.id,
      productId,
      status: 'DELIVERED_MOCK',
      mockCode: `NX-GIFT-${randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt: new Date(),
    };
    this.store.giftOrders.unshift(order);
    this.store.notify(userId, 'GIFT', 'Mock gift card delivered', `${brand.name} code is simulated inventory.`);
    return { ...order, brand: brand.name, denominationInr: product.denominationInr };
  }

  payUtility(userId: string, service: string, consumerId: string, amountInr: string) {
    const inr = inrAmount(amountInr);
    const usdt = usdtAmount(inr.div(d(this.rates.usdtInr())));
    this.ledger.post({
      memo: `Utility ${service}`,
      idempotency: `util:${userId}:${randomUUID()}`,
      entries: [
        { accountType: 'AVAILABLE', direction: 'DEBIT', amount: moneyString(usdt, 6), asset: 'USDT', userId },
        { accountType: 'EXTERNAL', direction: 'CREDIT', amount: moneyString(usdt, 6), asset: 'USDT' },
      ],
      activity: {
        userId,
        type: 'UTILITY',
        status: 'COMPLETED',
        asset: 'USDT',
        amount: moneyString(usdt, 6),
      },
    });
    const order = {
      id: randomUUID(),
      userId,
      service,
      consumerId,
      amountInr: moneyString(inr, 2),
      usdtDebit: moneyString(usdt, 6),
      status: 'SUCCESS_MOCK',
      createdAt: new Date(),
    };
    this.store.utilOrders.unshift(order);
    this.store.notify(userId, 'UTILITY', `${service} mock success`, 'No operator was contacted.');
    return { ...order, mockDetails: { name: 'Sample consumer', due: amountInr } };
  }

  giftOrders(userId: string) {
    return this.store.giftOrders.filter((g) => g.userId === userId);
  }

  utilOrders(userId: string) {
    return this.store.utilOrders.filter((g) => g.userId === userId);
  }

  ticketsFor(userId: string, admin: boolean) {
    return admin ? this.store.tickets : this.store.tickets.filter((t) => t.ownerId === userId);
  }

  ticket(id: string) {
    const row = this.store.tickets.find((t) => t.id === id);
    if (!row) throw this.missing('Ticket');
    return row;
  }

  allOrders() {
    return this.store.orders;
  }

  ledgerRows() {
    return this.store.ledger;
  }

  audits() {
    return this.store.audits;
  }

  disputes() {
    return this.store.disputes;
  }

  settings() {
    return Object.fromEntries(this.store.settings);
  }

  giftBrand(id: string) {
    const row = this.store.giftBrands.find((b) => b.id === id || b.slug === id);
    if (!row) throw this.missing('Brand');
    return row;
  }

  notices(userId: string) {
    return this.store.notices.filter((n) => n.userId === userId);
  }

  markRead(userId: string, id?: string) {
    for (const n of this.store.notices) {
      if (n.userId === userId && (!id || n.id === id)) n.readAt = new Date();
    }
    return { ok: true };
  }

  openTicket(userId: string, category: string, subject: string, body: string) {
    const ticket = {
      id: randomUUID(),
      ownerId: userId,
      category,
      subject,
      status: 'OPEN' as const,
      messages: [{ id: randomUUID(), authorId: userId, body, at: new Date() }],
      createdAt: new Date(),
    };
    this.store.tickets.unshift(ticket);
    return ticket;
  }

  replyTicket(actorId: string, id: string, body: string) {
    const ticket = this.store.tickets.find((t) => t.id === id);
    if (!ticket) throw this.missing('Ticket');
    ticket.messages.push({ id: randomUUID(), authorId: actorId, body, at: new Date() });
    ticket.status = actorId === ticket.ownerId ? 'WAITING_FOR_USER' : 'IN_PROGRESS';
    return ticket;
  }

  adminOverview() {
    const users = [...this.store.users.values()];
    const orders = this.store.orders;
    return {
      simulated: true,
      users: users.length,
      activeUsers: users.filter((u) => u.status === 'ACTIVE').length,
      merchants: users.filter((u) => u.roles.includes('MERCHANT')).length,
      orders: orders.length,
      completed: orders.filter((o) => o.status === 'COMPLETED').length,
      pending: orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)).length,
      failed: orders.filter((o) => o.status === 'FAILED').length,
      lockedUsdt: moneyString(
        [...this.store.accounts.values()]
          .filter((a) => a.asset === 'USDT')
          .reduce((sum, a) => sum.add(d(a.locked)), d('0')),
        6,
      ),
      ledgerEntries: this.store.ledger.length,
      volumeNote: 'All figures are simulated prototype totals.',
    };
  }

  users() {
    return [...this.store.users.values()].map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      status: u.status,
      roles: u.roles,
    }));
  }

  setUserStatus(adminId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = this.store.users.get(userId);
    if (!user) throw this.missing('User');
    user.status = status;
    this.store.audit(adminId, 'USER_STATUS', 'User', userId, status);
    return { id: user.id, status: user.status };
  }

  parseUpi(payload: string) {
    return {
      mock: true,
      upiId: 'demo.shop@nexora',
      beneficiary: 'Sample Kirana (simulated)',
      raw: payload,
      note: 'Mock parser. No PSP was called.',
    };
  }

  private releaseToCustomer(order: ProtoOrder, status: OrderStatus, note: string) {
    this.ledger.post({
      memo: `Unlock ${order.id}`,
      idempotency: `unlock:${order.id}`,
      entries: [
        {
          accountType: 'LOCKED',
          direction: 'DEBIT',
          amount: order.usdtAmount,
          asset: 'USDT',
          userId: order.customerId,
        },
        {
          accountType: 'AVAILABLE',
          direction: 'CREDIT',
          amount: order.usdtAmount,
          asset: 'USDT',
          userId: order.customerId,
        },
      ],
      activity: {
        userId: order.customerId,
        type: order.kind,
        status,
        asset: 'USDT',
        amount: order.usdtAmount,
      },
    });
    this.push(order, status, note);
  }

  private push(order: ProtoOrder, status: OrderStatus, note: string) {
    order.status = status;
    order.timeline.push({ at: new Date(), status, note });
  }

  private fail(code: string, message: string): never {
    throw new BadRequestException({ success: false, error: { code, message } });
  }

  private missing(name: string): never {
    throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: `${name} not found.` } });
  }

  private forbid(): never {
    throw new ForbiddenException({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Not allowed for this mock role.' },
    });
  }
}
