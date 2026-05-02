import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Garde-PIN pour les endpoints d'écriture du codex.
 * - Si APP_PIN n'est pas défini dans l'environnement → tout passe (mode dev/local).
 * - Sinon, le client doit envoyer un header `Authorization: Bearer <pin>`.
 * - Routes en lecture publique (GET) ne sont pas concernées : ce guard est appliqué
 *   sélectivement sur les controllers/methods d'écriture (POST/PUT/PATCH/DELETE).
 */
@Injectable()
export class PinGuard implements CanActivate {
  private readonly pin: string;

  constructor() {
    this.pin = process.env['APP_PIN'] ?? '';
  }

  canActivate(ctx: ExecutionContext): boolean {
    if (!this.pin) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'] ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    if (token === this.pin) return true;
    throw new UnauthorizedException('PIN invalide');
  }
}
