// L33 — raccourci de la recherche affiché selon la plateforme : « ⌘K » sur Mac (et iPhone / iPad),
// « Ctrl K » ailleurs (avant : « ⌘K » partout, faux sous Windows et Linux). Sans
// `navigator.platform` (obsolète) : `userAgentData.platform` s'il existe, sinon l'agent utilisateur.
import { describe, expect, it } from 'vitest';
import { isApplePlatform, searchShortcut } from './search-shortcut';

const UA = {
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36',
};

describe('isApplePlatform (L33)', () => {
  it('userAgentData.platform prime sur l’agent utilisateur', () => {
    expect(isApplePlatform({ userAgentData: { platform: 'macOS' }, userAgent: UA.windows })).toBe(true);
    expect(isApplePlatform({ userAgentData: { platform: 'Windows' }, userAgent: UA.mac })).toBe(false);
    expect(isApplePlatform({ userAgentData: { platform: 'Linux' } })).toBe(false);
  });
  it('sans userAgentData (Safari, Firefox) : l’agent utilisateur', () => {
    expect(isApplePlatform({ userAgent: UA.mac })).toBe(true);
    expect(isApplePlatform({ userAgent: UA.iphone })).toBe(true);
    expect(isApplePlatform({ userAgent: UA.windows })).toBe(false);
    expect(isApplePlatform({ userAgent: UA.linux })).toBe(false);
  });
  it('rien de connu : pas Mac (repli « Ctrl K »)', () => {
    expect(isApplePlatform(undefined)).toBe(false);
    expect(isApplePlatform({})).toBe(false);
    expect(isApplePlatform({ userAgentData: { platform: '' }, userAgent: '' })).toBe(false);
  });
});

describe('searchShortcut (L33)', () => {
  it('hors Mac : « Ctrl K » affiché, « Rechercher (Ctrl+K) » pour le nom accessible', () => {
    expect(searchShortcut({ userAgent: UA.windows })).toEqual({ hint: 'Ctrl K', label: 'Rechercher (Ctrl+K)' });
  });
  it('Mac : « ⌘K » affiché, « Rechercher (⌘K) »', () => {
    expect(searchShortcut({ userAgent: UA.mac })).toEqual({ hint: '⌘K', label: 'Rechercher (⌘K)' });
  });
});
