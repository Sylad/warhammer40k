// L23 — lien permanent `/nouveautes#<slug>` d'une entrée (repris d'AetherWX / claude-code-codex L13).
import { describe, expect, it } from 'vitest';
import { entryForFragment, permalink } from './news-anchor';

const entries = [{ slug: '2026-10-01-une-page-nouveautes' }, { slug: 'é-accent' }];

describe('lien permanent des Nouveautés (news-anchor) — L23', () => {
  it('fragment connu, avec ou sans « # », encodé ou non', () => {
    expect(entryForFragment('2026-10-01-une-page-nouveautes', entries)).toBe('2026-10-01-une-page-nouveautes');
    expect(entryForFragment('#2026-10-01-une-page-nouveautes', entries)).toBe('2026-10-01-une-page-nouveautes');
    expect(entryForFragment('%C3%A9-accent', entries)).toBe('é-accent');
  });

  it('fragment vide, inconnu ou mal encodé : null', () => {
    expect(entryForFragment(null, entries)).toBeNull();
    expect(entryForFragment('', entries)).toBeNull();
    expect(entryForFragment('#', entries)).toBeNull();
    expect(entryForFragment('inconnu', entries)).toBeNull();
    expect(entryForFragment('%E0%A4%A', entries)).toBeNull();
  });

  it('URL absolue à copier : /nouveautes#<slug> encodé', () => {
    expect(permalink('https://warhammer.sladoire.dev', 'a-b')).toBe('https://warhammer.sladoire.dev/nouveautes#a-b');
    expect(permalink('http://localhost:4201', 'é-accent')).toBe('http://localhost:4201/nouveautes#%C3%A9-accent');
  });
});
