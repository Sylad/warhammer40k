import { Global, Module } from '@nestjs/common';
import { DemoController } from './demo.controller.js';
import { DemoModeMiddleware } from './demo-mode.middleware.js';
import { RequestContextService } from './request-context.service.js';

/**
 * Demo-mode plumbing for Warhammer 40K Codex.
 *
 * Pattern: forced demo mode based on Host header (Cloudflare quick tunnel,
 * public showcase domain, …). When forced=true:
 *   - PinGuard is bypassed (DEMO_FORCED_HOSTS is checked there too).
 *   - Write endpoints throw 403 (see DemoWriteGuard).
 *   - Frontend shows a "Mode démo verrouillée" badge.
 *
 * Activation: set DEMO_FORCED_HOSTS="trycloudflare.com,demo.example.com" in
 * the backend env, restart, then expose via `cloudflared tunnel --url
 * http://localhost:4201`.
 */
@Global()
@Module({
  controllers: [DemoController],
  providers: [RequestContextService, DemoModeMiddleware],
  exports: [RequestContextService, DemoModeMiddleware],
})
export class DemoModule {}
