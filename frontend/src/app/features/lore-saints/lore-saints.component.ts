import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Saint, SaintCategory } from '../../core/models/models';

const CATEGORY_LABEL: Record<SaintCategory, string> = {
  'living-saint': 'Sainte Vivante',
  'saint-canonized': 'Sainte canonisée',
  'ecclesiarch-canonized': 'Ecclésiarque canonisé',
};

@Component({
  selector: 'app-lore-saints',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="back-btn" routerLink="/lore">← RETOUR AU CODEX</a>

    <header class="hero">
      <h1>Saintes & Saints de l'Imperium</h1>
      <p class="lead">
        L'Imperial Cult vénère ses Saintes Vivantes, ses canonisés à titre posthume, ses Ecclésiarques réformateurs.
        Chaque Saint manifeste un fragment de la grâce de l'Empereur — par miracles, par martyres, par la simple
        présence inspirante. Voici les figures qui galvanisent un trillion de fidèles à travers la galaxie.
      </p>
      <div class="filters">
        <button [class.active]="filter() === 'all'" (click)="filter.set('all')">Tous · {{ saints().length }}</button>
        <button [class.active]="filter() === 'living-saint'" (click)="filter.set('living-saint')">Saintes Vivantes</button>
        <button [class.active]="filter() === 'saint-canonized'" (click)="filter.set('saint-canonized')">Canonisés</button>
        <button [class.active]="filter() === 'ecclesiarch-canonized'" (click)="filter.set('ecclesiarch-canonized')">Ecclésiarques</button>
      </div>
    </header>

    <section class="grid">
      @for (s of filtered(); track s.id) {
        <a class="card" [routerLink]="['/lore/saints', s.id]" [style.--card-color]="s.color">
          <div class="card-img" [style.background-image]="saintImg(s.id)" [style.background-color]="s.color"></div>
          <div class="card-overlay">
            <div class="card-class">{{ categoryLabel(s.category) }}</div>
            <h2>{{ s.name }}</h2>
            @if (s.epithet) { <p class="card-epithet">{{ s.epithet }}</p> }
            <div class="card-meta">
              <span class="size-badge">{{ s.era }}</span>
              <span class="card-faction">{{ s.ordoOrChapter }}</span>
            </div>
          </div>
        </a>
      }
    </section>
  `,
  styleUrls: ['../lore-ships/lore-ships.component.scss'],
})
export class LoreSaintsComponent {
  private readonly service = inject(WarhammerService);

  readonly saints = toSignal(this.service.saints$, { initialValue: [] as Saint[] });
  readonly filter = signal<'all' | SaintCategory>('all');
  readonly saintImages = signal(new Map<string, string>());

  readonly filtered = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.saints();
    return this.saints().filter(s => s.category === f);
  });

  constructor() {
    this.service.saints$.subscribe(list => {
      list.forEach(s => {
        if (s.wikiQuery) {
          this.service.getWikiImage(s.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              this.saintImages.update(m => new Map(m).set(s.id, r.imageUrl!));
            }
          });
        }
      });
    });
  }

  saintImg(id: string): string {
    const url = this.saintImages().get(id);
    return url ? `url('${url}')` : 'none';
  }

  categoryLabel(c: SaintCategory): string { return CATEGORY_LABEL[c]; }
}
