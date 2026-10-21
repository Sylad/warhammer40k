/**
 * L160 — activation d'un lien de la barre d'ancres d'une fiche : défile jusqu'à la section, lui donne le
 * focus (tabindex=-1, sans défilement propre : celui de scrollIntoView) et écrit #id dans l'adresse
 * (replaceState : pas d'entrée d'historique par lien, le routeur n'est pas relancé).
 * Section absente : rien ne bouge (le clic natif est tout de même annulé, `<base href="/">` mènerait à l'accueil).
 */
export function goToSection(ev: Event, id: string): void {
  ev.preventDefault();
  revealSection(id);
}

/** Même effet sans événement (frise : la section n'existe qu'après le rendu des filtres remis à zéro). */
export function revealSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduit = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(history.state, '', `${location.pathname}${location.search}#${encodeURIComponent(id)}`);
}
