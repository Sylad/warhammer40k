/**
 * L39 — faux WarhammerService pour les tests de composants : chaque méthode non fournie renvoie
 * un flux vide de valeur neutre, chaque flux `xxx$` non fourni renvoie une liste vide.
 */
import { of } from 'rxjs';

export function fakeWarhammerService(overrides: Record<string, unknown> = {}): unknown {
  return new Proxy(overrides, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop.endsWith('$')) return of([]);
      if (prop === 'getWikiImage') return () => of({ imageUrl: null, pageTitle: null, pageUrl: null });
      return () => of(null);
    },
  });
}
