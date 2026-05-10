import { describe, it, expect, beforeEach } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { DemoModeMiddleware } from './demo-mode.middleware.js';
import { RequestContextService } from './request-context.service.js';

type ReqLike = { header: (name: string) => string | undefined };

function makeReq(headers: Record<string, string>): ReqLike {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return { header: (name: string) => lower[name.toLowerCase()] };
}

describe('DemoModeMiddleware', () => {
  let ctx: RequestContextService;
  let middleware: DemoModeMiddleware;

  function build(forcedHosts: string[]): void {
    const config = {
      get: (key: string) => (key === 'demoForcedHosts' ? forcedHosts : undefined),
    } as unknown as ConfigService;
    ctx = new RequestContextService();
    middleware = new DemoModeMiddleware(ctx, config);
  }

  beforeEach(() => build(['trycloudflare.com']));

  it('does not force demo when host does not match', () => {
    const req = makeReq({ host: 'nas:4201' });
    let captured: { demoMode: boolean; forced: boolean } | null = null;
    middleware.use(req as never, {} as never, () => {
      captured = { demoMode: ctx.isDemoMode(), forced: ctx.isForced() };
    });
    expect(captured).toEqual({ demoMode: false, forced: false });
  });

  it('forces demo when Host header matches a configured substring', () => {
    const req = makeReq({ host: 'random-name-1234.trycloudflare.com' });
    let captured: { demoMode: boolean; forced: boolean } | null = null;
    middleware.use(req as never, {} as never, () => {
      captured = { demoMode: ctx.isDemoMode(), forced: ctx.isForced() };
    });
    expect(captured).toEqual({ demoMode: true, forced: true });
  });

  it('forces demo when X-Forwarded-Host matches (reverse proxy)', () => {
    build(['demo.example.com']);
    const req = makeReq({
      host: 'localhost:3001',
      'x-forwarded-host': 'demo.example.com',
    });
    let captured: { demoMode: boolean; forced: boolean } | null = null;
    middleware.use(req as never, {} as never, () => {
      captured = { demoMode: ctx.isDemoMode(), forced: ctx.isForced() };
    });
    expect(captured).toEqual({ demoMode: true, forced: true });
  });

  it('matches case-insensitively', () => {
    build(['TryCloudflare.com']);
    const req = makeReq({ host: 'FOO.TRYCLOUDFLARE.COM' });
    let captured: { demoMode: boolean; forced: boolean } = { demoMode: false, forced: false };
    middleware.use(req as never, {} as never, () => {
      captured = { demoMode: ctx.isDemoMode(), forced: ctx.isForced() };
    });
    expect(captured.forced).toBe(true);
  });

  it('honors X-Demo-Mode opt-in (demoMode true, forced false)', () => {
    build([]);
    const req = makeReq({ host: 'localhost', 'x-demo-mode': 'true' });
    let captured: { demoMode: boolean; forced: boolean } | null = null;
    middleware.use(req as never, {} as never, () => {
      captured = { demoMode: ctx.isDemoMode(), forced: ctx.isForced() };
    });
    expect(captured).toEqual({ demoMode: true, forced: false });
  });

  it('skips empty patterns in DEMO_FORCED_HOSTS', () => {
    build(['', 'trycloudflare.com']);
    const req = makeReq({ host: '' });
    let captured: { demoMode: boolean; forced: boolean } = { demoMode: true, forced: true };
    middleware.use(req as never, {} as never, () => {
      captured = { demoMode: ctx.isDemoMode(), forced: ctx.isForced() };
    });
    // Empty pattern would match any host if not filtered → must NOT force demo here.
    expect(captured.forced).toBe(false);
  });

  it('also matches cfargotunnel.com out of the box', () => {
    build(['trycloudflare.com', 'cfargotunnel.com']);
    const req = makeReq({ host: 'tenant-12345.cfargotunnel.com' });
    let captured: { demoMode: boolean; forced: boolean } | null = null;
    middleware.use(req as never, {} as never, () => {
      captured = { demoMode: ctx.isDemoMode(), forced: ctx.isForced() };
    });
    expect(captured).toEqual({ demoMode: true, forced: true });
  });
});
