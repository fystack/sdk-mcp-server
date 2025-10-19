import { FystackSDK, Environment } from '@fystack/sdk';
import type { Config } from '../configs/index.js';

export class FystackMpcClient {
  private fystackSdk: FystackSDK;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    
    const environment = this.mapEnvironment(config.fystackEnvironment);
    this.fystackSdk = new FystackSDK({
      credentials: {
        apiKey: config.fystackApiKey,
        apiSecret: config.fystackApiSecret,
      },
      environment,
      logger: config.logLevel === 'debug',
    });
  }

  async connect(): Promise<void> {
    console.error('✅ Connected to Fystack SDK');
  }

  async disconnect(): Promise<void> {
    // No cleanup needed
  }

  getSdk(): FystackSDK {
    return this.fystackSdk;
  }

  getConfig(): Config {
    return this.config;
  }

  private mapEnvironment(env: string): Environment {
    switch (env) {
      case 'production':
        return Environment.Production;
      case 'sandbox':
        return Environment.Sandbox;
      case 'local':
      default:
        return Environment.Local;
    }
  }
}
