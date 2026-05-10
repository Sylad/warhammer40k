import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Garde-PIN pour les endpoints d'écriture du codex.
 * - Si APP_PIN n'est pas défini dans l'environnement → tout passe (mode dev/local).
 * - Sinon, le client doit envoyer un header `Authorization: Bearer <pin>`.
 * - Routes en lecture publique (GET) ne sont pas concernées : ce guard est appliqué
 *   sélectivement sur les controllers/methods d'écriture (POST/PUT/PATCH/DELETE).
 * - Sur un host forcé en mode démo (DEMO_FORCED_HOSTS) le guard est bypassé :
 *   le visiteur est de toute façon verrouillé en lecture-only par DemoWriteGuard,
 *   et exiger un PIN l'empêcherait juste d'utiliser la démo publique.
 */
@Injectable()
export class PinGuard implements CanActivate {
  private readonly pin: string;
  private readonly forcedHosts: string[];

  constructor(config: ConfigService) {
    this.pin = config.get<string>('appPin') ?? '';
    this.forcedHosts = config.get<string[]>('demoForcedHosts') ?? [];
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();

    // Le flux SSE ne peut pas porter le header Authorization (EventSource standard
    // n'a pas d'API pour les headers custom). Bypass pour préserver le push live.
    if (req.url.startsWith('/api/events')) return true;

    // Bypass entirely on forced-demo hosts (Cloudflare quick tunnels, etc.).
    const hostHeader = (
      (req.headers['x-forwarded-host'] as string | undefined) ??
      (req.headers.host as string | undefined) ??
      ''
    ).toLowerCase();
    if (this.forcedHosts.some((p) => p && hostHeader.includes(p.toLowerCase()))) {
      return true;
    }

    if (!this.pin) return true;

    const auth = req.headers['authorization'] ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    if (token === this.pin) return true;
    throw new UnauthorizedException('PIN invalide');
  }
}
