import type { FystackMpcClient } from '../../fystack/client.js';
import { validateString, validateRequired } from '../../utils/validators.js';

export class SolanaService {
  async getAddress(client: FystackMpcClient, walletId: string): Promise<object> {
    validateString(walletId, 'wallet_id');
    const signer = client.getSolanaSigner();
    signer.setWallet(walletId);
    const address = await signer.getAddress();

    return { wallet_id: walletId, address };
  }

  async signTransaction(
    client: FystackMpcClient,
    walletId: string,
    transaction: Record<string, unknown>
  ): Promise<object> {
    validateString(walletId, 'wallet_id');
    validateRequired(transaction, 'transaction');

    const signer = client.getSolanaSigner();
    signer.setWallet(walletId);
    const signedTx = await signer.signTransaction(transaction as any);

    return { wallet_id: walletId, signed_transaction: signedTx };
  }

  async signMessage(client: FystackMpcClient, walletId: string, message: string): Promise<object> {
    validateString(walletId, 'wallet_id');
    validateString(message, 'message');

    const signer = client.getSolanaSigner();
    signer.setWallet(walletId);
    const signature = await signer.signMessage(message);

    return { wallet_id: walletId, message, signature };
  }

  async signAndSendTransaction(
    client: FystackMpcClient,
    walletId: string,
    transaction: Record<string, unknown>
  ): Promise<object> {
    validateString(walletId, 'wallet_id');
    validateRequired(transaction, 'transaction');

    const signer = client.getSolanaSigner();
    signer.setWallet(walletId);
    const txHash = await signer.signAndSendTransaction(transaction as any);

    return { wallet_id: walletId, tx_hash: txHash, status: 'sent' };
  }

  async signAllTransactions(
    client: FystackMpcClient,
    walletId: string,
    transactions: Record<string, unknown>[]
  ): Promise<object> {
    validateString(walletId, 'wallet_id');
    validateRequired(transactions, 'transactions');

    const signer = client.getSolanaSigner();
    signer.setWallet(walletId);
    const signedTxs = await signer.signAllTransactions(transactions as any);

    return { wallet_id: walletId, signed_transactions: signedTxs, count: transactions.length };
  }
}
