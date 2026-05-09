import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, of, catchError, combineLatest } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { SubFaction, SubFactionType, Unit, Faction } from '../../core/models/models';

const TYPE_LABEL: Record<SubFactionType, string> = {
  chapter: 'Chapitre',
  regiment: 'Régiment',
  klan: 'Klan',
  craftworld: 'Vaisseau-Monde',
  hivefleet: 'Flotte-Ruche',
  dynasty: 'Dynastie',
  sept: 'Sept',
  forgeworld: 'Monde-Forge',
  order: 'Ordre',
  legion: 'Légion',
  shield_host: 'Shield Host',
  temple: 'Temple',
  kabal: 'Kabale',
  wych_cult: 'Culte Wych',
  haemonculus_coven: 'Coven Haemonculus',
  brotherhood: 'Brotherhood',
  kindred: 'Kindred',
  cult: 'Culte',
  other: 'Sous-faction',
};

@Component({
  selector: 'app-subfaction-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page" *ngIf="data() as d">
      <a [routerLink]="['/factions', d.subfaction.factionId]" class="back-link">
        ← {{ d.faction?.nom ?? 'Faction parente' }}
      </a>

      <header class="hero">
        <div class="hero-bg" [style.background-image]="heroBgUrl()"></div>
        <div class="hero-content">
          <div class="hero-text">
            <span class="eyebrow">{{ typeLabel(d.subfaction.type) }} · {{ d.faction?.nom }}</span>
            <h1>{{ d.subfaction.name }}</h1>
            <p class="hero-desc">{{ d.subfaction.description }}</p>
            <div class="key-info">
              @if (d.subfaction.primarch) {
                <div>
                  <span class="ki-label">Primarque</span>
                  @if (d.subfaction.primarchId) {
                    <a class="ki-val ki-link" [routerLink]="['/lore/primarchs', d.subfaction.primarchId]">{{ d.subfaction.primarch }} →</a>
                  } @else {
                    <span class="ki-val">{{ d.subfaction.primarch }}</span>
                  }
                </div>
              }
              @if (d.subfaction.homeworld) {
                <div><span class="ki-label">Monde-mère</span><span class="ki-val">{{ d.subfaction.homeworld }}</span></div>
              }
              @if (d.subfaction.founding) {
                <div><span class="ki-label">Fondation</span><span class="ki-val">{{ d.subfaction.founding }}</span></div>
              }
              @if (d.subfaction.motto) {
                <div><span class="ki-label">Devise</span><span class="ki-val">« {{ d.subfaction.motto }} »</span></div>
              }
            </div>
          </div>
        </div>
      </header>

      <section class="layout">
        <div class="main-col">
          @if (d.subfaction.loreShort || d.subfaction.loreLong) {
            <section class="block">
              <h2>Histoire & Lore</h2>
              @if (d.subfaction.loreLong) {
                <p>{{ d.subfaction.loreLong }}</p>
              } @else {
                <p>{{ d.subfaction.loreShort }}</p>
              }
            </section>
          }

          @if (d.subfaction.currentState) {
            <section class="block">
              <h2>État Actuel · M42</h2>
              <p>{{ d.subfaction.currentState }}</p>
            </section>
          }

          @if (d.subfaction.notableBattles?.length) {
            <section class="block">
              <h2>Batailles Notables</h2>
              <ul class="battles-list">
                @for (b of d.subfaction.notableBattles; track b.name) {
                  <li>
                    <div class="battle-head">
                      <strong>{{ b.name }}</strong>
                      @if (b.date) { <span class="battle-date">{{ b.date }}</span> }
                    </div>
                    <p>{{ b.summary }}</p>
                  </li>
                }
              </ul>
            </section>
          }

          <section class="block">
            <h2>Unités notables</h2>
            @if (d.units.length === 0) {
              <p class="empty">
                Aucune unité spécifiquement liée pour l'instant.
                Voir <a [routerLink]="['/factions', d.subfaction.factionId]">toutes les unités de {{ d.faction?.nom }}</a>.
              </p>
            } @else {
              <div class="unit-grid">
                @for (u of d.units; track u.id) {
                  <a class="unit-card" [routerLink]="['/units', u.id]">
                    <div class="unit-thumb" [style.background-image]="unitBg(u.id)"></div>
                    <div class="unit-info">
                      <span class="unit-type">{{ u.type }}</span>
                      <strong>{{ u.nom }}</strong>
                      @if (u.role) { <span class="unit-role">{{ u.role }}</span> }
                    </div>
                  </a>
                }
              </div>
            }
          </section>

          @if (d.successors.length > 0) {
            <section class="block">
              <h2>{{ d.subfaction.type === 'chapter' ? 'Chapitres successeurs' : 'Successeurs' }}</h2>
              <div class="succ-grid">
                @for (s of d.successors; track s.id) {
                  <a class="succ-card" [routerLink]="['/subfactions', s.id]">
                    <strong>{{ s.name }}</strong>
                    <span>{{ s.description }}</span>
                  </a>
                }
              </div>
            </section>
          }
        </div>

        <aside class="sidebar">
          <section class="side-panel">
            <h3>Informations clés</h3>
            <dl>
              <dt>Type</dt><dd>{{ typeLabel(d.subfaction.type) }}</dd>
              @if (d.subfaction.primarch) {
                <dt>Primarque</dt>
                <dd>
                  @if (d.subfaction.primarchId) {
                    <a class="dd-link" [routerLink]="['/lore/primarchs', d.subfaction.primarchId]">{{ d.subfaction.primarch }} →</a>
                  } @else {
                    {{ d.subfaction.primarch }}
                  }
                </dd>
              }
              @if (d.subfaction.homeworld) { <dt>Monde-mère</dt><dd>{{ d.subfaction.homeworld }}</dd> }
              @if (d.subfaction.founding) { <dt>Fondation</dt><dd>{{ d.subfaction.founding }}</dd> }
              <dt>Faction parente</dt><dd>
                <a [routerLink]="['/factions', d.subfaction.factionId]">{{ d.faction?.nom ?? d.subfaction.factionId }}</a>
              </dd>
              @if (d.parent) {
                <dt>Successeur de</dt><dd>
                  <a [routerLink]="['/subfactions', d.parent.id]">{{ d.parent.name }}</a>
                </dd>
              }
            </dl>
          </section>

          <section class="side-panel">
            <h3>Liens rapides</h3>
            <a class="quick-link" [routerLink]="['/factions', d.subfaction.factionId]">
              ← Toutes les sous-factions de {{ d.faction?.nom }}
            </a>
            <a class="quick-link" routerLink="/factions">Toutes les factions</a>
          </section>
        </aside>
      </section>
    </section>

    @if (loading()) {
      <div class="loading">Chargement…</div>
    }
    @if (notFound()) {
      <div class="loading">Sous-faction introuvable. <a routerLink="/factions">Retour</a></div>
    }
  `,
  styleUrls: ['./subfaction-detail.component.scss'],
})
export class SubFactionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(WarhammerService);

  readonly heroBgUrl = signal<string>('linear-gradient(135deg, #1a0a08 0%, #050403 100%)');
  private readonly unitImgCache = signal<Record<string, string>>({});

  readonly notFound = signal(false);
  readonly loading = signal(true);

  readonly data = toSignal(
    this.route.params.pipe(
      switchMap(params => {
        const id = params['id'];
        this.loading.set(true);
        this.notFound.set(false);
        return this.service.getSubFaction(id).pipe(
          switchMap(sub =>
            combineLatest([
              of(sub),
              this.service.getFaction(sub.factionId).pipe(catchError(() => of(null as Faction | null))),
              sub.parentSubFactionId
                ? this.service.getSubFaction(sub.parentSubFactionId).pipe(catchError(() => of(null as SubFaction | null)))
                : of(null as SubFaction | null),
              this.service.getSubFactionSuccessors(sub.id).pipe(catchError(() => of([] as SubFaction[]))),
              (sub.unitIds && sub.unitIds.length > 0
                ? this.service.getUnits(sub.factionId).pipe(map(units => units.filter(u => sub.unitIds!.includes(u.id))))
                : of([] as Unit[])),
            ]).pipe(
              map(([subfaction, faction, parent, successors, units]) => ({ subfaction, faction, parent, successors, units })),
            ),
          ),
          catchError(() => {
            this.notFound.set(true);
            this.loading.set(false);
            return of(null);
          }),
        );
      }),
    ),
    { initialValue: null },
  );

  constructor() {
    effect(() => {
      const d = this.data();
      if (d) {
        this.loading.set(false);
        const q = d.subfaction.wikiQuery ?? `${d.subfaction.name} warhammer`;
        this.service.getWikiImage(q).subscribe(r => {
          if (r.imageUrl) this.heroBgUrl.set(`url('${r.imageUrl}')`);
        });
        for (const u of d.units) {
          if (this.unitImgCache()[u.id]) continue;
          this.service.getWikiImage(`${u.nom} warhammer`).subscribe(r => {
            if (r.imageUrl) {
              this.unitImgCache.update(c => ({ ...c, [u.id]: r.imageUrl! }));
            }
          });
        }
      }
    });
  }

  unitBg(unitId: string): string {
    const url = this.unitImgCache()[unitId];
    return url ? `url('${url}')` : 'linear-gradient(135deg, #1a0a08 0%, #050403 100%)';
  }

  typeLabel(type: SubFactionType): string {
    return TYPE_LABEL[type] ?? type;
  }
}
