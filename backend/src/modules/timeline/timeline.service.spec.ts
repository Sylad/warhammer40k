import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { TimelineEvent, TimelineEra } from './timeline.model.js';

const SEED_PATH = path.resolve(__dirname, '../../../seed/timeline-events.json');

describe('TimelineService — seed integrity', () => {
  const seed: TimelineEvent[] = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));

  it('contient entre 20 et 35 événements', () => {
    expect(seed.length).toBeGreaterThanOrEqual(20);
    expect(seed.length).toBeLessThanOrEqual(35);
  });

  it('chaque événement a tous les champs obligatoires', () => {
    for (const ev of seed) {
      expect(ev.id).toBeTruthy();
      expect(ev.title).toBeTruthy();
      expect(ev.date).toBeTruthy();
      expect(ev.era).toBeTruthy();
      expect(ev.shortDescription).toBeTruthy();
      expect(ev.longDescription).toBeTruthy();
      expect(Array.isArray(ev.tags)).toBe(true);
      expect(Array.isArray(ev.sources)).toBe(true);
      expect(ev.sources.length).toBeGreaterThan(0);
    }
  });

  it('tous les ids sont uniques', () => {
    const ids = seed.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toutes les eras sont valides', () => {
    const validEras: TimelineEra[] = [
      'pre-imperium', 'horus-heresy', 'time-of-rebirth', 'm32-m40', 'm41', 'm42',
    ];
    for (const ev of seed) {
      expect(validEras).toContain(ev.era);
    }
  });

  it('couvre toutes les grandes eras (M30 → M42)', () => {
    const eras = new Set(seed.map(e => e.era));
    expect(eras.has('pre-imperium')).toBe(true);
    expect(eras.has('horus-heresy')).toBe(true);
    expect(eras.has('m41')).toBe(true);
    expect(eras.has('m42')).toBe(true);
  });

  it('longDescription >= 300 caractères pour chaque entrée', () => {
    for (const ev of seed) {
      expect(ev.longDescription.length).toBeGreaterThanOrEqual(300);
    }
  });
});
