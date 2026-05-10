/**
 * Pure helpers extracted from `lore-galaxy.component.ts` to enable unit testing
 * without bootstrapping Angular / Leaflet.
 *
 * The component delegates to these helpers, keeping a single source of truth
 * for popup HTML, CTA routing, marker filtering, arc sampling, and polygon
 * clipping. See `lore-galaxy.utils.spec.ts` for the corresponding Vitest specs.
 */

export type HotZoneType = 'world' | 'rift' | 'nexus';
export type HotZoneCategory =
  | 'primarch-homeworld'
  | 'segmentum-hq'
  | 'shrine-world'
  | 'forge-world'
  | 'death-world'
  | 'fortress-world'
  | 'eldar-craftworld'
  | 'war-zone'
  | 'standard';

export type HotZoneLink = { type: 'primarch' | 'timeline' | 'saint' | 'ship'; id: string };

export interface HotZoneLite {
  id: string;
  name: string;
  type: HotZoneType;
  cx: number;
  cy: number;
  r: number;
  color: string;
  description: string;
  conceptId?: string;
  category?: HotZoneCategory;
  linkTo?: HotZoneLink;
}

/** Returns the Angular Router path matching a typed lore link. */
export function linkToPath(link: HotZoneLink): string {
  switch (link.type) {
    case 'primarch': return `/lore/primarchs/${link.id}`;
    case 'timeline': return `/lore/timeline/${link.id}`;
    case 'saint':    return `/lore/saints/${link.id}`;
    case 'ship':     return `/lore/ships/${link.id}`;
  }
}

/** href du CTA dans le popup d'un hot zone : linkTo > conceptId fragment > fallback. */
export function popupCtaUrl(hz: Pick<HotZoneLite, 'linkTo' | 'conceptId'>): string {
  if (hz.linkTo) return linkToPath(hz.linkTo);
  if (hz.conceptId) return `/lore/concepts#${hz.conceptId}`;
  return '/lore/concepts';
}

/** Label FR du bouton CTA dans le popup. */
export function popupCtaLabel(hz: Pick<HotZoneLite, 'linkTo'>): string {
  if (!hz.linkTo) return 'Explorer le lore →';
  switch (hz.linkTo.type) {
    case 'primarch': return 'Voir le primarque →';
    case 'timeline': return 'Voir l\'événement →';
    case 'saint':    return 'Voir la sainte →';
    case 'ship':     return 'Voir le vaisseau →';
  }
}

/** Label FR du type de zone (Mondes / Failles / Nexus). */
export function typeLabel(t: HotZoneType): string {
  return t === 'rift' ? 'Faille warp' : t === 'nexus' ? 'Nexus xenos' : 'Monde-clé';
}

/** Label FR de la sous-catégorie d'une zone (vide si standard). */
export function categoryLabel(c: HotZoneCategory): string {
  const labels: Record<HotZoneCategory, string> = {
    'primarch-homeworld': 'Monde natal primarque',
    'segmentum-hq': 'Capitale Segmentum',
    'shrine-world': 'Monde-sanctuaire',
    'forge-world': 'Forge World',
    'death-world': 'Death World',
    'fortress-world': 'Monde-forteresse',
    'eldar-craftworld': 'Vaisseau-monde Eldar',
    'war-zone': 'Zone de guerre',
    'standard': '',
  };
  return labels[c] || '';
}

/** Identifie le type d'attribut data-link-type embarqué dans un CTA HTML. */
export function popupLinkType(hz: Pick<HotZoneLite, 'linkTo' | 'conceptId'>): string {
  return hz.linkTo?.type ?? (hz.conceptId ? 'concept' : 'concept-fallback');
}

/** Identifie l'id qui accompagne le linkType dans un data-link-id. */
export function popupLinkId(hz: Pick<HotZoneLite, 'linkTo' | 'conceptId'>): string {
  return hz.linkTo?.id ?? hz.conceptId ?? '';
}

/**
 * Construit le HTML du popup Leaflet d'un hot zone. Pure (zéro dépendance DOM).
 * Garantit l'échappement minimum des guillemets dans le data-name pour éviter
 * les ruptures d'attribut sur les noms type "Magnus 'le Rouge'".
 */
