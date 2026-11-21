import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { isAddress } from 'viem';
import { depositAccount, gasAccount } from './derivation';

const seed = generateMnemonic(wordlist, 128);

describe('key derivation (PRD §8.1)', () => {
  it('derives a usable gas wallet address', () => {
    expect(isAddress(gasAccount(seed).address)).toBe(true);
  });

  it('derives the same gas wallet from the same seed every time', () => {
    expect(gasAccount(seed).address).toBe(gasAccount(seed).address);
  });

  /**
   * The gas wallet pays for sweeps, so it holds a balance that is the
   * platform's rather than any user's. It sits on a different BIP-44 branch
   * for exactly this reason: if a deposit index could ever reach it, a user's
   * deposit address would be the wallet that funds every other sweep.
   */
  it('never collides with a deposit address', () => {
    const gas = gasAccount(seed).address;
    const deposits = Array.from(
      { length: 50 },
      (_, i) => depositAccount(seed, i).address,
    );

    expect(deposits).not.toContain(gas);
    expect(new Set(deposits).size).toBe(deposits.length);
  });

  it('refuses a seed that is not a valid mnemonic', () => {
    expect(() => gasAccount('not a real seed')).toThrow(/mnemonic|seed/i);
  });
});
