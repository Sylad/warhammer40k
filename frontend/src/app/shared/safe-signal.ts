import { Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, catchError, map, of, startWith, switchMap } from 'rxjs';

/** Signal de données qui ne lève jamais : `failed()` dit si le flux a échoué, `retry()` le relance. */
export type SafeSignal<T> = Signal<T> & { readonly failed: Signal<boolean>; retry(): void };

/**
 * L38 — `toSignal` relance l'erreur du flux à chaque lecture du signal : sur une 404/500 ou un
 * backend absent, la première lecture pendant la détection de changements lève et fige tout le rendu
 * (menu « À propos », recherche Ctrl+K). Ici l'échec est absorbé : le signal garde `initialValue`,
 * `failed()` passe à vrai et la page affiche son état d'erreur avec « Réessayer » (`retry()`).
 * À appeler dans un contexte d'injection, comme `toSignal`.
 */
export function toSafeSignal<T, I = T>(source$: Observable<T>, initialValue: I): SafeSignal<T | I> {
  const failed = signal(false);
  const attempt$ = new BehaviorSubject<void>(undefined);
  const value = toSignal(
    attempt$.pipe(
      switchMap(() => source$.pipe(
        map((v): T | I => { failed.set(false); return v; }),
        catchError(() => { failed.set(true); return of(initialValue as T | I); }),
        startWith(initialValue as T | I),
      )),
    ),
    { initialValue: initialValue as T | I },
  );
  return Object.assign(() => value(), {
    failed: failed.asReadonly(),
    retry: () => { failed.set(false); attempt$.next(); },
  }) as SafeSignal<T | I>;
}
