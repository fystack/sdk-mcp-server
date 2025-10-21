import type { FystackMpcClient } from '../fystack/client';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export type ToolExecutor = (client: FystackMpcClient, args: Record<string, unknown>) => Promise<string>;
