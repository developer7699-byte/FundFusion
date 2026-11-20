import type { EIP1193RequestFn } from 'viem';
import { ViemChainClient } from './viem-chain.client';
import { BSC_TESTNET_CHAIN_ID } from './chain.config';

/** A scripted node. The client is the code under test, not the network. */
function fakeNode(responses: Record<string, unknown>) {
  const calls: { method: string; params: unknown }[] = [];
  return {
    calls,
    request: ({ method, params }: { method: string; params?: unknown }) => {
      calls.push({ method, params });
      if (!(method in responses)) {
        return Promise.reject(new Error(`unexpected call ${method}`));
      }
      const value = responses[method];
      return value instanceof Error
        ? Promise.reject(value)
        : Promise.resolve(value);
    },
  };
}

const TOKEN = '0x1111111111111111111111111111111111111111';
const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function address(seed: string) {
  return `0x${seed.repeat(40).slice(0, 40)}`;
}

function transferLog(to: string, valueHex: string, over: object = {}) {
  return {
    address: TOKEN,
    topics: [
      TRANSFER_TOPIC,
      `0x${'0'.repeat(24)}${address('a').slice(2)}`,
      `0x${'0'.repeat(24)}${to.slice(2)}`,
    ],
    data: valueHex,
    blockNumber: '0x61',
    transactionHash: `0x${'c'.repeat(64)}`,
    logIndex: '0x2',
    ...over,
  };
}

function client(responses: Record<string, unknown>) {
  const node = fakeNode(responses);
  return {
    node,
    client: new ViemChainClient(
      { httpUrl: 'https://node.example', chainId: BSC_TESTNET_CHAIN_ID },
      node.request as unknown as EIP1193RequestFn,
    ),
  };
}

describe('reading the chain (PRD §8.2)', () => {
  /**
   * BSC has deterministic fast finality. Reading at the chain head is both
   * weaker and, on this chain, actively unsafe: eth_getLogs returns
   * incomplete results there and ERC-20 deposits are silently missed.
   */
  it('reads the finalized head, never the chain head', async () => {
    const { client: c, node } = client({
      eth_getBlockByNumber: { number: '0x61' },
      eth_blockNumber: '0x64',
    });

    expect(await c.finalizedBlockNumber()).toBe(97n);
    expect(node.calls[0].params).toEqual(['finalized', false]);
  });

  it('treats a node with no finalized block as unavailable', async () => {
    const { client: c } = client({ eth_getBlockByNumber: null });

    await expect(c.finalizedBlockNumber()).rejects.toThrow(/finali/i);
  });

  it('refuses a node that is not the configured chain', async () => {
    const { client: c } = client({ eth_chainId: '0x38' });

    await expect(c.assertNetwork()).rejects.toThrow(/chain|97/i);
  });

  it('accepts the configured chain', async () => {
    const { client: c } = client({ eth_chainId: '0x61' });

    await expect(c.assertNetwork()).resolves.toBeUndefined();
  });
});

describe('transfer logs', () => {
  const mine = address('b');

  it('decodes an amount as a decimal string, never a number', async () => {
    const { client: c } = client({
      // 100 USDT at 18 decimals
      eth_getLogs: [
        transferLog(mine, '0x' + (10n ** 20n).toString(16).padStart(64, '0')),
      ],
    });

    const [log] = await c.transferLogs(90n, 97n, TOKEN, [mine]);
    expect(log.amount).toBe('100');
    expect(typeof log.amount).toBe('string');
  });

  it('carries what makes a deposit unique on the chain', async () => {
    const { client: c } = client({
      eth_getLogs: [
        transferLog(mine, '0x' + (10n ** 18n).toString(16).padStart(64, '0')),
      ],
    });

    const [log] = await c.transferLogs(90n, 97n, TOKEN, [mine]);
    expect(log.txHash).toBe(`0x${'c'.repeat(64)}`);
    expect(log.logIndex).toBe(2);
    expect(log.blockNumber).toBe(97n);
    expect(log.to.toLowerCase()).toBe(mine.toLowerCase());
  });

  it('asks only for the addresses it owns and only for that token', async () => {
    const { client: c, node } = client({ eth_getLogs: [] });

    await c.transferLogs(90n, 97n, TOKEN, [mine]);

    const params = (node.calls[0].params as [Record<string, unknown>])[0];
    expect(params.address).toBe(TOKEN);
    expect(params.fromBlock).toBe('0x5a');
    expect(params.toBlock).toBe('0x61');
  });

  it('refuses a range that runs past the finalized head', async () => {
    const { client: c } = client({ eth_getLogs: [] });

    await expect(c.transferLogs(98n, 97n, TOKEN, [mine])).rejects.toThrow(
      /range/i,
    );
  });
});
