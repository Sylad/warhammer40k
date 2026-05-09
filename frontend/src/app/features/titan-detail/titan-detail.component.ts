import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { GodMachine } from '../../core/models/models';

@Component({
  selector: 'app-titan-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (machine(); as m) {
      <a class="back-btn" routerLink="/lore/titans">← RETOUR AUX DIEUX-MACHINES</a>

      <section class="hero" [style.--hero-img]="heroImg()" [style.--hero-color]="m.color">
        <div class="hero-overlay"></div>
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

      <nav class="anchor-nav">
        <a href="#description" (click)="scrollTo($event, 'description')">Description</a>
        @if (m.longHistory) { <a href="#histoire" (click)="scrollTo($event, 'histoire')">Histoire</a> }
        @if (m.specs?.length) { <a href="#specs" (click)="scrollTo($event, 'specs')">Spécifications</a> }
        @if (m.notableExamples?.length) { <a href="#exemples" (click)="scrollTo($event, 'exemples')">Exemples</a> }
        @if (galleryImages().length > 0) { <a href="#iconographie" (click)="scrollTo($event, 'iconographie')">Iconographie</a> }
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
            <h3>Données techniques</h3>
            <div class="info-row"><strong>Catégorie</strong><span>{{ categoryLabel(m.category) }}</span></div>
            <div class="info-row"><strong>Classe</strong><span>{{ m.scoutClass }}</span></div>
            <div class="info-row"><strong>Taille</strong><span>{{ m.size }}</span></div>
            <div class="info-row"><strong>Faction</strong><span>{{ m.factionName }}</span></div>
          </section>

          @if (m.factionId) {
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
    } @else {
      <div class="loading"><p>Chargement...</p></div>
    }
  `,
  styleUrls: ['../ship-detail/ship-detail.component.scss'],
})
export class TitanDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);

  readonly heroImage = signal<string | null>(null);
  readonly galleryImages = signal<string[]>([]);

  readonly machine = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getGodMachine(p.get('id')!))),
  );

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

  scrollTo(e: Event, id: string): void {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
