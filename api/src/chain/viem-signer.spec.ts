import {
  decodeFunctionData,
  parseAbiItem,
  recoverTransactionAddress,
  parseEther,
  parseTransaction,
  parseUnits,
  type EIP1193RequestFn,
  type TransactionSerialized,
} from 'viem';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { depositAccount, gasAccount, hotAccount } from './derivation';
import { ViemSigner } from './viem-signer';

const TRANSFER = parseAbiItem(
  'function transfer(address to, uint256 value) returns (bool)',
);

const SEED = generateMnemonic(wordlist, 128);
const TOKEN = '0x1111111111111111111111111111111111111111';
const HOT = '0x2222222222222222222222222222222222222222';

interface Sent {
  raw: TransactionSerialized;
  hash: `0x${string}`;
}

/**
 * A scripted node that accepts signed transactions. The signer is the code
 * under test — what it signs, in what order, and what it does with the
 * receipt it gets back.
 */
function fakeNode(options: { receipts?: ('success' | 'reverted')[] } = {}) {
  const sent: Sent[] = [];
  const unexpected: string[] = [];
  const receipts = options.receipts ?? [];
  let nonce = 0;

  const request = ({
    method,
    params,
  }: {
    method: string;
    params?: unknown;
  }): Promise<unknown> => {
    switch (method) {
      case 'eth_chainId':
        return Promise.resolve('0x61');
      case 'eth_blockNumber':
        return Promise.resolve('0x64');
      case 'eth_getTransactionCount':
        return Promise.resolve(`0x${(nonce++).toString(16)}`);
      case 'eth_gasPrice':
        return Promise.resolve('0x3b9aca00');
      case 'eth_maxPriorityFeePerGas':
        return Promise.resolve('0x3b9aca00');
      case 'eth_estimateGas':
        return Promise.resolve('0x186a0');
      case 'eth_getBlockByNumber':
        return Promise.resolve({
          number: '0x64',
          baseFeePerGas: '0x3b9aca00',
          timestamp: '0x1',
          transactions: [],
        });
      case 'eth_sendRawTransaction': {
        const raw = (params as TransactionSerialized[])[0];
        const hash = `0x${(sent.length + 1).toString(16).padStart(64, '0')}`;
        sent.push({ raw, hash: hash as `0x${string}` });
        return Promise.resolve(hash);
      }
      case 'eth_getTransactionReceipt': {
        const hash = (params as `0x${string}`[])[0];
        const index = sent.findIndex((s) => s.hash === hash);
        return Promise.resolve({
          transactionHash: hash,
          blockNumber: '0x64',
          blockHash: `0x${'b'.repeat(64)}`,
          status: receipts[index] === 'reverted' ? '0x0' : '0x1',
          gasUsed: '0x5208',
          cumulativeGasUsed: '0x5208',
          logs: [],
          type: '0x2',
          transactionIndex: '0x0',
          from: `0x${'0'.repeat(40)}`,
          to: `0x${'0'.repeat(40)}`,
          contractAddress: null,
          effectiveGasPrice: '0x3b9aca00',
          logsBloom: `0x${'0'.repeat(512)}`,
        });
      }
      default:
        unexpected.push(method);
        return Promise.reject(new Error(`unexpected call ${method}`));
    }
  };

  return { sent, unexpected, request };
}

function signer(node: ReturnType<typeof fakeNode>) {
  return new ViemSigner(
    {
      httpUrl: 'https://node.example',
      seedPhrase: SEED,
      tokenAddress: TOKEN,
    },
    node.request as unknown as EIP1193RequestFn,
  );
}

function decode(raw: TransactionSerialized) {
  return parseTransaction(raw);
}

describe('the gas wallet', () => {
  it('reports the address derived from the seed', () => {
    expect(signer(fakeNode()).gasWalletAddress()).toBe(
      gasAccount(SEED).address,
    );
  });

  it('refuses to start without a seed rather than inventing one', () => {
    expect(
      () =>
        new ViemSigner({
          httpUrl: 'https://node.example',
          seedPhrase: '',
          tokenAddress: TOKEN,
        }),
    ).toThrow(/seed/i);
  });
});

