// L23 — page Nouveautés : fonctions pures (dates, place réservée des captures, visionneuse).
import { describe, expect, it } from 'vitest';
import {
  captureAlt, captureBoxWidth, formatDay, PHONE_ZONE_INSET, separatorIndex, viewerMode, viewerPhoneWidth,
} from './nouveautes.utils';

describe('page Nouveautés — utilitaires (L23)', () => {
  it('date du jour en français, sans décalage de fuseau', () => {
    expect(formatDay('2026-10-01')).toBe('1 octobre 2026');
    expect(formatDay('2026-09-28')).toBe('28 septembre 2026');
  });

  it('texte alternatif : numéroté quand une entrée a plusieurs captures', () => {
    expect(captureAlt('Une page', 0, 1)).toBe('Capture d’écran : Une page');
    expect(captureAlt('Une page', 1, 2)).toBe('Capture d’écran 2 sur 2 : Une page');
  });

  it('place réservée : min(largeur dispo, largeur naturelle, largeur qui donne 32rem de haut)', () => {
    expect(captureBoxWidth([390, 844])).toBe('min(100%, 390px, calc(32rem * 390 / 844))');
    expect(captureBoxWidth(undefined)).toBeNull();
  });

  it('visionneuse au téléphone (< 640 px) : défilement, largeur naturelle au plus 2 écrans', () => {
    expect(viewerMode([1440, 900], { width: 390, height: 844 })).toBe('scroll');
    expect(viewerPhoneWidth([1440, 900], 390)).toBe(780);
    expect(viewerPhoneWidth([300, 600], 390)).toBe(300);
    // Zone à 390 px : 364 px (marges 12 px + bordures). Capture de 390 px à 320 px d'écran
    // (zone 294, +33 %) : largeur naturelle, défilement horizontal assumé.
    expect(viewerPhoneWidth([390, 844], 320)).toBe(390);
  });

  it('visionneuse au téléphone : capture qui dépasse la zone de 15 % au plus → ajustée à la zone (revue UX L23)', () => {
    expect(PHONE_ZONE_INSET).toBe(26);
    // 390 dans 364 (+7 %) : ajustée, plus de défilement horizontal.
    expect(viewerPhoneWidth([390, 844], 390)).toBe('zone');
    expect(viewerPhoneWidth([418, 844], 390)).toBe('zone'); // 418 / 364 = 1,148
    expect(viewerPhoneWidth([420, 844], 390)).toBe(420); // 1,154 : largeur naturelle
    expect(viewerPhoneWidth([364, 844], 390)).toBe(364); // tient déjà
  });

  it('visionneuse au bureau : entière à l’écran, sauf une capture haute qui y perdrait plus de 20 %', () => {
    // Bureau 1440×900 à l'écran 1440×900 : échelle 0,88 ≥ 0,8 → entière.
    expect(viewerMode([1440, 900], { width: 1440, height: 900 })).toBe('fit');
    // Capture de téléphone 390×844 à 1440×900 : 796/844 = 0,94 → entière.
    expect(viewerMode([390, 844], { width: 1440, height: 900 })).toBe('fit');
    // Capture haute (page entière) 390×2400 : 0,33 → largeur naturelle, défilement vertical.
    expect(viewerMode([390, 2400], { width: 1440, height: 900 })).toBe('natural');
    expect(viewerMode(undefined, { width: 1440, height: 900 })).toBe('fit');
  });

  it('séparateur « Déjà vu » : avant la première entrée vue qui suit une nouvelle', () => {
    expect(separatorIndex([true, true, false, false], true)).toBe(2);
    expect(separatorIndex([false, false], true)).toBe(-1);
    expect(separatorIndex([true, true], true)).toBe(-1);
    // Premier visiteur : pas de séparateur.
    expect(separatorIndex([true, false], false)).toBe(-1);
  });
});
