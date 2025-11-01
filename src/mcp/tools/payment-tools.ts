import type { FystackMpcClient } from '../../fystack/client.js';
import type { ToolDefinition, ToolExecutor } from '../types.js';
import { PaymentService } from '../../services/payment/payment.service.js';
import { formatError } from '../../utils/errors.js';
import { validateString, validateOptionalString } from '../../utils/validators.js';

const paymentService = new PaymentService();

export const paymentToolDefinitions: ToolDefinition[] = [
  {
    name: 'create_payment_checkout',
    description: 'Create a payment checkout.',
    inputSchema: {
      type: 'object',
      properties: {
        price: { type: 'string', description: 'Price amount' },
        currency: { type: 'string', description: 'Currency code (e.g., USD)' },
        supported_assets: { type: 'array', description: 'Array of supported asset IDs' },
        destination_wallet_id: { type: 'string', description: 'Destination wallet ID' },
      },
      required: ['price', 'currency', 'supported_assets', 'destination_wallet_id'],
    },
  },
  {
    name: 'get_payment_checkout',
    description: 'Get payment checkout details.',
    inputSchema: {
      type: 'object',
      properties: {
        checkout_id: { type: 'string', description: 'The checkout ID' },
      },
      required: ['checkout_id'],
    },
  },
  {
    name: 'create_checkout_payment',
    description: 'Create a payment for a checkout.',
    inputSchema: {
      type: 'object',
      properties: {
        checkout_id: { type: 'string', description: 'The checkout ID' },
        pay_asset_id: { type: 'string', description: 'Payment asset ID (UUIDv4)' },
        customer_email: { type: 'string', description: 'Customer email (optional)' },
      },
      required: ['checkout_id', 'pay_asset_id'],
    },
  },
  {
    name: 'get_checkout_payment',
    description: 'Get payment details for a checkout.',
    inputSchema: {
      type: 'object',
      properties: {
        checkout_id: { type: 'string', description: 'The checkout ID' },
      },
      required: ['checkout_id'],
    },
  },
];

export const executeCreatePaymentCheckout: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const price = validateString(args.price, 'price');
    const currency = validateString(args.currency, 'currency');
    const supportedAssets = args.supported_assets as string[];
    const destinationWalletId = validateString(args.destination_wallet_id, 'destination_wallet_id');

    const result = await paymentService.createCheckout(
      client,
      price,
      currency,
      supportedAssets,
      destinationWalletId
    );
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeGetPaymentCheckout: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const checkoutId = validateString(args.checkout_id, 'checkout_id');
    const result = await paymentService.getCheckout(client, checkoutId);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeCreateCheckoutPayment: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const checkoutId = validateString(args.checkout_id, 'checkout_id');
    const payAssetId = validateString(args.pay_asset_id, 'pay_asset_id');
    const customerEmail = validateOptionalString(args.customer_email);

    const result = await paymentService.createCheckoutPayment(
      client,
      checkoutId,
      payAssetId,
      customerEmail
    );
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};

export const executeGetCheckoutPayment: ToolExecutor = async (
  client: FystackMpcClient,
  args: Record<string, unknown>
): Promise<string> => {
  try {
    const checkoutId = validateString(args.checkout_id, 'checkout_id');
    const result = await paymentService.getCheckoutPayment(client, checkoutId);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return formatError(error);
  }
};
