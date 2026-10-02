// L30 — logique pure de la page « Plan de travail ».
import { afterEach, describe, expect, it } from 'vitest';
import {
  PLAN_URL, RECENT_DAYS, dateLine, fetchPlan, groupPlan, isEmpty, newsSlugByLot, progressText,
  statusLabel, summary, type PlanLot,
} from './plan.utils';

const TODAY = new Date('2026-10-02T10:00:00');

const lot = (o: Partial<PlanLot> & Pick<PlanLot, 'id' | 'status'>): PlanLot => ({ title: `Titre ${o.id}`, ...o });

describe('groupPlan', () => {
  const lots: PlanLot[] = [
    lot({ id: 'L1', status: 'done', finished: '2026-09-01' }), // 31 jours : ancien
    lot({ id: 'L2', status: 'todo' }),
    lot({ id: 'L3', status: 'done', finished: '2026-09-02' }), // 30 jours : récent
    lot({ id: 'L4', status: 'doing', started: '2026-10-01' }),
    lot({ id: 'L5', status: 'done', finished: '2026-10-01' }),
    lot({ id: 'L6', status: 'todo' }),
    lot({ id: 'L7', status: 'done' }), // sans date : ancien
  ];
  const g = groupPlan(lots, TODAY);

  it('en cours et prévus dans l’ordre du plan', () => {
    expect(g.doing.map((l) => l.id)).toEqual(['L4']);
    expect(g.todo.map((l) => l.id)).toEqual(['L2', 'L6']);
  });

  it(`livrés depuis ${RECENT_DAYS} jours au plus, le plus récent en premier ; les autres comptés à part`, () => {
    expect(g.done.map((l) => l.id)).toEqual(['L5', 'L3']);
    expect(g.olderDone).toBe(2);
  });

  it('isEmpty : vrai seulement sans aucun lot affiché', () => {
    expect(isEmpty(g)).toBe(false);
    expect(isEmpty(groupPlan([lot({ id: 'L1', status: 'done', finished: '2020-01-01' })], TODAY))).toBe(true);
  });
});

describe('libellés', () => {
  it('état écrit en toutes lettres', () => {
    expect(statusLabel('doing')).toBe('En cours');
    expect(statusLabel('todo')).toBe('Prévu');
    expect(statusLabel('done')).toBe('Livré');
  });

  it('ligne de date : livré le / démarré le / rien pour un lot prévu', () => {
    expect(dateLine(lot({ id: 'L1', status: 'done', finished: '2026-10-01' }))).toEqual({ day: '2026-10-01', text: 'Livré le 1er octobre 2026' });
    expect(dateLine(lot({ id: 'L1', status: 'doing', started: '2026-09-28' }))).toEqual({ day: '2026-09-28', text: 'Démarré le 28 septembre 2026' });
    expect(dateLine(lot({ id: 'L1', status: 'todo', started: '2026-09-28' }))).toBeNull();
    expect(dateLine(lot({ id: 'L1', status: 'doing' }))).toBeNull();
  });

  it('avancement en mots (singulier / pluriel)', () => {
    expect(progressText({ done: 0, total: 1 })).toBe('0 étape faite sur 1');
    expect(progressText({ done: 1, total: 3 })).toBe('1 étape faite sur 3');
    expect(progressText({ done: 2, total: 3 })).toBe('2 étapes faites sur 3');
  });

  it('résumé en une phrase', () => {
    const g = groupPlan([lot({ id: 'L1', status: 'doing' }), lot({ id: 'L2', status: 'todo' }), lot({ id: 'L3', status: 'todo' })], TODAY);
    expect(summary(g)).toBe(`1 évolution en cours, 2 prévues, 0 livrée ces ${RECENT_DAYS} derniers jours.`);
    expect(summary(groupPlan([], TODAY))).toBe(`Rien en cours, 0 prévue, 0 livrée ces ${RECENT_DAYS} derniers jours.`);
  });
});

describe('newsSlugByLot', () => {
  it('lot → slug de son entrée Nouveautés la plus récente (entrées de la plus récente à la plus ancienne)', () => {
    const m = newsSlugByLot([
      { slug: 'recente', lots: ['L2'] },
      { slug: 'ancienne', lots: ['L1', 'L2'] },
    ]);
    expect(m.get('L2')).toBe('recente');
    expect(m.get('L1')).toBe('ancienne');
  });
});

describe('fetchPlan', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });
  const respond = (status: number, body: unknown) => {
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      expect(String(url)).toBe(PLAN_URL);
      return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
    }) as typeof fetch;
  };

  it('plan publié', async () => {
    respond(200, { version: 1, project: 'p', lots: [] });
    await expect(fetchPlan()).resolves.toEqual({ version: 1, project: 'p', lots: [] });
  });
  it('404 → null (aucun plan publié)', async () => {
    respond(404, null);
    await expect(fetchPlan()).resolves.toBeNull();
  });
  it('version inconnue (ou absente) → erreur, pas un plan vide', async () => {
    respond(200, { version: 2, project: 'p', lots: [] });
    await expect(fetchPlan()).rejects.toThrow(/version/);
    respond(200, { project: 'p', lots: [] });
    await expect(fetchPlan()).rejects.toThrow(/version/);
  });
  it('500, réponse sans liste de lots ou panne réseau → erreur', async () => {
    respond(500, null);
    await expect(fetchPlan()).rejects.toThrow();
    respond(200, '<!doctype html>');
    await expect(fetchPlan()).rejects.toThrow();
    globalThis.fetch = (async () => { throw new TypeError('réseau'); }) as typeof fetch;
    await expect(fetchPlan()).rejects.toThrow();
  });
});
