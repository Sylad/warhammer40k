import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { WarhammerService } from '../../../core/services/warhammer.service';

interface SearchResult {
  type: 'faction' | 'subfaction' | 'unit' | 'primarch' | 'saint' | 'ship' | 'titan' | 'event' | 'equipment' | 'concept' | 'org' | 'page';
  label: string;
  sublabel?: string;
  routerLink: any[];
  weight: number;
}

const PAGE_LINKS: SearchResult[] = [
  { type: 'page', label: 'Accueil', sublabel: 'Dashboard', routerLink: ['/'], weight: 0 },
  { type: 'page', label: 'Factions', sublabel: 'Liste 17 factions', routerLink: ['/factions'], weight: 0 },
  { type: 'page', label: 'Lore', sublabel: 'Hub codex', routerLink: ['/lore'], weight: 0 },
  { type: 'page', label: 'Empereur', sublabel: 'L\'Empereur de l\'Humanité', routerLink: ['/lore/emperor'], weight: 0 },
  { type: 'page', label: 'Primarques', sublabel: 'Les 20 Fils', routerLink: ['/lore/primarchs'], weight: 0 },
  { type: 'page', label: 'Saints', sublabel: 'Saintes Vivantes', routerLink: ['/lore/saints'], weight: 0 },
  { type: 'page', label: 'Vaisseaux', sublabel: 'Légendaires', routerLink: ['/lore/ships'], weight: 0 },
  { type: 'page', label: 'Titans', sublabel: 'Dieux-Machines', routerLink: ['/lore/titans'], weight: 0 },
  { type: 'page', label: 'Chronologie', sublabel: 'Timeline 35 events', routerLink: ['/lore/timeline'], weight: 0 },
  { type: 'page', label: 'Galaxie', sublabel: 'Carte galactique', routerLink: ['/lore/galaxy'], weight: 0 },
  { type: 'page', label: 'Dieux du Chaos', sublabel: 'Panthéon', routerLink: ['/lore/chaos-gods'], weight: 0 },
  { type: 'page', label: 'Imperial Orgs', sublabel: 'Civilians/Mechanicus/Custodes', routerLink: ['/lore/civilians'], weight: 0 },
  { type: 'page', label: 'Concepts', sublabel: '15 concepts lore', routerLink: ['/lore/concepts'], weight: 0 },
  { type: 'page', label: 'Armement', sublabel: 'Armes & reliques', routerLink: ['/lore/equipment'], weight: 0 },
  { type: 'page', label: 'Romans', sublabel: 'Black Library', routerLink: ['/romans'], weight: 0 },
  { type: 'page', label: 'Vidéos', sublabel: 'YouTube', routerLink: ['/videos'], weight: 0 },
  { type: 'page', label: 'Galerie', sublabel: 'Artworks', routerLink: ['/gallery'], weight: 0 },
];

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  faction: 'Faction',
  subfaction: 'Sous-faction',
  unit: 'Unité',
  primarch: 'Primarque',
  saint: 'Saint',
  ship: 'Vaisseau',
  titan: 'Titan',
  event: 'Événement',
  equipment: 'Équipement',
  concept: 'Concept',
  org: 'Organisation',
  page: 'Page',
};

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (isOpen()) {
      <div class="cmdk-backdrop" (click)="close()"></div>
      <div class="cmdk-panel" role="dialog" aria-label="Recherche globale">
        <div class="cmdk-header">
          <span class="cmdk-icon">⌕</span>
          <input
            #cmdkInput
            class="cmdk-input"
            type="text"
            placeholder="Rechercher dans le codex…"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange($event)"
            (keydown)="onKeyDown($event)"
            autofocus
          />
          <span class="cmdk-shortcut">Esc</span>
        </div>

        <div class="cmdk-results">
          @if (results().length === 0 && query.length > 1) {
            <div class="cmdk-empty">Aucun résultat pour « {{ query }} »</div>
          } @else if (results().length === 0) {
            <div class="cmdk-hint">Tape au moins 2 caractères. Astuce : « celestine », « guilliman », « phalanx », « cadia »…</div>
          } @else {
            @for (r of results(); track r.routerLink.join('/'); let i = $index) {
              <a
                class="cmdk-item"
                [class.active]="selectedIndex() === i"
                [routerLink]="r.routerLink"
                (click)="close()"
                (mouseenter)="selectedIndex.set(i)">
                <span class="cmdk-type">{{ typeLabel(r.type) }}</span>
                <span class="cmdk-label">{{ r.label }}</span>
                @if (r.sublabel) { <span class="cmdk-sub">{{ r.sublabel }}</span> }
                <span class="cmdk-arrow">›</span>
              </a>
            }
          }
        </div>

        <div class="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> ouvrir</span>
          <span><kbd>Esc</kbd> fermer</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .cmdk-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 999;
      backdrop-filter: blur(4px);
    }
    .cmdk-panel {
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
      width: min(640px, 92vw); max-height: 70vh;
      background: rgba(11,9,7,0.97); border: 1px solid var(--border-strong);
      box-shadow: 0 24px 80px rgba(0,0,0,0.85);
      z-index: 1000;
      display: flex; flex-direction: column;
    }
    .cmdk-header {
      display: flex; align-items: center; gap: 12px;
      padding: 18px 22px; border-bottom: 1px solid var(--border);
    }
    .cmdk-icon { font-size: 22px; color: var(--gold); }
    .cmdk-input {
      flex: 1; background: transparent; border: none; outline: none;
      font-family: var(--sans); font-size: 16px; color: var(--text);
      letter-spacing: 0.04em;
    }
    .cmdk-input::placeholder { color: var(--muted); }
    .cmdk-shortcut {
      font-family: var(--serif); font-size: 10px; letter-spacing: 0.18em;
      color: var(--muted); border: 1px solid var(--border); padding: 4px 8px;
    }
    .cmdk-results {
      flex: 1; overflow-y: auto; padding: 8px 0;
    }
    .cmdk-empty, .cmdk-hint {
      padding: 24px; text-align: center; color: var(--muted);
      font-size: 14px;
    }
    .cmdk-item {
      display: grid; grid-template-columns: 100px 1fr auto 16px;
      gap: 12px; align-items: center;
      padding: 10px 22px; text-decoration: none; color: var(--text);
      border-left: 3px solid transparent;
      transition: all 0.12s;
    }
    .cmdk-item.active, .cmdk-item:hover {
      background: rgba(201,162,74,0.08);
      border-left-color: var(--gold);
    }
    .cmdk-item.active .cmdk-label { color: var(--gold-bright); }
    .cmdk-type {
      font-family: var(--serif); font-size: 10px; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--gold);
    }
    .cmdk-label { font-size: 14px; font-weight: 500; }
    .cmdk-sub { font-size: 12px; color: var(--muted); }
    .cmdk-arrow { color: var(--muted); }
    .cmdk-footer {
      display: flex; gap: 24px; justify-content: center;
      padding: 12px; border-top: 1px solid var(--border);
      font-size: 11px; color: var(--muted);
    }
    .cmdk-footer kbd {
      font-family: var(--sans); padding: 2px 6px; margin-right: 4px;
      background: rgba(255,255,255,0.06); border: 1px solid var(--border);
      border-radius: 2px; font-size: 10px;
    }
    @media (max-width: 760px) {
      .cmdk-panel { top: 60px; width: 96vw; }
      .cmdk-item { grid-template-columns: 80px 1fr 16px; }
      .cmdk-sub { display: none; }
      .cmdk-footer { gap: 12px; flex-wrap: wrap; }
    }
  `],
})
export class CommandPaletteComponent {
  private readonly service = inject(WarhammerService);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);
  query = '';
  readonly queryS = signal('');
  readonly selectedIndex = signal(0);

  // Load all searchable data once
  private readonly factions = toSignal(this.service.factions$, { initialValue: [] });
  private readonly primarchs = toSignal(this.service.primarchs$, { initialValue: [] });
  private readonly saints = toSignal(this.service.saints$, { initialValue: [] });
  private readonly ships = toSignal(this.service.ships$, { initialValue: [] });
  private readonly titans = toSignal(this.service.godMachines$, { initialValue: [] });
  private readonly equipment = toSignal(this.service.equipment$, { initialValue: [] });
  private readonly events = toSignal(this.service.timelineEvents$, { initialValue: [] });

  readonly results = computed(() => {
    const q = this.queryS().toLowerCase().trim();
    if (q.length < 2) return [];
    const all: SearchResult[] = [
      ...this.factions().map(f => ({ type: 'faction' as const, label: f.nom, sublabel: f.alignement, routerLink: ['/factions', f.id], weight: 10 })),
      ...this.primarchs().map(p => ({ type: 'primarch' as const, label: p.name, sublabel: p.legion, routerLink: ['/lore/primarchs', p.id], weight: 9 })),
      ...this.saints().map(s => ({ type: 'saint' as const, label: s.name, sublabel: s.ordoOrChapter, routerLink: ['/lore/saints', s.id], weight: 8 })),
      ...this.ships().map(s => ({ type: 'ship' as const, label: s.name, sublabel: s.factionName, routerLink: ['/lore/ships', s.id], weight: 7 })),
      ...this.titans().map(t => ({ type: 'titan' as const, label: t.name, sublabel: t.scoutClass, routerLink: ['/lore/titans', t.id], weight: 7 })),
      ...this.events().map(e => ({ type: 'event' as const, label: e.title, sublabel: e.date, routerLink: ['/lore/timeline', e.id], weight: 5 })),
      ...this.equipment().map(e => ({ type: 'equipment' as const, label: e.name, sublabel: e.subCategory, routerLink: ['/lore/equipment', e.id], weight: 5 })),
      ...PAGE_LINKS.map(p => ({ ...p, weight: 1 })),
    ];
    const matches = all
      .map(r => ({ r, score: this.score(r, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ r }) => r);
    return matches;
  });

  private score(r: SearchResult, q: string): number {
    const label = r.label.toLowerCase();
    const sub = (r.sublabel ?? '').toLowerCase();
    if (label === q) return 100 + r.weight;
    if (label.startsWith(q)) return 50 + r.weight;
    if (label.includes(q)) return 25 + r.weight;
    if (sub.includes(q)) return 10 + r.weight;
    return 0;
  }

  open(): void {
    this.isOpen.set(true);
    this.query = '';
    this.queryS.set('');
    this.selectedIndex.set(0);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.cmdk-input');
      input?.focus();
    }, 50);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onQueryChange(v: string): void {
    this.queryS.set(v);
    this.selectedIndex.set(0);
  }

  onKeyDown(e: KeyboardEvent): void {
    const r = this.results();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex.set(Math.min(this.selectedIndex() + 1, r.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex.set(Math.max(this.selectedIndex() - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = r[this.selectedIndex()];
      if (sel) {
        this.router.navigate(sel.routerLink);
        this.close();
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (this.isOpen()) this.close();
      else this.open();
    } else if (e.key === 'Escape' && this.isOpen()) {
      e.preventDefault();
      this.close();
    }
  }

  typeLabel(t: SearchResult['type']): string { return TYPE_LABEL[t]; }
}
