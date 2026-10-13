// L97 — état « fiche introuvable » : un h1, le message, un lien vers la liste (pas de Réessayer).
import { setupTestBed } from '../../../../testing/angular-testbed';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoadErrorComponent } from './load-error.component';

async function monter(inputs: Record<string, unknown>) {
  await setupTestBed([LoadErrorComponent], [provideRouter([])]);
  const f = TestBed.createComponent(LoadErrorComponent);
  for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('LoadErrorComponent — introuvable (L97)', () => {
  it('notFound : h1 par défaut, message, lien de retour, pas de Réessayer', async () => {
    const el = await monter({ notFound: true, backLink: '/factions', backLabel: 'Toutes les factions' });
    expect(el.querySelector('h1')!.textContent!.trim()).toBe('Fiche introuvable');
    expect(el.textContent).toContain('Cette fiche est introuvable.');
    const a = el.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/factions');
    expect(a.textContent!.trim()).toBe('Toutes les factions');
    expect(el.querySelector('button')).toBeNull();
  });

  it('notFound : titre propre à la page', async () => {
    const el = await monter({ notFound: true, heading: 'Faction introuvable' });
    expect(el.querySelector('h1')!.textContent!.trim()).toBe('Faction introuvable');
    expect(el.querySelector('a')).toBeNull();
  });

  it('erreur réseau sans titre : pas de h1 (la page garde le sien), Réessayer présent', async () => {
    const el = await monter({});
    expect(el.querySelector('h1')).toBeNull();
    expect(el.querySelector('button')).not.toBeNull();
  });

  it('erreur réseau avec titre : h1 fourni', async () => {
    const el = await monter({ heading: 'Sous-faction indisponible' });
    expect(el.querySelector('h1')!.textContent!.trim()).toBe('Sous-faction indisponible');
  });
});
