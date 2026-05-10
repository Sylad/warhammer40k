import { describe, expect, it } from 'vitest';
import {
  buildPopupHtml,
  categoryLabel,
  clipToRect,
  countByType,
  findZoneById,
  type HotZoneLite,
  linkToPath,
  popupCtaLabel,
  popupCtaUrl,
  popupLinkId,
  popupLinkType,
  sampleArc,
  typeLabel,
} from './lore-galaxy.utils';

const baseWorld: HotZoneLite = {
  id: 'macragge',
  name: 'Macragge',
  type: 'world',
  cx: 2484,
  cy: 1922,
  r: 10,
  color: '#1d4ba0',
  description: 'Monde-mère des Ultramarines.',
  conceptId: 'macragge',
  category: 'primarch-homeworld',
  linkTo: { type: 'primarch', id: 'guilliman' },
};

describe('linkToPath', () => {
  it('routes les 4 types vers /lore/<type>s/:id', () => {
    expect(linkToPath({ type: 'primarch', id: 'guilliman' })).toBe('/lore/primarchs/guilliman');
    expect(linkToPath({ type: 'timeline', id: 'fall-of-cadia' })).toBe('/lore/timeline/fall-of-cadia');
    expect(linkToPath({ type: 'saint', id: 'saint-drusus' })).toBe('/lore/saints/saint-drusus');
    expect(linkToPath({ type: 'ship', id: 'phalanx' })).toBe('/lore/ships/phalanx');
  });
});

describe('popupCtaUrl — priorité linkTo > conceptId > fallback', () => {
  it('utilise linkTo en priorité quand présent', () => {
    expect(popupCtaUrl(baseWorld)).toBe('/lore/primarchs/guilliman');
  });

  it('tombe sur /lore/concepts#<conceptId> si pas de linkTo', () => {
    expect(popupCtaUrl({ conceptId: 'cadia' })).toBe('/lore/concepts#cadia');
  });

  it('fallback /lore/concepts si rien', () => {
    expect(popupCtaUrl({})).toBe('/lore/concepts');
  });
});

describe('popupCtaLabel', () => {
  it('label par type linkTo', () => {
    expect(popupCtaLabel({ linkTo: { type: 'primarch', id: 'x' } })).toBe('Voir le primarque →');
    expect(popupCtaLabel({ linkTo: { type: 'timeline', id: 'x' } })).toBe('Voir l\'événement →');
    expect(popupCtaLabel({ linkTo: { type: 'saint', id: 'x' } })).toBe('Voir la sainte →');
    expect(popupCtaLabel({ linkTo: { type: 'ship', id: 'x' } })).toBe('Voir le vaisseau →');
  });

  it('fallback "Explorer le lore →" sans linkTo', () => {
    expect(popupCtaLabel({})).toBe('Explorer le lore →');
  });
});

describe('typeLabel', () => {
  it('mappe les 3 types FR', () => {
    expect(typeLabel('world')).toBe('Monde-clé');
    expect(typeLabel('rift')).toBe('Faille warp');
    expect(typeLabel('nexus')).toBe('Nexus xenos');
  });
});

describe('categoryLabel', () => {
  it('mappe toutes les catégories sauf standard', () => {
    expect(categoryLabel('primarch-homeworld')).toBe('Monde natal primarque');
    expect(categoryLabel('forge-world')).toBe('Forge World');
    expect(categoryLabel('eldar-craftworld')).toBe('Vaisseau-monde Eldar');
  });

  it('renvoie une chaîne vide pour standard', () => {
    expect(categoryLabel('standard')).toBe('');
  });
});

describe('popupLinkType / popupLinkId — pour data-attrs du CTA', () => {
  it('linkTo gagne sur conceptId', () => {
    expect(popupLinkType(baseWorld)).toBe('primarch');
    expect(popupLinkId(baseWorld)).toBe('guilliman');
  });

  it('conceptId seul → "concept"', () => {
    expect(popupLinkType({ conceptId: 'cadia' })).toBe('concept');
    expect(popupLinkId({ conceptId: 'cadia' })).toBe('cadia');
  });

  it('rien → "concept-fallback" + id vide', () => {
    expect(popupLinkType({})).toBe('concept-fallback');
    expect(popupLinkId({})).toBe('');
  });
});

describe('buildPopupHtml — popup HTML builder critique', () => {
  it('contient le nom, la description, la couleur et le CTA href', () => {
    const html = buildPopupHtml(baseWorld);
    expect(html).toContain('>Macragge<');
    expect(html).toContain('Monde-mère des Ultramarines.');
    expect(html).toContain('color:#1d4ba0');
    expect(html).toContain('href="/lore/primarchs/guilliman"');
    expect(html).toContain('data-link-type="primarch"');
    expect(html).toContain('data-link-id="guilliman"');
    expect(html).toContain('Voir le primarque →');
  });

  it('inclut le label de catégorie quand présent', () => {
    expect(buildPopupHtml(baseWorld)).toContain('Monde natal primarque');
  });

  it('omet le subtype quand category absent', () => {
    const noCat: HotZoneLite = { ...baseWorld, category: undefined };
    const html = buildPopupHtml(noCat);
    expect(html).not.toContain('Monde natal primarque');
    expect(html).toContain('Monde-clé');
  });

  it('échappe les guillemets dans data-name pour ne pas casser l\'attribut', () => {
    const tricky: HotZoneLite = { ...baseWorld, name: 'Magnus "le Rouge"' };
    const html = buildPopupHtml(tricky);
    expect(html).toContain('data-name="Magnus &quot;le Rouge&quot;"');
  });

  it('rift : type label = "Faille warp"', () => {
    const rift: HotZoneLite = {
      ...baseWorld,
      id: 'eye-of-terror',
      name: 'Œil de la Terreur',
      type: 'rift',
      category: undefined,
      linkTo: undefined,
      conceptId: 'eye-of-terror',
    };
    const html = buildPopupHtml(rift);
    expect(html).toContain('Faille warp');
    expect(html).toContain('href="/lore/concepts#eye-of-terror"');
    expect(html).toContain('data-link-type="concept"');
  });
});

