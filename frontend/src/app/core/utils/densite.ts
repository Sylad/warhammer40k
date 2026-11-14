import { DestroyRef, inject, signal, type Signal } from '@angular/core';

/**
 * L40 — règles communes de densité (docs/densite/regles.md), côté application.
 *
 * Seuil téléphone : moins de 600 px (classe « compacte » de Material 3, skill interface-utilisable).
 * Une liste montre au plus 12 éléments au bureau et 6 au téléphone avant « Afficher plus » (D4).
 */
export const TELEPHONE_MAX_PX = 599.98;
export const LISTE_MAX = { bureau: 12, telephone: 6 } as const;

/**
 * Vrai sous 600 px de large, suit le redimensionnement (à appeler dans un contexte d'injection).
 * Sans `matchMedia` (jsdom), on est au bureau.
 */
export function estTelephone(): Signal<boolean> {
  const mq = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(`(max-width: ${TELEPHONE_MAX_PX}px)`)
    : null;
  const s = signal(mq?.matches ?? false);
  if (mq) {
    const suivre = (e: MediaQueryListEvent) => s.set(e.matches);
    mq.addEventListener('change', suivre);
    inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', suivre));
  }
  return s.asReadonly();
}
