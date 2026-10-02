import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsService } from '../nouveautes/news.service';
import {
  RECENT_DAYS, dateLine, fetchPlan, groupPlan, isEmpty, newsSlugByLot, progressText, statusLabel, summary,
  type PlanData, type PlanLot, type PlanStatus,
} from './plan.utils';

interface Group {
  key: PlanStatus;
  title: string;
  hint: string;
  empty: string;
  lots: PlanLot[];
}

/**
 * L30 — page « Plan de travail » (/plan) : ce qui est en cours, prévu et récemment livré
 * (signature commune des apps : finance-tracker L48, ol-companion L23, AetherWX « À venir »).
 *
 * Données publiques générées par `npm run plan` (frontend/scripts/plan-data.mjs) depuis le
 * plan raf : lots visibles, TITRES PUBLICS et états seulement, jamais les notes.
 * - état écrit en toutes lettres (la couleur ne fait que le souligner) ;
 * - identifiant du lot jamais montré : il ne sert que d'ancre /plan#<id> ;
 * - arrivée sur une ancre : la carte est signalée, défile et reçoit le focus, une fois par arrivée ;
 * - un lot livré renvoie à son entrée des Nouveautés.
 */
@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="plan">
      <header class="plan-head">
        <p class="plan-eyebrow">Plan de travail · Codex numérique</p>
        <h1>Ce qui se prépare</h1>
        <p class="plan-lede">
          Les évolutions visibles du codex : ce qui est en cours, ce qui est prévu et ce qui vient d’être livré.
          Le détail de chaque livraison est dans les <a routerLink="/nouveautes">Nouveautés</a>.
        </p>
      </header>

      @switch (state()) {
        @case ('error') {
          <div class="plan-box plan-error" role="alert">
            <p class="plan-error-title">Le plan n’a pas pu être chargé</p>
            <p>Vérifiez la connexion, puis réessayez.</p>
            @if (retryFailedAt(); as at) { <p class="plan-retry-failed">Nouvel essai à {{ at }} : échec.</p> }
            <button type="button" class="plan-retry" (click)="retry()">Réessayer</button>
          </div>
        }
        @case ('none') {
          <p class="plan-box plan-empty" tabindex="-1">Aucun plan publié pour l’instant.</p>
        }
        @case ('ready') {
          @if (empty()) {
            <p class="plan-box plan-empty" tabindex="-1">
              Rien en préparation pour l’instant. <a routerLink="/nouveautes">Voir les Nouveautés</a>
            </p>
          } @else {
            <p class="plan-box plan-summary" tabindex="-1"><span class="plan-summary-label">En ce moment</span>{{ summaryText() }}</p>
            @for (g of groups(); track g.key) {
              <section class="plan-group" [id]="'plan-' + g.key + '-groupe'" [attr.aria-labelledby]="'plan-' + g.key">
                <h2 [id]="'plan-' + g.key">{{ g.title }} <span class="plan-count">({{ g.lots.length }})</span></h2>
                <p class="plan-hint">{{ g.hint }}</p>
                @if (g.lots.length === 0) {
                  <p class="plan-box plan-empty">{{ g.empty }}</p>
                } @else {
                  <ul class="plan-list">
                    @for (lot of g.lots; track lot.id) {
                      <!-- L'identifiant du lot n'est pas montré : il reste l'ancre /plan#<id>. -->
                      <li class="plan-lot" [id]="lot.id" tabindex="-1" [class.is-target]="target() === lot.id">
                        <!-- Écart porté par le gap flex, sans « · » : rien d'orphelin au retour à la ligne. -->
                        <p class="plan-meta">
                          <span class="plan-status" [attr.data-status]="lot.status">{{ statusLabel(lot.status) }}</span>
                          @if (dateLine(lot); as d) { <time [attr.datetime]="d.day">{{ d.text }}</time> }
                        </p>
                        <h3>{{ lot.title }}</h3>
                        @if (lot.tasks; as p) {
                          <div class="plan-progress">
                            <div class="plan-bar" role="progressbar" aria-valuemin="0"
                                 [attr.aria-valuemax]="p.total" [attr.aria-valuenow]="p.done"
                                 [attr.aria-valuetext]="progressText(p, lot.status)" [attr.aria-label]="'Avancement : ' + lot.title">
                              <span [style.width.%]="(100 * p.done) / p.total"></span>
                            </div>
                            <span class="plan-progress-text" aria-hidden="true">{{ progressText(p, lot.status) }}</span>
                          </div>
                        }
                        @if (lot.status === 'done' && slugs().get(lot.id); as slug) {
                          <a class="plan-news" routerLink="/nouveautes" [fragment]="slug">Voir la nouveauté<span class="sr-only"> : {{ lot.title }}</span></a>
                        }
                      </li>
                    }
                  </ul>
                }
                @if (g.key === 'done' && olderDone() > 0) {
                  <p class="plan-older">
                    {{ olderText() }} : <a routerLink="/nouveautes">voir les Nouveautés</a>.
                  </p>
                }
              </section>
            }
          }
        }
        @default {
          <p class="plan-box plan-empty" role="status">Chargement…</p>
        }
      }
    </section>
  `,
  styleUrl: './plan.component.scss',
})
export class PlanComponent implements OnInit, OnDestroy {
  private readonly news = inject(NewsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly state = signal<'loading' | 'ready' | 'none' | 'error'>('loading');
  private readonly data = signal<PlanData | null>(null);
  readonly target = signal<string | null>(null);

  private readonly grouped = computed(() => groupPlan(this.data()?.lots ?? [], new Date()));
  readonly empty = computed(() => isEmpty(this.grouped()));
  readonly summaryText = computed(() => summary(this.grouped()));
  readonly olderDone = computed(() => this.grouped().olderDone);
  readonly olderText = computed(() => {
    const n = this.olderDone();
    return n > 1 ? `${n} évolutions livrées plus anciennes` : '1 évolution livrée plus ancienne';
  });
  readonly slugs = computed(() => newsSlugByLot(this.news.entries()));
  readonly groups = computed<Group[]>(() => {
    const g = this.grouped();
    return [
      { key: 'doing', title: 'En cours', hint: 'Le travail commencé, pas encore livré.', empty: 'Rien en cours pour l’instant.', lots: g.doing },
      { key: 'todo', title: 'Prévu', hint: 'La suite, dans l’ordre du plan.', empty: 'Rien de prévu pour l’instant.', lots: g.todo },
      {
        key: 'done', title: 'Récemment livré', hint: `Livré ces ${RECENT_DAYS} derniers jours, le plus récent en premier.`,
        empty: `Rien de livré ces ${RECENT_DAYS} derniers jours.`, lots: g.done,
      },
    ];
  });

  readonly statusLabel = statusLabel;
  readonly dateLine = dateLine;
  readonly progressText = progressText;

  /** Ancre déjà révélée : un nouveau rendu ne refait ni défilement ni focus. */
  private revealedHash: string | null = null;
  private readonly onHashChange = () => this.reveal(true);

  ngOnInit(): void {
    window.addEventListener('hashchange', this.onHashChange);
    void this.news.load();
    void this.load();
  }

  ngOnDestroy(): void {
    window.removeEventListener('hashchange', this.onHashChange);
  }

  /** Heure (HH:MM) du dernier « Réessayer » en échec, annoncée dans l'alerte. */
  readonly retryFailedAt = signal<string | null>(null);

  /**
   * « Réessayer » : le bouton disparaît pendant le chargement, le focus ne doit pas tomber sur
   * BODY (WCAG 2.4.3). Échec → nouveau bouton focalisé, échec annoncé avec l'heure ;
   * succès → résumé « En ce moment » (ou message d'état) focalisé.
   */
  async retry(): Promise<void> {
    await this.load();
    const ok = this.state() !== 'error';
    this.retryFailedAt.set(ok ? null : new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    setTimeout(() => {
      const sel = ok ? '.plan-summary, .plan-empty' : '.plan-retry';
      this.host.nativeElement.querySelector<HTMLElement>(sel)?.focus();
    });
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const data = await fetchPlan();
      this.data.set(data);
      this.state.set(data ? 'ready' : 'none');
    } catch {
      this.state.set('error');
      return;
    }
    // Les cartes viennent d'être rendues : viser l'ancre une fois le DOM à jour.
    setTimeout(() => this.reveal(false));
  }

  /** Carte visée par l'ancre de l'URL : signalée ; défilement et focus une seule fois par arrivée. */
  private reveal(force: boolean): void {
    const hash = location.hash;
    let id = '';
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      /* ancre mal encodée : aucune carte visée */
    }
    const el = id
      ? Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('li.plan-lot')).find((li) => li.id === id) ?? null
      : null;
    this.target.set(el ? id : null);
    if (!el || (!force && this.revealedHash === hash)) return;
    this.revealedHash = hash;
    el.scrollIntoView?.({ block: 'start' });
    el.focus({ preventScroll: true });
  }
}
