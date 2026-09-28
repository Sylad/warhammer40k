import type { IncomingMessage } from 'http';

/**
 * Le mode démo FORCÉ (lecture seule verrouillée, PIN contourné) est-il actif
 * pour cette requête ?
 *
 * Décision (L22, 2026-09-28, même correctif que finance-tracker L1) : on ne
 * regarde QUE ce que le client ne peut pas choisir.
 *
 * - `X-Forwarded-Host` est IGNORÉ. Ni cloudflared ni le nginx du frontend
 *   (`frontend/nginx.conf`, qui ne pose que Host et X-Real-IP) ne le
 *   réécrivent : la valeur envoyée par le navigateur arrivait telle quelle au
 *   backend. La forger permettait de SORTIR de la démo forcée d'un tunnel
 *   (`X-Forwarded-Host: example.com`) ou d'y ENTRER depuis un hôte normal, ce
 *   qui contournait le PinGuard (les écritures restaient bloquées par
 *   DemoWriteGuard, mais uniquement parce que chaque route le couple au PIN).
 * - `Host` fait foi. Derrière le tunnel, c'est le nom routé par Cloudflare ; le
 *   nginx du frontend le recopie (`proxy_set_header Host $host`). Forger un
 *   Host démo en accès direct ne fait qu'ENTRER en démo : lecture seule.
 * - `forcedAll` (env `DEMO_FORCED=true`) force toute l'instance côté serveur,
 *   sans dépendre d'aucun en-tête. Désactivé par défaut.
 */
export function isForcedDemoRequest(
  req: Pick<IncomingMessage, 'headers'>,
  forcedHosts: string[],
  forcedAll: boolean,
): boolean {
  if (forcedAll) return true;
  const host = String(req.headers?.host ?? '').toLowerCase();
  if (!host) return false;
  return forcedHosts.some((p) => p.trim() !== '' && host.includes(p.trim().toLowerCase()));
}
