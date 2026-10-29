import { afterNextRender, Component, computed, effect, inject, Injector, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { GodMachine, GodMachineCategory } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';
import { LightboxDialogDirective } from '../../shared/lightbox-dialog.directive';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';
import { compteur, toSafeSignal } from '../../shared/safe-signal';
import { teinteLisible } from '../../core/utils/teinte-lisible';

const CATEGORY_LABEL: Record<GodMachineCategory, string> = {
  titan: 'Titans',
  knight: 'Chevaliers',
  'war-machine': 'Walkers'
};

@Component({
  selector: 'app-lore-titans',
  standalone: true,
  imports: [LoadErrorComponent, CommonModule, RouterLink, FigureLightboxComponent, LightboxDialogDirective],
  template: `
    <a class="back-btn" routerLink="/lore">← RETOUR AU CODEX</a>

    <header class="hero">
      <h1>Titans, Chevaliers & Dieux-Machines</h1>
      <p class="lead">
        Cathédrales-machines ambulantes, walkers chevaleresques pilotés par la noblesse, robots cybernétiques
        sans âme — la guerre à grande échelle dans Warhammer 40,000 se mène avec ces géants de métal sacralisé.
        Chacun est une légende, chacun est un dieu mineur fait de pression hydraulique et d'esprit-machine.
      </p>
      <div class="filters" role="group" aria-label="Filtrer par catégorie">
        <button type="button" [class.active]="filter() === 'all'" [attr.aria-pressed]="filter() === 'all'" (click)="filter.set('all')">Tous · {{ nb(machines().length) }}</button>
        <button type="button" [class.active]="filter() === 'titan'" [attr.aria-pressed]="filter() === 'titan'" (click)="filter.set('titan')">Titans</button>
        <button type="button" [class.active]="filter() === 'knight'" [attr.aria-pressed]="filter() === 'knight'" (click)="filter.set('knight')">Chevaliers</button>
        <button type="button" [class.active]="filter() === 'war-machine'" [attr.aria-pressed]="filter() === 'war-machine'" (click)="filter.set('war-machine')">Walkers</button>
      </div>
    </header>

    @if (machines.failed()) {
      <app-load-error (retry)="machines.retry()" />
    }

    <section class="grid">
      @for (m of filtered(); track m.id) {
        <div class="card-wrap">
        <a class="card" [routerLink]="['/lore/titans', m.id]" [style.--card-color]="m.color">
          <div class="card-img" [style.background-image]="machineImg(m.id)" [style.background-color]="m.color"></div>
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
        @if (machineImages().has(m.id)) {
          <button class="card-zoom" type="button" (click)="openLightbox(m, $event)" [attr.aria-label]="'Voir en grand : ' + m.name">⛶</button>
        }
        </div>
      }
    </section>

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)"
                         [appLightboxDialog]="lightbox() ? 'Visionneuse — ' + lightbox()!.title : null" />
  `,
  styleUrls: ['../lore-ships/lore-ships.component.scss'],
})
export class LoreTitansComponent {
  private readonly service = inject(WarhammerService);
  private readonly injector = inject(Injector);

  readonly machines = toSafeSignal(this.service.godMachines$, [] as GodMachine[]);
  readonly filter = signal<'all' | GodMachineCategory>('all');
  readonly machineImages = signal(new Map<string, string>());
  readonly lightbox = signal<LightboxState | null>(null);
  /** Le ⛶ qui a ouvert la visionneuse : il récupère le focus à la fermeture. */
  private opener: HTMLElement | null = null;

  /** L115 : « — » tant que la liste est en échec. */
  nb(n: number): string { return compteur(n, this.machines.failed()); }

  readonly filtered = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.machines();
    return this.machines().filter(m => m.category === f);
  });

  constructor() {
    effect(() => {
      const list = this.machines();
      untracked(() => {
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
    });
  }

  machineImg(id: string): string {
    const url = this.machineImages().get(id);
    return url ? `url('${url}')` : 'none';
  }

  openLightbox(m: GodMachine, ev?: Event): void {
    const baseUrl = this.machineImages().get(m.id);
    if (!baseUrl) return;
    this.opener = ev?.currentTarget instanceof HTMLElement ? ev.currentTarget : null;
    this.lightbox.set({
      title: m.name,
      subtitle: `${m.scoutClass} — ${m.factionName}`,
      description: m.epithet || undefined,
      contextName: 'Titans & Dieux-Machines',
      // Teinte éclaircie (≥ 4,5:1) : les couleurs du seed (#7a2020, #3a4a8e, #3a5c1a) sont illisibles sur le fond noir de la visionneuse.
      contextColor: teinteLisible(m.color),
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

  closeLightbox(): void {
    this.lightbox.set(null);
    const origine = this.opener;
    this.opener = null;
    // Après le rendu : la visionneuse est encore dans le DOM avant, et lui rendre le focus plus tôt le lui ferait reprendre.
    afterNextRender(() => { if (origine?.isConnected) origine.focus(); }, { injector: this.injector });
  }
}
