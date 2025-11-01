import { FystackSDK, Environment, EtherSigner, SolanaSigner, PaymentService, APIService } from '@fystack/sdk';
import { JsonRpcProvider } from 'ethers6';
import type { Config } from '../configs/index';

export class FystackMpcClient {
  private fystackSdk: FystackSDK;
  private config: Config;
  public environment: Environment;
  private etherSigner?: EtherSigner;
  private solanaSigner?: SolanaSigner;
  private paymentService?: PaymentService;
  private apiService?: APIService;

  constructor(config: Config) {
    this.config = config;
    
    this.environment = this.mapEnvironment(config.fystackEnvironment);
    this.fystackSdk = new FystackSDK({
      credentials: {
        apiKey: config.fystackApiKey,
        apiSecret: config.fystackApiSecret,
      },
      workspaceId: config.fystackWorkspaceId,
      environment: this.environment,
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

  getEtherSigner(provider?: any): EtherSigner {
    // Always ensure we have a valid provider configured (defaults to ENV)
    const effectiveProvider = provider || new JsonRpcProvider(this.config.ethereumRpcUrl, this.config.ethereumChainId);

    this.etherSigner = new EtherSigner(
      {
        apiKey: this.config.fystackApiKey,
        apiSecret: this.config.fystackApiSecret,
      },
      this.environment,
      effectiveProvider
    );

    return this.etherSigner;
  }

  getSolanaSigner(): SolanaSigner {
    if (!this.solanaSigner) {
      this.solanaSigner = new SolanaSigner(
        {
          apiKey: this.config.fystackApiKey,
          apiSecret: this.config.fystackApiSecret,
        },
        this.environment
      );
    }
    return this.solanaSigner;
  }

  getPaymentService(): PaymentService {
    if (!this.paymentService) {
      this.paymentService = new PaymentService({
        apiKey: this.config.fystackApiKey,
        environment: this.environment,
      });
    }
    return this.paymentService;
  }

  getApiService(): APIService {
    if (!this.apiService) {
      this.apiService = new APIService(
        {
          apiKey: this.config.fystackApiKey,
          apiSecret: this.config.fystackApiSecret,
        },
        this.environment
      );
    }
    return this.apiService;
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
