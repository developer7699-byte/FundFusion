import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// PRD §3: gift cards, game top-ups and utilities are v1 non-goals.
// Asserting against the booted application, not the controller class, is what
// catches a handler that was deleted in one place but still registered in another.
const GONE: [string, string][] = [
  ['get', '/api/gift-cards'],
  ['get', '/api/gift-cards/brands/some-id'],
  ['get', '/api/gift-cards/history'],
  ['post', '/api/gift-cards/orders'],
  ['post', '/api/utilities/orders'],
  ['get', '/api/utilities/history'],

  // M4.6: the prototype surface the v1 API replaced. Its wallet kept balances
  // in memory and credited them on request, and its auth minted sessions for
  // a different account system entirely — two of each is how one of them gets
  // forgotten.
  ['get', '/api/wallet'],
  ['post', '/api/wallet/deposits'],
  ['post', '/api/wallet/send'],
  ['post', '/api/wallet/withdrawals'],
  ['post', '/api/wallet/quotes'],
  ['get', '/api/customer/overview'],
  ['post', '/api/auth/login'],
  ['post', '/api/auth/register'],
  ['post', '/api/auth/otp/request'],
  ['get', '/api/auth/me'],
  ['get', '/api/orders'],
  ['post', '/api/orders'],
  ['post', '/api/upi/parse'],
  ['get', '/api/merchant/dashboard'],
  ['get', '/api/merchant/available-orders'],
  ['get', '/api/admin/overview'],
  ['get', '/api/admin/users'],
  ['get', '/api/admin/ledger'],
  ['get', '/api/admin/audit-logs'],

  // M0 finish: the ops bridge (notifications + support) ran on the in-memory
  // prototype store and 401'd under v1 auth. Removed; M6 rebuilds them on the
  // ledger-backed database.
  ['get', '/api/notifications'],
  ['post', '/api/notifications/read'],
  ['get', '/api/support'],
  ['post', '/api/support'],
  ['get', '/api/support/some-id'],
  ['post', '/api/support/some-id/reply'],
];

describe('Removed out-of-scope routes (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it.each(GONE)('%s %s is 404', async (method, path) => {
    const res = await request(app.getHttpServer())[method as 'get' | 'post'](
      path,
    );
    expect(res.status).toBe(404);
  });

  afterAll(async () => {
    await app.close();
  });
});
