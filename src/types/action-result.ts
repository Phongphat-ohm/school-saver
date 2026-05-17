export type ActionResult<T = unknown> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      message: string;
      errors?: Record<string, string[]>;
      retryAfterSeconds?: number;
    };
