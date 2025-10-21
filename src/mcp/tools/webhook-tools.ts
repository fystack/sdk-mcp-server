import type { FystackMpcClient } from '../../fystack/client';
import { APIService } from '@fystack/sdk';
import type { ToolDefinition, ToolExecutor } from '../types';

export const webhookToolDefinitions: ToolDefinition[] = [
  {
    name: 'verify_webhook_event',
    description: 'Verify a webhook event signature using HMAC.',
    inputSchema: {
      type: 'object',
      properties: {
        event: {
          type: 'object',
          description: 'Webhook event object (JSON with webhook_id, resource_id, url, payload, event)',
        },
        signature: {
          type: 'string',
          description: 'HMAC signature from webhook header',
        },
      },
      required: ['event', 'signature'],
    },
  },
];

export const executeVerifyWebhookEvent: ToolExecutor = async (client: FystackMpcClient, args: Record<string, unknown>): Promise<string> => {
  const event = args.event as any;
  const signature = args.signature as string;

  if (!event || !signature) {
    throw new Error('event and signature are required');
  }

  const config = client.getConfig();
  const apiService = new APIService(
    {
      apiKey: config.fystackApiKey,
      apiSecret: config.fystackApiSecret,
    },
    client['environment']
  );

  const isValid = await apiService.Webhook.verifyEvent(event, signature);

  return JSON.stringify({
    is_valid: isValid,
    event_type: event.event,
    resource_id: event.resource_id,
    message: isValid ? 'Webhook signature is valid' : 'Webhook signature is invalid',
  });
};