describe('sending gas (PRD §8.3)', () => {
  it('sends BNB to the address that needs it', async () => {
    const node = fakeNode();

    await signer(node).sendGas(HOT, '0.001');

    expect(node.sent).toHaveLength(1);
    const tx = decode(node.sent[0].raw);
    expect(tx.to?.toLowerCase()).toBe(HOT.toLowerCase());
    expect(tx.value).toBe(parseEther('0.001'));
  });

  /**
   * The whole point of the gas transaction is that the BNB is *there* before
   * the token transfer is signed. Returning on submission rather than on the
   * receipt means the sweep that follows runs against an address that is
   * still empty, and reverts.
   */
  it('waits for the receipt before returning', async () => {
    const node = fakeNode({ receipts: ['reverted'] });

    await expect(signer(node).sendGas(HOT, '0.001')).rejects.toThrow(
      /revert|fail/i,
    );
  });
});

describe('paying a withdrawal out of the hot wallet (PRD §8.4)', () => {
  it('reports the hot wallet address derived from the seed', () => {
    expect(signer(fakeNode()).hotWalletAddress()).toBe(
      hotAccount(SEED).address,
    );
  });

  /**
   * A payout signed by any other key spends the wrong balance — a user's
   * deposit address, or the gas wallet that funds every sweep.
   */
  it('signs the payout with the hot wallet key', async () => {
    const node = fakeNode();

    await signer(node).payout(HOT, '25');

    await expect(
      recoverTransactionAddress({ serializedTransaction: node.sent[0].raw }),
    ).resolves.toBe(hotAccount(SEED).address);
  });

  it('transfers the amount to the destination', async () => {
    const node = fakeNode();

    await signer(node).payout(HOT, '25.5');

    const { args } = decodeFunctionData({
      abi: [TRANSFER],
      data: decode(node.sent[0].raw).data!,
    });
    expect(args[0]).toBe(HOT);
    expect(args[1]).toBe(parseUnits('25.5', 18));
  });

  /** A payout reported as sent but reverted is money the user never got. */
  it('does not report success when the payout reverted', async () => {
    const node = fakeNode({ receipts: ['reverted'] });

    await expect(signer(node).payout(HOT, '25')).rejects.toThrow(
      /revert|fail/i,
    );
  });
});

describe('sweeping a deposit address (PRD §8.3)', () => {
  /**
   * A sweep signed by the wrong key either reverts or moves a different
   * user's deposit, so the sender is recovered from the signature rather
   * than trusted.
   */
  it('signs the transfer with the key for that index', async () => {
    const node = fakeNode();

    await signer(node).sweepToken(7, HOT, '100');

    const tx = decode(node.sent[0].raw);
    expect(tx.to?.toLowerCase()).toBe(TOKEN.toLowerCase());
    await expect(
      recoverTransactionAddress({ serializedTransaction: node.sent[0].raw }),
    ).resolves.toBe(depositAccount(SEED, 7).address);
  });

  it('sends gas from the gas wallet, not from a deposit address', async () => {
    const node = fakeNode();

    await signer(node).sendGas(HOT, '0.001');

    await expect(
      recoverTransactionAddress({ serializedTransaction: node.sent[0].raw }),
    ).resolves.toBe(gasAccount(SEED).address);
  });

  it('transfers the whole amount to the hot wallet', async () => {
    const node = fakeNode();

    await signer(node).sweepToken(0, HOT, '100.5');

    const { args, functionName } = decodeFunctionData({
      abi: [TRANSFER],
      data: decode(node.sent[0].raw).data!,
    });
    expect(functionName).toBe('transfer');
    expect(args[0]).toBe(HOT);
    expect(args[1]).toBe(parseUnits('100.5', 18));
  });

  it('returns the transaction hash of the sweep', async () => {
    const node = fakeNode();

    const hash = await signer(node).sweepToken(0, HOT, '1');

    expect(hash).toBe(node.sent[0].hash);
  });

  /** Reporting a sweep that reverted leaves the USDT where it was. */
  it('does not report success when the transaction reverted', async () => {
    const node = fakeNode({ receipts: ['reverted'] });

    await expect(signer(node).sweepToken(0, HOT, '1')).rejects.toThrow(
      /revert|fail/i,
    );
  });

  it('refuses an amount that is not a positive number', async () => {
    await expect(signer(fakeNode()).sweepToken(0, HOT, '0')).rejects.toThrow(
      /amount/i,
    );
  });
});
