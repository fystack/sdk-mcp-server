import { ethers } from 'ethers';
import { AlphaRouter } from '@uniswap/smart-order-router';
import { MAINNET_CONFIGS, TESTNET_CONFIGS, type ChainConfig } from '../../configs/chains.js';
import { ChainError } from '../../utils/errors.js';

export interface ChainContext {
  provider: ethers.providers.JsonRpcProvider;
  router: AlphaRouter;
  config: ChainConfig;
}

export class ChainService {
  getChainContext(chainId: number): ChainContext {
    const config = MAINNET_CONFIGS[chainId] || TESTNET_CONFIGS[chainId];

    if (!config) {
      const mainnetChains = Object.entries(MAINNET_CONFIGS)
        .map(([id, { name }]) => `${id} - ${name} (mainnet)`)
        .join(', ');
      const testnetChains = Object.entries(TESTNET_CONFIGS)
        .map(([id, { name }]) => `${id} - ${name} (testnet)`)
        .join(', ');

      throw new ChainError(
        `Unsupported chainId: ${chainId}. Supported mainnet chains: ${mainnetChains}. Supported testnet chains: ${testnetChains}`
      );
    }

    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const router = new AlphaRouter({ chainId, provider });

    return { provider, router, config };
  }

  getConfig(chainId: number): ChainConfig {
    const config = MAINNET_CONFIGS[chainId] || TESTNET_CONFIGS[chainId];
    if (!config) {
      throw new ChainError(`Unsupported chainId: ${chainId}`);
    }
    return config;
  }
}
