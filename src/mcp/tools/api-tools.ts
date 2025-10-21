import type { FystackMpcClient } from '../../fystack/client';
import { AddressType } from '@fystack/sdk';
import type { ToolDefinition, ToolExecutor } from '../types';

export const apiToolDefinitions: ToolDefinition[] = [
  {
    name: 'api_get_wallet_detail',
    description: 'Get detailed wallet information including address and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        address_type: {
          type: 'string',
          enum: ['evm', 'solana', 'tron'],
          description: 'Address type',
        },
        wallet_id: {
          type: 'string',
          description: 'Wallet ID (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'api_request_sign',
    description: 'Request a signing operation (low-level API for custom sign requests).',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        method: {
          type: 'string',
          description: 'Signing method (e.g., eth_sign, eth_signTypedData_v4, solana_signMessage)',
        },
        message: {
          type: 'string',
          description: 'Message to sign',
        },
        chain_id: {
          type: 'number',
          description: 'Chain ID',
        },
        typed_data: {
          type: 'string',
          description: 'Typed data for EIP-712 (optional)',
        },
      },
      required: ['wallet_id', 'method', 'message', 'chain_id'],
    },
  },
  {
    name: 'api_get_sign_status',
    description: 'Get the status of a signing request.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        transaction_id: {
          type: 'string',
          description: 'The transaction/sign request ID',
        },
      },
      required: ['wallet_id', 'transaction_id'],
    },
  },
  {
    name: 'api_sign_transaction',
    description: 'Sign a transaction using low-level API (supports both EVM and Solana).',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        transaction_data: {
          type: 'object',
          description: 'Transaction data object',
        },
      },
      required: ['wallet_id', 'transaction_data'],
    },
  },
  {
    name: 'api_get_transaction_status',
    description: 'Get the status of a transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        transaction_id: {
          type: 'string',
          description: 'The transaction ID',
        },
      },
      required: ['wallet_id', 'transaction_id'],
    },
  },
];

export const executeApiGetWalletDetail: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const addressTypeStr = (args.address_type as string)?.toLowerCase();
  const walletId = args.wallet_id as string;

  const apiService = client.getApiService();
  
  let addressType;
  if (addressTypeStr === 'solana') {
    addressType = AddressType.Solana;
  } else if (addressTypeStr === 'tron') {
    addressType = AddressType.Tron;
  } else {
    addressType = AddressType.Evm;
  }

  const detail = await apiService.getWalletDetail(addressType, walletId);

  return JSON.stringify({
    wallet_id: detail.WalletID,
    name: detail.Name,
    address_type: detail.AddressType,
    address: detail.Address,
    api_key: detail.APIKey,
  });
};

export const executeApiRequestSign: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const method = args.method as string;
  const message = args.message as string;
  const chainId = args.chain_id as number;
  const typedData = args.typed_data as string;

  if (!walletId || !method || !message || chainId === undefined) {
    throw new Error('wallet_id, method, message, and chain_id are required');
  }

  const apiService = client.getApiService();
  
  const response = await apiService.requestSign(walletId, {
    method,
    message,
    chain_id: chainId,
    typed_data: typedData,
  });

  return JSON.stringify({
    transaction_id: response.transaction_id,
    message: 'Sign request created successfully',
  });
};

export const executeApiGetSignStatus: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const transactionId = args.transaction_id as string;

  if (!walletId || !transactionId) {
    throw new Error('wallet_id and transaction_id are required');
  }

  const apiService = client.getApiService();
  const status = await apiService.getSignStatus(walletId, transactionId);

  return JSON.stringify({
    transaction_id: status.transaction_id,
    status: status.status,
    signature: status.signature,
    approvals: status.approvals,
    created_at: status.created_at,
    updated_at: status.updated_at,
  });
};

export const executeApiSignTransaction: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const transactionData = args.transaction_data as any;

  if (!walletId || !transactionData) {
    throw new Error('wallet_id and transaction_data are required');
  }

  const apiService = client.getApiService();
  const response = await apiService.signTransaction(walletId, transactionData);

  return JSON.stringify({
    transaction_id: response.transaction_id,
    message: 'Transaction sign request created successfully',
  });
};

export const executeApiGetTransactionStatus: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const transactionId = args.transaction_id as string;

  if (!walletId || !transactionId) {
    throw new Error('wallet_id and transaction_id are required');
  }

  const apiService = client.getApiService();
  const status = await apiService.getTransactionStatus(walletId, transactionId);

  return JSON.stringify({
    transaction_id: status.transaction_id,
    status: status.status,
    method: status.method,
    hash: status.hash,
    failed_reason: status.failed_reason,
    approvals: status.approvals,
    created_at: status.created_at,
    updated_at: status.updated_at,
  });
};
