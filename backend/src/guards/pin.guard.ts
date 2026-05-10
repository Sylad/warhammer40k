import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

/**
 * Garde-PIN pour les endpoints d'écriture du codex.
 * - Si APP_PIN n'est pas défini dans l'environnement → tout passe (mode dev/local).
 *   Warning loggé. En production (NODE_ENV=production), boot refusé sauf si
 *   ALLOW_NO_PIN=true (opt-in explicite pour éviter le fail-open silencieux).
 * - Sinon, le client doit envoyer un header `Authorization: Bearer <pin>`.
 * - Routes en lecture publique (GET) ne sont pas concernées : ce guard est appliqué
 *   sélectivement sur les controllers/methods d'écriture (POST/PUT/PATCH/DELETE).
 * - Sur un host forcé en mode démo (DEMO_FORCED_HOSTS) le guard est bypassé :
 *   le visiteur est de toute façon verrouillé en lecture-only par DemoWriteGuard,
 *   et exiger un PIN l'empêcherait juste d'utiliser la démo publique.
 */
@Injectable()
export class PinGuard implements CanActivate {
  private readonly logger = new Logger(PinGuard.name);
  private readonly pin: string;
  private readonly forcedHosts: string[];

  constructor(config: ConfigService) {
    this.pin = config.get<string>('appPin') ?? '';
    this.forcedHosts = config.get<string[]>('demoForcedHosts') ?? [];

    if (!this.pin) {
      const allowNoPin = (config.get<string>('allowNoPin') ?? process.env.ALLOW_NO_PIN) === 'true';
      const isProd = (config.get<string>('nodeEnv') ?? process.env.NODE_ENV) === 'production';
      if (isProd && !allowNoPin) {
        throw new Error(
          'APP_PIN is empty in production. Set APP_PIN, or pass ALLOW_NO_PIN=true to opt into the unprotected mode explicitly.',
        );
      }
      this.logger.warn(
        '⚠️  APP_PIN is empty — ALL WRITE ENDPOINTS ARE UNPROTECTED. '
        + 'Set APP_PIN env var to enable PIN guard, or set ALLOW_NO_PIN=true to silence this warning.',
      );
    }
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

    // timingSafeEqual : protection contre attaques timing-based.
    if (token.length !== this.pin.length) {
      throw new UnauthorizedException('PIN invalide');
    }
    const ok = timingSafeEqual(Buffer.from(token), Buffer.from(this.pin));
    if (ok) return true;
    throw new UnauthorizedException('PIN invalide');
  }
}
