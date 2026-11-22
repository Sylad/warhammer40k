import { Component, InjectionToken, OnInit, computed, inject, signal } from '@angular/core';
import { VEILLE_CHARGEMENT, dateVeille, estVeille, hoteSource, jourIso, prochaineRevue, trierActualites, type Veille } from './veille.utils';

/** Horloge de la section (revue en retard ou non) ; les tests la figent. */
export const ACTUALITES_NOW = new InjectionToken<() => Date>('ACTUALITES_NOW', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/**
 * L44 — « Actualités de l'univers » (accueil) : faits vérifiés en ligne, chacun avec sa source
 * et sa date, plus la date de la dernière revue du contenu et celle de la prochaine.
 */
@Component({
  selector: 'app-actualites',
  standalone: true,
  template: `
    <section class="act" aria-labelledby="act-titre" data-testid="actualites">
      <header class="act-head">
        <h2 id="act-titre">Actualités de l’univers</h2>
        <span class="act-sub">Jeux, romans, éditions et écrans : faits vérifiés, sources citées</span>
      </header>
      @switch (state()) {
        @case ('loading') {
          <p class="act-msg" role="status" data-testid="actualites-chargement">Chargement des actualités…</p>
        }
        @case ('error') {
          <div class="act-msg" role="alert">
            <p data-testid="actualites-erreur">Impossible de charger les actualités. Vérifiez votre connexion, puis réessayez.</p>
            <button type="button" class="act-btn" (click)="load()">Réessayer</button>
          </div>
        }
        @case ('ready') {
          @if (revue(); as r) {
            <p class="act-revue" data-testid="actualites-revue">
              Contenu revu le <time [attr.datetime]="r.iso">{{ r.texte }}</time>.
              @if (r.enRetard) {
                <strong class="act-retard">Revue prévue le <time [attr.datetime]="r.prochaineIso">{{ r.prochaine }}</time> : pas encore faite, certaines informations peuvent avoir changé.</strong>
              } @else {
                Prochaine revue au plus tard le <time [attr.datetime]="r.prochaineIso">{{ r.prochaine }}</time>.
              }
            </p>
          }
          @if (actualites().length) {
            <ul class="act-liste">
              @for (a of actualites(); track a.id) {
                <li>
                  <article class="act-item" data-testid="actualite">
                    <time class="act-date" [attr.datetime]="a.date" data-testid="actualite-date">{{ a.dateTexte }}</time>
                    <h3 data-testid="actualite-titre">{{ a.titre }}</h3>
                    <p class="act-resume">{{ a.resume }}</p>
                    <p class="act-source">
                      <a [href]="a.source" target="_blank" rel="noopener noreferrer" data-testid="actualite-source">Source : {{ a.hote }}<span class="sr-only"> — {{ a.titre }} (nouvel onglet)</span> ↗</a>
                      <span class="act-consulte">consultée le <time [attr.datetime]="a.consulteLe">{{ a.consulteTexte }}</time></span>
                    </p>
                  </article>
                </li>
              }
            </ul>
          } @else {
            <p class="act-msg" data-testid="actualites-vide">Aucune actualité vérifiée pour le moment.</p>
          }
        }
      }
    </section>
  `,
  styleUrl: './actualites.component.scss',
})
export class ActualitesComponent implements OnInit {
  readonly state = signal<'loading' | 'error' | 'ready'>('loading');
  private readonly data = signal<Veille | null>(null);
  private readonly now = inject(ACTUALITES_NOW);
  private readonly charger = inject(VEILLE_CHARGEMENT);

  readonly actualites = computed(() =>
    trierActualites(this.data()?.actualites ?? []).map((a) => ({
      ...a,
      dateTexte: dateVeille(a.date),
      consulteTexte: dateVeille(a.consulteLe),
      hote: hoteSource(a.source),
    })),
  );

  readonly revue = computed(() => {
    const d = this.data();
    if (!d) return null;
    const prochaineIso = prochaineRevue(d.revueLe, d.rythmeJours);
    return {
      iso: d.revueLe,
      texte: dateVeille(d.revueLe),
      prochaineIso,
      prochaine: dateVeille(prochaineIso),
      enRetard: jourIso(this.now()) > prochaineIso,
    };
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const d = await this.charger();
      if (!estVeille(d)) throw new Error('format');
      this.data.set(d);
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }
}
