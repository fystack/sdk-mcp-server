export class NLPService {
  extractWalletName(message: string): string | undefined {
    const nameMatch =
      message.match(/name[d]?\s+["']([^"']+)["']/i) || message.match(/called\s+["']([^"']+)["']/i);
    return nameMatch ? nameMatch[1] : undefined;
  }

  extractWalletPurpose(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('gastank') || lowerMessage.includes('gas tank')) {
      return 'gas_tank';
    } else if (lowerMessage.includes('payment')) {
      return 'payment';
    } else if (lowerMessage.includes('custody')) {
      return 'custody';
    } else if (lowerMessage.includes('deployment')) {
      return 'deployment';
    } else if (lowerMessage.includes('general')) {
      return 'general';
    }
    return 'user';
  }

  extractAddressType(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('solana') || lowerMessage.includes('sol')) {
      return 'solana';
    } else if (lowerMessage.includes('tron')) {
      return 'tron';
    }
    return 'evm';
  }

  extractTxHash(message: string): string | null {
    const txHashMatch =
      message.match(/tx[_\s]hash[:\s]+([a-zA-Z0-9]+)/i) ||
      message.match(/hash[:\s]+([a-zA-Z0-9]+)/i) ||
      message.match(/0x[a-fA-F0-9]{64}/);
    return txHashMatch ? txHashMatch[1] || txHashMatch[0] : null;
  }

  extractNetworkId(message: string): string | null {
    const networkIdMatch =
      message.match(/network[_\s]id[:\s]+([a-zA-Z0-9-]+)/i) ||
      message.match(/on\s+(ethereum|solana|tron|polygon|bsc)/i);
    return networkIdMatch ? networkIdMatch[1].toLowerCase() : null;
  }
}
