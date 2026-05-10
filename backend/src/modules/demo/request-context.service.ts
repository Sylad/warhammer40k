import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  demoMode: boolean;
  forced: boolean;
}

/**
 * Per-request demo-mode context, carried via AsyncLocalStorage so any service
 * deep in the call stack can check whether the current HTTP request is being
 * served in forced-demo mode (Cloudflare tunnel, public showcase, …).
 *
 * Le codex Warhammer est read-only par nature (pas de données utilisateur
 * sensibles à isoler) — le contexte sert uniquement à court-circuiter les
 * endpoints d'écriture (descriptions Claude payantes, imports image, méta)
 * et à informer le frontend pour afficher le badge "Mode démo verrouillée".
 */
@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<RequestContext>();

  runWith<T>(ctx: RequestContext, fn: () => T): T {
    return this.als.run(ctx, fn);
  }

  isDemoMode(): boolean {
    return this.als.getStore()?.demoMode ?? false;
  }

  isForced(): boolean {
    return this.als.getStore()?.forced ?? false;
  }
}
