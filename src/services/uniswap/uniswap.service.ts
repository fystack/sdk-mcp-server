import { ethers } from 'ethers';
import { CurrencyAmount, TradeType, Percent, Token } from '@uniswap/sdk-core';
import { SwapType } from '@uniswap/smart-order-router';
import type { FystackMpcClient } from '../../fystack/client.js';
import { ChainService } from './chain.service.js';
import { TokenService } from './token.service.js';
import { SwapError, ValidationError } from '../../utils/errors.js';
import {
  validateRequired,
  validateString,
  validateNumber,
  validateOptionalString,
  validateOptionalNumber,
  validateEnum,
} from '../../utils/validators.js';

interface PriceQuoteParams {
  walletId: string;
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn?: string;
  amountOut?: string;
  tradeType: 'exactIn' | 'exactOut';
}

interface SwapParams extends PriceQuoteParams {
  slippageTolerance: number;
  deadlineMinutes: number;
}

interface SuggestSwapParams {
  walletId: string;
  chainId: number;
  tokenIn: string;
  amount: string;
  candidateTokens?: string[];
}

export class UniswapService {
  private chainService: ChainService;
  private tokenService: TokenService;

  constructor() {
    this.chainService = new ChainService();
    this.tokenService = new TokenService(this.chainService);
  }

  async getPriceQuote(params: PriceQuoteParams): Promise<object> {
    this.validatePriceParams(params);

    const { walletId, chainId, tokenIn, tokenOut, amountIn, amountOut, tradeType } = params;
    const { provider, router, config } = this.chainService.getChainContext(chainId);

    const tokenA = await this.tokenService.createToken(chainId, tokenIn, provider);
    const tokenB = await this.tokenService.createToken(chainId, tokenOut, provider);

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
      throw new SwapError('No route found for this token pair');
    }

    return {
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
    };
  }

  async executeSwap(client: FystackMpcClient, params: SwapParams): Promise<object> {
    this.validateSwapParams(params);

    const {
      walletId,
      chainId,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      tradeType,
      slippageTolerance,
      deadlineMinutes,
    } = params;

    const { provider, router, config } = this.chainService.getChainContext(chainId);

    const signer = client.getEtherSigner();
    signer.setWallet(walletId);

    const isNativeIn = !tokenIn || tokenIn.toLowerCase() === 'native';
    const isNativeOut = !tokenOut || tokenOut.toLowerCase() === 'native';

    const tokenA = await this.tokenService.createToken(
      chainId,
      isNativeIn ? config.weth : tokenIn,
      provider
    );
    const tokenB = await this.tokenService.createToken(
      chainId,
      isNativeOut ? config.weth : tokenOut,
      provider
    );

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
      throw new SwapError('No route found for this token pair');
    }

    if (!isNativeIn) {
      await this.approveTokenIfNeeded(tokenA, amountWei, signer, config.swapRouter, provider);
    }

    const txValue =
      isNativeIn && tradeType === 'exactIn' ? amountWei.toString() : route.methodParameters!.value;
    const tx = await signer.sendTransaction({
      to: config.swapRouter,
      data: route.methodParameters!.calldata,
      value: txValue,
      gasLimit: route.estimatedGasUsed.mul(12).div(10).toString(),
    });

    const receipt = await tx.wait();

    if (!receipt) {
      throw new SwapError('Transaction receipt is null');
    }

    return {
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
    };
  }

  private async approveTokenIfNeeded(
    token: Token,
    amount: ethers.BigNumber,
    signer: any,
    spender: string,
    provider: ethers.providers.JsonRpcProvider
  ): Promise<void> {
    const tokenContract = await this.tokenService.getTokenContract(token.address, provider);
    const allowance = await tokenContract.allowance(await signer.getAddress(), spender);

    if (allowance.lt(amount)) {
      const approvalData = tokenContract.interface.encodeFunctionData('approve', [
        spender,
        ethers.constants.MaxUint256,
      ]);

      const approvalTx = await signer.sendTransaction({
        to: token.address,
        data: approvalData,
      });

      await approvalTx.wait();
    }
  }

  private validatePriceParams(params: PriceQuoteParams): void {
    validateRequired(params.walletId, 'wallet_id');
    validateRequired(params.chainId, 'chain_id');
    validateRequired(params.tokenIn, 'token_in');
    validateRequired(params.tokenOut, 'token_out');
    validateEnum(params.tradeType, 'trade_type', ['exactIn', 'exactOut']);

    if (params.tradeType === 'exactIn' && !params.amountIn) {
      throw new ValidationError('amount_in is required for exactIn trades');
    }
    if (params.tradeType === 'exactOut' && !params.amountOut) {
      throw new ValidationError('amount_out is required for exactOut trades');
    }
  }

  private validateSwapParams(params: SwapParams): void {
    this.validatePriceParams(params);
    validateRequired(params.slippageTolerance, 'slippage_tolerance');
    validateRequired(params.deadlineMinutes, 'deadline_minutes');
  }
}
