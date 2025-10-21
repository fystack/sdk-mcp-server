import type { FystackMpcClient } from '../../fystack/client';
import type { ToolDefinition, ToolExecutor } from '../types';

export const paymentToolDefinitions: ToolDefinition[] = [
  {
    name: 'create_payment_checkout',
    description: 'Create a payment checkout for accepting cryptocurrency payments.',
    inputSchema: {
      type: 'object',
      properties: {
        price: {
          type: 'string',
          description: 'Price amount',
        },
        currency: {
          type: 'string',
          description: 'Currency code (e.g., USD)',
        },
        supported_assets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of asset IDs in format SYMBOL:CHAIN_ID',
        },
        destination_wallet_id: {
          type: 'string',
          description: 'Destination wallet ID',
        },
        expiry_duration_seconds: {
          type: 'number',
          description: 'Expiry time in seconds',
        },
        description: {
          type: 'string',
          description: 'Payment description',
        },
        order_id: {
          type: 'string',
          description: 'Order ID',
        },
      },
      required: ['price', 'currency', 'supported_assets', 'destination_wallet_id', 'expiry_duration_seconds'],
    },
  },
  {
    name: 'get_payment_checkout',
    description: 'Get details of a payment checkout.',
    inputSchema: {
      type: 'object',
      properties: {
        checkout_id: {
          type: 'string',
          description: 'The checkout ID',
        },
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
        checkout_id: {
          type: 'string',
          description: 'The checkout ID',
        },
        pay_asset_id: {
          type: 'string',
          description: 'Payment asset ID (UUIDv4)',
        },
        customer_email: {
          type: 'string',
          description: 'Customer email (optional)',
        },
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
        checkout_id: {
          type: 'string',
          description: 'The checkout ID',
        },
      },
      required: ['checkout_id'],
    },
  },
];

export const executeCreatePaymentCheckout: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const price = args.price as string;
  const currency = args.currency as string;
  const supportedAssets = args.supported_assets as string[];
  const destinationWalletId = args.destination_wallet_id as string;
  const expiryDurationSeconds = args.expiry_duration_seconds as number;
  const description = args.description as string;
  const orderId = args.order_id as string;

  if (!price || !currency || !supportedAssets || !destinationWalletId || !expiryDurationSeconds) {
    throw new Error('price, currency, supported_assets, destination_wallet_id, and expiry_duration_seconds are required');
  }

  const paymentService = client.getPaymentService();
  
  const checkout = await paymentService.createCheckout({
    price,
    currency,
    supported_assets: supportedAssets,
    destination_wallet_id: destinationWalletId,
    expiry_duration_seconds: expiryDurationSeconds,
    description,
    order_id: orderId,
  });

  return JSON.stringify({
    checkout_id: checkout.id,
    price: checkout.price,
    currency: checkout.currency,
    status: checkout.status,
    supported_assets: checkout.supported_assets,
    expiry_duration_seconds: checkout.expiry_duration_seconds,
    message: 'Payment checkout created successfully',
  });
};

export const executeGetPaymentCheckout: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const checkoutId = args.checkout_id as string;

  if (!checkoutId) {
    throw new Error('checkout_id is required');
  }

  const paymentService = client.getPaymentService();
  const checkout = await paymentService.getCheckout(checkoutId);

  return JSON.stringify({
    checkout_id: checkout.id,
    price: checkout.price,
    currency: checkout.currency,
    status: checkout.status,
    supported_assets: checkout.supported_assets,
    description: checkout.description,
    order_id: checkout.order_id,
    customer_id: checkout.customer_id,
  });
};

export const executeCreateCheckoutPayment: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const checkoutId = args.checkout_id as string;
  const payAssetId = args.pay_asset_id as string;
  const customerEmail = args.customer_email as string;

  if (!checkoutId || !payAssetId) {
    throw new Error('checkout_id and pay_asset_id are required');
  }

  const paymentService = client.getPaymentService();
  const payment = await paymentService.createCheckoutPayment(checkoutId, {
    pay_asset_id: payAssetId,
    customer_email: customerEmail,
  });

  return JSON.stringify({
    payment_id: payment.id,
    checkout_id: payment.checkout_id,
    deposit_address: payment.deposit_address,
    deposit_qr: payment.deposit_qr,
    converted_crypto_price: payment.converted_crypto_price,
    expired_at: payment.expired_at,
    message: 'Checkout payment created successfully',
  });
};

export const executeGetCheckoutPayment: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const checkoutId = args.checkout_id as string;

  if (!checkoutId) {
    throw new Error('checkout_id is required');
  }

  const paymentService = client.getPaymentService();
  const payment = await paymentService.getCheckoutPayment(checkoutId);

  return JSON.stringify({
    payment_id: payment.id,
    checkout_id: payment.checkout_id,
    deposit_address: payment.deposit_address,
    converted_crypto_price: payment.converted_crypto_price,
    tx_hash: payment.tx_hash,
    payer_address: payment.payer_address,
    expired_at: payment.expired_at,
    pay_asset: payment.pay_asset,
    network: payment.network,
  });
};