describe('countByType', () => {
  const zones: HotZoneLite[] = [
    { ...baseWorld, id: 'a', type: 'world' },
    { ...baseWorld, id: 'b', type: 'world' },
    { ...baseWorld, id: 'c', type: 'rift' },
    { ...baseWorld, id: 'd', type: 'nexus' },
  ];

  it('compte chaque type indépendamment', () => {
    expect(countByType(zones, 'world')).toBe(2);
    expect(countByType(zones, 'rift')).toBe(1);
    expect(countByType(zones, 'nexus')).toBe(1);
  });

  it('renvoie 0 sur liste vide', () => {
    expect(countByType([], 'world')).toBe(0);
  });
});

describe('findZoneById', () => {
  const zones: HotZoneLite[] = [
    { ...baseWorld, id: 'macragge' },
    { ...baseWorld, id: 'cadia' },
  ];

  it('trouve par id', () => {
    expect(findZoneById(zones, 'cadia')?.id).toBe('cadia');
  });

  it('renvoie null pour id inconnu', () => {
    expect(findZoneById(zones, 'unknown')).toBeNull();
  });

  it('renvoie null pour id null/undefined', () => {
    expect(findZoneById(zones, null)).toBeNull();
  });
});

describe('sampleArc', () => {
  it('produit samples+1 points', () => {
    const pts = sampleArc(0, 0, 0, 90, 100, 8);
    expect(pts).toHaveLength(9);
  });

  it('arc 0° → 90° rayon 100 : début (100,0) fin (0,100) à epsilon près', () => {
    const pts = sampleArc(0, 0, 0, 90, 100, 4);
    expect(pts[0][0]).toBeCloseTo(100, 6);
    expect(pts[0][1]).toBeCloseTo(0, 6);
    expect(pts[pts.length - 1][0]).toBeCloseTo(0, 6);
    expect(pts[pts.length - 1][1]).toBeCloseTo(100, 6);
  });

  it('gère le wrap 360° quand theta2 < theta1 (Ultima 336° → 21°)', () => {
    const pts = sampleArc(0, 0, 336, 21, 100, 4);
    // span doit être 21 - 336 + 360 = 45°
    // dernier point doit être à 21° → cos(21°) ≈ 0.9336, sin ≈ 0.3584
    const last = pts[pts.length - 1];
    expect(last[0]).toBeCloseTo(100 * Math.cos((21 * Math.PI) / 180), 4);
    expect(last[1]).toBeCloseTo(100 * Math.sin((21 * Math.PI) / 180), 4);
  });

  it('respecte le centre (cx,cy) custom', () => {
    // Centre Terra (967, 1255), arc 0° → 90° rayon 50, samples=2 → 3 points
    const pts = sampleArc(967, 1255, 0, 90, 50, 2);
    expect(pts).toHaveLength(3);
    // Premier point à theta=0 : (cx + 50, cy)
    expect(pts[0][0]).toBeCloseTo(1017, 6);
    expect(pts[0][1]).toBeCloseTo(1255, 6);
    // Dernier point à theta=90° : (cx, cy + 50)
    expect(pts[2][0]).toBeCloseTo(967, 6);
    expect(pts[2][1]).toBeCloseTo(1305, 6);
  });
});

describe('clipToRect — Sutherland–Hodgman', () => {
  it('polygone fully inside : inchangé', () => {
    const sq: [number, number][] = [[10, 10], [50, 10], [50, 50], [10, 50]];
    const out = clipToRect(sq, 100, 100);
    expect(out).toHaveLength(4);
    expect(out).toEqual(expect.arrayContaining(sq));
  });

  it('polygone fully outside : empty', () => {
    const sq: [number, number][] = [[200, 200], [300, 200], [300, 300], [200, 300]];
    expect(clipToRect(sq, 100, 100)).toEqual([]);
  });

  it('polygone à cheval sur la bordure droite : clip à W', () => {
    const sq: [number, number][] = [[50, 10], [150, 10], [150, 90], [50, 90]];
    const out = clipToRect(sq, 100, 100);
    // Tous les points doivent être dans [0,100]×[0,100]
    expect(out.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true);
    // Le résultat doit contenir les 2 points internes + 2 points clippés à x=100
    const xs = out.map(p => p[0]);
    expect(xs).toContain(50);
    expect(xs).toContain(100);
  });

  it('triangle qui sort en bas à droite : reste un polygone fermé valide', () => {
    const tri: [number, number][] = [[50, 50], [200, 50], [50, 200]];
    const out = clipToRect(tri, 100, 100);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true);
  });
});
