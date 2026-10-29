import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import { namedPage, PageTitleService } from '../../core/services/page-title.service';
import type { LegendaryShip } from '../../core/models/models';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';
import { toSafeSignal } from '../../shared/safe-signal';
import { SectionAnchorDirective } from '../../shared/section-anchor.directive';

@Component({
  selector: 'app-ship-detail',
  standalone: true,
  imports: [SectionAnchorDirective, LoadErrorComponent, CommonModule, RouterLink],
  template: `
    @if (ship(); as s) {
      <a class="back-btn" routerLink="/lore/ships">← RETOUR AUX VAISSEAUX</a>

      <section class="hero" [style.--hero-img]="heroImg()" [style.--hero-color]="s.color">
        <div class="hero-overlay hero-overlay-releve"></div>
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="hero-class">{{ s.class }}</span>
          </div>
          <h1>{{ s.name }}</h1>
          @if (s.epithet) { <p class="hero-epithet">{{ s.epithet }}</p> }
          <p class="hero-faction">{{ s.factionName }}</p>
          <div class="hero-status">
            <strong>Statut · </strong>{{ s.currentStatus }}
          </div>
          @if (s.captainOrLord) {
            <div class="hero-captain">
              <strong>Commandement · </strong>{{ s.captainOrLord }}
            </div>
          }
        </div>
      </section>

      <nav class="anchor-nav" aria-label="Sections de la fiche">
        <a sectionAnchor="description">Description</a>
        @if (s.longHistory) { <a sectionAnchor="histoire">Histoire</a> }
        @if (s.specs?.length) { <a sectionAnchor="specs">Spécifications</a> }
        @if (s.notableBattles?.length) { <a sectionAnchor="batailles">Batailles</a> }
        @if (galleryImages().length > 0) { <a sectionAnchor="iconographie">Iconographie</a> }
      </nav>

      <section class="layout">
        <div class="main">
          <article class="panel" id="description">
            <h2>Description</h2>
            <p class="lead">{{ s.description }}</p>
          </article>

          @if (s.longHistory) {
            <article class="panel" id="histoire">
              <h2>Histoire Complète</h2>
              <p class="bible-text">{{ s.longHistory }}</p>
            </article>
          }

          @if (s.specs?.length) {
            <article class="panel" id="specs">
              <h2>Spécifications</h2>
              <ul class="specs-list">
                @for (spec of s.specs; track spec) {
                  <li>{{ spec }}</li>
                }
              </ul>
            </article>
          }

          @if (s.notableBattles?.length) {
            <article class="panel" id="batailles">
              <h2>Batailles Notables</h2>
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

          @if (galleryImages().length > 0) {
            <article class="panel" id="iconographie">
              <h2>Iconographie</h2>
              <div class="iconography-grid">
                @for (g of galleryImages(); track g; let i = $index) {
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
            <div class="info-row"><strong>Classe</strong><span>{{ s.class }}</span></div>
            <div class="info-row"><strong>Faction</strong><span>{{ s.factionName }}</span></div>
            @if (s.captainOrLord) {
              <div class="info-row"><strong>Commandement</strong><span>{{ s.captainOrLord }}</span></div>
            }
            <div class="info-row"><strong>Statut actuel</strong><span>{{ s.currentStatus }}</span></div>
          </section>

          <section class="sp">
            <h3>Liens</h3>
            @if (s.factionId) {
              <a class="row-link" [routerLink]="['/factions', s.factionId]">
                <span class="rl-label">Faction · {{ s.factionName }}</span>
                <span class="rl-arrow">›</span>
              </a>
            }
            @if (s.relatedPrimarchId) {
              <a class="row-link" [routerLink]="['/lore/primarchs', s.relatedPrimarchId]">
                <span class="rl-label">Primarque associé</span>
                <span class="rl-arrow">›</span>
              </a>
            }
          </section>

          <a class="cta" routerLink="/lore/ships">VOIR TOUS LES VAISSEAUX</a>
        </aside>
      </section>
    } @else if (ship.failed()) {
      <app-load-error [notFound]="ship.notFound()" [heading]="ship.notFound() ? 'Vaisseau introuvable' : 'Vaisseau indisponible'" backLink="/lore/ships" backLabel="Tous les vaisseaux" (retry)="ship.retry()" />
    } @else {
      <div class="loading"><p>Chargement du vaisseau...</p></div>
    }
  `,
  styleUrls: ['./ship-detail.component.scss'],
})
export class ShipDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly pages = inject(PageTitleService);
  private readonly route = inject(ActivatedRoute);

  readonly heroImage = signal<string | null>(null);
  readonly galleryImages = signal<string[]>([]);

  readonly ship = toSafeSignal(
    this.route.paramMap, p => this.service.getShip(p.get('id')!).pipe(namedPage(this.pages, x => x.name)), undefined);

  constructor() {
    effect(() => {
      const s = this.ship();
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
}
