import type { FystackMpcClient } from '../../fystack/client';
import type { ToolDefinition, ToolExecutor } from '../types';

export const ethToolDefinitions: ToolDefinition[] = [
  {
    name: 'eth_get_address',
    description: 'Get the Ethereum address for a wallet.',
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
    name: 'eth_sign_transaction',
    description: 'Sign an Ethereum transaction (returns tx hash).',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        transaction: {
          type: 'object',
          description: 'Transaction object with to, from, value, data, gasLimit, maxFeePerGas, etc.',
        },
      },
      required: ['wallet_id', 'transaction'],
    },
  },
  {
    name: 'eth_send_transaction',
    description: 'Sign and send an Ethereum transaction (auto-populates gas if needed).',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        transaction: {
          type: 'object',
          description: 'Transaction object with to, value, data, etc.',
        },
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
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        message: {
          type: 'string',
          description: 'Message to sign',
        },
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
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        domain: {
          type: 'object',
          description: 'EIP-712 domain (JSON object with name, version, chainId, verifyingContract)',
        },
        types: {
          type: 'object',
          description: 'EIP-712 types definition (JSON object)',
        },
        value: {
          type: 'object',
          description: 'The message value to sign (JSON object)',
        },
      },
      required: ['wallet_id', 'domain', 'types', 'value'],
    },
  },
];

export const executeEthGetAddress: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;

  if (!walletId) {
    throw new Error('wallet_id is required');
  }

  const signer = client.getEtherSigner();
  signer.setWallet(walletId);
  
  const address = await signer.getAddress();

  return JSON.stringify({
    wallet_id: walletId,
    address,
    blockchain: 'ethereum',
  });
};

export const executeEthSignTransaction: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const transaction = args.transaction as any;

  if (!walletId || !transaction) {
    throw new Error('wallet_id and transaction are required');
  }

  const signer = client.getEtherSigner();
  signer.setWallet(walletId);
  
  const txHash = await signer.signTransaction(transaction);

  return JSON.stringify({
    wallet_id: walletId,
    tx_hash: txHash,
    message: 'Transaction signed successfully',
  });
};

export const executeEthSendTransaction: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const transaction = args.transaction as any;

  if (!walletId || !transaction) {
    throw new Error('wallet_id and transaction are required');
  }

  const signer = client.getEtherSigner();
  signer.setWallet(walletId);
  
  const txResponse = await signer.sendTransaction(transaction);

  return JSON.stringify({
    wallet_id: walletId,
    tx_hash: txResponse.hash,
    from: txResponse.from,
    to: txResponse.to,
    value: txResponse.value.toString(),
    nonce: txResponse.nonce,
    gas_limit: txResponse.gasLimit.toString(),
    message: 'Transaction sent successfully',
  });
};

export const executeEthSignMessage: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const message = args.message as string;

  if (!walletId || !message) {
    throw new Error('wallet_id and message are required');
  }

  const signer = client.getEtherSigner();
  signer.setWallet(walletId);
  
  const signature = await signer.signMessage(message);

  return JSON.stringify({
    wallet_id: walletId,
    message,
    signature,
    message_text: 'Message signed successfully',
  });
};

export const executeEthSignTypedData: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const walletId = args.wallet_id as string;
  const domain = args.domain as any;
  const types = args.types as any;
  const value = args.value as any;

  if (!walletId || !domain || !types || !value) {
    throw new Error('wallet_id, domain, types, and value are required');
  }

  const signer = client.getEtherSigner();
  signer.setWallet(walletId);
  
  const signature = await signer.signTypedData(domain, types, value);

  return JSON.stringify({
    wallet_id: walletId,
    signature,
    message: 'Typed data signed successfully',
  });
};
