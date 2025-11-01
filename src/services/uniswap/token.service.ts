import { ethers } from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { ChainService } from './chain.service.js';
import { TokenError } from '../../utils/errors.js';

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
];

const ERC20_ABI_NONSTANDARD = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

export const WETH_ABI = [
  'function deposit() external payable',
  'function withdraw(uint256 wad) external',
  'function balanceOf(address account) external view returns (uint256)',
];

export class TokenService {
  constructor(private chainService: ChainService) {}

  async getTokenContract(
    address: string,
    provider: ethers.providers.JsonRpcProvider
  ): Promise<ethers.Contract> {
    const standardContract = new ethers.Contract(address, ERC20_ABI, provider);
    const nonstandardContract = new ethers.Contract(address, ERC20_ABI_NONSTANDARD, provider);

    try {
      const decimals = await standardContract.decimals();
      if (typeof decimals === 'number' || (decimals && decimals.toNumber)) {
        return standardContract;
      }
    } catch {
      // Standard ABI failed, fall through to non-standard
    }

    return nonstandardContract;
  }

  async createToken(
    chainId: number,
    address: string,
    provider: ethers.providers.JsonRpcProvider,
    symbol = 'UNKNOWN',
    name = 'Unknown Token'
  ): Promise<Token> {
    const config = this.chainService.getConfig(chainId);

    if (!address || address.toLowerCase() === 'native') {
      return new Token(chainId, config.weth, 18, symbol, name);
    }

    const tokenContract = await this.getTokenContract(address, provider);
    let decimals: number;

    try {
      const decimalsResult = await tokenContract.decimals();
      decimals = typeof decimalsResult === 'number' ? decimalsResult : decimalsResult.toNumber();
    } catch (error) {
      const commonTokensHint = config.commonTokens
        ? `\n\nCommon ${config.name} testnet tokens:\n` +
          Object.entries(config.commonTokens)
            .map(([name, addr]) => `- ${name.toUpperCase()}: ${addr}`)
            .join('\n')
        : '';

      throw new TokenError(
        `Invalid or non-existent ERC20 token at address ${address} on ${config.name} (chainId: ${chainId}).\n` +
        `This could mean:\n` +
        `1. The contract doesn't exist at this address\n` +
        `2. The contract is not an ERC20 token\n` +
        `3. There's an RPC connectivity issue${commonTokensHint}`
      );
    }

    return new Token(chainId, ethers.utils.getAddress(address), decimals, symbol, name);
  }
}
