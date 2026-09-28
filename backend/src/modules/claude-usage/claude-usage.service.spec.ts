import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RequestContextService } from '../demo/request-context.service.js';
import type { EventBusService } from '../events/event-bus.service.js';

/**
 * L22 : en mode démo (tunnel forcé, DEMO_FORCED ou X-Demo-Mode), le solde
 * Claude RÉEL (claude-shared.json, partagé entre les 3 apps) et les vrais
 * compteurs du mois ne doivent jamais être lus ni écrits — même correctif que
 * finance-tracker L1.
 */
describe('ClaudeUsageService — isolation démo (L22)', () => {
  let tmp: string;
  let sharedFile: string;
  let svc: any;
  let ctx: RequestContextService;
  const REAL_SHARED = { balanceUsd: 42, balanceSetAt: '2026-09-01T00:00:00Z', totalConsumedUsdAtConfig: 1, totalConsumedUsd: 3 };

  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-claude-usage-'));
    sharedFile = path.join(tmp, 'claude-shared.json');
    fs.writeFileSync(sharedFile, JSON.stringify(REAL_SHARED));
    vi.stubEnv('SHARED_DATA_DIR', tmp);
    vi.resetModules();
    const { ClaudeUsageService } = await import('./claude-usage.service.js');
    ctx = new RequestContextService();
    const bus = { emit: vi.fn() } as unknown as EventBusService;
    svc = new ClaudeUsageService(bus, ctx);
    // Compteurs réels du mois en mémoire ; on n'écrit jamais dans ./data du dépôt.
    const d = new Date();
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    svc.data = { [month]: { inputTokens: 1000, outputTokens: 500, calls: 7 } };
    svc.filePath = path.join(tmp, 'claude-usage.json');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const inDemo = <T>(fn: () => T) => ctx.runWith({ demoMode: true, forced: true }, fn);
  const inReal = <T>(fn: () => T) => ctx.runWith({ demoMode: false, forced: false }, fn);

  it('hors démo : expose le vrai solde et les vrais compteurs (inchangé)', () => {
    const u = inReal(() => svc.getUsage());
    expect(u.hasBalance).toBe(true);
    expect(u.calls).toBe(7);
  });

  it('en démo : ni solde réel ni compteurs réels', () => {
    const u = inDemo(() => svc.getUsage());
    expect(u.hasBalance).toBe(false);
    expect(u.configuredBalanceEur).toBeNull();
    expect(u.estimatedRemainingEur).toBeNull();
    expect(u.calls).toBe(0);
    expect(u.inputTokens).toBe(0);
    expect(u.estimatedCostEur).toBe(0);
  });

  it("en démo : setBalance et recordUsage ne touchent pas aux vrais fichiers", () => {
    inDemo(() => {
      svc.setBalance(999);
      svc.recordUsage(10_000, 10_000);
    });
    expect(JSON.parse(fs.readFileSync(sharedFile, 'utf-8'))).toEqual(REAL_SHARED);
    expect(fs.existsSync(path.join(tmp, 'claude-usage.json'))).toBe(false);
    expect(inReal(() => svc.getUsage()).calls).toBe(7);
  });
});
