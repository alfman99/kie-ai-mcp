export class KieApiError extends Error {
  readonly status?: number;
  readonly code?: number;
  readonly response: unknown;

  constructor(message: string, options: { status?: number; code?: number; response?: unknown } = {}) {
    super(message);
    this.name = "KieApiError";
    this.status = options.status;
    this.code = options.code;
    this.response = options.response;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      response: this.response
    };
  }
}

export function normalizeError(error: unknown): Record<string, unknown> {
  if (error instanceof KieApiError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return {
    name: "UnknownError",
    message: String(error)
  };
}

