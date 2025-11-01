import type { FystackMpcClient } from '../../fystack/client.js';
import { validateString, validateRequired, validateOptionalString } from '../../utils/validators.js';

export class PaymentService {
  async createCheckout(
    client: FystackMpcClient,
    price: string,
    currency: string,
    supportedAssets: string[],
    destinationWalletId: string
  ): Promise<object> {
    validateString(price, 'price');
    validateString(currency, 'currency');
    validateRequired(supportedAssets, 'supported_assets');
    validateString(destinationWalletId, 'destination_wallet_id');

    const paymentService = client.getPaymentService();
    const checkout = await paymentService.createCheckout({
      price,
      currency,
      supported_assets: supportedAssets,
      destination_wallet_id: destinationWalletId,
      expiry_duration_seconds: 3600,
    });

    return {
      checkout_id: checkout.id,
      price,
      currency,
      supported_assets: supportedAssets,
      destination_wallet_id: destinationWalletId,
    };
  }

  async getCheckout(client: FystackMpcClient, checkoutId: string): Promise<object> {
    validateString(checkoutId, 'checkout_id');

    const paymentService = client.getPaymentService();
    const checkout = await paymentService.getCheckout(checkoutId);

    return {
      checkout_id: checkout.id,
      price: checkout.price,
      currency: checkout.currency,
      status: checkout.status,
      supported_assets: checkout.supported_assets,
    };
  }

  async createCheckoutPayment(
    client: FystackMpcClient,
    checkoutId: string,
    payAssetId: string,
    customerEmail?: string
  ): Promise<object> {
    validateString(checkoutId, 'checkout_id');
    validateString(payAssetId, 'pay_asset_id');

    const paymentService = client.getPaymentService();
    const payment = await paymentService.createCheckoutPayment(checkoutId, {
      pay_asset_id: payAssetId,
      customer_email: customerEmail,
    });

    return {
      checkout_id: checkoutId,
      payment_id: payment.id,
      pay_asset_id: payAssetId,
      customer_email: customerEmail,
    };
  }

  async getCheckoutPayment(client: FystackMpcClient, checkoutId: string): Promise<object> {
    validateString(checkoutId, 'checkout_id');

    const paymentService = client.getPaymentService();
    const payment = await paymentService.getCheckoutPayment(checkoutId);

    return {
      checkout_id: checkoutId,
      payment_id: payment.id,
      payment,
    };
  }
}
