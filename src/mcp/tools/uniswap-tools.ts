import type { FystackMpcClient } from '../../fystack/client';
import type { ToolDefinition, ToolExecutor } from '../types';
import { parseUnits as parseUnitsV6, getAddress, ZeroAddress as ZeroAddressV6, MaxUint256 as MaxUint256V6 } from 'ethers6';
import { ethers, BigNumber } from 'ethers';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router';
import { MAINNET_CONFIGS, TESTNET_CONFIGS } from '../../configs/chains';

const ERC20ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
];

const ERC20ABI_NONSTANDARD = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

const WETHABI = [
  'function deposit() external payable',
  'function withdraw(uint256 wad) external',
  'function balanceOf(address account) external view returns (uint256)',
];

export const uniswapToolDefinitions: ToolDefinition[] = [
  {
    name: 'uniswap_get_price',
    description:
      'Get a price quote for a Uniswap swap using smart order routing. Supports multi-hop routes across multiple chains.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID to use for the quote',
        },
        chain_id: {
          type: 'number',
          description: 'Chain ID (1: Ethereum, 10: Optimism, 137: Polygon, 42161: Arbitrum, 8453: Base)',
        },
        token_in: {
          type: 'string',
          description: 'Input token address (use "NATIVE" for native token like ETH)',
        },
        token_out: {
          type: 'string',
          description: 'Output token address (use "NATIVE" for native token like ETH)',
        },
        amount_in: {
          type: 'string',
          description: 'Exact input amount (required for exactIn trades)',
        },
        amount_out: {
          type: 'string',
          description: 'Exact output amount (required for exactOut trades)',
        },
        trade_type: {
          type: 'string',
          enum: ['exactIn', 'exactOut'],
          description: 'Trade type: exactIn requires amount_in, exactOut requires amount_out (default: exactIn)',
        },
      },
      required: ['wallet_id', 'chain_id', 'token_in', 'token_out'],
    },
  },
  {
    name: 'uniswap_execute_swap',
    description:
      'Execute a swap on Uniswap with optimal multi-hop routing. Automatically handles approvals and gas estimation.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID to use for the swap',
        },
        chain_id: {
          type: 'number',
          description: 'Chain ID (1: Ethereum, 10: Optimism, 137: Polygon, 42161: Arbitrum, 8453: Base)',
        },
        token_in: {
          type: 'string',
          description: 'Input token address (use "NATIVE" for native token like ETH)',
        },
        token_out: {
          type: 'string',
          description: 'Output token address (use "NATIVE" for native token like ETH)',
        },
        amount_in: {
          type: 'string',
          description: 'Exact input amount (required for exactIn trades)',
        },
        amount_out: {
          type: 'string',
          description: 'Exact output amount (required for exactOut trades)',
        },
        trade_type: {
          type: 'string',
          enum: ['exactIn', 'exactOut'],
          description: 'Trade type: exactIn requires amount_in, exactOut requires amount_out (default: exactIn)',
        },
        slippage_tolerance: {
          type: 'number',
          description: 'Slippage tolerance in percentage (default: 0.5)',
        },
        deadline_minutes: {
          type: 'number',
          description: 'Transaction deadline in minutes (default: 20)',
        },
      },
      required: ['wallet_id', 'chain_id', 'token_in', 'token_out'],
    },
  },
  {
    name: 'uniswap_suggest_swap',
    description:
      'Get intelligent swap suggestions based on liquidity analysis, fee optimization, and multi-hop route evaluation. Provides recommendations for the best tokens to swap to.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'The wallet ID',
        },
        chain_id: {
          type: 'number',
          description: 'Chain ID (1: Ethereum, 10: Optimism, 137: Polygon, 42161: Arbitrum, 8453: Base)',
        },
        token_in: {
          type: 'string',
          description: 'Starting token address (use "NATIVE" for native token)',
        },
        amount: {
          type: 'string',
          description: 'Amount to swap',
        },
        candidate_tokens: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of candidate token addresses to evaluate (optional, will use common tokens if not provided)',
        },
      },
      required: ['wallet_id', 'chain_id', 'token_in', 'amount'],
    },
  },
];

