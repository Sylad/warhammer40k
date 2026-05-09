import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Equipment, EquipmentType } from '../../core/models/models';

const TYPE_LABEL: Record<EquipmentType, string> = {
  ranged: 'Arme à distance',
  melee: 'Arme de mêlée',
  armor: 'Armure',
  relic: 'Relique',
};

@Component({
  selector: 'app-equipment-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (equipment(); as e) {
      <a class="back-btn" routerLink="/lore/equipment">← RETOUR À L'ARSENAL</a>

      <section class="hero" [style.--hero-img]="heroImg()">
        <div class="hero-overlay"></div>
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="hero-class">{{ typeLabel(e.type) }} · {{ e.subCategory }}</span>
            @if (e.sigil) { <span class="hero-size">{{ e.sigil }}</span> }
          </div>
          <h1>{{ e.name }}</h1>
          @if (e.nameVO) { <p class="hero-epithet">{{ e.nameVO }}</p> }
          <p class="hero-faction">{{ factionsLabel(e) }}</p>
        </div>
      </section>

      <nav class="anchor-nav">
        <a href="#description" (click)="scrollTo($event, 'description')">Description</a>
        @if (e.loreLong) { <a href="#histoire" (click)="scrollTo($event, 'histoire')">Histoire</a> }
        @if (e.specs) { <a href="#specs" (click)="scrollTo($event, 'specs')">Spécifications</a> }
        @if (e.notable?.length) { <a href="#notable" (click)="scrollTo($event, 'notable')">Porteurs notables</a> }
        @if (e.citation) { <a href="#citation" (click)="scrollTo($event, 'citation')">Citation</a> }
      </nav>

      <section class="layout">
        <div class="main">
          <article class="panel" id="description">
            <h2>Description</h2>
            <p class="lead">{{ e.description }}</p>
          </article>

          @if (e.loreLong) {
            <article class="panel" id="histoire">
              <h2>Histoire & Lore</h2>
              <p class="bible-text">{{ e.loreLong }}</p>
            </article>
          }

          @if (e.specs) {
            <article class="panel" id="specs">
              <h2>Spécifications</h2>
              <p class="bible-text">{{ e.specs }}</p>
            </article>
          }

          @if (e.notable?.length) {
            <article class="panel" id="notable">
              <h2>Porteurs / Variantes Notables</h2>
              <ul class="specs-list">
                @for (n of e.notable; track n) { <li>{{ n }}</li> }
              </ul>
            </article>
          }

          @if (e.citation) {
            <article class="panel" id="citation">
              <h2>Citation</h2>
              <blockquote class="lead" style="font-style: italic">« {{ e.citation }} »</blockquote>
            </article>
          }
        </div>

        <aside class="sidebar">
          <section class="sp">
            <h3>Données</h3>
            <div class="info-row"><strong>Type</strong><span>{{ typeLabel(e.type) }}</span></div>
            <div class="info-row"><strong>Sous-catégorie</strong><span>{{ e.subCategory }}</span></div>
            @if (e.nameVO) { <div class="info-row"><strong>Nom VO</strong><span>{{ e.nameVO }}</span></div> }
          </section>

          @if (e.factionIds?.length) {
            <section class="sp">
              <h3>Factions liées</h3>
              @for (fid of e.factionIds; track fid) {
                <a class="row-link" [routerLink]="['/factions', fid]">
                  <span class="rl-label">{{ fid }}</span>
                  <span class="rl-arrow">›</span>
                </a>
              }
            </section>
          }

          <a class="cta" routerLink="/lore/equipment">VOIR TOUT L'ARSENAL</a>
        </aside>
      </section>
    } @else {
      <div class="loading"><p>Chargement de l'équipement...</p></div>
    }
  `,
  styleUrls: ['../ship-detail/ship-detail.component.scss'],
})
export class EquipmentDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);

  readonly heroImage = signal<string | null>(null);

  readonly equipment = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getEquipmentItem(p.get('id')!))),
  );

  constructor() {
    effect(() => {
      const e = this.equipment();
      if (!e) return;
      this.heroImage.set(null);
      if (e.wikiQuery) {
        this.service.getWikiImage(e.wikiQuery).subscribe(r => {
          if (r.imageUrl) this.heroImage.set(r.imageUrl);
        });
      }
    });
  }

  heroImg(): string {
    const url = this.heroImage();
    return url ? `url('${url}')` : 'none';
  }

  typeLabel(t: EquipmentType): string { return TYPE_LABEL[t]; }

  factionsLabel(e: Equipment): string {
    return (e.factionIds ?? []).join(' · ');
  }

  scrollTo(ev: Event, id: string): void {
    ev.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
