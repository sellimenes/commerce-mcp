export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    cause?: unknown,
  ) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'AdapterError';
  }
}

export class AuthError extends AdapterError {
  constructor(message = 'Authentication failed', cause?: unknown) {
    super(message, 'AUTH_ERROR', cause);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends AdapterError {
  constructor(message = 'Rate limit exceeded', cause?: unknown) {
    super(message, 'RATE_LIMIT', cause);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends AdapterError {
  constructor(message = 'Resource not found', cause?: unknown) {
    super(message, 'NOT_FOUND', cause);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}

export class UpstreamError extends AdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, 'UPSTREAM_ERROR', cause);
    this.name = 'UpstreamError';
  }
}

export function toLLMErrorMessage(err: unknown): string {
  if (err instanceof AdapterError) {
    return `[${err.code}] ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
