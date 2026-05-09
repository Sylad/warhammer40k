import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { LegendaryShip } from '../../core/models/models';

const ALIGNMENT_BY_FACTION: Record<string, string> = {
  'space-marines': 'Imperium',
  'chaos-space-marines': 'Chaos',
  'aeldari': 'Xenos',
  'orks': 'Xenos',
  'tyranides': 'Xenos',
  'necrons': 'Xenos',
  'tau': 'Xenos',
  'astra-militarum': 'Imperium',
  'adeptus-mechanicus': 'Imperium',
  'soeurs-de-bataille': 'Imperium',
  'inquisition': 'Imperium',
  'adeptus-custodes': 'Imperium',
  'officio-assassinorum': 'Imperium',
  'leagues-of-votann': 'Xenos',
  'grey-knights': 'Imperium',
  'genestealer-cults': 'Xenos',
  'drukhari': 'Xenos',
};

@Component({
  selector: 'app-lore-ships',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="back-btn" routerLink="/lore">← RETOUR AU CODEX</a>

    <header class="hero">
      <h1>Vaisseaux Légendaires</h1>
      <p class="lead">
        Les vaisseaux qui portent les Primarques, qui défendent Terra, qui transportent les Légions —
        chaque vaisseau légendaire est une légende en mouvement, une cathédrale de guerre, un mythe gravé
        dans la coque adamantine.
      </p>
      <div class="filters">
        <button [class.active]="filter() === 'all'" (click)="filter.set('all')">Tous · {{ ships().length }}</button>
        <button [class.active]="filter() === 'Imperium'" (click)="filter.set('Imperium')">Imperium</button>
        <button [class.active]="filter() === 'Chaos'" (click)="filter.set('Chaos')">Chaos</button>
        <button [class.active]="filter() === 'Xenos'" (click)="filter.set('Xenos')">Xenos</button>
      </div>
    </header>

    <section class="grid">
      @for (s of filtered(); track s.id) {
        <a class="card" [routerLink]="['/lore/ships', s.id]" [style.--card-color]="s.color">
          <div class="card-img" [style.background-image]="shipImg(s.id)" [style.background-color]="s.color"></div>
          <div class="card-overlay">
            <div class="card-class">{{ s.class }}</div>
            <h2>{{ s.name }}</h2>
            @if (s.epithet) { <p class="card-epithet">{{ s.epithet }}</p> }
            <div class="card-meta">
              <span class="badge" [class]="'a-' + alignmentClass(s.factionId)">{{ alignment(s.factionId) }}</span>
              <span class="card-faction">{{ s.factionName }}</span>
            </div>
          </div>
        </a>
      }
    </section>
  `,
  styleUrls: ['./lore-ships.component.scss'],
})
export class LoreShipsComponent {
  private readonly service = inject(WarhammerService);

  readonly ships = toSignal(this.service.ships$, { initialValue: [] as LegendaryShip[] });
  readonly filter = signal<'all' | 'Imperium' | 'Chaos' | 'Xenos'>('all');
  readonly shipImages = signal(new Map<string, string>());

  readonly filtered = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.ships();
    return this.ships().filter(s => this.alignment(s.factionId) === f);
  });

  constructor() {
    this.service.ships$.subscribe(list => {
      list.forEach(s => {
        if (s.wikiQuery) {
          this.service.getWikiImage(s.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              this.shipImages.update(m => new Map(m).set(s.id, r.imageUrl!));
            }
          });
        }
      });
    });
  }

  shipImg(id: string): string {
    const url = this.shipImages().get(id);
    return url ? `url('${url}')` : 'none';
  }

  alignment(factionId: string): string {
    return ALIGNMENT_BY_FACTION[factionId] || 'Xenos';
  }

  alignmentClass(factionId: string): string {
    return this.alignment(factionId).toLowerCase();
  }
}
