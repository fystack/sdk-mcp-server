import type { FystackMpcClient } from '../../fystack/client';
import { FystackSDK, WalletType, WalletPurpose, AddressType } from '@fystack/sdk';
import type { ToolDefinition, ToolExecutor } from '../types';

export const naturalLanguageWalletTool: ToolDefinition = {
  name: 'wallet_operations',
  description: 'Handle all wallet operations using natural language. Supports creating wallets (Standard/MPC), managing assets, signing transactions, processing payments, and more. Just describe what you want to do in plain English.',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Natural language description of the wallet operation you want to perform. Examples: "create a standard wallet", "create an MPC wallet", "get wallet assets for wallet_id", "sign ethereum transaction", "create payment checkout", "sweep funds to wallet", etc.',
      },
      wallet_id: {
        type: 'string',
        description: 'Wallet ID (UUID format) - required for operations on existing wallets',
      },
    },
    required: ['message'],
  },
};

export const walletToolDefinitions: ToolDefinition[] = [
  naturalLanguageWalletTool,
  {
    name: 'create_mpc_wallet',
    description: 'Create a new MPC (Multi-Party Computation) wallet. This generates a secure wallet where private keys are split across multiple MPC nodes.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Optional wallet name',
        },
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
        name: {
          type: 'string',
          description: 'Wallet name',
        },
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
    description: 'Get all wallets for the workspace. Requires workspaceId to be set in SDK initialization.',
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
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
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
        wallet_id: {
          type: 'string',
          description: 'The unique identifier of the wallet (UUID format)',
        },
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
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        address_type: {
          type: 'string',
          enum: ['evm', 'sol', 'tron'],
          description: 'The blockchain type (evm for Ethereum/EVM chains, sol for Solana, tron for Tron)',
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
        tx_hash: {
          type: 'string',
          description: 'Transaction hash',
        },
        network_id: {
          type: 'string',
          description: 'Network ID (UUID format)',
        },
      },
      required: ['tx_hash', 'network_id'],
    },
  },
];

export const executeCreateMpcWallet: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const sdk = client.getSdk();
  const name = (args.name as string) || `MPC-Wallet-${Date.now()}`;
  const walletPurposeStr = (args.wallet_purpose as string)?.toLowerCase();
  
  let walletPurpose = WalletPurpose.User;
  if (walletPurposeStr) {
    walletPurpose = mapWalletPurpose(walletPurposeStr);
  }
  
  const response = await sdk.createWallet({
    name,
    walletType: WalletType.MPC,
    walletPurpose,
  });

  return JSON.stringify({
    wallet_id: response.wallet_id,
    status: response.status,
    name,
    wallet_type: 'MPC',
    wallet_purpose: walletPurposeStr || 'user',
    message: `Successfully created MPC wallet: ${response.wallet_id}`,
  });
};

export const executeCreateStandardWallet: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const sdk = client.getSdk();
  const name = args.name as string;
  const walletPurposeStr = (args.wallet_purpose as string)?.toLowerCase() || 'user';
  
  if (!name) {
    throw new Error('Wallet name is required');
  }

  const walletPurpose = mapWalletPurpose(walletPurposeStr);

  const response = await sdk.createWallet({
    name,
    walletType: WalletType.Standard,
    walletPurpose,
  });

  return JSON.stringify({
    wallet_id: response.wallet_id,
    status: response.status,
    name,
    wallet_type: 'Standard',
    wallet_purpose: walletPurposeStr,
    message: `Successfully created standard wallet: ${response.wallet_id}`,
  });
};

export const executeGetWallets: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const sdk = client.getSdk();
  const wallets = await sdk.getWallets();

  return JSON.stringify({
    wallets: wallets.map(wallet => ({
      id: wallet.id,
      name: wallet.name,
      role: wallet.role,
      wallet_type: wallet.wallet_type,
      value_usd: wallet.value_usd,
      wallet_purpose: wallet.wallet_purpose,
      top_assets: wallet.top_assets,
    })),
    count: wallets.length,
  });
};

export const executeGetWalletAssets: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  if (!walletId) {
    throw new Error('wallet_id is required');
  }

  const sdk = client.getSdk();
  const assets = await sdk.getWalletAssets(walletId);

  return JSON.stringify({
    wallet_id: walletId,
    assets: assets.map(asset => ({
      id: asset.id,
      symbol: asset.asset.symbol,
      name: asset.asset.name,
      decimals: asset.asset.decimals,
      logo_url: asset.asset.logo_url,
      deposit_address: asset.deposit_address,
      network: asset.asset.network?.name,
      chain_id: asset.asset.network?.chain_id,
      is_native: asset.asset.is_native,
    })),
    count: assets.length,
  });
};

export const executeGetDepositAddress: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const addressTypeStr = (args.address_type as string)?.toLowerCase();

  if (!walletId || !addressTypeStr) {
    throw new Error('wallet_id and address_type are required');
  }

  let addressType: AddressType;
  switch (addressTypeStr) {
    case 'sol':
    case 'solana':
      addressType = AddressType.Solana;
      break;
    case 'tron':
      addressType = AddressType.Tron;
      break;
    case 'evm':
    default:
      addressType = AddressType.Evm;
      break;
  }

  const sdk = client.getSdk();
  const depositInfo = await sdk.getDepositAddress(walletId, addressType);

  return JSON.stringify({
    wallet_id: walletId,
    address_type: addressTypeStr,
    address: depositInfo.address,
    qr_code: depositInfo.qr_code,
    asset_id: depositInfo.asset_id,
  });
};