function getChainContext(chainId: number) {
  const config = MAINNET_CONFIGS[chainId] || TESTNET_CONFIGS[chainId];
  if (!config) {
    const mainnetChains = Object.entries(MAINNET_CONFIGS)
      .map(([id, { name }]) => `${id} - ${name} (mainnet)`)
      .join(', ');
    const testnetChains = Object.entries(TESTNET_CONFIGS)
      .map(([id, { name }]) => `${id} - ${name} (testnet)`)
      .join(', ');
    throw new Error(
      `Unsupported chainId: ${chainId}. Supported mainnet chains: ${mainnetChains}. Supported testnet chains: ${testnetChains}`
    );
  }
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const router = new AlphaRouter({ chainId, provider });
  return { provider, router, config };
}

async function getTokenContract(
  address: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<ethers.Contract> {
  const standardContract = new ethers.Contract(address, ERC20ABI, provider);
  const nonstandardContract = new ethers.Contract(address, ERC20ABI_NONSTANDARD, provider);
  
  try {
    const decimals = await standardContract.decimals();
    if (typeof decimals === 'number' || (decimals && decimals.toNumber)) {
      return standardContract;
    }
  } catch (error) {
    // Standard ABI failed, try non-standard
  }
  
  return nonstandardContract;
}

async function createToken(
  chainId: number,
  address: string,
  provider: ethers.providers.JsonRpcProvider,
  symbol = 'UNKNOWN',
  name = 'Unknown Token'
): Promise<Token> {
  const config = MAINNET_CONFIGS[chainId] || TESTNET_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }
  if (!address || address.toLowerCase() === 'native') {
    return new Token(chainId, config.weth, 18, symbol, name);
  }
  
  const tokenContract = await getTokenContract(address, provider);
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
    throw new Error(
      `Invalid or non-existent ERC20 token at address ${address} on ${config.name} (chainId: ${chainId}).\n` +
      `This could mean:\n` +
      `1. The contract doesn't exist at this address\n` +
      `2. The contract is not an ERC20 token\n` +
      `3. There's an RPC connectivity issue${commonTokensHint}`
    );
  }
  
  return new Token(chainId, ethers.utils.getAddress(address), decimals, symbol, name);
}

