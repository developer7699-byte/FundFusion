import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { PrivateKeyAccount } from 'viem';

/**
 * How keys come off the custody seed (PRD §8.1).
 *
 * One place, because three things need the same answer: the service that
 * hands a user their deposit address, the signer that sweeps it, and the
 * script that deploys the test token from the gas wallet. Two derivations
 * that drift apart derive money nobody can reach.
 */

/** BIP-44 for an EVM chain. BSC shares coin type 60 with Ethereum. */
const DEPOSIT_PATH = "m/44'/60'/0'/0";

/**
 * The gas wallet, on the change branch rather than the external one. A
 * different branch means no deposit index can ever reach it, however many
 * users sign up — proven in the spec beside this file.
 */
const GAS_PATH = "m/44'/60'/0'/1/0";

/**
 * The hot wallet, on a third branch again. It holds a few days of expected
 * withdrawals (PRD §8.3) — the one balance here that is neither a user's
 * deposit nor gas — and pays withdrawals out.
 */
const HOT_PATH = "m/44'/60'/0'/2/0";

function master(seedPhrase: string): HDKey {
  const phrase = seedPhrase?.trim();
  if (!phrase) {
    throw new Error(
      'BSC_HD_SEED is not set. Custody cannot start without a seed, and inventing one would strand every deposit made against it.',
    );
  }
  if (!validateMnemonic(phrase, wordlist)) {
    throw new Error(
      'BSC_HD_SEED is not a valid BIP-39 mnemonic. A mistyped seed derives different addresses, silently.',
    );
  }
  return HDKey.fromMasterSeed(mnemonicToSeedSync(phrase));
}

function accountAt(key: HDKey, path: string): PrivateKeyAccount {
  const child = key.derive(path);
  if (!child.privateKey) {
    throw new Error(`Could not derive a key at ${path}.`);
  }
  return privateKeyToAccount(toHex(child.privateKey));
}

/** The account behind a user's deposit address. Pure: same seed, same answer. */
export function depositAccount(
  seedPhrase: string,
  index: number,
): PrivateKeyAccount {
  return accountAt(master(seedPhrase), `${DEPOSIT_PATH}/${index}`);
}

/** The account that pays for sweeps and deploys. */
export function gasAccount(seedPhrase: string): PrivateKeyAccount {
  return accountAt(master(seedPhrase), GAS_PATH);
}

/** The account deposits sweep into, and withdrawals pay out from. */
export function hotAccount(seedPhrase: string): PrivateKeyAccount {
  return accountAt(master(seedPhrase), HOT_PATH);
}

/** Derivation from an already-built master key, for a service holding one. */
export function depositAccountFrom(
  key: HDKey,
  index: number,
): PrivateKeyAccount {
  return accountAt(key, `${DEPOSIT_PATH}/${index}`);
}

export { DEPOSIT_PATH, GAS_PATH, HOT_PATH, master as masterKey };
