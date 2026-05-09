import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Saint, SaintCategory } from '../../core/models/models';

const CATEGORY_LABEL: Record<SaintCategory, string> = {
  'living-saint': 'Sainte Vivante',
  'saint-canonized': 'Sainte canonisée',
  'ecclesiarch-canonized': 'Ecclésiarque canonisé',
};

@Component({
  selector: 'app-saint-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (saint(); as s) {
      <a class="back-btn" routerLink="/lore/saints">← RETOUR AUX SAINTS</a>

      <section class="hero" [style.--hero-img]="heroImg()" [style.--hero-color]="s.color">
        <div class="hero-overlay"></div>
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

      <nav class="anchor-nav">
        <a href="#description" (click)="scrollTo($event, 'description')">Description</a>
        @if (s.longHistory) { <a href="#histoire" (click)="scrollTo($event, 'histoire')">Histoire</a> }
        @if (s.miracles?.length) { <a href="#miracles" (click)="scrollTo($event, 'miracles')">Miracles</a> }
        @if (s.notableBattles?.length) { <a href="#batailles" (click)="scrollTo($event, 'batailles')">Batailles</a> }
        @if (s.quotes?.length) { <a href="#citations" (click)="scrollTo($event, 'citations')">Citations</a> }
        @if (galleryImages().length > 0) { <a href="#iconographie" (click)="scrollTo($event, 'iconographie')">Iconographie</a> }
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

          @if (galleryImages().length > 0) {
            <article class="panel" id="iconographie">
              <h2>Iconographie</h2>
              <div class="iconography-grid">
                @for (g of galleryImages(); track g) {
                  <a class="iconography-card" routerLink="/gallery"
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
    } @else {
      <div class="loading"><p>Chargement du Saint...</p></div>
    }
  `,
  styleUrls: ['../ship-detail/ship-detail.component.scss'],
})
export class SaintDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);

  readonly heroImage = signal<string | null>(null);
  readonly galleryImages = signal<string[]>([]);

  readonly saint = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getSaint(p.get('id')!))),
  );

  constructor() {
    effect(() => {
      const s = this.saint();
      if (!s) return;
      this.heroImage.set(null);
      this.galleryImages.set([]);
      if (s.wikiQuery) {
        this.service.getWikiImage(s.wikiQuery).subscribe(r => {
          if (r.imageUrl) this.heroImage.set(r.imageUrl);
        });
      }
      const queries = (s.galleryQueries ?? []).slice(0, 6);
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

  categoryLabel(c: SaintCategory): string { return CATEGORY_LABEL[c]; }

  scrollTo(e: Event, id: string): void {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
