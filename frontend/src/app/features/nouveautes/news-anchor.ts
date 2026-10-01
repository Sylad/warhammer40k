/**
 * L23 — lien permanent `/nouveautes#<slug>` d'une entrée des Nouveautés (repris d'AetherWX
 * news-anchor et de claude-code-codex L13). Module pur, testé par Vitest.
 *
 * Les entrées arrivent après le chargement du JSON : le défilement natif vers l'ancre ne
 * peut pas marcher, la page vise donc l'entrée elle-même une fois la liste affichée.
 */

/** Slug visé par un fragment d'URL (avec ou sans « # », encodé ou non) ; null s'il n'existe pas. */
export function entryForFragment(
  fragment: string | null | undefined,
  entries: readonly { slug: string }[],
): string | null {
  const raw = (fragment ?? '').replace(/^#/, '');
  if (!raw) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return entries.some((e) => e.slug === slug) ? slug : null;
}

/** URL absolue d'une entrée, à copier ou partager. */
export function permalink(origin: string, slug: string): string {
  return `${origin}/nouveautes#${encodeURIComponent(slug)}`;
}
