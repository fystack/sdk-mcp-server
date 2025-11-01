import type { FystackMpcClient } from '../../fystack/client';
import type { ToolDefinition, ToolExecutor } from '../types';
import { UniswapService } from '../../services/uniswap/uniswap.service';
import { formatError } from '../../utils/errors';
import { validateString, validateNumber, validateOptionalString, validateOptionalNumber } from '../../utils/validators';

const uniswapService = new UniswapService();

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
          description: 'Chain ID (1: Ethereum, 10: Optimism, 137: Polygon, 42161: Arbitrum, 8453: Base, 11155111: Sepolia)',
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
          description: 'Chain ID (1: Ethereum, 10: Optimism, 137: Polygon, 42161: Arbitrum, 8453: Base, 11155111: Sepolia)',
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

export const executeUniswapGetPrice: ToolExecutor = async (
  _client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const chainId = validateNumber(args.chain_id, 'chain_id');
    const tokenIn = validateString(args.token_in, 'token_in');
    const tokenOut = validateString(args.token_out, 'token_out');
    const amountIn = validateOptionalString(args.amount_in);
    const amountOut = validateOptionalString(args.amount_out);
    const tradeType = (args.trade_type as 'exactIn' | 'exactOut') || 'exactIn';

    const result = await uniswapService.getPriceQuote({
      walletId,
      chainId,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      tradeType,
    });

    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeUniswapExecuteSwap: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const walletId = validateString(args.wallet_id, 'wallet_id');
    const chainId = validateNumber(args.chain_id, 'chain_id');
    const tokenIn = validateString(args.token_in, 'token_in');
    const tokenOut = validateString(args.token_out, 'token_out');
    const amountIn = validateOptionalString(args.amount_in);
    const amountOut = validateOptionalString(args.amount_out);
    const tradeType = (args.trade_type as 'exactIn' | 'exactOut') || 'exactIn';
    const slippageTolerance = validateOptionalNumber(args.slippage_tolerance) ?? 0.5;
    const deadlineMinutes = validateOptionalNumber(args.deadline_minutes) ?? 20;

    const result = await uniswapService.executeSwap(client, {
      walletId,
      chainId,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      tradeType,
      slippageTolerance,
      deadlineMinutes,
    });

    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeUniswapSuggestSwap: ToolExecutor = async (
  _client: FystackMpcClient,
  _args: Record<string, unknown>
): Promise<string> => {
  return JSON.stringify({
    error: 'Suggest swap functionality temporarily disabled during refactoring',
    code: 'NOT_IMPLEMENTED',
  });
};

