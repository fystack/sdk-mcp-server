import type { FystackMpcClient } from '../../fystack/client.js';
import type { ToolDefinition, ToolExecutor } from '../types.js';
import { WalletService } from '../../services/wallet/wallet.service.js';
import { NLPService } from '../../services/wallet/nlp.service.js';
import { formatError } from '../../utils/errors.js';
import { validateString, validateOptionalString } from '../../utils/validators.js';

const walletService = new WalletService();
const nlpService = new NLPService();

export const naturalLanguageWalletTool: ToolDefinition = {
  name: 'wallet_operations',
  description:
    'Handle all wallet operations using natural language. Supports creating wallets (Standard/MPC), managing assets, signing transactions, processing payments, and more.',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description:
          'Natural language description of the wallet operation. Examples: "create MPC wallet", "get wallet assets", "get deposit address on ethereum"',
      },
      wallet_id: {
        type: 'string',
        description: 'Wallet ID (required for operations on existing wallets)',
      },
    },
    required: ['message'],
  },
};

export const walletToolDefinitions: ToolDefinition[] = [
  naturalLanguageWalletTool,
  {
    name: 'create_mpc_wallet',
    description:
      'Create a new MPC (Multi-Party Computation) wallet where private keys are split across multiple nodes.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Optional wallet name' },
        wallet_purpose: {
          type: 'string',
          enum: ['general', 'gas_tank', 'deployment', 'custody', 'user', 'payment'],
          description: 'Purpose of the wallet',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_standard_wallet',
    description: 'Create a new standard (non-MPC) wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Wallet name' },
        wallet_purpose: {
          type: 'string',
          enum: ['general', 'gas_tank', 'deployment', 'custody', 'user', 'payment'],
          description: 'Purpose of the wallet',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_wallets',
    description: 'Get all wallets for the workspace.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_wallet_creation_status',
    description: 'Get the current status of a wallet creation process.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
      },
      required: ['wallet_id'],
    },
  },
  {
    name: 'get_wallet_assets',
    description: 'Get all assets for a specific wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID (UUID format)' },
      },
      required: ['wallet_id'],
    },
  },
  {
    name: 'get_deposit_address',
    description: 'Get deposit address for a wallet on a specific blockchain.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string', description: 'The wallet ID' },
        address_type: {
          type: 'string',
          enum: ['evm', 'sol', 'tron'],
          description: 'The blockchain type',
        },
      },
      required: ['wallet_id', 'address_type'],
    },
  },
  {
    name: 'rescan_transaction',
    description: 'Rescan a transaction on the blockchain.',
    inputSchema: {
      type: 'object',
      properties: {
        tx_hash: { type: 'string', description: 'Transaction hash' },
        network_id: { type: 'string', description: 'Network ID (UUID format)' },
      },
      required: ['tx_hash', 'network_id'],
    },
  },
];

export const executeCreateMpcWallet: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const name = validateOptionalString(args.name);
    const purposeStr = validateOptionalString(args.wallet_purpose);
    const purpose = purposeStr ? walletService.stringToWalletPurpose(purposeStr) : undefined;

    const result = await walletService.createMpcWallet(client, name, purpose);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeCreateStandardWallet: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const name = validateString(args.name, 'name');
    const purposeStr = validateOptionalString(args.wallet_purpose);
    const purpose = purposeStr ? walletService.stringToWalletPurpose(purposeStr) : undefined;

    const result = await walletService.createStandardWallet(client, name, purpose);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeGetWallets: ToolExecutor = async (
  client: FystackMpcClient,
  _args: Record<string, unknown>
): Promise<string> => {
  try {
    const result = await walletService.getWallets(client);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeGetWalletAssets: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const result = await walletService.getWalletAssets(client, walletId);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeGetDepositAddress: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const addressTypeStr = validateString(args.address_type, 'address_type');
    const addressType = walletService.stringToAddressType(addressTypeStr);

    const result = await walletService.getDepositAddress(client, walletId, addressType);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeRescanTransaction: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const txHash = validateString(args.tx_hash, 'tx_hash');
    const networkId = validateString(args.network_id, 'network_id');

    const result = await walletService.rescanTransaction(client, txHash, networkId);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeGetWalletCreationStatus: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const result = await walletService.getWalletCreationStatus(client, walletId);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeNaturalLanguageWalletOperation: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const message = validateString(args.message, 'message');
    const walletId = validateOptionalString(args.wallet_id);
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('create') && lowerMessage.includes('wallet')) {
      if (lowerMessage.includes('mpc') || lowerMessage.includes('multi-party')) {
        const name = nlpService.extractWalletName(message);
        return await executeCreateMpcWallet(client, { name });
      } else if (lowerMessage.includes('standard') || lowerMessage.includes('hyper')) {
        const name = nlpService.extractWalletName(message) || `Wallet-${Date.now()}`;
        const walletPurpose = nlpService.extractWalletPurpose(message);
        return await executeCreateStandardWallet(client, { name, wallet_purpose: walletPurpose });
      } else {
        const name = nlpService.extractWalletName(message);
        return await executeCreateMpcWallet(client, { name });
      }
    }

    if (lowerMessage.includes('assets') || lowerMessage.includes('balance')) {
      if (!walletId) {
        throw new Error('Wallet ID is required for getting wallet assets');
      }
      return await executeGetWalletAssets(client, { wallet_id: walletId });
    }

    if (lowerMessage.includes('deposit') && lowerMessage.includes('address')) {
      if (!walletId) {
        throw new Error('Wallet ID is required for getting deposit address');
      }
      const addressType = nlpService.extractAddressType(message);
      return await executeGetDepositAddress(client, { wallet_id: walletId, address_type: addressType });
    }

    if (lowerMessage.includes('rescan') || lowerMessage.includes('reprocess')) {
      const txHash = nlpService.extractTxHash(message);
      const networkId = nlpService.extractNetworkId(message);
      if (!txHash || !networkId) {
        throw new Error('Transaction hash and network ID are required for rescan');
      }
      return await executeRescanTransaction(client, { tx_hash: txHash, network_id: networkId });
    }

    return JSON.stringify({
      error: 'Could not understand the requested operation',
      message: 'Please be more specific. Supported: Create wallet, Get assets, Get deposit address, Rescan transaction',
      examples: [
        'Create an MPC wallet',
        'Create a standard wallet named "My Wallet"',
        'Get assets',
        'Get deposit address on ethereum',
        'Rescan transaction 0x123...',
      ],
    });
  } catch (error) {
    return formatError(error);
  }
};
