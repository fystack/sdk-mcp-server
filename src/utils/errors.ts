export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class TokenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'TOKEN_ERROR', 400, details);
  }
}

export class ChainError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CHAIN_ERROR', 400, details);
  }
}

export class WalletError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'WALLET_ERROR', 400, details);
  }
}

export class SwapError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'SWAP_ERROR', 400, details);
  }
}

export function formatError(error: unknown): string {
  if (error instanceof AppError) {
    const result: Record<string, unknown> = {
      error: error.message,
      code: error.code,
    };
    if (error.details) {
      result.details = error.details;
    }
    return JSON.stringify(result);
  }

  if (error instanceof Error) {
    return JSON.stringify({
      error: error.message,
      code: 'INTERNAL_ERROR',
    });
  }

  return JSON.stringify({
    error: String(error),
    code: 'UNKNOWN_ERROR',
  });
}

export function handleServiceError<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : String(error),
      'SERVICE_ERROR'
    );
  });
}
