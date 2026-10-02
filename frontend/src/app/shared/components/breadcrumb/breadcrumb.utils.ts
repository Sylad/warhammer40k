/**
 * L39 — fil d'Ariane, en fonctions pures. Un préfixe d'adresse n'est un LIEN que s'il est une page
 * de l'application : « /units » et « /subfactions » n'en sont pas (le routeur renverrait vers
 * /factions), ils s'affichent en texte.
 */
export interface Crumb {
  label: string;
  link: string | null;
}

const STATIC_LABELS: Record<string, string> = {
  '': 'Accueil',
  factions: 'Factions',
  subfactions: 'Sous-Factions',
  units: 'Unités',
  romans: 'Romans',
  videos: 'Vidéos',
  gallery: 'Galerie',
  galerie: 'Galerie',
  about: 'À propos',
  nouveautes: 'Nouveautés',
  plan: 'Plan de travail',
  lore: 'Lore',
  emperor: 'L\'Empereur',
  primarchs: 'Les Primarques',
  'chaos-gods': 'Panthéon Chaos',
  civilians: 'Civils Impériaux',
  concepts: 'Concepts & Lieux',
  galaxy: 'La Galaxie',
  equipment: 'Armement & Reliques',
  timeline: 'Chronologie',
};

export function slugToLabel(slug: string): string {
  if (STATIC_LABELS[slug] !== undefined) return STATIC_LABELS[slug];
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Prédicat « cette adresse est une page » à partir des chemins de route (sans « / » initial,
 * paramètres « :id » acceptant n'importe quel segment).
 */
export function pagePaths(paths: readonly string[]): (url: string) => boolean {
  const patterns = paths.map(p => p.split('/').filter(Boolean));
  return (url: string) => {
    const segs = url.split(/[?#]/)[0].split('/').filter(Boolean);
    return patterns.some(p => p.length === segs.length && p.every((s, i) => s.startsWith(':') || s === segs[i]));
  };
}

export function crumbsFor(url: string, isPage: (url: string) => boolean): Crumb[] {
  const segments = url.split('?')[0].split('#')[0].split('/').filter(Boolean);
  const out: Crumb[] = [{ label: 'Accueil', link: '/' }];
  let acc = '';
  for (const seg of segments) {
    acc += '/' + seg;
    out.push({ label: slugToLabel(seg), link: isPage(acc) ? acc : null });
  }
  if (out.length > 0) {
    out[out.length - 1] = { ...out[out.length - 1], link: null };
  }
  return out;
}
