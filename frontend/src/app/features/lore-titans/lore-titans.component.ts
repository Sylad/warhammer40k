import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { GodMachine, GodMachineCategory } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';

const CATEGORY_LABEL: Record<GodMachineCategory, string> = {
  titan: 'Titans',
  knight: 'Chevaliers',
  'war-machine': 'Walkers'
};

@Component({
  selector: 'app-lore-titans',
  standalone: true,
  imports: [CommonModule, RouterLink, FigureLightboxComponent],
  template: `
    <a class="back-btn" routerLink="/lore">← RETOUR AU CODEX</a>

    <header class="hero">
      <h1>Titans, Chevaliers & Dieux-Machines</h1>
      <p class="lead">
        Cathédrales-machines ambulantes, walkers chevaleresques pilotés par la noblesse, robots cybernétiques
        sans âme — la guerre à grande échelle dans Warhammer 40,000 se mène avec ces géants de métal sacralisé.
        Chacun est une légende, chacun est un dieu mineur fait de pression hydraulique et d'esprit-machine.
      </p>
      <div class="filters">
        <button [class.active]="filter() === 'all'" (click)="filter.set('all')">Tous · {{ machines().length }}</button>
        <button [class.active]="filter() === 'titan'" (click)="filter.set('titan')">Titans</button>
        <button [class.active]="filter() === 'knight'" (click)="filter.set('knight')">Chevaliers</button>
        <button [class.active]="filter() === 'war-machine'" (click)="filter.set('war-machine')">Walkers</button>
      </div>
    </header>

    <section class="grid">
      @for (m of filtered(); track m.id) {
        <a class="card" [routerLink]="['/lore/titans', m.id]" [style.--card-color]="m.color">
          <div class="card-img" [style.background-image]="machineImg(m.id)" [style.background-color]="m.color"></div>
          <button class="card-zoom" type="button" (click)="$event.stopPropagation(); $event.preventDefault(); openLightbox(m)" aria-label="Voir en grand">⛶</button>
          <div class="card-overlay">
            <div class="card-class">{{ m.scoutClass }}</div>
            <h2>{{ m.name }}</h2>
            @if (m.epithet) { <p class="card-epithet">{{ m.epithet }}</p> }
            <div class="card-meta">
              <span class="size-badge">{{ m.size }}</span>
              <span class="card-faction">{{ m.factionName }}</span>
            </div>
          </div>
        </a>
      }
    </section>

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)" />
  `,
  styleUrls: ['../lore-ships/lore-ships.component.scss'],
})
export class LoreTitansComponent {
  private readonly service = inject(WarhammerService);

  readonly machines = toSignal(this.service.godMachines$, { initialValue: [] as GodMachine[] });
  readonly filter = signal<'all' | GodMachineCategory>('all');
  readonly machineImages = signal(new Map<string, string>());
  readonly lightbox = signal<LightboxState | null>(null);

  readonly filtered = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.machines();
    return this.machines().filter(m => m.category === f);
  });

  constructor() {
    this.service.godMachines$.subscribe(list => {
      list.forEach(m => {
        if (m.wikiQuery) {
          this.service.getWikiImage(m.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              this.machineImages.update(map => new Map(map).set(m.id, r.imageUrl!));
            }
          });
        }
      });
    });
  }

  machineImg(id: string): string {
    const url = this.machineImages().get(id);
    return url ? `url('${url}')` : 'none';
  }

  openLightbox(m: GodMachine): void {
    const baseUrl = this.machineImages().get(m.id);
    if (!baseUrl) return;
    this.lightbox.set({
      title: m.name,
      subtitle: `${m.scoutClass} — ${m.factionName}`,
      description: m.epithet || undefined,
      contextName: 'Titans & Dieux-Machines',
      contextColor: m.color,
      contextSigil: '⚙',
      searchQuery: m.name,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });
    const baseQuery = m.wikiQuery ?? m.name;
    const variants = [
      `${baseQuery} warhammer 40k`,
      `${baseQuery} art`,
      `${baseQuery} concept art`,
      `${baseQuery} miniature`,
    ];
    for (const q of variants) {
      this.service.getWikiImage(q).subscribe({
        next: r => {
          if (!r.imageUrl) return;
          const cur = this.lightbox();
          if (!cur || cur.title !== m.name) return;
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
