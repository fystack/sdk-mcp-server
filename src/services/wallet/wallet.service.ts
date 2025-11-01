import { FystackSDK, WalletType, WalletPurpose, AddressType } from '@fystack/sdk';
import type { FystackMpcClient } from '../../fystack/client.js';
import { WalletError, ValidationError } from '../../utils/errors.js';
import { validateRequired, validateString } from '../../utils/validators.js';

export class WalletService {
  async createMpcWallet(
    client: FystackMpcClient,
    name?: string,
    walletPurpose?: WalletPurpose
  ): Promise<object> {
    const sdk = client.getSdk();
    const walletName = name || `MPC-Wallet-${Date.now()}`;

    const response = await sdk.createWallet({
      name: walletName,
      walletType: WalletType.MPC,
      walletPurpose: walletPurpose || WalletPurpose.User,
    });

    return {
      wallet_id: response.wallet_id,
      status: response.status,
      name: walletName,
      wallet_type: 'MPC',
      wallet_purpose: this.purposeToString(walletPurpose || WalletPurpose.User),
      message: `Successfully created MPC wallet: ${response.wallet_id}`,
    };
  }

  async createStandardWallet(
    client: FystackMpcClient,
    name: string,
    walletPurpose?: WalletPurpose
  ): Promise<object> {
    validateRequired(name, 'name');

    const sdk = client.getSdk();

    const response = await sdk.createWallet({
      name,
      walletType: WalletType.Standard,
      walletPurpose: walletPurpose || WalletPurpose.User,
    });

    return {
      wallet_id: response.wallet_id,
      status: response.status,
      name,
      wallet_type: 'Standard',
      wallet_purpose: this.purposeToString(walletPurpose || WalletPurpose.User),
      message: `Successfully created standard wallet: ${response.wallet_id}`,
    };
  }

  async getWallets(client: FystackMpcClient): Promise<object> {
    const sdk = client.getSdk();
    const wallets = await sdk.getWallets();

    return {
      wallets: wallets.map((wallet) => ({
        id: wallet.id,
        name: wallet.name,
        role: wallet.role,
        wallet_type: wallet.wallet_type,
        value_usd: wallet.value_usd,
        wallet_purpose: wallet.wallet_purpose,
        top_assets: wallet.top_assets,
      })),
      count: wallets.length,
    };
  }

  async getWalletAssets(client: FystackMpcClient, walletId: string): Promise<object> {
    validateString(walletId, 'wallet_id');

    const sdk = client.getSdk();
    const assets = await sdk.getWalletAssets(walletId);

    return {
      wallet_id: walletId,
      assets: assets.map((asset) => ({
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
    };
  }

  async getDepositAddress(
    client: FystackMpcClient,
    walletId: string,
    addressType: AddressType
  ): Promise<object> {
    validateString(walletId, 'wallet_id');
    validateRequired(addressType, 'address_type');

    const sdk = client.getSdk();
    const depositInfo = await sdk.getDepositAddress(walletId, addressType);

    return {
      wallet_id: walletId,
      address_type: this.addressTypeToString(addressType),
      address: depositInfo.address,
      qr_code: depositInfo.qr_code,
      asset_id: depositInfo.asset_id,
    };
  }

  async rescanTransaction(
    client: FystackMpcClient,
    txHash: string,
    networkId: string
  ): Promise<object> {
    validateString(txHash, 'tx_hash');
    validateString(networkId, 'network_id');

    const sdk = client.getSdk();
    await sdk.rescanTransaction({ txHash, networkId });

    return {
      operation: 'rescan',
      tx_hash: txHash,
      network_id: networkId,
      status: 'initiated',
      message: `Transaction rescan initiated for ${txHash} on network ${networkId}`,
    };
  }

  async getWalletCreationStatus(client: FystackMpcClient, walletId: string): Promise<object> {
    validateString(walletId, 'wallet_id');

    const sdk = client.getSdk();
    const status = await sdk.getWalletCreationStatus(walletId);

    return {
      wallet_id: status.wallet_id,
      status: status.status,
      message: `Wallet creation status: ${status.status}`,
    };
  }

  stringToWalletPurpose(purposeStr: string): WalletPurpose {
    switch (purposeStr.toLowerCase()) {
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

  stringToAddressType(typeStr: string): AddressType {
    switch (typeStr.toLowerCase()) {
      case 'sol':
      case 'solana':
        return AddressType.Solana;
      case 'tron':
        return AddressType.Tron;
      case 'evm':
      default:
        return AddressType.Evm;
    }
  }

  private purposeToString(purpose: WalletPurpose): string {
    const purposeMap: Record<WalletPurpose, string> = {
      [WalletPurpose.General]: 'general',
      [WalletPurpose.Gastank]: 'gas_tank',
      [WalletPurpose.Deployment]: 'deployment',
      [WalletPurpose.Custody]: 'custody',
      [WalletPurpose.Payment]: 'payment',
      [WalletPurpose.User]: 'user',
    };
    return purposeMap[purpose] || 'user';
  }

  private addressTypeToString(type: AddressType): string {
    const typeMap: Record<AddressType, string> = {
      [AddressType.Evm]: 'evm',
      [AddressType.Solana]: 'solana',
      [AddressType.Tron]: 'tron',
    };
    return typeMap[type] || 'evm';
  }
}
