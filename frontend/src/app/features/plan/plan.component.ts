import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
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
 * - L67 : la carte visée arrive juste sous la barre même en fin de page : l'espace qui manque au
 *   défilement est réservé en bas de la page, seulement tant qu'une ancre vise un lot ; l'ancre est
 *   relue à chaque changement d'adresse : `hashchange` ET fin de navigation du routeur (un lien
 *   interne vers /plan — pied de page, « À propos ▾ », recherche rapide — ne déclenche pas `hashchange`) ;
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

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
  /** Largeur ou hauteur d'écran changée (rotation, barre d'adresse du téléphone) : réajuster l'espace. */
  private readonly onResize = () => this.realign();
  /**
   * La carte visée a été amenée sous la barre et le visiteur n'a pas encore fait défiler lui-même :
   * seul ce cas autorise un recalage. Sur téléphone, la barre d'adresse qui se rétracte pendant un
   * défilement au doigt émet `resize` : sans cette garde, la page reviendrait de force sur la carte.
   */
  private pinned = false;
  private readonly onUserScrollIntent = () => { this.pinned = false; };
  private static readonly INTENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  private destroyed = false;

  ngOnInit(): void {
    window.addEventListener('hashchange', this.onHashChange);
    window.addEventListener('resize', this.onResize);
    for (const t of PlanComponent.INTENTS) window.addEventListener(t, this.onUserScrollIntent, { passive: true, capture: true });
    // Revue r1 de L67 : depuis /plan#<lot>, un lien interne vers /plan passe par `pushState` (aucun
    // `hashchange`) et réutilise ce composant : sans cette relecture, l'espace réservé et le surlignage
    // restaient sans ancre. Après le défilement du routeur (anchorScrolling / scrollPositionRestoration,
    // planifié par un setTimeout à la fin de la navigation) : le nôtre passe ensuite.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => setTimeout(() => {
        if (!this.destroyed) this.reveal(true);
      }));
    void this.news.load();
    void this.load();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    window.removeEventListener('hashchange', this.onHashChange);
    window.removeEventListener('resize', this.onResize);
    for (const t of PlanComponent.INTENTS) window.removeEventListener(t, this.onUserScrollIntent, { capture: true });
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
    // Les polices web arrivent parfois après : le texte se reflue et la carte quitte sa place (L55).
    // Recaler une fois, seulement si la carte garde le focus (le visiteur n'est pas parti ailleurs).
    void document.fonts?.ready.then(() => this.realign());
  }

  /**
   * Recalage de la carte visée (polices arrivées tard, fenêtre redimensionnée, rotation) : espace
   * réajusté, puis carte remise sous la barre — seulement si elle garde le focus et que le visiteur
   * n'a pas fait défiler la page depuis (`pinned`).
   */
  private realign(): void {
    const el = this.targetEl();
    this.reserveSpace(el);
    if (el && this.pinned && document.activeElement === el) el.scrollIntoView?.({ block: 'start' });
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
    this.reserveSpace(el);
    if (!el) this.pinned = false;
    if (!el || (!force && this.revealedHash === hash)) return;
    this.revealedHash = hash;
    el.scrollIntoView?.({ block: 'start' });
    this.pinned = true;
    el.focus({ preventScroll: true });
  }

  private targetEl(): HTMLElement | null {
    const id = this.target();
    return id ? Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('li.plan-lot')).find((li) => li.id === id) ?? null : null;
  }

  /**
   * L67 — en fin de page, le défilement maximal ne suffit pas à amener la carte visée sous la barre
   * (QA prod du 05-10 : dernier lot à 372 px). On ajoute en bas de la page (padding de `.plan`)
   * exactement l'espace qui manque, seulement tant qu'une ancre vise un lot : la navigation
   * ordinaire n'a aucun vide. Synchrone (style posé directement) pour que le `scrollIntoView` qui
   * suit en tienne compte.
   */
  private reserveSpace(el: HTMLElement | null): void {
    const page = this.host.nativeElement.querySelector<HTMLElement>('section.plan');
    if (!page) return;
    if (!el) {
      page.style.paddingBottom = '';
      return;
    }
    const root = document.documentElement;
    const current = parseFloat(page.style.paddingBottom) || 0;
    const offset = (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
    const wanted = el.getBoundingClientRect().top + window.scrollY - offset; // défilement qui met la carte sous la barre
    const max = root.scrollHeight - current - window.innerHeight; // défilement maximal sans l'espace réservé
    const missing = Math.ceil(wanted - max);
    page.style.paddingBottom = missing > 0 ? `${missing}px` : '';
  }
}
