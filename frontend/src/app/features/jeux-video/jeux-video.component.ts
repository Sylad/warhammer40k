import { Component, OnInit, computed, signal } from '@angular/core';

/** Un jeu annoncé, pas encore sorti. `sortie` : date à la précision annoncée, ou null si aucune. */
export interface JeuAVenir {
  id: string;
  titre: string;
  statut: string;
  sortie: string | null;
  genre: string;
  plateformes: string[];
  resume: string;
  source: string;
  image?: string;
}

export interface JeuSorti {
  id: string;
  titre: string;
  annee: number;
  resume: string;
  plateformes: string[];
}

export interface JeuxData {
  verifieLe: string;
  aVenir: JeuAVenir[];
  existants: JeuSorti[];
}

export const JEUX_URL = '/jeux-data/jeux.json';

/** « 2026-10-11 » → « 11 octobre 2026 » (sans fuseau : la date est écrite telle quelle). */
export function dateFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${Number(m[3])} ${mois[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/**
 * L35 — page « Jeux vidéo » (/jeux-video) : jeux à venir d'abord, puis jeux déjà sortis.
 * Données : public/jeux-data/jeux.json (versionné, vérifié en ligne à la date `verifieLe`),
 * lues par fetch comme /nouveautes-data. Une date n'est jamais devinée : affichée à la précision
 * annoncée, ou « Date non communiquée ».
 */
@Component({
  selector: 'app-jeux-video',
  standalone: true,
  template: `
    <main class="jv">
      <p class="jv-eyebrow">Codex numérique · Jeux vidéo</p>
      <h1 data-testid="titre-page">Jeux vidéo</h1>
      <p class="jv-lede" data-testid="intro-page">
        Les jeux Warhammer 40 000 qui arrivent, puis ceux déjà sortis. Les dates sont celles annoncées par les éditeurs ; elles peuvent bouger.
      </p>

      @switch (state()) {
        @case ('loading') {
          <div aria-busy="true">
            <p class="jv-verif" role="status" data-testid="message-chargement">Chargement des jeux…</p>
            <ul class="jv-cards" aria-hidden="true"><li class="jv-sk jv-sk-card"></li><li class="jv-sk jv-sk-card"></li></ul>
            <div class="jv-sk-lines" aria-hidden="true"><div class="jv-sk jv-sk-ligne"></div><div class="jv-sk jv-sk-ligne"></div></div>
          </div>
        }
        @case ('error') {
          <div class="jv-msg" role="alert">
            <p data-testid="message-erreur">Impossible de charger les jeux vidéo.</p>
            <p class="jv-aide">Vérifiez votre connexion, puis réessayez.</p>
            <button type="button" class="jv-btn" data-testid="bouton-reessayer" (click)="load()">Réessayer</button>
          </div>
        }
        @case ('empty') {
          <div class="jv-msg" data-testid="message-vide">
            <p>Aucun jeu à présenter pour le moment.</p>
            <p class="jv-aide">La liste sera complétée dès que des informations vérifiées seront disponibles.</p>
          </div>
        }
        @case ('ready') {
          @if (verifieLe(); as v) {
            <p class="jv-verif" data-testid="date-verification">Informations vérifiées le <time [attr.datetime]="v.iso">{{ v.text }}</time>.</p>
          }

          @if (aVenir().length) {
            <section class="jv-section" aria-labelledby="jv-h-venir" data-testid="section-a-venir">
              <h2 id="jv-h-venir">À venir</h2>
              <p class="jv-sub">Annoncés, pas encore sortis.</p>
              <ul class="jv-cards" data-testid="liste-a-venir">
                @for (j of aVenir(); track j.id) {
                  <li>
                    <article class="jv-card" data-testid="carte-a-venir">
                      <div class="jv-visuel" aria-hidden="true" data-testid="jeu-visuel">
                        @if (j.image) { <img [src]="j.image" alt="" loading="lazy" /> } @else { <span>✠</span> }
                      </div>
                      <div class="jv-corps">
                        <span class="jv-statut" data-testid="jeu-statut">{{ j.statut }}</span>
                        <h3 data-testid="jeu-titre">{{ j.titre }}</h3>
                        <dl class="jv-meta">
                          <dt>Sortie</dt>
                          <dd data-testid="jeu-date">
                            @if (j.sortie) { {{ j.sortie }} <span class="jv-tag">annoncée</span> } @else { Date non communiquée }
                          </dd>
                          <dt>Genre</dt><dd data-testid="jeu-genre">{{ j.genre }}</dd>
                          <dt>Plateformes</dt><dd data-testid="jeu-plateformes">{{ j.plateformes.join(' · ') }}</dd>
                        </dl>
                        <p class="jv-resume" data-testid="jeu-resume">{{ j.resume }}</p>
                        <p class="jv-source">
                          <a [href]="j.source" target="_blank" rel="noopener noreferrer" data-testid="jeu-source">Source de l’annonce<span class="sr-only"> (nouvel onglet)</span> ↗</a>
                        </p>
                      </div>
                    </article>
                  </li>
                }
              </ul>
            </section>
          }

          @if (existants().length) {
            <section class="jv-section" aria-labelledby="jv-h-sortis" data-testid="section-existants">
              <h2 id="jv-h-sortis">Déjà sortis</h2>
              <p class="jv-sub">Les jeux disponibles, du plus récent au plus ancien.</p>
              <ul class="jv-existants" data-testid="liste-existants">
                @for (j of existants(); track j.id) {
                  <li>
                    <article class="jv-ligne" data-testid="ligne-existant">
                      <h3 data-testid="existant-titre">{{ j.titre }}</h3>
                      <span class="jv-annee" data-testid="existant-annee">{{ j.annee }}</span>
                      <p class="jv-detail" data-testid="existant-resume">{{ j.resume }}</p>
                      <p class="jv-plat" data-testid="existant-plateformes">{{ j.plateformes.join(' · ') }}</p>
                    </article>
                  </li>
                }
              </ul>
            </section>
          }
        }
      }
    </main>
  `,
  styleUrl: './jeux-video.component.scss',
})
export class JeuxVideoComponent implements OnInit {
  readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  private readonly data = signal<JeuxData | null>(null);

  readonly aVenir = computed(() => this.data()?.aVenir ?? []);
  /** Du plus récent au plus ancien (R4) ; à année égale, l'ordre du fichier. */
  readonly existants = computed(() => [...(this.data()?.existants ?? [])].sort((a, b) => b.annee - a.annee));
  readonly verifieLe = computed(() => {
    const iso = this.data()?.verifieLe;
    return iso ? { iso, text: dateFr(iso) } : null;
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const res = await fetch(JEUX_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as Partial<JeuxData> | null;
      if (!d || !Array.isArray(d.aVenir) || !Array.isArray(d.existants)) throw new Error('format');
      this.data.set({ verifieLe: d.verifieLe ?? '', aVenir: d.aVenir, existants: d.existants });
      this.state.set(d.aVenir.length || d.existants.length ? 'ready' : 'empty');
    } catch {
      this.state.set('error');
    }
  }
}
