import { afterEach, describe, expect, it, vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { setupTestBed } from '../../testing/angular-testbed';
import { SectionAnchorDirective } from './section-anchor.directive';

@Component({
  standalone: true,
  imports: [SectionAnchorDirective],
  template: `<nav><a sectionAnchor="histoire">Histoire</a><a [sectionAnchor]="id">Liée</a></nav><article id="histoire"></article><article id="autre"></article>`,
})
class HostComponent { id = 'autre'; }

afterEach(() => { document.body.innerHTML = ''; history.replaceState(null, '', '/'); });

async function monte(): Promise<HTMLElement> {
  await setupTestBed([HostComponent]);
  const f = TestBed.createComponent(HostComponent);
  f.detectChanges();
  document.body.appendChild(f.nativeElement);
  document.querySelectorAll('article').forEach((a) => { (a as HTMLElement).scrollIntoView = vi.fn(); });
  return f.nativeElement as HTMLElement;
}

describe('directive sectionAnchor (L160)', () => {
  it('href = page courante + #id (un clic du milieu ou « copier l’adresse » mène à la fiche, pas à l’accueil)', async () => {
    history.replaceState(null, '', '/factions/orks?x=1');
    const el = await monte();
    const [a, b] = Array.from(el.querySelectorAll('a'));
    expect(a.getAttribute('href')).toBe('/factions/orks?x=1#histoire');
    expect(b.getAttribute('href')).toBe('/factions/orks?x=1#autre');
  });

  it('clic simple : section atteinte (focus + #id), clic annulé', async () => {
    const el = await monte();
    const ev = new MouseEvent('click', { cancelable: true, bubbles: true });
    el.querySelector('a')!.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('histoire'));
    expect(location.hash).toBe('#histoire');
  });

  it('Ctrl+clic et clic du milieu : non annulés, aucune section atteinte', async () => {
    const el = await monte();
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
      const ev = new MouseEvent('click', { cancelable: true, bubbles: true, ...init });
      el.querySelector('a')!.dispatchEvent(ev);
      expect(ev.defaultPrevented, JSON.stringify(init)).toBe(false);
    }
    expect(location.hash).toBe('');
    expect(document.activeElement).toBe(document.body);
  });
});
