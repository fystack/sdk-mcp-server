import type { FystackMpcClient } from '../../fystack/client.js';
import type { ToolDefinition, ToolExecutor } from '../types.js';
import { SolanaService } from '../../services/solana/solana.service.js';
import { formatError } from '../../utils/errors.js';
import { validateString } from '../../utils/validators.js';

const solanaService = new SolanaService();

export const solanaToolDefinitions: ToolDefinition[] = [
  {
    name: 'solana_get_address',
    description: 'Get Solana address for a wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
      },
      required: ['wallet_id'],
    },
  },
  {
    name: 'solana_sign_transaction',
    description: 'Sign a Solana transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
        transaction: { type: 'object', description: 'Solana transaction object' },
      },
      required: ['wallet_id', 'transaction'],
    },
  },
  {
    name: 'solana_sign_message',
    description: 'Sign a message using Solana wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
        message: { type: 'string', description: 'Message to sign' },
      },
      required: ['wallet_id', 'message'],
    },
  },
  {
    name: 'solana_sign_and_send_transaction',
    description: 'Sign and send a Solana transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
        transaction: { type: 'object', description: 'Solana transaction object' },
      },
      required: ['wallet_id', 'transaction'],
    },
  },
  {
    name: 'solana_sign_all_transactions',
    description: 'Sign multiple Solana transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
        transactions: { type: 'array', description: 'Array of Solana transaction objects' },
      },
      required: ['wallet_id', 'transactions'],
    },
  },
];

export const executeSolanaGetAddress: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const result = await solanaService.getAddress(client, walletId);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeSolanaSignTransaction: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const transaction = args.transaction as Record<string, unknown>;
    const result = await solanaService.signTransaction(client, walletId, transaction);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeSolanaSignMessage: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const message = validateString(args.message, 'message');
    const result = await solanaService.signMessage(client, walletId, message);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeSolanaSignAndSendTransaction: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const transaction = args.transaction as Record<string, unknown>;
    const result = await solanaService.signAndSendTransaction(client, walletId, transaction);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeSolanaSignAllTransactions: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const transactions = args.transactions as Record<string, unknown>[];
    const result = await solanaService.signAllTransactions(client, walletId, transactions);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};
