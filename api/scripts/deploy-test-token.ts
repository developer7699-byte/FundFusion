/**
 * Deploys the stand-in USDT contract to BSC testnet (M3 Task 3).
 *
 * Run: `npm run chain:deploy-token --workspace api`
 *
 * Compiles from `contracts/TestUsdt.sol` rather than from a committed hex
 * blob, so the address printed here can be traced back to source anyone can
 * read. Deploys from the gas wallet, which is the only funded account, and
 * refuses to spend from any other.
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  getContract,
  http,
} from 'viem';
import { bscTestnet } from 'viem/chains';
import solc from 'solc';
import { gasAccount } from '../src/chain/derivation';
import { BSC_TESTNET_CHAIN_ID } from '../src/chain/chain.config';

loadEnv({ path: resolve(__dirname, '..', '.env') });

const SOURCE = resolve(__dirname, '..', 'contracts', 'TestUsdt.sol');
const CONTRACT = 'TestUsdt';
/** Enough to fund every test account this environment will ever need. */
const INITIAL_SUPPLY = 1_000_000n * 10n ** 18n;

interface SolcOutput {
  errors?: { severity: string; formattedMessage: string }[];
  contracts: Record<
    string,
    Record<string, { abi: unknown[]; evm: { bytecode: { object: string } } }>
  >;
}

interface Compiled {
  abi: unknown[];
  bytecode: `0x${string}`;
  solcVersion: string;
}

function compile(): Compiled {
  const source = readFileSync(SOURCE, 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'TestUsdt.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };

  const out = JSON.parse(solc.compile(JSON.stringify(input))) as SolcOutput;

  const fatal = (out.errors ?? []).filter((e) => e.severity === 'error');
  if (fatal.length) {
    throw new Error(fatal.map((e) => e.formattedMessage).join('\n'));
  }
  for (const warning of out.errors ?? []) {
    console.warn(warning.formattedMessage.trim());
  }

  const artifact = out.contracts['TestUsdt.sol'][CONTRACT];
  return {
    abi: artifact.abi,
    bytecode: `0x${artifact.evm.bytecode.object}`,
    solcVersion: solc.version(),
  };
}

async function main() {
  const httpUrl = process.env.BSC_RPC_HTTP_URL?.trim();
  if (!httpUrl) throw new Error('BSC_RPC_HTTP_URL is not set.');

  const account = gasAccount(process.env.BSC_HD_SEED ?? '');

  // Deploying from an unexpected address would spend the one funded wallet
  // and leave the contract owned by a key nobody recorded.
  const expected = process.env.BSC_GAS_WALLET_ADDRESS?.trim();
  if (expected && expected.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(
      `The seed derives ${account.address}, but BSC_GAS_WALLET_ADDRESS is ${expected}. One of them is wrong, and deploying would spend from the wrong wallet.`,
    );
  }

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(httpUrl),
  });

  const chainId = await publicClient.getChainId();
  if (chainId !== BSC_TESTNET_CHAIN_ID) {
    throw new Error(
      `That endpoint is chain ${chainId}, not testnet (${BSC_TESTNET_CHAIN_ID}).`,
    );
  }

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Gas wallet ${account.address}: ${formatEther(balance)} tBNB`);
  if (balance === 0n) {
    throw new Error('The gas wallet is empty; a deploy needs tBNB for gas.');
  }

  const { abi, bytecode, solcVersion } = compile();
  console.log(`Compiled with solc ${solcVersion}`);

  const wallet = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http(httpUrl),
  });

  const hash = await wallet.deployContract({
    abi,
    bytecode,
    args: [INITIAL_SUPPLY],
  });
  console.log(`Deploy transaction ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success' || !receipt.contractAddress) {
    throw new Error(`The deploy reverted: ${hash}`);
  }
  const address = receipt.contractAddress;

  // Read the contract back through a fresh client. A deploy that reports
  // success but whose token answers nothing is the failure worth catching.
  const token = getContract({ address, abi, client: publicClient });
  const [name, symbol, decimals, supply, held] = await Promise.all([
    token.read.name() as Promise<string>,
    token.read.symbol() as Promise<string>,
    token.read.decimals() as Promise<number>,
    token.read.totalSupply() as Promise<bigint>,
    token.read.balanceOf([account.address]) as Promise<bigint>,
  ]);

  console.log('');
  console.log(`Deployed  ${address}`);
  console.log(`Block     ${receipt.blockNumber}`);
  console.log(`Gas used  ${receipt.gasUsed}`);
  console.log(`Token     ${name} (${symbol}), ${decimals} decimals`);
  console.log(`Supply    ${formatUnits(supply, decimals)}`);
  console.log(`Owner holds ${formatUnits(held, decimals)} ${symbol}`);
  console.log('');
  console.log(`Add to api/.env:   USDT_CONTRACT_ADDRESS=${address}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
