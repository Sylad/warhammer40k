import { describe, expect, it } from 'vitest';
import { categoryLabel, clipToRect, sampleArc } from './lore-galaxy.utils';

describe('categoryLabel — catégories secondaires (segmentum/shrine/death/fortress/war)', () => {
  it('segmentum-hq → Capitale Segmentum', () => {
    expect(categoryLabel('segmentum-hq')).toBe('Capitale Segmentum');
  });

  it('shrine-world → Monde-sanctuaire', () => {
    expect(categoryLabel('shrine-world')).toBe('Monde-sanctuaire');
  });

  it('death-world → Death World', () => {
    expect(categoryLabel('death-world')).toBe('Death World');
  });

  it('fortress-world → Monde-forteresse', () => {
    expect(categoryLabel('fortress-world')).toBe('Monde-forteresse');
  });

  it('war-zone → Zone de guerre', () => {
    expect(categoryLabel('war-zone')).toBe('Zone de guerre');
  });
});

describe('sampleArc — cas limites', () => {
  it('samples=1 produit exactement 2 points (start + end)', () => {
    const pts = sampleArc(0, 0, 0, 180, 50, 1);
    expect(pts).toHaveLength(2);
    expect(pts[0][0]).toBeCloseTo(50, 6);
    expect(pts[0][1]).toBeCloseTo(0, 6);
    expect(pts[1][0]).toBeCloseTo(-50, 5);
    expect(pts[1][1]).toBeCloseTo(0, 5);
  });

  it('arc 0° → 360° (cercle complet) : premier et dernier point confondus', () => {
    const pts = sampleArc(0, 0, 0, 360, 100, 8);
    expect(pts).toHaveLength(9);
    expect(pts[0][0]).toBeCloseTo(pts[8][0], 10);
    expect(pts[0][1]).toBeCloseTo(pts[8][1], 10);
  });

  it('span=0 (theta2 == theta1) : tous les samples+1 points sont au même endroit', () => {
    const pts = sampleArc(0, 0, 45, 45, 100, 3);
    expect(pts).toHaveLength(4);
    const expectedXY = 100 * Math.cos((45 * Math.PI) / 180);
    for (const [x, y] of pts) {
      expect(x).toBeCloseTo(expectedXY, 5);
      expect(y).toBeCloseTo(expectedXY, 5);
    }
  });
});

describe('clipToRect — cas limites', () => {
  it('polygone vide → résultat vide (guard !subj.length)', () => {
    expect(clipToRect([], 100, 100)).toEqual([]);
  });

  it('polygone à cheval sur la bordure gauche : clip à x=0', () => {
    const rect: [number, number][] = [[-50, 10], [50, 10], [50, 90], [-50, 90]];
    const out = clipToRect(rect, 100, 100);
    expect(out.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true);
    const xs = out.map(p => p[0]);
    expect(xs.some(x => Math.abs(x) < 1e-9)).toBe(true);
    expect(xs.some(x => Math.abs(x - 50) < 1e-9)).toBe(true);
  });

  it('grand carré couvrant tout le viewport → clippé aux 4 coins du viewport', () => {
    const big: [number, number][] = [[-50, -50], [150, -50], [150, 150], [-50, 150]];
    const out = clipToRect(big, 100, 100);
    expect(out.length).toBe(4);
    expect(out.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true);
    const corners: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]];
    for (const [cx, cy] of corners) {
      expect(
        out.some(([x, y]) => Math.abs(x - cx) < 1e-9 && Math.abs(y - cy) < 1e-9),
      ).toBe(true);
    }
  });
});
