// Re-export types
export type { ToolDefinition, ToolExecutor } from '../types';

// Import and re-export all tool definitions
import { walletToolDefinitions, naturalLanguageWalletTool } from './wallet-tools';
import { ethToolDefinitions } from './eth-tools';
import { solanaToolDefinitions } from './solana-tools';
import { paymentToolDefinitions } from './payment-tools';

// Combine all tool definitions
export const toolDefinitions = [
  ...walletToolDefinitions,
  ...ethToolDefinitions,
  ...solanaToolDefinitions,
  ...paymentToolDefinitions,
];

// Re-export the natural language wallet tool for backward compatibility
export { naturalLanguageWalletTool };

// Re-export all executor functions from individual tool files
export {
  executeCreateMpcWallet,
  executeCreateStandardWallet,
  executeGetWallets,
  executeGetWalletAssets,
  executeGetDepositAddress,
  executeRescanTransaction,
  executeNaturalLanguageWalletOperation,
  executeGetWalletCreationStatus,
} from './wallet-tools';

export {
  executeEthGetAddress,
  executeEthSignTransaction,
  executeEthSendTransaction,
  executeEthSignMessage,
  executeEthSignTypedData,
} from './eth-tools';

export {
  executeSolanaGetAddress,
  executeSolanaSignMessage,
  executeSolanaSignTransaction,
  executeSolanaSignAndSendTransaction,
  executeSolanaSignAllTransactions,
} from './solana-tools';

export {
  executeCreatePaymentCheckout,
  executeGetPaymentCheckout,
  executeCreateCheckoutPayment,
  executeGetCheckoutPayment,
} from './payment-tools';
