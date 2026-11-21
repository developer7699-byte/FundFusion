import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { isAddress } from 'viem';
import {
  makeTestDb,
  seedAsset,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import { AccountService } from '../ledger/account.service';
import { HdWalletService } from './hd-wallet.service';

let t: TestDb;
let accounts: AccountService;
let wallets: HdWalletService;
let seedPhrase: string;
let userId: string;

const NETWORK = 'BSC_TESTNET';

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
}, 30000);

beforeEach(async () => {
  await t.reset();
  const assetId = await seedAsset(t.pool);
  await t.pool.query(
    `INSERT INTO blockchain_network (asset_id, code, name) VALUES ($1, $2, 'BSC Testnet')`,
    [assetId, NETWORK],
  );
  seedPhrase = generateMnemonic(wordlist, 128);
  wallets = new HdWalletService(t.db, accounts, { seedPhrase });
  userId = await seedUser(t.pool, 'depositor@example.test');
  await openAccount(userId);
});

afterAll(async () => {
  await t.close();
});

/** Verified email plus an enrolled authenticator — the gate from §9.1. */
async function openAccount(id: string) {
  await t.pool.query(
    `UPDATE "user"
        SET email_verified_at = now(),
            mfa_secret = 'AAAAAAAAAAAAAAAA',
            mfa_enrolled_at = now()
      WHERE id = $1`,
    [id],
  );
}

describe('deposit addresses (PRD §8.1)', () => {
  it('derives a usable address', async () => {
    const address = await wallets.addressFor(userId);

    expect(isAddress(address)).toBe(true);
  });

  it('gives the same user the same address every time', async () => {
    const first = await wallets.addressFor(userId);
    const second = await wallets.addressFor(userId);

    expect(second).toBe(first);
  });

  it('gives two users different addresses', async () => {
    const other = await seedUser(t.pool, 'other@example.test');
    await openAccount(other);

    expect(await wallets.addressFor(other)).not.toBe(
      await wallets.addressFor(userId),
    );
  });

  /**
   * The address is derived from the seed and an index, so the same seed
   * reproduces it. If this ever stopped holding, every deposit sent to an
   * address we could no longer derive would be unspendable.
   */
  it('derives the same address again from the same seed after a restart', async () => {
    const before = await wallets.addressFor(userId);

    const restarted = new HdWalletService(t.db, accounts, { seedPhrase });

    expect(await restarted.addressFor(userId)).toBe(before);
  });

  it('allocates a distinct index to each address', async () => {
    const other = await seedUser(t.pool, 'other@example.test');
    await openAccount(other);
    await wallets.addressFor(userId);
    await wallets.addressFor(other);

    const r = await t.pool.query(
      `SELECT derivation_index FROM wallet_address ORDER BY derivation_index`,
    );
    expect(
      r.rows.map((x: { derivation_index: number }) => x.derivation_index),
    ).toEqual([0, 1]);
  });

  it('allocates distinct indexes to simultaneous first-time users', async () => {
    const others: string[] = [];
    for (let n = 0; n < 5; n++) {
      const id = await seedUser(t.pool, `rush${n}@example.test`);
      await openAccount(id);
      others.push(id);
    }

    const addresses = await Promise.all(
      others.map((id) => wallets.addressFor(id)),
    );

    expect(new Set(addresses).size).toBe(5);
  });
});

/** PRD §9.1: until a phone is verified the account has no deposit address. */
describe('the financial gate', () => {
  it('refuses an address for an unverified email', async () => {
    const stranger = await seedUser(t.pool, 'unverified@example.test');

    await expect(wallets.addressFor(stranger)).rejects.toThrow(/email/i);
  });

  it('refuses an address until an authenticator is enrolled', async () => {
    const half = await seedUser(t.pool, 'half@example.test');
    await t.pool.query(
      `UPDATE "user" SET email_verified_at = now() WHERE id = $1`,
      [half],
    );

    await expect(wallets.addressFor(half)).rejects.toThrow(/authenticator/i);
  });
});

/**
 * PRD §13.5 and DEPENDENCIES §2.5: no private key in the database, in source,
 * or anywhere an admin screen can reach.
 */
describe('the seed', () => {
  it('refuses to start without one rather than inventing one', () => {
    expect(
      () => new HdWalletService(t.db, accounts, { seedPhrase: '' }),
    ).toThrow(/seed/i);
  });

  it('refuses a seed phrase that is not a valid mnemonic', () => {
    expect(
      () =>
        new HdWalletService(t.db, accounts, { seedPhrase: 'not a real seed' }),
    ).toThrow(/mnemonic|seed/i);
  });

  it('never writes the seed to the database', async () => {
    await wallets.addressFor(userId);

    const words = seedPhrase.split(' ');
    const r = await t.pool.query(
      `SELECT string_agg(t::text, ' ') AS dump FROM (
         SELECT row_to_json(w) AS t FROM wallet_address w
         UNION ALL SELECT row_to_json(s) FROM system_setting s
         UNION ALL SELECT row_to_json(u) FROM "user" u
       ) rows`,
    );
    const dump = String((r.rows[0] as { dump: string }).dump ?? '');
    for (const word of words) {
      expect(dump.split(/\W+/)).not.toContain(word);
    }
  });
});
