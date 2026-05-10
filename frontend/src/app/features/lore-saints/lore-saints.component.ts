import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Saint, SaintCategory } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';

const CATEGORY_LABEL: Record<SaintCategory, string> = {
  'living-saint': 'Sainte Vivante',
  'saint-canonized': 'Sainte canonisée',
  'ecclesiarch-canonized': 'Ecclésiarque canonisé',
};

@Component({
  selector: 'app-lore-saints',
  standalone: true,
  imports: [CommonModule, RouterLink, FigureLightboxComponent],
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
          <button class="card-zoom" type="button" (click)="$event.stopPropagation(); $event.preventDefault(); openLightbox(s)" aria-label="Voir en grand">⛶</button>
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

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)" />
  `,
  styleUrls: ['../lore-ships/lore-ships.component.scss'],
})
export class LoreSaintsComponent {
  private readonly service = inject(WarhammerService);

  readonly saints = toSignal(this.service.saints$, { initialValue: [] as Saint[] });
  readonly filter = signal<'all' | SaintCategory>('all');
  readonly saintImages = signal(new Map<string, string>());
  readonly lightbox = signal<LightboxState | null>(null);

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

  openLightbox(s: Saint): void {
    const baseUrl = this.saintImages().get(s.id);
    if (!baseUrl) return;
    this.lightbox.set({
      title: s.name,
      subtitle: `${CATEGORY_LABEL[s.category]} — ${s.ordoOrChapter}`,
      description: s.epithet || undefined,
      contextName: 'Saintes & Saints',
      contextColor: s.color,
      contextSigil: '✠',
      searchQuery: s.name,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });
    const baseQuery = s.wikiQuery ?? s.name;
    const variants = [
      `${baseQuery} warhammer 40k`,
      `${baseQuery} art`,
      `${baseQuery} Sisters of Battle`,
      `${baseQuery} Imperial saint`,
    ];
    for (const q of variants) {
      this.service.getWikiImage(q).subscribe({
        next: r => {
          if (!r.imageUrl) return;
          const cur = this.lightbox();
          if (!cur || cur.title !== s.name) return;
          if (cur.thumbUrls.includes(r.imageUrl)) return;
          this.lightbox.set({ ...cur, thumbUrls: [...cur.thumbUrls, r.imageUrl] });
        },
        error: () => {},
      });
    }
  }

  selectThumb(idx: number): void {
    const cur = this.lightbox();
    if (!cur) return;
    const url = cur.thumbUrls[idx];
    if (!url) return;
    this.lightbox.set({ ...cur, mainUrl: url, selectedIdx: idx });
  }

  closeLightbox(): void { this.lightbox.set(null); }
}
