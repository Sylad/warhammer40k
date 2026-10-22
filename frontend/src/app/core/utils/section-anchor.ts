/**
 * L160 — activation d'un lien de la barre d'ancres d'une fiche : défile jusqu'à la section, lui donne le
 * focus (tabindex=-1, sans défilement propre : celui de scrollIntoView) et écrit #id dans l'adresse
 * (replaceState : pas d'entrée d'historique par lien, le routeur n'est pas relancé).
 * Section absente : rien ne bouge (le clic natif est tout de même annulé : sans cela le lien suivrait son href).
 * Un clic modifié (bouton ≠ 0, Ctrl, Méta, Maj, Alt) n'est PAS traité : le navigateur ouvre l'onglet ou la
 * fenêtre de l'href (voir `sectionHref`), comme pour un RouterLink.
 */
export function goToSection(ev: Event, id: string): void {
  if (ev instanceof MouseEvent && (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey)) return;
  ev.preventDefault();
  revealSection(id);
}

/**
 * Adresse d'une section de la page courante : chemin + requête + #id. Jamais « #id » seul : avec
 * `<base href="/">` il se résout en « /#id » (l'accueil) pour un clic du milieu ou « copier l'adresse du lien ».
 */
export function sectionHref(id: string): string {
  return `${location.pathname}${location.search}#${encodeURIComponent(id)}`;
}

/** Même effet sans événement (frise : la section n'existe qu'après le rendu des filtres remis à zéro). */
export function revealSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduit = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(history.state, '', sectionHref(id));
}
