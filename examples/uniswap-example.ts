import { loadConfig } from '../src/configs/index.js';
import { FystackMpcClient } from '../src/fystack/client.js';
import { executeUniswapGetPrice, executeUniswapExecuteSwap } from '../src/mcp/tools/uniswap-tools.js';

/**
 * Uniswap Integration Example
 * 
 * This example demonstrates how to:
 * 1. Get a price quote for a token swap
 * 2. Execute a swap transaction
 */

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting Uniswap Example...\n');

    // Load configuration
    const config = loadConfig();
    console.log('✅ Configuration loaded');

    // Create and connect MPC client
    const client = new FystackMpcClient(config);
    await client.connect();
    console.log('✅ MPC client connected\n');

    // Example 1: Get price quote for ETH -> USDC swap
    console.log('📊 Example 1: Getting price quote for 0.1 ETH -> USDC...');
    const priceQuote = await executeUniswapGetPrice(client, {
      wallet_id: process.env.WALLET_ID || 'your-wallet-id',
      chain_id: 1, // Ethereum mainnet
      token_in: 'NATIVE', // ETH
      token_out: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      amount_in: '0.1',
      trade_type: 'exactIn',
    });
    console.log('Price Quote:', JSON.parse(priceQuote));
    console.log('');

    // Example 2: Get price quote for USDC -> ETH swap (exact output)
    console.log('📊 Example 2: Getting price quote for USDC -> 0.1 ETH...');
    const reverseQuote = await executeUniswapGetPrice(client, {
      wallet_id: process.env.WALLET_ID || 'your-wallet-id',
      chain_id: 1,
      token_in: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      token_out: 'NATIVE', // ETH
      amount_out: '0.1',
      trade_type: 'exactOut',
    });
    console.log('Reverse Quote:', JSON.parse(reverseQuote));
    console.log('');

    // Example 3: Execute swap on Polygon (commented out for safety)
    /*
    console.log('💱 Example 3: Executing swap on Polygon...');
    const swapResult = await executeUniswapExecuteSwap(client, {
      wallet_id: process.env.WALLET_ID || 'your-wallet-id',
      chain_id: 137, // Polygon
      token_in: 'NATIVE', // MATIC
      token_out: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
      amount_in: '1.0',
      trade_type: 'exactIn',
      slippage_tolerance: 0.5,
      deadline_minutes: 20,
    });
    console.log('Swap Result:', JSON.parse(swapResult));
    console.log('');
    */

    // Example 4: Multi-chain price comparison
    console.log('🌐 Example 4: Comparing prices across chains...');
    const chains = [
      { id: 1, name: 'Ethereum', usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      { id: 137, name: 'Polygon', usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
      { id: 42161, name: 'Arbitrum', usdc: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' },
      { id: 8453, name: 'Base', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    ];

    for (const chain of chains) {
      try {
        const quote = await executeUniswapGetPrice(client, {
          wallet_id: process.env.WALLET_ID || 'your-wallet-id',
          chain_id: chain.id,
          token_in: 'NATIVE',
          token_out: chain.usdc,
          amount_in: '1.0',
          trade_type: 'exactIn',
        });
        const result = JSON.parse(quote);
        console.log(`${chain.name}: 1 ${result.chain_name} native token = ${result.output_amount} USDC`);
      } catch (error) {
        console.log(`${chain.name}: Error - ${error}`);
      }
    }
    console.log('');

    console.log('✅ Examples completed successfully!');
    
    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run examples
main();

