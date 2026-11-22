import { Component, ElementRef, Injector, ViewChild, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import { Alignment, Faction, Unit } from '../../core/models/models';
import { retryAll, toSafeSignal } from '../../shared/safe-signal';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';

const WIKI_SEARCH: Record<string, string> = {
  'space-marines':       'Space Marines Adeptus Astartes',
  'chaos-space-marines': 'Chaos Space Marines Traitor Legion',
  'aeldari':             'Eldrad Ulthran',
  'orks':                'Warboss Ork',
  'tyranides':           'Tyranid Warrior hive',
  'necrons':             'Szarekh Silent King Necron',
  'tau':                 'Fire Warriors T au',
  'astra-militarum':     'Cadian Shock Troops',
  'adeptus-mechanicus':  'Tech-Priest Adeptus Mechanicus',
  'soeurs-de-bataille':  'Adepta Sororitas warrior',
  'inquisition':         'Inquisitor Torquemada Coteaz',
};

type SortKey = 'az' | 'units' | 'alignement';
type FilterKey = 'all' | 'Imperium' | 'Chaos' | 'Xenos' | 'autres';

const FILTRE_LIBELLE: Record<Exclude<FilterKey, 'all'>, string> = {
  Imperium: 'Imperium', Chaos: 'Chaos', Xenos: 'Xénos', autres: 'Autres',
};

const isAutre = (x: Faction): boolean => !['imperium', 'chaos', 'xenos'].includes(x.alignement.toLowerCase());

@Component({
  selector: 'app-factions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadErrorComponent],
  template: `
    <section class="hero" [style.--hero-img]="heroBgUrl()">
      <div class="hero-content">
        <div class="eyebrow">Les peuples du 41<sup>e</sup> millénaire</div>
        <h1>Factions <span class="fleur">✠</span></h1>
        <p>
          De l'Imperium à la menace du Chaos, des civilisations anciennes aux races xénos —
          chaque peuple lutte pour sa survie dans une galaxie en guerre éternelle.
        </p>
      </div>
    </section>

    <section class="toolbar">
      <div class="filters" role="group" aria-label="Alignement">
        <button #toutes type="button" class="filter" [class.active]="filterKey() === 'all'" [attr.aria-pressed]="filterKey() === 'all'" (click)="filterKey.set('all')">Toutes les factions</button>
        <button type="button" class="filter" [class.active]="filterKey() === 'Imperium'" [attr.aria-pressed]="filterKey() === 'Imperium'" (click)="filterKey.set('Imperium')">Imperium</button>
        <button type="button" class="filter" [class.active]="filterKey() === 'Chaos'" [attr.aria-pressed]="filterKey() === 'Chaos'" (click)="filterKey.set('Chaos')">Chaos</button>
        <button type="button" class="filter" [class.active]="filterKey() === 'Xenos'" [attr.aria-pressed]="filterKey() === 'Xenos'" (click)="filterKey.set('Xenos')">Xénos</button>
        @if (hasAutres()) {
          <button type="button" class="filter" [class.active]="filterKey() === 'autres'" [attr.aria-pressed]="filterKey() === 'autres'" (click)="filterKey.set('autres')">Autres</button>
        }
      </div>
      <input class="search" type="search" placeholder="Rechercher une faction..." aria-label="Rechercher une faction"
             [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
      <select class="sort" aria-label="Trier les factions" [ngModel]="sortKey()" (ngModelChange)="sortKey.set($event)">
        <option value="az">Tri : A-Z</option>
        <option value="units">Tri : nb d'unités</option>
        <option value="alignement">Tri : alignement</option>
      </select>
    </section>

    <section class="layout">
      <div #resultats class="results" tabindex="-1" [attr.aria-busy]="etat() === 'chargement' || reessai()">
      <!-- L96 : région live toujours présente (jamais display:none), annonce le chargement puis le nombre de résultats. -->
      <p class="results-count" role="status" data-testid="compte-factions">{{ compte() }}</p>
      @if (etat() === 'erreur') {
        <!-- L96 : alerte partagée ; pendant le nouvel essai elle reste affichée, bouton en aria-disabled (focus gardé). -->
        <app-load-error message="Les factions n’ont pas pu être chargées. Vérifiez la connexion, puis réessayez."
                        [enCours]="reessai()" alerteTestId="erreur-factions" boutonTestId="bouton-reessayer"
                        (retry)="reessayer()" />
      } @else if (etat() === 'chargement') {
        <div class="grid" aria-hidden="true" data-testid="chargement-factions">
          @for (i of fantomes; track i) {
            <div class="card card-fantome"></div>
          }
        </div>
      } @else if (!factions().length) {
        <div class="etat" data-testid="catalogue-vide"><p>Le codex ne contient encore aucune faction.</p></div>
      } @else if (!displayedFactions().length) {
        <div class="etat" data-testid="filtres-vides">
          <p>Aucune faction ne correspond à {{ filtresActifs() }}.</p>
          <button type="button" class="filter" data-testid="effacer-etat-vide" (click)="effacerFiltres()">Effacer les filtres</button>
        </div>
      } @else {
      <div class="grid">
        @for (f of displayedFactions(); track f.id) {
          <a class="card" [routerLink]="['/factions', f.id]"
                   [style.--card-img]="cardImageUrl(f)">
            <div class="card-sigil">
              @if (f.iconUrl && !brokenIcons().has(f.id)) {
                <img [src]="f.iconUrl" [alt]="f.nom" (error)="iconFailed(f.id)" />
              } @else {
                <span aria-hidden="true">{{ f.symbole }}</span>
              }
            </div>
            <div class="card-content">
              <h2>{{ f.nom }}</h2>
              <span class="badge" [class]="alignClass(f.alignement)">{{ f.alignement }}</span>
              <p>{{ f.description }}</p>
              <div class="card-footer">
                @if (sansUnite(f)) {
                  <span class="units-count units-aucune" data-testid="aucune-unite">Aucune fiche d’unité pour l’instant</span>
                } @else {
                  <span class="units-count">UNITÉS <strong>{{ unitCountLabel(f) }}</strong></span>
                }
                <span class="card-arrow">→</span>
              </div>
            </div>
          </a>
        }
      </div>
      }
      </div>

      <aside class="sidebar">
        <section class="side-panel">
          <h3>À propos des factions</h3>
          <p>
            Les factions sont au cœur du 41<sup>e</sup> millénaire. Chacune possède ses croyances,
            ses objectifs et ses ennemis jurés. Explorez leur histoire, leurs unités, leurs héros
            et leur rôle dans l'éternelle guerre pour la survie.
          </p>
        </section>

        <section class="side-panel">
          <h3>Ressources rapides</h3>
          <a class="resource-row" routerLink="/lore/timeline">
            <div class="resource-ico">⌚</div>
            <div>
              <strong>Chronologie</strong>
              <span>Voir les grands événements</span>
            </div>
          </a>
          <a class="resource-row" routerLink="/lore/galaxy">
            <div class="resource-ico">⊛</div>
            <div>
              <strong>Carte galactique</strong>
              <span>Explorer la galaxie</span>
            </div>
          </a>
          <a class="resource-row" routerLink="/lore/concepts">
            <div class="resource-ico">▤</div>
            <div>
              <strong>Concepts</strong>
              <span>Termes et notions clés</span>
            </div>
          </a>
        </section>
      </aside>
    </section>
  `,
  styleUrls: ['./factions.component.scss'],
})
export class FactionsComponent {
  private readonly service = inject(WarhammerService);
  private readonly injector = inject(Injector);

  /**
   * L102/L96 : le chargement et l'erreur de /api/factions ne sont pas une « liste vide » due au filtre.
   * `toSafeSignal` absorbe l'échec et permet « Réessayer » (le `shareReplay` du service se réinitialise sur erreur).
   */
  private readonly source = toSafeSignal(this.service.factions$, [] as Faction[]);
  /** L96 : un nouvel essai garde l'état d'erreur affiché (bouton en place, focus gardé) jusqu'à la réponse. */
  readonly reessai = signal(false);
  readonly etat = computed<'chargement' | 'erreur' | 'ok'>(() => {
    if (this.source.failed()) return 'erreur';
    if (this.source.pending()) return this.reessai() ? 'erreur' : 'chargement';
    return 'ok';
  });
  readonly factions = computed(() => this.source());
  /** Cartes fantômes de la grille pendant le premier chargement (décoratives, `aria-hidden`). */
  readonly fantomes = [0, 1, 2, 3, 4, 5];
  /** L39 : icônes du wiki introuvables (404) → symbole de la faction à la place. */
  readonly brokenIcons = signal(new Set<string>());
  iconFailed(id: string): void {
    this.brokenIcons.update(s => new Set(s).add(id));
  }
  /** L102/L96 : « — » à la place des comptes tant que /api/units charge ou a échoué : jamais un faux « 0 ». */
  readonly units = toSafeSignal(this.service.getUnits(), [] as Unit[]);
  readonly wikiImages = signal(new Map<string, string>());

  @ViewChild('toutes') private toutes?: ElementRef<HTMLButtonElement>;
  @ViewChild('resultats') private resultats?: ElementRef<HTMLElement>;
  @ViewChild(LoadErrorComponent, { read: ElementRef }) private alerteErreur?: ElementRef<HTMLElement>;

  readonly filterKey = signal<FilterKey>('all');
  readonly searchQuery = signal('');
  readonly sortKey = signal<SortKey>('az');

  /** L96 : texte de la région live — chargement, puis nombre de résultats (vide en erreur : l'alerte parle). */
  readonly compte = computed(() => {
    const e = this.etat();
    if (e === 'chargement') return 'Chargement des factions…';
    if (e === 'erreur') return '';
    const n = this.displayedFactions().length;
    return n === 0 ? 'Aucune faction' : `${n} faction${n > 1 ? 's' : ''}`;
  });

  /** L96 : ce qui vide la liste, nommé dans le message (« la recherche « x » et le filtre Chaos »). */
  readonly filtresActifs = computed(() => {
    const parts: string[] = [];
    const q = this.searchQuery().trim();
    if (q) parts.push(`la recherche « ${q} »`);
    const f = this.filterKey();
    if (f !== 'all') parts.push(`le filtre ${FILTRE_LIBELLE[f]}`);
    return parts.join(' et ') || 'ces filtres';
  });

  /** L96 : « Réessayer » relance les deux sources ; le bouton reste en place pendant l'essai. */
  reessayer(): void {
    if (this.reessai()) return;
    const actif = document.activeElement;
    const avaitFocus = !!actif && !!this.alerteErreur?.nativeElement.contains(actif);
    this.reessai.set(true);
    retryAll(this.source, this.units);
    const fini = effect(() => {
      if (this.source.pending()) return;
      fini.destroy();
      untracked(() => this.reessai.set(false));
      // Succès : le bouton disparaît, le focus va à la liste revenue (WCAG 2.4.3) ; échec : il reste sur le bouton.
      if (avaitFocus && !this.source.failed()) {
        afterNextRender(() => this.focusPremierResultat(), { injector: this.injector });
      }
    }, { injector: this.injector, manualCleanup: true });
  }

  readonly unitCountByFaction = computed(() => {
    const map = new Map<string, number>();
    for (const u of this.units()) map.set(u.factionId, (map.get(u.factionId) ?? 0) + 1);
    return map;
  });

  /** L102 : « Autres » n'est proposé que si au moins une faction y entre. */
  readonly hasAutres = computed(() => this.factions().some(x => isAutre(x)));

  /**
   * L96 (comme /videos L242) : « Effacer les filtres » de l'état vide disparaît avec lui ; le focus va au premier
   * résultat revenu (jamais `body`, WCAG 2.4.3) et la région live annonce le nombre de factions.
   */
  effacerFiltres(): void {
    this.filterKey.set('all');
    this.searchQuery.set('');
    afterNextRender(() => this.focusPremierResultat(), { injector: this.injector });
  }

  private focusPremierResultat(): void {
    const liste = this.resultats?.nativeElement;
    (liste?.querySelector<HTMLElement>('a.card') ?? liste ?? this.toutes?.nativeElement)?.focus();
  }

  readonly displayedFactions = computed(() => {
    const f = this.factions();
    const filter = this.filterKey();
    const q = this.searchQuery().toLowerCase().trim();
    const sort = this.sortKey();
    let out = f;
    if (filter === 'autres') {
      // « Autres » = tout ce qui n'est pas un des 3 alignements principaux (L92 : comparaison en
      // minuscules des deux côtés, 'Imperium' n'égalait pas 'imperium' et les 17 factions passaient).
      out = out.filter(isAutre);
    } else if (filter !== 'all') {
      out = out.filter(x => x.alignement === filter);
    }
    if (q) {
      out = out.filter(x =>
        x.nom.toLowerCase().includes(q) ||
        x.description.toLowerCase().includes(q)
      );
    }
    const counts = this.unitCountByFaction();
    out = [...out].sort((a, b) => {
      if (sort === 'az') return a.nom.localeCompare(b.nom, 'fr');
      if (sort === 'units') return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      return a.alignement.localeCompare(b.alignement);
    });
    return out;
  });

  constructor() {
    effect(() => {
      const factions = this.factions();
      if (!factions.length) return;
      factions.forEach(f => {
        const query = WIKI_SEARCH[f.id] ?? f.nom;
        this.service.getWikiImage(query).subscribe({
          next: (res) => {
            if (res.imageUrl) {
              this.wikiImages.update(m => new Map(m).set(f.id, res.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });
  }

  unitCount(f: Faction): number {
    return f.unitCount ?? this.unitCountByFaction().get(f.id) ?? 0;
  }

  /**
   * L246 : la faction n'a vraiment aucune unité dans les données (compte servi, ou /api/units chargé) :
   * la carte le dit en toutes lettres plutôt qu'un « UNITÉS 0 » qui ressemble à une panne.
   * Six factions du seed sont dans ce cas le 22-11 (Custodes, Assassinorum, Drukhari, Grey Knights,
   * Votann, Genestealer Cults).
   */
  sansUnite(f: Faction): boolean {
    if (f.unitCount != null) return f.unitCount === 0;
    return !this.units.pending() && !this.units.failed() && this.unitCount(f) === 0;
  }

  /** « — » tant que /api/units n'a pas répondu ou a échoué (sauf compte servi avec la faction). */
  unitCountLabel(f: Faction): string {
    if (f.unitCount != null) return String(f.unitCount);
    return this.units.pending() || this.units.failed() ? '—' : String(this.unitCount(f));
  }

  alignClass(alignement: string): string {
    const a = alignement.toLowerCase();
    if (a === 'imperium') return 'blue';
    if (a === 'chaos') return 'red';
    return 'green';
  }

  cardImageUrl(f: Faction): string {
    const url = this.wikiImages().get(f.id);
    if (url) return `url('${url}')`;
    return `linear-gradient(135deg, ${f.couleurThematique}dd 0%, #0a0a0a 100%)`;
  }

  heroBgUrl(): string {
    const sm = this.factions().find(f => f.id === 'space-marines');
    if (sm) {
      const url = this.wikiImages().get(sm.id);
      if (url) return `url('${url}')`;
    }
    return 'linear-gradient(135deg, #1a3a6e 0%, #0a0a0a 100%)';
  }

}
