import { describe, it, expect } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { isForcedDemoRequest } from './forced-demo.js';
import { DemoModeMiddleware } from './demo-mode.middleware.js';
import { RequestContextService } from './request-context.service.js';
import { PinGuard } from '../../guards/pin.guard.js';
import { DemoWriteGuard } from '../../guards/demo-write.guard.js';

const HOSTS = ['trycloudflare.com', 'warhammer.sladoire.dev'];

const req = (headers: Record<string, string>, url = '/api/units/u1/description') => {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { url, headers: lower, header: (name: string) => lower[name.toLowerCase()] };
};

const config = (values: Record<string, unknown>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('isForcedDemoRequest (L22)', () => {
  it('forces demo when the Host matches a forced pattern', () => {
    expect(isForcedDemoRequest(req({ host: 'warhammer.sladoire.dev' }), HOSTS, false)).toBe(true);
    expect(isForcedDemoRequest(req({ host: 'abc.TRYCLOUDFLARE.com' }), HOSTS, false)).toBe(true);
  });

  it('ignores X-Forwarded-Host: a client cannot leave forced demo by forging it', () => {
    const r = req({ host: 'abc.trycloudflare.com', 'x-forwarded-host': 'example.com' });
    expect(isForcedDemoRequest(r, HOSTS, false)).toBe(true);
  });

  it('ignores X-Forwarded-Host: a client cannot enter forced demo (PIN bypass) by forging it', () => {
    const r = req({ host: 'localhost:3001', 'x-forwarded-host': 'x.trycloudflare.com' });
    expect(isForcedDemoRequest(r, HOSTS, false)).toBe(false);
  });

  it('forces every request when the instance is forced server-side (DEMO_FORCED)', () => {
    expect(isForcedDemoRequest(req({ host: 'warhammer.dark-blue.lan' }), HOSTS, true)).toBe(true);
    expect(isForcedDemoRequest(req({}), [], true)).toBe(true);
  });

  it('is not forced without a Host and without the server-side flag', () => {
    expect(isForcedDemoRequest(req({}), HOSTS, false)).toBe(false);
    expect(isForcedDemoRequest(req({ host: 'x' }), ['', ' '], false)).toBe(false);
  });
});

describe('DemoModeMiddleware — forced detection (L22)', () => {
  const run = (headers: Record<string, string>, values: Record<string, unknown> = {}) => {
    const ctx = new RequestContextService();
    const mw = new DemoModeMiddleware(ctx, config({ demoForcedHosts: HOSTS, ...values }));
    let captured: { demoMode: boolean; forced: boolean } | undefined;
    mw.use(req(headers) as never, {} as never, () => {
      captured = { demoMode: ctx.isDemoMode(), forced: ctx.isForced() };
    });
    return captured!;
  };

  it('stays forced when a tunnel visitor forges X-Forwarded-Host', () => {
    expect(run({ host: 'abc.trycloudflare.com', 'x-forwarded-host': 'example.com' }))
      .toEqual({ demoMode: true, forced: true });
  });

  it('is not forced by a forged X-Forwarded-Host alone', () => {
    expect(run({ host: 'warhammer.dark-blue.lan', 'x-forwarded-host': 'x.trycloudflare.com' }))
      .toEqual({ demoMode: false, forced: false });
  });

  it('honours the server-side DEMO_FORCED flag, whatever the headers', () => {
    expect(run({ host: 'warhammer.dark-blue.lan', 'x-forwarded-host': 'example.com' }, { demoForcedAll: true }))
      .toEqual({ demoMode: true, forced: true });
  });
});

describe('PinGuard — forced demo bypass (L22)', () => {
  const ctx = (r: unknown): ExecutionContext =>
    ({ switchToHttp: () => ({ getRequest: () => r }) }) as unknown as ExecutionContext;
  const guard = (values: Record<string, unknown> = {}) =>
    new PinGuard(config({ appPin: '1234', demoForcedHosts: HOSTS, ...values }));

  it('does not bypass the PIN on a forged X-Forwarded-Host', () => {
    const r = req({ host: 'warhammer.dark-blue.lan', 'x-forwarded-host': 'x.trycloudflare.com' });
    expect(() => guard().canActivate(ctx(r))).toThrow(UnauthorizedException);
  });

  it('bypasses the PIN when the Host is a forced demo host', () => {
    expect(guard().canActivate(ctx(req({ host: 'abc.trycloudflare.com' })))).toBe(true);
  });

  it('bypasses the PIN when the instance is forced server-side', () => {
    expect(guard({ demoForcedAll: true }).canActivate(ctx(req({ host: 'warhammer.dark-blue.lan' })))).toBe(true);
  });

  it('still accepts the right PIN on a regular host', () => {
    const r = req({ host: 'warhammer.dark-blue.lan', authorization: 'Bearer 1234' });
    expect(guard().canActivate(ctx(r))).toBe(true);
  });
});

describe('DemoWriteGuard — forced demo stays read-only whatever the headers (L22)', () => {
  it('rejects writes on a forced host even with a forged X-Forwarded-Host', () => {
    const rc = new RequestContextService();
    const mw = new DemoModeMiddleware(rc, config({ demoForcedHosts: HOSTS }));
    const writeGuard = new DemoWriteGuard(rc);
    let thrown: unknown;
    mw.use(req({ host: 'abc.trycloudflare.com', 'x-forwarded-host': 'example.com' }) as never, {} as never, () => {
      try { writeGuard.canActivate({} as ExecutionContext); } catch (e) { thrown = e; }
    });
    expect(thrown).toBeInstanceOf(ForbiddenException);
  });
});
