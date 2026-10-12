// L38 — un flux de données en échec (404/500, backend absent) ne doit jamais lever à la lecture du
// signal : toSignal relance l'erreur à CHAQUE lecture, y compris pendant la détection de changements.
import '../../testing/angular-testbed';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { toSafeSignal } from './safe-signal';

function inCtx<T>(fn: () => T): T {
  return runInInjectionContext(TestBed.inject(Injector), fn);
}

describe('toSafeSignal', () => {
  it('valeur initiale pendant le chargement, puis la valeur reçue', () => {
    const src = new Subject<number[]>();
    const s = inCtx(() => toSafeSignal(src, [] as number[]));
    expect(s()).toEqual([]);
    expect(s.failed()).toBe(false);
    src.next([1, 2]);
    expect(s()).toEqual([1, 2]);
  });

  it('en échec : ne lève pas, garde la valeur initiale et lève failed()', () => {
    const s = inCtx(() => toSafeSignal(throwError(() => new Error('500')), [] as number[]));
    expect(() => s()).not.toThrow();
    expect(() => s()).not.toThrow();
    expect(s()).toEqual([]);
    expect(s.failed()).toBe(true);
  });

  it('retry() : nouvelle tentative après un échec', () => {
    let calls = 0;
    const s = inCtx(() => toSafeSignal(
      new Observable<string>((o) => { calls++; if (calls === 1) o.error(new Error('x')); else { o.next('ok'); o.complete(); } }),
      'init' as string));
    expect(s.failed()).toBe(true);
    s.retry();
    expect(calls).toBe(2);
    expect(s.failed()).toBe(false);
    expect(s()).toBe('ok');
  });

  it('flux synchrone sans valeur initiale explicite : undefined', () => {
    const s = inCtx(() => toSafeSignal(of({ a: 1 }), undefined));
    expect(s()).toEqual({ a: 1 });
  });
});
