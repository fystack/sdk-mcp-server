import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type Tool,
  type TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import type { FystackMpcClient } from '../fystack/client.js';
import {
  toolDefinitions,
  executeCreateMpcWallet,
  executeCreateStandardWallet,
  executeGetWalletAssets,
  executeGetDepositAddress,
  executeRescanTransaction,
  executeNaturalLanguageWalletOperation,
} from './tools.js';

export class FystackMcpServer {
  private server: Server;
  private client: FystackMpcClient;

  constructor(client: FystackMpcClient) {
    this.client = client;
    this.server = new Server(
      {
        name: 'sdk-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getToolsAsArray(),
    }));

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request.params.name, request.params.arguments || {});
    });
  }

  private getToolsAsArray(): Tool[] {
    return toolDefinitions.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Tool['inputSchema'],
    }));
  }

  private async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<{ content: TextContent[] }> {
    try {
      let result: string;

      switch (toolName) {
        case 'wallet_operations':
          result = await executeNaturalLanguageWalletOperation(this.client, args);
          break;

        case 'create_mpc_wallet':
          result = await executeCreateMpcWallet(this.client, args);
          break;

        case 'create_standard_wallet':
          result = await executeCreateStandardWallet(this.client, args);
          break;

        case 'get_wallet_assets':
          result = await executeGetWalletAssets(this.client, args);
          break;

        case 'get_deposit_address':
          result = await executeGetDepositAddress(this.client, args);
          break;

        case 'rescan_transaction':
          result = await executeRescanTransaction(this.client, args);
          break;

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: errorMessage,
              tool: toolName,
            }),
          },
        ],
      };
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('✅ MCP Server started and listening on stdio');
  }

  async stop(): Promise<void> {
    await this.client.disconnect();
  }
}
