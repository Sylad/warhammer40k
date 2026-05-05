/**
 * Test helpers shared by claude.service.spec.ts and series-claude.service.spec.ts.
 *
 * The two services build their own `new Anthropic(...)` in the constructor, so
 * we don't mock the SDK module — we just stub `this.client.messages.create`
 * after construction. The error classes come from `@anthropic-ai/sdk` directly.
 */
import { vi } from 'vitest';
import { AuthenticationError, RateLimitError, APIError } from '@anthropic-ai/sdk';

export interface FakeMessageResponse {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

/** Build a minimal valid messages.create() response. */
export function fakeTextResponse(text: string): FakeMessageResponse {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

/** ConfigService stub that returns a dummy api key for ANY get(). */
export function fakeConfig() {
  return { get: vi.fn().mockReturnValue('test-key') };
}

/** ClaudeUsageService stub — only `recordUsage` is called by the services. */
export function fakeUsage() {
  return { recordUsage: vi.fn() };
}

/**
 * Replace `service.client.messages.create` with a vi.fn().
 * Returns the spy so callers can configure resolved/rejected values.
 *
 * `client` is a private field on the services; we punch through with a
 * double `unknown` cast since this is test-only code.
 */
export function stubMessagesCreate(service: object): ReturnType<typeof vi.fn> {
  const spy = vi.fn();
  const client = (service as unknown as { client: { messages: { create: unknown } } }).client;
  client.messages.create = spy;
  return spy;
}

/* ----- Error class factories (the SDK constructors are not super ergonomic) ----- */

export function makeAuthError(message = 'invalid api key'): AuthenticationError {
  return new AuthenticationError(401, undefined, message, undefined as never);
}

export function makeRateLimitError(message = 'rate limited'): RateLimitError {
  return new RateLimitError(429, undefined, message, undefined as never);
}

/** Generic APIError with a controllable status + message. */
export function makeApiError(status: number | undefined, message: string): APIError {
  return new APIError(status, undefined, message, undefined as never);
}
