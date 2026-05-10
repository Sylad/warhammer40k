import { describe, it, expect } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PinGuard } from './pin.guard.js';

function makeCtx(req: { url?: string; headers?: Record<string, string> }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        url: req.url ?? '/api/units/u1/description',
        headers: req.headers ?? {},
      }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

function buildGuard(opts: { pin?: string; forcedHosts?: string[] } = {}): PinGuard {
  const config = {
    get: (key: string) => {
      if (key === 'appPin') return opts.pin ?? '';
      if (key === 'demoForcedHosts') return opts.forcedHosts ?? [];
      return undefined;
    },
  } as unknown as ConfigService;
  return new PinGuard(config);
}

describe('PinGuard', () => {
  it('always lets /api/events through (SSE cannot send Authorization)', () => {
    const guard = buildGuard({ pin: '1234' });
    const ctx = makeCtx({ url: '/api/events' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('passes when no PIN is configured (dev/permissive mode)', () => {
    const guard = buildGuard({ pin: '' });
    expect(guard.canActivate(makeCtx({}))).toBe(true);
  });

  it('rejects when PIN is set and Authorization header is missing', () => {
    const guard = buildGuard({ pin: '1234' });
    expect(() => guard.canActivate(makeCtx({}))).toThrow(UnauthorizedException);
  });

  it('accepts a matching Bearer token', () => {
    const guard = buildGuard({ pin: '1234' });
    const ctx = makeCtx({ headers: { authorization: 'Bearer 1234' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects an incorrect Bearer token', () => {
    const guard = buildGuard({ pin: '1234' });
    const ctx = makeCtx({ headers: { authorization: 'Bearer 9999' } });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('bypasses on a forced-demo host even without PIN', () => {
    const guard = buildGuard({ pin: '1234', forcedHosts: ['trycloudflare.com'] });
    const ctx = makeCtx({ headers: { host: 'random-1234.trycloudflare.com' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bypasses on a forced-demo X-Forwarded-Host even without PIN', () => {
    const guard = buildGuard({ pin: '1234', forcedHosts: ['demo.example.com'] });
    const ctx = makeCtx({
      headers: { host: 'localhost:3001', 'x-forwarded-host': 'demo.example.com' },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('still rejects regular hosts when PIN is required', () => {
    const guard = buildGuard({ pin: '1234', forcedHosts: ['trycloudflare.com'] });
    const ctx = makeCtx({ headers: { host: 'nas:4201' } });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
