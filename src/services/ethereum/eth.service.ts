import type { FystackMpcClient } from '../../fystack/client.js';
import { validateString, validateRequired } from '../../utils/validators.js';

export class EthereumService {
  async getAddress(client: FystackMpcClient, walletId: string): Promise<object> {
    validateString(walletId, 'wallet_id');
    const signer = client.getEtherSigner();
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

    const signer = client.getEtherSigner();
    signer.setWallet(walletId);
    const signedTx = await signer.signTransaction(transaction);

    return { wallet_id: walletId, signed_transaction: signedTx };
  }

  async sendTransaction(
    client: FystackMpcClient,
    walletId: string,
    transaction: Record<string, unknown>
  ): Promise<object> {
    validateString(walletId, 'wallet_id');
    validateRequired(transaction, 'transaction');

    const signer = client.getEtherSigner();
    signer.setWallet(walletId);
    const tx = await signer.sendTransaction(transaction);
    const receipt = await tx.wait();

    return {
      wallet_id: walletId,
      tx_hash: tx.hash,
      block_number: receipt?.blockNumber,
      gas_used: receipt?.gasUsed?.toString(),
      status: receipt?.status,
    };
  }

  async signMessage(client: FystackMpcClient, walletId: string, message: string): Promise<object> {
    validateString(walletId, 'wallet_id');
    validateString(message, 'message');

    const signer = client.getEtherSigner();
    signer.setWallet(walletId);
    const signature = await signer.signMessage(message);

    return { wallet_id: walletId, message, signature };
  }

  async signTypedData(
    client: FystackMpcClient,
    walletId: string,
    domain: Record<string, unknown>,
    types: Record<string, unknown>,
    value: Record<string, unknown>
  ): Promise<object> {
    validateString(walletId, 'wallet_id');
    validateRequired(domain, 'domain');
    validateRequired(types, 'types');
    validateRequired(value, 'value');

    const signer = client.getEtherSigner();
    signer.setWallet(walletId);
    const signature = await signer.signTypedData(domain as any, types as any, value);

    return { wallet_id: walletId, signature, domain, types, value };
  }
}