export const executeRescanTransaction: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const txHash = args.tx_hash as string;
  const networkId = args.network_id as string;

  if (!txHash || !networkId) {
    throw new Error('tx_hash and network_id are required');
  }

  const sdk = client.getSdk();
  await sdk.rescanTransaction({
    txHash,
    networkId,
  });

  return JSON.stringify({
    operation: 'rescan',
    tx_hash: txHash,
    network_id: networkId,
    status: 'initiated',
    message: `Transaction rescan initiated for ${txHash} on network ${networkId}`,
  });
};

export const executeNaturalLanguageWalletOperation: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>,
): Promise<string> => {
  const message = args.message as string;
  const walletId = args.wallet_id as string;

  if (!message) {
    throw new Error('Message is required');
  }

  const lowerMessage = message.toLowerCase();

  try {
    // Wallet Creation Operations
    if (lowerMessage.includes('create') && lowerMessage.includes('wallet')) {
      if (lowerMessage.includes('mpc') || lowerMessage.includes('multi-party')) {
        return await executeCreateMpcWallet(client, { 
          name: extractWalletName(message) 
        });
      } else if (lowerMessage.includes('standard') || lowerMessage.includes('hyper')) {
        const name = extractWalletName(message);
        const walletPurpose = extractWalletPurpose(message);
        return await executeCreateStandardWallet(client, { 
          name: name || `Wallet-${Date.now()}`,
          wallet_purpose: walletPurpose 
        });
      } else {
        return await executeCreateMpcWallet(client, { 
          name: extractWalletName(message) 
        });
      }
    }

    // Get Wallet Assets
    if (lowerMessage.includes('assets') || lowerMessage.includes('balance')) {
      if (!walletId) {
        throw new Error('Wallet ID is required for getting wallet assets');
      }
      return await executeGetWalletAssets(client, { wallet_id: walletId });
    }

    // Get Deposit Address
    if (lowerMessage.includes('deposit') && lowerMessage.includes('address')) {
      if (!walletId) {
        throw new Error('Wallet ID is required for getting deposit address');
      }
      const addressType = extractAddressType(message);
      return await executeGetDepositAddress(client, { 
        wallet_id: walletId, 
        address_type: addressType 
      });
    }

    // Rescan Transaction
    if (lowerMessage.includes('rescan') || lowerMessage.includes('reprocess')) {
      const txHash = extractTxHash(message);
      const networkId = extractNetworkId(message);
      if (!txHash || !networkId) {
        throw new Error('Transaction hash and network ID are required for rescan');
      }
      return await executeRescanTransaction(client, { 
        tx_hash: txHash, 
        network_id: networkId 
      });
    }

    return JSON.stringify({
      error: 'Could not understand the requested operation',
      message: 'Please be more specific about what you want to do. Supported operations include:',
      supported_operations: [
        'Create wallet (standard/MPC)',
        'Get wallet assets',
        'Get deposit address',
        'Rescan transactions',
      ],
      examples: [
        'Create an MPC wallet',
        'Create a standard wallet named "My Wallet"',
        'Get assets for wallet abc-123',
        'Get deposit address for wallet abc-123 on ethereum',
        'Rescan transaction 0x123... on ethereum network',
      ]
    });

  } catch (error) {
    return JSON.stringify({
      error: 'Operation failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

export const executeGetWalletCreationStatus: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  if (!walletId) {
    throw new Error('wallet_id is required');
  }

  const sdk = client.getSdk();
  const status = await sdk.getWalletCreationStatus(walletId);

  return JSON.stringify({
    wallet_id: status.wallet_id,
    status: status.status,
    message: `Wallet creation status: ${status.status}`,
  });
};

// Helper functions
function mapWalletPurpose(purposeStr: string): WalletPurpose {
  switch (purposeStr) {
    case 'general':
      return WalletPurpose.General;
    case 'gastank':
    case 'gas_tank':
      return WalletPurpose.Gastank;
    case 'deployment':
      return WalletPurpose.Deployment;
    case 'custody':
      return WalletPurpose.Custody;
    case 'payment':
      return WalletPurpose.Payment;
    case 'user':
    default:
      return WalletPurpose.User;
  }
}

function extractWalletName(message: string): string | undefined {
  const nameMatch = message.match(/name[d]?\s+["']([^"']+)["']/i) || 
                    message.match(/called\s+["']([^"']+)["']/i);
  return nameMatch ? nameMatch[1] : undefined;
}

function extractWalletPurpose(message: string): string {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('gastank') || lowerMessage.includes('gas tank')) {
    return 'gas_tank';
  } else if (lowerMessage.includes('payment')) {
    return 'payment';
  } else if (lowerMessage.includes('custody')) {
    return 'custody';
  } else if (lowerMessage.includes('deployment')) {
    return 'deployment';
  } else if (lowerMessage.includes('general')) {
    return 'general';
  }
  return 'user';
}

function extractAddressType(message: string): string {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('solana') || lowerMessage.includes('sol')) {
    return 'solana';
  } else if (lowerMessage.includes('tron')) {
    return 'tron';
  }
  return 'evm';
}

function extractTxHash(message: string): string | null {
  const txHashMatch = message.match(/tx[_\s]hash[:\s]+([a-zA-Z0-9]+)/i) ||
                      message.match(/hash[:\s]+([a-zA-Z0-9]+)/i) ||
                      message.match(/0x[a-fA-F0-9]{64}/);
  return txHashMatch ? (txHashMatch[1] || txHashMatch[0]) : null;
}

function extractNetworkId(message: string): string | null {
  const networkIdMatch = message.match(/network[_\s]id[:\s]+([a-zA-Z0-9-]+)/i) ||
                         message.match(/on\s+(ethereum|solana|tron|polygon|bsc)/i);
  return networkIdMatch ? networkIdMatch[1].toLowerCase() : null;
}
