import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import { namedPage, PageTitleService } from '../../core/services/page-title.service';
import type { GodMachine } from '../../core/models/models';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';
import { retryAll, toSafeSignal } from '../../shared/safe-signal';
import { SectionAnchorDirective } from '../../shared/section-anchor.directive';

@Component({
  selector: 'app-titan-detail',
  standalone: true,
  imports: [SectionAnchorDirective, LoadErrorComponent, CommonModule, RouterLink],
  template: `
    @if (machine(); as m) {
      @if (factions.failed()) {
        <app-load-error message="Une partie de cette fiche n’a pas pu être chargée." (retry)="retryAll(machine, factions)" />
      }
      <a class="back-btn" routerLink="/lore/titans">← RETOUR AUX DIEUX-MACHINES</a>

      <section class="hero" [style.--hero-img]="heroImg()" [style.--hero-color]="m.color">
        <div class="hero-overlay hero-overlay-releve"></div>
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="hero-class">{{ m.scoutClass }}</span>
            <span class="hero-size">{{ m.size }}</span>
          </div>
          <h1>{{ m.name }}</h1>
          @if (m.epithet) { <p class="hero-epithet">{{ m.epithet }}</p> }
          <p class="hero-faction">{{ m.factionName }}</p>
        </div>
      </section>

      <nav class="anchor-nav" aria-label="Sections de la fiche">
        <a sectionAnchor="description">Description</a>
        @if (m.longHistory) { <a sectionAnchor="histoire">Histoire</a> }
        @if (m.specs?.length) { <a sectionAnchor="specs">Spécifications</a> }
        @if (m.notableExamples?.length) { <a sectionAnchor="exemples">Exemples</a> }
        @if (galleryImages().length > 0) { <a sectionAnchor="iconographie">Iconographie</a> }
      </nav>

      <section class="layout">
        <div class="main">
          <article class="panel" id="description">
            <h2>Description</h2>
            <p class="lead">{{ m.description }}</p>
          </article>

          @if (m.longHistory) {
            <article class="panel" id="histoire">
              <h2>Histoire & Doctrine</h2>
              <p class="bible-text">{{ m.longHistory }}</p>
            </article>
          }

          @if (m.specs?.length) {
            <article class="panel" id="specs">
              <h2>Spécifications</h2>
              <ul class="specs-list">
                @for (spec of m.specs; track spec) {
                  <li>{{ spec }}</li>
                }
              </ul>
            </article>
          }

          @if (m.notableExamples?.length) {
            <article class="panel" id="exemples">
              <h2>Exemples Notables</h2>
              <ul class="battles">
                @for (ex of m.notableExamples; track ex.name) {
                  <li>
                    <div class="battle-head"><strong>{{ ex.name }}</strong></div>
                    <p>{{ ex.context }}</p>
                  </li>
                }
              </ul>
            </article>
          }

          @if (galleryImages().length > 0) {
            <article class="panel" id="iconographie">
              <h2>Iconographie</h2>
              <div class="iconography-grid">
                @for (g of galleryImages(); track g; let i = $index) {
                  <a class="iconography-card" routerLink="/gallery" [attr.aria-label]="'Galerie — illustration ' + (i + 1) + ' de ' + m.name"
                     [style.--g-img]="'url(' + g + ')'"></a>
                }
              </div>
            </article>
          }
        </div>

        <aside class="sidebar">
          <section class="sp">
            <h3>Données techniques</h3>
            <div class="info-row"><strong>Catégorie</strong><span>{{ categoryLabel(m.category) }}</span></div>
            <div class="info-row"><strong>Classe</strong><span>{{ m.scoutClass }}</span></div>
            <div class="info-row"><strong>Taille</strong><span>{{ m.size }}</span></div>
            <div class="info-row"><strong>Faction</strong><span>{{ m.factionName }}</span></div>
          </section>

          @if (m.factionId && factionIds().has(m.factionId)) {
            <section class="sp">
              <h3>Liens</h3>
              <a class="row-link" [routerLink]="['/factions', m.factionId]">
                <span class="rl-label">Faction · {{ m.factionName }}</span>
                <span class="rl-arrow">›</span>
              </a>
            </section>
          }

          <a class="cta" routerLink="/lore/titans">VOIR TOUS LES DIEUX-MACHINES</a>
        </aside>
      </section>
    } @else if (machine.failed()) {
      <app-load-error [notFound]="machine.notFound()" [heading]="machine.notFound() ? 'Machine introuvable' : 'Machine indisponible'" backLink="/lore/titans" backLabel="Toutes les machines" (retry)="retryAll(machine, factions)" />
    } @else {
      <div class="loading"><p>Chargement...</p></div>
    }
  `,
  styleUrls: ['../ship-detail/ship-detail.component.scss'],
})
export class TitanDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly pages = inject(PageTitleService);
  private readonly route = inject(ActivatedRoute);

  readonly heroImage = signal<string | null>(null);
  readonly galleryImages = signal<string[]>([]);

  /** L39 : on ne lie que les factions qui ont une fiche (« imperial-knights » n'en a pas). */
  protected readonly factions = toSafeSignal(this.service.factions$, []);
  readonly factionIds = computed(() => new Set(this.factions().map(f => f.id)));

  protected readonly retryAll = retryAll;
  readonly machine = toSafeSignal(
    this.route.paramMap, p => this.service.getGodMachine(p.get('id')!).pipe(namedPage(this.pages, x => x.name)), undefined);

  constructor() {
    effect(() => {
      const m = this.machine();
      if (!m) return;
      this.heroImage.set(null);
      this.galleryImages.set([]);
      if (m.wikiQuery) {
        this.service.getWikiImage(m.wikiQuery).subscribe(r => {
          if (r.imageUrl) this.heroImage.set(r.imageUrl);
        });
      }
      const queries = (m.galleryQueries ?? []).slice(0, 6);
      queries.forEach(q => {
        this.service.getWikiImage(q).subscribe({
          next: r => { if (r.imageUrl) this.galleryImages.update(arr => [...arr, r.imageUrl!]); },
          error: () => {},
        });
      });
    });
  }

  heroImg(): string {
    const url = this.heroImage();
    return url ? `url('${url}')` : 'none';
  }

  categoryLabel(c: string): string {
    return c === 'titan' ? 'Titan' : c === 'knight' ? 'Chevalier' : 'Walker';
  }
}
