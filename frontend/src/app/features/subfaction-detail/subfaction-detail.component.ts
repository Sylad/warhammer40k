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
                <div><span class="ki-label">Primarque</span><span class="ki-val">{{ d.subfaction.primarch }}</span></div>
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
              @if (d.subfaction.primarch) { <dt>Primarque</dt><dd>{{ d.subfaction.primarch }}</dd> }
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
  styles: [`
    :host { display: block; }
    .page {
      width: min(1440px, calc(100% - 64px));
      margin: 0 auto;
      padding: 24px 0 64px;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 18px;
      color: var(--gold);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .back-link:hover { color: var(--gold-bright); }

    .hero {
      position: relative;
      min-height: 320px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: var(--panel);
      box-shadow: var(--shadow);
      margin-bottom: 28px;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: contrast(1.4) saturate(0.92) brightness(0.5);
    }
    .hero-content {
      position: relative;
      z-index: 1;
      min-height: 320px;
      display: grid;
      align-items: end;
      padding: 36px 40px;
    }
    .eyebrow {
      display: block;
      color: var(--gold);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .hero h1 {
      margin: 0 0 16px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: clamp(38px, 5vw, 64px);
      line-height: 0.95;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 38px rgba(201, 162, 74, 0.28);
    }
    .hero-desc {
      max-width: 720px;
      color: #cfc3ad;
      font-size: 16px;
      line-height: 1.65;
      margin: 0 0 18px;
    }
    .key-info {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      max-width: 800px;
    }
    .key-info > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ki-label {
      color: var(--muted);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .ki-val {
      color: var(--gold-bright);
      font-size: 14px;
      font-weight: 700;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 24px;
    }
    .main-col { min-width: 0; }
    .block { margin-bottom: 32px; }
    .block h2 {
      margin: 0 0 16px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 22px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .block p {
      color: #cfc3ad;
      line-height: 1.7;
      max-width: 780px;
    }
    .empty { color: var(--muted); font-style: italic; }
    .empty a { color: var(--gold); }

    .unit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }
    .unit-card {
      display: block;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background: var(--panel);
      text-decoration: none;
      color: inherit;
      overflow: hidden;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .unit-card:hover { transform: translateY(-4px); border-color: rgba(201, 162, 74, 0.55); }
    .unit-thumb {
      aspect-ratio: 16 / 10;
      background-size: cover;
      background-position: center;
      background-color: #050403;
      border-bottom: 1px solid rgba(201, 162, 74, 0.18);
    }
    .unit-info {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .unit-type {
      color: var(--gold);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .unit-info strong {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 15px;
    }
    .unit-role {
      color: var(--muted);
      font-size: 12px;
    }

    .succ-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
    }
    .succ-card {
      display: block;
      padding: 14px 16px;
      border: 1px solid rgba(201, 162, 74, 0.28);
      background: rgba(8, 7, 6, 0.6);
      color: inherit;
      text-decoration: none;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .succ-card:hover { border-color: var(--gold); transform: translateY(-2px); }
    .succ-card strong {
      display: block;
      color: var(--gold-bright);
      font-family: var(--serif);
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .succ-card span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .sidebar {
      position: sticky;
      top: 96px;
      align-self: start;
      display: grid;
      gap: 18px;
    }
    .side-panel {
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(19, 15, 11, 0.92), rgba(5, 4, 3, 0.96));
      padding: 18px;
    }
    .side-panel h3 {
      margin: 0 0 14px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
    }
    dl { margin: 0; }
    dl dt {
      color: var(--muted);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 10px;
    }
    dl dt:first-child { margin-top: 0; }
    dl dd {
      margin: 2px 0 0;
      color: #ead7a2;
      font-size: 14px;
    }
    dl dd a { color: var(--gold-bright); }
    .quick-link {
      display: block;
      padding: 8px 0;
      color: #c9beaa;
      font-size: 13px;
      text-decoration: none;
      border-top: 1px solid rgba(201, 162, 74, 0.12);
    }
    .quick-link:first-of-type { border-top: 0; }
    .quick-link:hover { color: var(--gold-bright); }

    .loading {
      padding: 60px;
      text-align: center;
      color: var(--muted);
    }

    @media (max-width: 1024px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: relative; top: auto; }
    }
    @media (max-width: 760px) {
      .page { width: min(100% - 28px, 1440px); }
      .hero-content { padding: 24px; }
    }
  `],
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
