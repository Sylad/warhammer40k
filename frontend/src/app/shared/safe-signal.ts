import { HttpErrorResponse } from '@angular/common/http';
import { Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, catchError, map, of, startWith, switchMap } from 'rxjs';

/** Une 404 : l'entité n'existe pas, réessayer ne peut pas aboutir (≠ 500 ou backend absent). */
export function isNotFound(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 404;
}

/**
 * Signal de données qui ne lève jamais : `failed()` dit si le flux a échoué, `notFound()` si c'est
 * une 404 (sous-ensemble de `failed()`), `retry()` le relance.
 */
export type SafeSignal<T> = Signal<T> & { readonly failed: Signal<boolean>; readonly notFound: Signal<boolean>; retry(): void };

/**
 * L38 — `toSignal` relance l'erreur du flux à chaque lecture du signal : sur une 404/500 ou un
 * backend absent, la première lecture pendant la détection de changements lève et fige tout le rendu
 * (menu « À propos », recherche Ctrl+K). Ici l'échec est absorbé : le signal garde `initialValue`,
 * `failed()` passe à vrai et la page affiche son état d'erreur avec « Réessayer » (`retry()`).
 * À appeler dans un contexte d'injection, comme `toSignal`.
 */
export function toSafeSignal<T, I = T>(source$: Observable<T>, initialValue: I): SafeSignal<T | I>;
/**
 * Variante pour les fiches : `trigger$` (paramètres de route) est écouté en permanence, l'échec de
 * `project` est absorbé DANS le `switchMap` — sinon l'erreur terminerait l'abonnement aux paramètres
 * et l'état d'erreur resterait affiché après une navigation vers une autre fiche du même type.
 */
export function toSafeSignal<P, T, I = T>(trigger$: Observable<P>, project: (p: P) => Observable<T>, initialValue: I): SafeSignal<T | I>;
export function toSafeSignal<P, T, I>(source$: Observable<P>, a: ((p: P) => Observable<T>) | I, b?: I): SafeSignal<T | I> {
  const initialValue = (typeof a === 'function' && arguments.length > 2 ? b : a) as I;
  const project = (typeof a === 'function' && arguments.length > 2 ? a : null) as ((p: P) => Observable<T>) | null;
  const failed = signal(false);
  const notFound = signal(false);
  const attempt$ = new BehaviorSubject<void>(undefined);
  const guarded$: Observable<T | I> = project
    ? source$.pipe(switchMap(p => {
        failed.set(false); notFound.set(false);
        return project(p).pipe(
          map((v): T | I => { failed.set(false); notFound.set(false); return v; }),
          catchError((err) => { failed.set(true); notFound.set(isNotFound(err)); return of(initialValue as T | I); }),
          startWith(initialValue as T | I),
        );
      }))
    : (source$ as unknown as Observable<T>).pipe(
        map((v): T | I => { failed.set(false); notFound.set(false); return v; }),
        catchError((err) => { failed.set(true); notFound.set(isNotFound(err)); return of(initialValue as T | I); }),
        startWith(initialValue as T | I),
      );
  const value = toSignal(
    attempt$.pipe(switchMap(() => guarded$)),
    { initialValue: initialValue as T | I },
  );
  return Object.assign(() => value(), {
    failed: failed.asReadonly(),
    notFound: notFound.asReadonly(),
    retry: () => { failed.set(false); notFound.set(false); attempt$.next(); },
  }) as SafeSignal<T | I>;
}

/** L38 — « Réessayer » d'une page à plusieurs flux : relance chacun d'eux, pas seulement le principal. */
export function retryAll(...signals: readonly { retry(): void }[]): void {
  for (const s of signals) s.retry();
}
