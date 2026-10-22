import { ReplaySubject, switchMap, take } from 'rxjs';
import { Component, computed, EventEmitter, HostListener, inject, OnDestroy, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WarhammerService } from '../../../core/services/warhammer.service';
import { toSafeSignal } from '../../safe-signal';
import { subCategoryLabel } from '../../sub-category-label';

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
  { type: 'page', label: 'Jeux vidéo', sublabel: 'À venir et déjà sortis', routerLink: ['/jeux-video'], weight: 0 },
  { type: 'page', label: 'Galerie', sublabel: 'Artworks', routerLink: ['/gallery'], weight: 0 },
  { type: 'page', label: 'Nouveautés', sublabel: 'Ce qui a changé', routerLink: ['/nouveautes'], weight: 0 },
  { type: 'page', label: 'Plan de travail', sublabel: 'Ce qui se prépare', routerLink: ['/plan'], weight: 0 },
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
      <div class="cmdk-panel" role="dialog" aria-label="Recherche globale" (keydown)="boucler($event)" (mousedown)="garderFocus($event)">
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
                (click)="navigated.emit(); close(false)"
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
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2000;
      backdrop-filter: blur(4px);
    }
    .cmdk-panel {
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
      width: min(640px, 92vw); max-height: 70vh;
      background: rgba(11,9,7,0.97); border: 1px solid var(--border-strong);
      box-shadow: 0 24px 80px rgba(0,0,0,0.85);
      z-index: 2001;
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
export class CommandPaletteComponent implements OnDestroy {
  private readonly service = inject(WarhammerService);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);
  query = '';
  readonly queryS = signal('');
  readonly selectedIndex = signal(0);

  // Load all searchable data once
  private readonly factions = toSafeSignal(this.service.factions$, []);
  // 350 Ko (loreLong compris) : demandées à la première ouverture, pas à chaque page vue.
  private readonly premiereOuverture$ = new ReplaySubject<void>(1);
  private readonly subFactions = toSafeSignal(this.premiereOuverture$.pipe(take(1), switchMap(() => this.service.subFactions$)), []);
  private readonly primarchs = toSafeSignal(this.service.primarchs$, []);
  private readonly saints = toSafeSignal(this.service.saints$, []);
  private readonly ships = toSafeSignal(this.service.ships$, []);
  private readonly titans = toSafeSignal(this.service.godMachines$, []);
  private readonly equipment = toSafeSignal(this.service.equipment$, []);
  private readonly events = toSafeSignal(this.service.timelineEvents$, []);

  readonly results = computed(() => {
    const q = this.queryS().toLowerCase().trim();
    if (q.length < 2) return [];
    const nomsFactions = new Map(this.factions().map(f => [f.id, f.nom]));
    const all: SearchResult[] = [
      ...this.factions().map(f => ({ type: 'faction' as const, label: f.nom, sublabel: f.alignement, routerLink: ['/factions', f.id], weight: 10 })),
      ...this.subFactions().map(s => ({ type: 'subfaction' as const, label: s.name, sublabel: nomsFactions.get(s.factionId) ?? s.factionId, routerLink: ['/subfactions', s.id], weight: 9 })),
      ...this.primarchs().map(p => ({ type: 'primarch' as const, label: p.name, sublabel: p.legion, routerLink: ['/lore/primarchs', p.id], weight: 9 })),
      ...this.saints().map(s => ({ type: 'saint' as const, label: s.name, sublabel: s.ordoOrChapter, routerLink: ['/lore/saints', s.id], weight: 8 })),
      ...this.ships().map(s => ({ type: 'ship' as const, label: s.name, sublabel: s.factionName, routerLink: ['/lore/ships', s.id], weight: 7 })),
      ...this.titans().map(t => ({ type: 'titan' as const, label: t.name, sublabel: t.scoutClass, routerLink: ['/lore/titans', t.id], weight: 7 })),
      ...this.events().map(e => ({ type: 'event' as const, label: e.title, sublabel: e.date, routerLink: ['/lore/timeline', e.id], weight: 5 })),
      ...this.equipment().map(e => ({ type: 'equipment' as const, label: e.name, sublabel: subCategoryLabel(e.subCategory), routerLink: ['/lore/equipment', e.id], weight: 5 })),
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

  /**
   * L30 : un résultat choisi (Entrée ou clic) — la palette se ferme, son champ disparaît :
   * la mise en page place le focus sur le titre de la page d'arrivée (comme le tiroir).
   */
  @Output() readonly navigated = new EventEmitter<void>();

  /** L110 : une source tombée au démarrage est relancée à chaque ouverture ; les autres ne sont pas rechargées. */
  private relancerSourcesEnEchec(): void {
    for (const s of [this.factions, this.subFactions, this.primarchs, this.saints, this.ships, this.titans, this.equipment, this.events]) {
      if (s.failed()) s.retry();
    }
  }

  open(): void {
    this.relancerSourcesEnEchec();
    this.premiereOuverture$.next();
    const actif = document.activeElement;
    this.avant = actif instanceof HTMLElement && actif !== document.body ? actif : null;
    this.isOpen.set(true);
    this.query = '';
    this.queryS.set('');
    this.selectedIndex.set(0);
    // Le handle est gardé : une ouverture répétée remplace le timer, la destruction l'annule
    // (sinon il tire après le démontage de l'environnement — « document is not defined » en CI).
    this.annulerFocus();
    this.focusTimer = setTimeout(() => {
      this.focusTimer = undefined;
      const input = document.querySelector<HTMLInputElement>('.cmdk-input');
      input?.focus();
    }, 50);
  }

  private focusTimer: ReturnType<typeof setTimeout> | undefined;

  private annulerFocus(): void {
    if (this.focusTimer !== undefined) {
      clearTimeout(this.focusTimer);
      this.focusTimer = undefined;
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.surEchap, true);
    this.annulerFocus();
  }

  /**
   * L163 (WCAG 2.4.3) : fermée sans destination (Échap, fond, Ctrl+K), la recherche rend le focus à
   * l'élément qui l'avait avant l'ouverture ; fermée sur un résultat (`rendreFocus = false`), elle ne
   * le reprend pas : la mise en page place le focus sur le titre de la page d'arrivée.
   */
  close(rendreFocus = true): void {
    this.isOpen.set(false);
    const avant = this.avant;
    this.avant = null;
    this.annulerFocus();
    if (rendreFocus && avant?.isConnected) avant.focus();
  }

  private avant: HTMLElement | null = null;

  /** L163 : Tab boucle dans la recherche (champ ↔ résultats) au lieu de sortir vers la page dessous. */
  boucler(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const panneau = e.currentTarget as HTMLElement;
    const focalisables = Array.from(panneau.querySelectorAll<HTMLElement>('input, a[href]'));
    const premier = focalisables[0];
    const dernier = focalisables[focalisables.length - 1];
    const actif = document.activeElement;
    if (e.shiftKey && (actif === premier || !panneau.contains(actif))) {
      e.preventDefault();
      dernier?.focus();
    } else if (!e.shiftKey && (actif === dernier || !panneau.contains(actif))) {
      e.preventDefault();
      premier?.focus();
    }
  }

  /**
   * L163 : un clic sur une zone non focalisable du panneau (pied, aide, « Aucun résultat ») donnerait le
   * focus à `body` — le `keydown` de Tab ne traverserait plus le panneau et sortirait vers la page cachée.
   * On annule la prise de focus par défaut ; champ et résultats gardent la leur.
   */
  garderFocus(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('input, a[href]')) e.preventDefault();
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
        this.navigated.emit();
        this.router.navigate(sel.routerLink);
        this.close(false);
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (this.isOpen()) this.close();
      else this.open();
    }
  }

  /**
   * Échap ferme la recherche SEULE (Nielsen n°3 : un Échap, une couche). Écoute en capture sur `window` :
   * elle passe avant les écouteurs `document:keydown.escape` des couches du dessous (visionneuse
   * `figure-lightbox`, tiroir), que `stopPropagation` ne laisse pas la voir — quel que soit l'ordre
   * de création des composants. Le suivant, la recherche fermée, atteint la couche d'en dessous.
   */
  private readonly surEchap = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !this.isOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    this.close();
  };

  constructor() {
    window.addEventListener('keydown', this.surEchap, true);
  }

  typeLabel(t: SearchResult['type']): string { return TYPE_LABEL[t]; }
}
