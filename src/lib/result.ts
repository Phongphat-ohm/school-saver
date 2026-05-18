import type { ActionResult } from "@/types/action-result";

export function successResult<T>(data: T, message?: string): ActionResult<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResult<T = never>(message: string, errors?: Record<string, string[]>, meta?: { retryAfterSeconds?: number; redirectTo?: string }): ActionResult<T> {
  return {
    success: false,
    message,
    errors,
    ...meta,
  };
}
