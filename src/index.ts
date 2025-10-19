import { loadConfig } from './configs/index.js';
import { FystackMpcClient } from './fystack/client.js';
import { FystackMcpServer } from './mcp/server.js';

async function main(): Promise<void> {
  try {
    console.error('🚀 Starting Fystack MPC MCP Server...');

    // Load configuration
    const config = loadConfig();
    console.error('✅ Configuration loaded');

    // Create and connect MPC client
    const mpcClient = new FystackMpcClient(config);
    await mpcClient.connect();
    console.error('✅ MPC client connected');

    // Create and start MCP server
    const mcpServer = new FystackMcpServer(mpcClient);
    await mcpServer.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('\n🛑 Shutting down gracefully...');
      await mcpServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('\n🛑 Shutting down gracefully...');
      await mcpServer.stop();
      process.exit(0);
    });

    console.error('✅ Server is ready!');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();