export const executeUniswapGetPrice: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  const walletId = args.wallet_id as string;
  const chainId = args.chain_id as number;
  const tokenIn = args.token_in as string;
  const tokenOut = args.token_out as string;
  const amountIn = args.amount_in as string | undefined;
  const amountOut = args.amount_out as string | undefined;
  const tradeType = (args.trade_type as string) || 'exactIn';

  if (!walletId || !chainId || !tokenIn || !tokenOut) {
    throw new Error('wallet_id, chain_id, token_in, and token_out are required');
  }

  if (tradeType === 'exactIn' && !amountIn) {
    throw new Error('amount_in is required for exactIn trades');
  }
  if (tradeType === 'exactOut' && !amountOut) {
    throw new Error('amount_out is required for exactOut trades');
  }

  try {
    const { provider, router, config } = getChainContext(chainId);

    const tokenA = await createToken(chainId, tokenIn, provider);
    const tokenB = await createToken(chainId, tokenOut, provider);

    const amount = tradeType === 'exactIn' ? amountIn! : amountOut!;
    const decimals = tradeType === 'exactIn' ? tokenA.decimals : tokenB.decimals;
    const amountWei = ethers.utils.parseUnits(amount, decimals).toString();

    const route = await router.route(
      CurrencyAmount.fromRawAmount(tradeType === 'exactIn' ? tokenA : tokenB, amountWei),
      tradeType === 'exactIn' ? tokenB : tokenA,
      tradeType === 'exactIn' ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT,
      {
        recipient: ethers.constants.AddressZero,
        slippageTolerance: new Percent(5, 1000),
        deadline: Math.floor(Date.now() / 1000) + 20 * 60,
        type: SwapType.SWAP_ROUTER_02,
      }
    );

    if (!route) {
      throw new Error('No route found');
    }

    return JSON.stringify(
      {
        wallet_id: walletId,
        chain_id: chainId,
        chain_name: config.name,
        trade_type: tradeType,
        price: route.trade.executionPrice.toSignificant(6),
        input_amount: route.trade.inputAmount.toSignificant(6),
        output_amount: route.trade.outputAmount.toSignificant(6),
        minimum_received: route.trade.minimumAmountOut(new Percent(5, 1000)).toSignificant(6),
        maximum_input: route.trade.maximumAmountIn(new Percent(5, 1000)).toSignificant(6),
        route: route.trade.swaps.map((swap) => {
          const pool = swap.route.pools[0] as any;
          const tokenInAddress = swap.inputAmount.currency.isNative 
            ? 'NATIVE' 
            : (swap.inputAmount.currency as any).address;
          const tokenOutAddress = swap.outputAmount.currency.isNative 
            ? 'NATIVE' 
            : (swap.outputAmount.currency as any).address;
          return {
            token_in: tokenInAddress,
            token_out: tokenOutAddress,
            fee: pool.fee || 'N/A',
          };
        }),
        estimated_gas: route.estimatedGasUsed.toString(),
      },
      null,
      2
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get price: ${errorMessage}`);
  }
};

export const executeUniswapExecuteSwap: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  const walletId = args.wallet_id as string;
  const chainId = args.chain_id as number;
  const tokenIn = args.token_in as string;
  const tokenOut = args.token_out as string;
  const amountIn = args.amount_in as string | undefined;
  const amountOut = args.amount_out as string | undefined;
  const tradeType = (args.trade_type as string) || 'exactIn';
  const slippageTolerance = (args.slippage_tolerance as number) || 0.5;
  const deadlineMinutes = (args.deadline_minutes as number) || 20;

  if (!walletId || !chainId || !tokenIn || !tokenOut) {
    throw new Error('wallet_id, chain_id, token_in, and token_out are required');
  }

  if (tradeType === 'exactIn' && !amountIn) {
    throw new Error('amount_in is required for exactIn trades');
  }
  if (tradeType === 'exactOut' && !amountOut) {
    throw new Error('amount_out is required for exactOut trades');
  }

  try {
    const { provider, router, config } = getChainContext(chainId);
    
    // Get MPC signer
    const signer = client.getEtherSigner();
    signer.setWallet(walletId);

    const isNativeIn = !tokenIn || tokenIn.toLowerCase() === 'native';
    const isNativeOut = !tokenOut || tokenOut.toLowerCase() === 'native';

    const tokenA = await createToken(chainId, isNativeIn ? config.weth : tokenIn, provider);
    const tokenB = await createToken(chainId, isNativeOut ? config.weth : tokenOut, provider);

    const amount = tradeType === 'exactIn' ? amountIn! : amountOut!;
    const decimals = tradeType === 'exactIn' ? tokenA.decimals : tokenB.decimals;
    const amountWei = ethers.utils.parseUnits(amount, decimals);

    const route = await router.route(
      CurrencyAmount.fromRawAmount(tradeType === 'exactIn' ? tokenA : tokenB, amountWei.toString()),
      tradeType === 'exactIn' ? tokenB : tokenA,
      tradeType === 'exactIn' ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT,
      {
        recipient: await signer.getAddress(),
        slippageTolerance: new Percent(Math.floor(slippageTolerance * 100), 10000),
        deadline: Math.floor(Date.now() / 1000) + deadlineMinutes * 60,
        type: SwapType.SWAP_ROUTER_02,
      }
    );

    if (!route) {
      throw new Error('No route found');
    }

    // Approve token if not native input
    if (!isNativeIn) {
      const tokenContract = await getTokenContract(tokenA.address, provider);
      const allowance = await tokenContract.allowance(await signer.getAddress(), config.swapRouter);
      
      if (allowance.lt(amountWei)) {
        const approvalData = tokenContract.interface.encodeFunctionData('approve', [
          config.swapRouter,
          ethers.constants.MaxUint256,
        ]);

        const approvalTx = await signer.sendTransaction({
          to: tokenA.address,
          data: approvalData,
        });
        
        await approvalTx.wait();
      }
    }

    // Execute swap
    const txValue = isNativeIn && tradeType === 'exactIn' ? amountWei.toString() : route.methodParameters!.value;
    const tx = await signer.sendTransaction({
      to: config.swapRouter,
      data: route.methodParameters!.calldata,
      value: txValue,
      gasLimit: route.estimatedGasUsed.mul(12).div(10).toString(),
    });

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }

    return JSON.stringify(
      {
        wallet_id: walletId,
        chain_id: chainId,
        chain_name: config.name,
        tx_hash: receipt.hash || tx.hash,
        trade_type: tradeType,
        amount_in: route.trade.inputAmount.toSignificant(6),
        output_amount: route.trade.outputAmount.toSignificant(6),
        minimum_received: route.trade
          .minimumAmountOut(new Percent(Math.floor(slippageTolerance * 100), 10000))
          .toSignificant(6),
        maximum_input: route.trade
          .maximumAmountIn(new Percent(Math.floor(slippageTolerance * 100), 10000))
          .toSignificant(6),
        from_token: isNativeIn ? 'NATIVE' : tokenIn,
        to_token: isNativeOut ? 'NATIVE' : tokenOut,
        route: route.trade.swaps.map((swap) => {
          const pool = swap.route.pools[0] as any;
          const tokenInAddress = swap.inputAmount.currency.isNative 
            ? 'NATIVE' 
            : (swap.inputAmount.currency as any).address;
          const tokenOutAddress = swap.outputAmount.currency.isNative 
            ? 'NATIVE' 
            : (swap.outputAmount.currency as any).address;
          return {
            token_in: tokenInAddress,
            token_out: tokenOutAddress,
            fee: pool.fee || 'N/A',
          };
        }),
        gas_used: receipt.gasUsed?.toString() || 'N/A',
        message: 'Swap executed successfully',
      },
      null,
      2
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Swap failed: ${errorMessage}`);
  }
};

