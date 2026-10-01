import { Injectable, computed, signal } from '@angular/core';
import { browserStorage, countUnseen, markAllSeen, readSeen, type NewsSeen } from './news-badge';
import type { CaptureSize } from './nouveautes.utils';

/**
 * L23 — journal des Nouveautés, partagé par la page /nouveautes et la pastille du menu.
 *
 * Source : docs/nouveautes/*.md, compilé par `cadence news build` (cd frontend && npm run news)
 * dans public/nouveautes-data/ (nouveautes.json + captures + tailles.json), VERSIONNÉ : la CI
 * construit l'image nginx sans cadence. L'ordre (la plus récente en haut, départage sur
 * l'heure de création `created`) est celui du JSON.
 *
 * Lu par fetch (pas HttpClient) : fichiers statiques, hors des intercepteurs PIN / quota de l'API.
 */
export const NEWS_BASE = '/nouveautes-data';

export interface NewsEntry {
  slug: string;
  title: string;
  date: string;
  lots: string[];
  captures: string[];
  html: string;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  readonly state = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly entries = signal<NewsEntry[]>([]);
  readonly sizes = signal<Record<string, CaptureSize>>({});
  readonly seen = signal<NewsSeen | null>(readSeen(browserStorage()));
  /** Entrées parues depuis la dernière visite de /nouveautes (pastille du menu). */
  readonly unseen = computed(() => countUnseen(this.entries(), this.seen()));

  private pending: Promise<void> | null = null;

  /** Charge le journal une fois ; les appels suivants attendent le même chargement. */
  load(): Promise<void> {
    if (this.pending) return this.pending;
    this.state.set('loading');
    this.pending = Promise.all([
      getJson<{ entries?: NewsEntry[] }>(`${NEWS_BASE}/nouveautes.json`),
      getJson<Record<string, CaptureSize>>(`${NEWS_BASE}/tailles.json`),
    ]).then(([news, sizes]) => {
      if (!news || !Array.isArray(news.entries)) {
        this.state.set('error');
        this.pending = null; // nouvel essai à la prochaine visite
        return;
      }
      this.entries.set(news.entries);
      this.sizes.set(sizes ?? {});
      this.state.set('ready');
    });
    return this.pending;
  }

  /** Visite de la page : retourne la mémoire AVANT la visite, puis marque tout vu. */
  visit(now: Date = new Date()): NewsSeen | null {
    const storage = browserStorage();
    const before = readSeen(storage);
    const after = markAllSeen(storage, this.entries(), now);
    if (after) this.seen.set(after);
    return before;
  }
}