export function buildPopupHtml(hz: HotZoneLite): string {
  const ctaUrl = popupCtaUrl(hz);
  const ctaLabel = popupCtaLabel(hz);
  const linkType = popupLinkType(hz);
  const linkId = popupLinkId(hz);
  const cta = `<a class="lf-popup-cta" href="${ctaUrl}" data-link-type="${linkType}" data-link-id="${linkId}">${ctaLabel}</a>`;
  const subtypeLabel = hz.category ? ` · ${categoryLabel(hz.category)}` : '';
  const safeName = hz.name.replace(/"/g, '&quot;');
  return `
        <div class="lf-popup">
          <div class="lf-popup-img" data-name="${safeName}"></div>
          <div class="lf-popup-body">
            <div class="lf-popup-name" style="color:${hz.color}">${hz.name}</div>
            <div class="lf-popup-type">${typeLabel(hz.type)}${subtypeLabel}</div>
            <p>${hz.description}</p>
            ${cta}
          </div>
        </div>`;
}

/** Compte les zones d'un type donné. */
export function countByType<T extends Pick<HotZoneLite, 'type'>>(zones: readonly T[], t: HotZoneType): number {
  return zones.filter(z => z.type === t).length;
}

/** Trouve une zone par id, ou null. */
export function findZoneById<T extends Pick<HotZoneLite, 'id'>>(zones: readonly T[], id: string | null): T | null {
  if (!id) return null;
  return zones.find(z => z.id === id) ?? null;
}

/**
 * Échantillonne N+1 points le long d'un arc centré sur (cx, cy). Gère le wrap
 * 360° quand theta2 < theta1 (ex. Ultima 336° → 21°).
 */
export function sampleArc(
  cx: number,
  cy: number,
  theta1Deg: number,
  theta2Deg: number,
  r: number,
  samples: number,
): [number, number][] {
  const t2 = theta2Deg < theta1Deg ? theta2Deg + 360 : theta2Deg;
  const span = t2 - theta1Deg;
  const out: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const t = ((theta1Deg + (span * i) / samples) * Math.PI) / 180;
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return out;
}

/**
 * Sutherland–Hodgman : clip un polygone fermé contre [0,W]×[0,H].
 * Output = polygone fermé (potentiellement vide si fully outside).
 */
export function clipToRect(poly: [number, number][], W: number, H: number): [number, number][] {
  type Edge = 'L' | 'R' | 'T' | 'B';
  const inside = (p: [number, number], e: Edge): boolean =>
    e === 'L' ? p[0] >= 0 :
    e === 'R' ? p[0] <= W :
    e === 'T' ? p[1] >= 0 :
                p[1] <= H;
  const intersect = (a: [number, number], b: [number, number], e: Edge): [number, number] => {
    const [ax, ay] = a, [bx, by] = b;
    if (e === 'L') { const t = (0 - ax) / (bx - ax); return [0, ay + t * (by - ay)]; }
    if (e === 'R') { const t = (W - ax) / (bx - ax); return [W, ay + t * (by - ay)]; }
    if (e === 'T') { const t = (0 - ay) / (by - ay); return [ax + t * (bx - ax), 0]; }
    const t = (H - ay) / (by - ay); return [ax + t * (bx - ax), H];
  };
  const clipEdge = (subj: [number, number][], e: Edge): [number, number][] => {
    if (!subj.length) return subj;
    const out: [number, number][] = [];
    for (let i = 0; i < subj.length; i++) {
      const cur = subj[i];
      const prev = subj[(i - 1 + subj.length) % subj.length];
      const cIn = inside(cur, e);
      const pIn = inside(prev, e);
      if (cIn) {
        if (!pIn) out.push(intersect(prev, cur, e));
        out.push(cur);
      } else if (pIn) {
        out.push(intersect(prev, cur, e));
      }
    }
    return out;
  };
  return clipEdge(clipEdge(clipEdge(clipEdge(poly, 'L'), 'R'), 'T'), 'B');
}
