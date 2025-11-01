import type { FystackMpcClient } from '../../fystack/client.js';
import type { ToolDefinition, ToolExecutor } from '../types.js';
import { EthereumService } from '../../services/ethereum/eth.service.js';
import { formatError } from '../../utils/errors.js';
import { validateString } from '../../utils/validators.js';

const ethService = new EthereumService();

export const ethToolDefinitions: ToolDefinition[] = [
  {
    name: 'eth_get_address',
    description: 'Get Ethereum address for a wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
      },
      required: ['wallet_id'],
    },
  },
  {
    name: 'eth_sign_transaction',
    description: 'Sign an Ethereum transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
        transaction: { type: 'object', description: 'Transaction object (to, value, data, etc.)' },
      },
      required: ['wallet_id', 'transaction'],
    },
  },
  {
    name: 'eth_send_transaction',
    description: 'Sign and send an Ethereum transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
        transaction: { type: 'object', description: 'Transaction object' },
      },
      required: ['wallet_id', 'transaction'],
    },
  },
  {
    name: 'eth_sign_message',
    description: 'Sign a message using Ethereum wallet (eth_sign).',
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
    name: 'eth_sign_typed_data',
    description: 'Sign typed data (EIP-712) using Ethereum wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
        domain: { type: 'object', description: 'EIP-712 domain' },
        types: { type: 'object', description: 'EIP-712 types definition' },
        value: { type: 'object', description: 'The message value to sign' },
      },
      required: ['wallet_id', 'domain', 'types', 'value'],
    },
  },
];

export const executeEthGetAddress: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const result = await ethService.getAddress(client, walletId);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeEthSignTransaction: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const transaction = args.transaction as Record<string, unknown>;
    const result = await ethService.signTransaction(client, walletId, transaction);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeEthSendTransaction: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const transaction = args.transaction as Record<string, unknown>;
    const result = await ethService.sendTransaction(client, walletId, transaction);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeEthSignMessage: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const message = validateString(args.message, 'message');
    const result = await ethService.signMessage(client, walletId, message);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeEthSignTypedData: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const domain = args.domain as Record<string, unknown>;
    const types = args.types as Record<string, unknown>;
    const value = args.value as Record<string, unknown>;
    const result = await ethService.signTypedData(client, walletId, domain, types, value);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};
