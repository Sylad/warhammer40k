import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import { namedPage, PageTitleService } from '../../core/services/page-title.service';
import type { Saint, SaintCategory } from '../../core/models/models';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';
import { pageCiblee } from '../../core/utils/page-ciblee';
import { toSafeSignal } from '../../shared/safe-signal';
import { SectionAnchorDirective } from '../../shared/section-anchor.directive';

const CATEGORY_LABEL: Record<SaintCategory, string> = {
  'living-saint': 'Sainte Vivante',
  'saint-canonized': 'Sainte canonisée',
  'ecclesiarch-canonized': 'Ecclésiarque canonisé',
};

@Component({
  selector: 'app-saint-detail',
  standalone: true,
  imports: [SectionAnchorDirective, LoadErrorComponent, CommonModule, RouterLink],
  template: `
    @if (saint(); as s) {
      <a class="back-btn" routerLink="/lore/saints">← RETOUR AUX SAINTS</a>

      <section class="hero" [style.--hero-img]="heroImg()" [style.--hero-color]="s.color">
        <div class="hero-overlay hero-overlay-releve"></div>
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="hero-class">{{ categoryLabel(s.category) }}</span>
            <span class="hero-size">{{ s.era }}</span>
          </div>
          <h1>{{ s.name }}</h1>
          @if (s.epithet) { <p class="hero-epithet">{{ s.epithet }}</p> }
          <p class="hero-faction">{{ s.ordoOrChapter }}</p>
        </div>
      </section>

      <nav class="anchor-nav" aria-label="Sections de la fiche">
        <a sectionAnchor="description">Description</a>
        @if (s.longHistory) { <a sectionAnchor="histoire">Histoire</a> }
        @if (s.miracles?.length) { <a sectionAnchor="miracles">Miracles</a> }
        @if (s.notableBattles?.length) { <a sectionAnchor="batailles">Batailles</a> }
        @if (s.quotes?.length) { <a sectionAnchor="citations">Citations</a> }
        @if (iconographie().length > 0) { <a sectionAnchor="iconographie">Iconographie</a> }
      </nav>

      <section class="layout">
        <div class="main">
          <article class="panel" id="description">
            <h2>Description</h2>
            <p class="lead">{{ s.description }}</p>
          </article>

          @if (s.longHistory) {
            <article class="panel" id="histoire">
              <h2>Histoire & Hagiographie</h2>
              <p class="bible-text">{{ s.longHistory }}</p>
            </article>
          }

          @if (s.miracles?.length) {
            <article class="panel" id="miracles">
              <h2>Miracles & Pouvoirs</h2>
              <ul class="specs-list">
                @for (m of s.miracles; track m) {
                  <li>{{ m }}</li>
                }
              </ul>
            </article>
          }

          @if (s.notableBattles?.length) {
            <article class="panel" id="batailles">
              <h2>Batailles & Apparitions</h2>
              <ul class="battles">
                @for (b of s.notableBattles; track b.name) {
                  <li>
                    <div class="battle-head">
                      <strong>{{ b.name }}</strong>
                      @if (b.date) { <span class="battle-date">{{ b.date }}</span> }
                    </div>
                    <p>{{ b.summary }}</p>
                  </li>
                }
              </ul>
            </article>
          }

          @if (s.quotes?.length) {
            <article class="panel" id="citations">
              <h2>Citations</h2>
              @for (q of s.quotes; track q) {
                <blockquote class="lead" style="margin-bottom: 12px;">{{ q }}</blockquote>
              }
            </article>
          }

          @if (iconographie().length > 0) {
            <article class="panel" id="iconographie">
              <h2>Iconographie</h2>
              <div class="iconography-grid">
                @for (g of iconographie(); track g; let i = $index) {
                  <a class="iconography-card" routerLink="/gallery" [attr.aria-label]="'Galerie — illustration ' + (i + 1) + ' de ' + s.name"
                     [style.--g-img]="'url(' + g + ')'"></a>
                }
              </div>
            </article>
          }
        </div>

        <aside class="sidebar">
          <section class="sp">
            <h3>Données vitales</h3>
            <div class="info-row"><strong>Catégorie</strong><span>{{ categoryLabel(s.category) }}</span></div>
            <div class="info-row"><strong>Affiliation</strong><span>{{ s.ordoOrChapter }}</span></div>
            <div class="info-row"><strong>Ère</strong><span>{{ s.era }}</span></div>
          </section>

          <a class="cta" routerLink="/lore/saints">VOIR TOUS LES SAINTS</a>
        </aside>
      </section>
    } @else if (saint.failed()) {
      <app-load-error [notFound]="saint.notFound()" [heading]="saint.notFound() ? 'Saint introuvable' : 'Saint indisponible'" backLink="/lore/saints" backLabel="Tous les saints" (retry)="saint.retry()" />
    } @else {
      <div class="loading"><p>Chargement du Saint...</p></div>
    }
  `,
  styleUrls: ['../ship-detail/ship-detail.component.scss'],
})
export class SaintDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly pages = inject(PageTitleService);
  private readonly route = inject(ActivatedRoute);

  readonly heroImage = signal<string | null>(null);
  /** Image de chaque page de `galleryPages`, à sa place du seed (null : pas encore répondu, ou écartée). */
  private readonly galleryImages = signal<(string | null)[]>([]);
  /** L215 : l'Iconographie n'a que des images distinctes entre elles et de celle du haut de page. */
  readonly iconographie = computed(() => {
    const hero = this.heroImage();
    return this.galleryImages().filter((u, i, tous): u is string => u !== null && u !== hero && tous.indexOf(u) === i);
  });

  readonly saint = toSafeSignal(
    this.route.paramMap, p => this.service.getSaint(p.get('id')!).pipe(namedPage(this.pages, x => x.name)), undefined);

  constructor() {
    effect(() => {
      const s = this.saint();
      if (!s) return;
      this.heroImage.set(null);
      if (s.wikiQuery) {
        this.service.getWikiImage(s.wikiQuery).subscribe(r => {
          if (r.imageUrl) this.heroImage.set(r.imageUrl);
        });
      }
      // Les pages du sujet (`galleryPages`) : une page qui répond sous un autre titre ou sans vraie image est écartée (L215).
      const pages = s.galleryPages ?? [];
      this.galleryImages.set(pages.map(() => null));
      pages.forEach((page, i) => {
        this.service.getWikiImage(page).subscribe({
          next: r => {
            if (this.saint() !== s || !pageCiblee(page, r)) return;
            this.galleryImages.update(arr => arr.map((u, j) => (j === i ? r.imageUrl : u)));
          },
          error: () => {},
        });
      });
    });
  }

  heroImg(): string {
    const url = this.heroImage();
    return url ? `url('${url}')` : 'none';
  }

  categoryLabel(c: SaintCategory): string { return CATEGORY_LABEL[c]; }
}
