import type { FystackMpcClient } from '../../fystack/client';
import type { ToolDefinition, ToolExecutor } from '../types';

export const solanaToolDefinitions: ToolDefinition[] = [
  {
    name: 'solana_get_address',
    description: 'Get the Solana address for a wallet.',
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
    name: 'solana_sign_transaction',
    description: 'Sign a Solana transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        transaction: {
          type: 'string',
          description: 'Base64 encoded serialized transaction',
        },
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
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        message: {
          type: 'string',
          description: 'Message to sign (base64 or string)',
        },
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
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        transaction: {
          type: 'string',
          description: 'Base64 encoded serialized transaction',
        },
      },
      required: ['wallet_id', 'transaction'],
    },
  },
  {
    name: 'solana_sign_all_transactions',
    description: 'Sign multiple Solana transactions at once.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        transactions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of base64 encoded serialized transactions',
        },
      },
      required: ['wallet_id', 'transactions'],
    },
  },
];

export const executeSolanaGetAddress: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;

  if (!walletId) {
    throw new Error('wallet_id is required');
  }

  const signer = client.getSolanaSigner();
  signer.setWallet(walletId);
  
  const address = await signer.getAddress();

  return JSON.stringify({
    wallet_id: walletId,
    address,
    blockchain: 'solana',
  });
};

export const executeSolanaSignMessage: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const message = args.message as string;

  if (!walletId || !message) {
    throw new Error('wallet_id and message are required');
  }

  const signer = client.getSolanaSigner();
  signer.setWallet(walletId);
  
  const signature = await signer.signMessage(message);

  return JSON.stringify({
    wallet_id: walletId,
    message,
    signature,
    message_text: 'Message signed successfully',
  });
};

export const executeSolanaSignTransaction: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const transaction = args.transaction as string;

  if (!walletId || !transaction) {
    throw new Error('wallet_id and transaction are required');
  }

  const signer = client.getSolanaSigner();
  signer.setWallet(walletId);
  
  const signature = await signer.signTransaction(transaction);

  return JSON.stringify({
    wallet_id: walletId,
    signature,
    message: 'Transaction signed successfully',
  });
};

export const executeSolanaSignAndSendTransaction: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const transaction = args.transaction as string;

  if (!walletId || !transaction) {
    throw new Error('wallet_id and transaction are required');
  }

  const signer = client.getSolanaSigner();
  signer.setWallet(walletId);
  
  const txHash = await signer.signAndSendTransaction(transaction);

  return JSON.stringify({
    wallet_id: walletId,
    tx_hash: txHash,
    message: 'Transaction signed and sent successfully',
  });
};

export const executeSolanaSignAllTransactions: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const transactions = args.transactions as string[];

  if (!walletId || !transactions || !Array.isArray(transactions)) {
    throw new Error('wallet_id and transactions array are required');
  }

  const signer = client.getSolanaSigner();
  signer.setWallet(walletId);
  
  const result = await signer.signAllTransactions(transactions);

  return JSON.stringify({
    wallet_id: walletId,
    signed_transactions: result.transactions,
    count: result.transactions.length,
    message: `Successfully signed ${result.transactions.length} transactions`,
  });
};
