import type { FystackMpcClient } from '../../fystack/client';
import type { ToolDefinition, ToolExecutor } from '../types';
import { ethers } from 'ethers';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router';
import { CHAIN_CONFIGS } from '../../configs/chains';

const ERC20ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
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
];

function getChainContext(chainId: number) {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    const supportedChains = Object.entries(CHAIN_CONFIGS)
      .map(([id, { name }]) => `${id} - ${name}`)
      .join(', ');
    throw new Error(`Unsupported chainId: ${chainId}. Supported chains: ${supportedChains}`);
  }
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const router = new AlphaRouter({ chainId, provider });
  return { provider, router, config };
}

async function createToken(
  chainId: number,
  address: string,
  provider: ethers.providers.Provider,
  symbol = 'UNKNOWN',
  name = 'Unknown Token'
): Promise<Token> {
  const config = CHAIN_CONFIGS[chainId];
  if (!address || address.toLowerCase() === 'native') {
    return new Token(chainId, config.weth, 18, symbol, name);
  }
  const tokenContract = new ethers.Contract(address, ERC20ABI, provider);
  const decimals = await tokenContract.decimals();
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
      const tokenContract = new ethers.Contract(tokenA.address, ERC20ABI, provider);
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

