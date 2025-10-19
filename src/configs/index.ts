import {config} from 'dotenv';

if (process.env.FYSTACK_API_KEY === undefined) {
  config();
}

export interface Config {
  fystackApiKey: string;
  fystackApiSecret: string;
  fystackEnvironment: 'local' | 'sandbox' | 'production';
  solanaRpcUrl: string;
  ethereumRpcUrl: string;
  ethereumChainId: number;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function loadConfig(): Config {
  const normalizeEnvironment = (env: string | undefined): 'local' | 'sandbox' | 'production' => {
    if (!env) return 'local';
    
    const normalized = env.toLowerCase();
    if (normalized === 'sandbox') return 'sandbox';
    if (normalized === 'production') return 'production';
    if (normalized === 'local') return 'local';
    
    return 'local';
  };

  const config: Config = {
    fystackApiKey: process.env.FYSTACK_API_KEY || '',
    fystackApiSecret: process.env.FYSTACK_API_SECRET || '',
    fystackEnvironment: normalizeEnvironment(process.env.FYSTACK_ENVIRONMENT),

    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    ethereumChainId: parseInt(process.env.ETHEREUM_CHAIN_ID || '11155111', 10),

    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  };
  
  validateConfig(config);
  return config;
}

function validateConfig(config: Config): void {
  const errors: string[] = [];
  
  if (!config.fystackApiKey) errors.push('FYSTACK_API_KEY is required');
  if (!config.fystackApiSecret) errors.push('FYSTACK_API_SECRET is required');
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