export const executeUniswapSuggestSwap: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  const walletId = args.wallet_id as string;
  const chainId = args.chain_id as number;
  const tokenIn = args.token_in as string;
  const amount = args.amount as string;
  const candidateTokens = args.candidate_tokens as string[] | undefined;

  if (!walletId || !chainId || !tokenIn || !amount) {
    throw new Error('wallet_id, chain_id, token_in, and amount are required');
  }

  try {
    const { provider, router, config } = getChainContext(chainId);

    // Default candidate tokens for each chain (common stablecoins and wrapped tokens)
    const defaultCandidates: Record<number, string[]> = {
      1: [ // Ethereum
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      ],
      10: [ // Optimism
        '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // USDC
        '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // USDT
        '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI
      ],
      137: [ // Polygon
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
        '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
      ],
      42161: [ // Arbitrum
        '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC
        '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
        '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI
      ],
      8453: [ // Base
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
        '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI
      ],
    };

    const tokensToEvaluate = candidateTokens || defaultCandidates[chainId] || [];

    if (tokensToEvaluate.length === 0) {
      throw new Error('No candidate tokens to evaluate. Please provide candidate_tokens or use a supported chain.');
    }

    const tokenA = await createToken(chainId, tokenIn, provider);
    const amountWei = ethers.utils.parseUnits(amount, tokenA.decimals);

    interface Suggestion {
      token_address: string;
      token_symbol: string;
      output_amount: string;
      price_impact: string;
      route_hops: number;
      estimated_gas: string;
      fees_bps: number;
      score: number;
      reasoning: string;
    }

    const suggestions: Suggestion[] = [];

    // Evaluate each candidate token
    for (const tokenOut of tokensToEvaluate) {
      try {
        const tokenB = await createToken(chainId, tokenOut, provider);
        
        const route = await router.route(
          CurrencyAmount.fromRawAmount(tokenA, amountWei.toString()),
          tokenB,
          TradeType.EXACT_INPUT,
          {
            recipient: ethers.constants.AddressZero,
            slippageTolerance: new Percent(5, 1000),
            deadline: Math.floor(Date.now() / 1000) + 20 * 60,
            type: SwapType.SWAP_ROUTER_02,
          }
        );

        if (!route) continue;

        const outputAmount = route.trade.outputAmount.toSignificant(6);
        const priceImpact = route.trade.priceImpact.toSignificant(2);
        const routeHops = route.trade.swaps.reduce((acc, swap) => acc + swap.route.pools.length, 0);
        const estimatedGas = route.estimatedGasUsed.toString();
        
        // Calculate average fee in basis points
        let totalFee = 0;
        let poolCount = 0;
        route.trade.swaps.forEach(swap => {
          swap.route.pools.forEach(pool => {
            const poolFee = (pool as any).fee || 3000;
            totalFee += poolFee;
            poolCount++;
          });
        });
        const avgFeeBps = poolCount > 0 ? Math.round(totalFee / poolCount / 100) : 30;

        // Calculate score (higher is better)
        const gasScore = Math.max(0, 100 - parseInt(estimatedGas) / 1000);
        const hopScore = Math.max(0, 100 - routeHops * 20);
        const feeScore = Math.max(0, 100 - avgFeeBps);
        const priceImpactScore = Math.max(0, 100 - parseFloat(priceImpact) * 10);
        const score = (gasScore + hopScore + feeScore + priceImpactScore) / 4;

        // Generate reasoning
        let reasoning = '';
        if (routeHops === 1) {
          reasoning += 'Direct swap with single pool. ';
        } else {
          reasoning += `Multi-hop route (${routeHops} pools). `;
        }
        
        if (parseFloat(priceImpact) < 1) {
          reasoning += 'Low price impact. ';
        } else if (parseFloat(priceImpact) < 3) {
          reasoning += 'Moderate price impact. ';
        } else {
          reasoning += 'High price impact - consider smaller amount. ';
        }

        if (avgFeeBps <= 5) {
          reasoning += 'Low fees (0.05%). ';
        } else if (avgFeeBps <= 30) {
          reasoning += 'Standard fees (0.3%). ';
        } else {
          reasoning += 'Higher fees (1%+). ';
        }

        const symbol = await (new ethers.Contract(tokenOut, ERC20ABI, provider)).symbol();

        suggestions.push({
          token_address: tokenOut,
          token_symbol: symbol,
          output_amount: outputAmount,
          price_impact: `${priceImpact}%`,
          route_hops: routeHops,
          estimated_gas: estimatedGas,
          fees_bps: avgFeeBps,
          score: Math.round(score),
          reasoning: reasoning.trim(),
        });
      } catch (error) {
        // Skip tokens that fail (no liquidity, etc.)
        continue;
      }
    }

    // Sort by score (highest first)
    suggestions.sort((a, b) => b.score - a.score);

    // Add recommendation label
    const recommendedSuggestions = suggestions.map((s, index) => ({
      ...s,
      recommendation: index === 0 ? 'BEST' : index < 3 ? 'GOOD' : 'ACCEPTABLE',
    }));

    return JSON.stringify(
      {
        wallet_id: walletId,
        chain_id: chainId,
        chain_name: config.name,
        token_in: tokenIn,
        amount_in: amount,
        total_evaluated: tokensToEvaluate.length,
        suggestions_found: suggestions.length,
        suggestions: recommendedSuggestions,
        message: `Evaluated ${tokensToEvaluate.length} tokens, found ${suggestions.length} viable swaps`,
      },
      null,
      2
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate swap suggestions: ${errorMessage}`);
  }
};

