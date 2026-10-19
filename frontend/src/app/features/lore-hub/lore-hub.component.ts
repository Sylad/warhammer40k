import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { HOT_ZONES } from '../lore-galaxy/lore-galaxy.data';
import { hubMeta, primarchsSummary, type HubData } from './lore-hub.counts';

interface LoreCard {
  route: string;
  ico: string;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  available: boolean;
}

@Component({
  selector: 'app-lore-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="eyebrow">Archives sacrées du 41<sup>e</sup> millénaire</div>
        <h1>Lore Impérial</h1>
        <p class="lede">
          Au-delà des factions et des unités, le tissu narratif de Warhammer 40,000
          est porté par quelques entités centrales : un Empereur cloué sur Son Trône d'Or,
          vingt Primarques dispersés à travers le temps, quatre Dieux du Chaos qui
          conspirent dans le Warp. Voici les portails vers chacun.
        </p>
      </div>
    </section>

    <section class="cards">
      @for (c of cards(); track c.route) {
        @if (c.available) {
          <a class="card" [routerLink]="c.route">
            <div class="card-ico">{{ c.ico }}</div>
            <div class="eyebrow small">{{ c.eyebrow }}</div>
            <h2>{{ c.title }}</h2>
            <p>{{ c.description }}</p>
            <div class="card-foot">
              <span class="meta">{{ c.meta }}</span>
              <span class="arrow">→</span>
            </div>
          </a>
        } @else {
          <div class="card disabled">
            <div class="card-ico muted">{{ c.ico }}</div>
            <div class="eyebrow small">{{ c.eyebrow }}</div>
            <h2>{{ c.title }}</h2>
            <p>{{ c.description }}</p>
            <div class="card-foot">
              <span class="meta">{{ c.meta }}</span>
              <span class="badge-soon">À venir</span>
            </div>
          </div>
        }
      }
    </section>

    <section class="footnote">
      <div class="ornament"><span class="line"></span><span class="aigle">⚜</span><span class="line"></span></div>
      <p>
        Le lore est un océan sans rivage. Les pages ici ne prétendent pas à l'exhaustivité —
        elles tracent les grandes lignes pour le lecteur curieux. Pour creuser, suivez les liens
        wiki, lisez Black Library, ou laissez le Trône d'Or vous parler dans vos rêves.
      </p>
    </section>
  `,
  styleUrls: ['./lore-hub.component.scss'],
})
export class LoreHubComponent {
  private readonly service = inject(WarhammerService);

  /** Un flux en erreur vaut « indisponible » : sa carte n'affiche alors aucun chiffre. */
  private readonly data = toSignal(
    combineLatest({
      primarchs: this.service.primarchs$.pipe(catchError(() => of(null))),
      chaosGods: this.service.chaosGods$.pipe(catchError(() => of(null))),
      orgs: this.service.imperialOrgs$.pipe(catchError(() => of(null))),
      concepts: this.service.loreConcepts$.pipe(catchError(() => of(null))),
      events: this.service.timelineEvents$.pipe(catchError(() => of(null))),
      equipment: this.service.equipment$.pipe(catchError(() => of(null))),
      ships: this.service.ships$.pipe(catchError(() => of(null))),
      godMachines: this.service.godMachines$.pipe(catchError(() => of(null))),
      saints: this.service.saints$.pipe(catchError(() => of(null))),
    }),
    { initialValue: null },
  );

  readonly cards = computed((): LoreCard[] => {
    const d = this.data();
    const meta = hubMeta({ ...(d ?? EMPTY), zones: HOT_ZONES });
    return CARDS.map((c) => ({
      ...c,
      meta: meta[c.route] ?? c.meta,
      description: c.route === '/lore/primarchs' ? c.description.replace('{repartition} ', primarchsSummary(d?.primarchs ?? null)?.concat(' ') ?? '') : c.description,
    }));
  });
}

const EMPTY: Omit<HubData, 'zones'> = {
  primarchs: null, chaosGods: null, orgs: null, concepts: null, events: null,
  equipment: null, ships: null, godMachines: null, saints: null,
};

const CARDS: LoreCard[] = [
    {
      route: '/lore/emperor',
      ico: '✠',
      eyebrow: 'Le Maître de l\'Humanité',
      title: "L'Empereur",
      description:
        'Né en Anatolie préhistorique, fondateur de l\'Imperium, cloué sur le Trône d\'Or depuis dix mille ans. Origine, Grande Croisade, Hérésie, Trône, et apparitions au M42.',
      meta: '6 sections lore',
      available: true,
    },
    {
      route: '/lore/primarchs',
      ico: '⚜',
      eyebrow: 'Les vingt fils',
      title: 'Les Primarques',
      description:
        '{repartition} Lion El\'Jonson, Sanguinius, Guilliman, Horus, Magnus, Angron, Mortarion… leur statut au M42, leurs légions, leurs morts ou résurrections.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/chaos-gods',
      ico: '☠',
      eyebrow: 'Les Quatre',
      title: 'Le Panthéon Chaos',
      description:
        'Khorne, Tzeentch, Nurgle, Slaanesh — les quatre puissances ruineuses du Warp. Leurs sphères, leurs daemons, leurs primarques corrompus.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/civilians',
      ico: '⚙',
      eyebrow: 'Les rouages humains',
      title: 'Civils Impériaux',
      description:
        'Administratum, Ministorum, Arbites, Navigators, Astropaths, Sœurs du Silence, Rogue Traders, Knight Households… les ordres invisibles qui font tenir l\'Imperium debout.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/concepts',
      ico: '📜',
      eyebrow: 'Encyclopédie',
      title: 'Concepts & Lieux',
      description:
        'Trône d\'Or, Astronomican, Œil de la Terreur, Cicatrix Maledictum, Codex Astartes, Cadia, Holy Terra, Macragge… les piliers et les fissures de la galaxie.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/galaxy',
      ico: '✦',
      eyebrow: 'Carte galactique',
      title: 'La Galaxie',
      description:
        'Les 5 Segmenta, l\'Œil de la Terreur, le Maelstrom, la Cicatrice Maledictum, les mondes-clés. Carte SVG interactive avec hot zones cliquables.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/equipment',
      ico: '⚒',
      eyebrow: 'Codex de l\'arsenal',
      title: 'Armement & Reliques',
      description:
        'Bolters, plasma, melta, marteaux-tonnerre, wraithbone, gauss, daemon weapons, Mark IV-X, Cataphractii, reliques nommées (Drach\'nyen, Black Sword, Mjalnar)… armes, armures, et objets sacrés ou damnés.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/timeline',
      ico: '⌬',
      eyebrow: 'Codex chronologique',
      title: 'Chronologie',
      description:
        'De la Vieille Nuit à la Cicatrix Maledictum, les jalons gravés dans la pierre des reliquaires impériaux. Trente millénaires d\'agonie, de conquête et de foi — Hérésie, Croisades, Chutes de Cadia et Indomitus.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/ships',
      ico: '⛴',
      eyebrow: 'Codex naval',
      title: 'Vaisseaux Légendaires',
      description:
        'Phalanx, Vengeful Spirit, Macragge\'s Honour, Endurance, Eternal Crusader, Ark Mechanicus Speranza… les vaisseaux qui portent les Primarques, transportent les Légions, et déchirent les flottes ennemies.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/titans',
      ico: '⚙',
      eyebrow: 'Codex titanique',
      title: 'Titans, Chevaliers & Dieux-Machines',
      description:
        'Warhound, Reaver, Warlord, Imperator. Knights Paladin, Errant, Castellan. Robots Kastelan. Stompas Orks. Cathédrales-machines de 12 à 55 mètres, bénies par les Tech-Prêtres, pilotées par la noblesse martiale.',
      meta: '',
      available: true,
    },
    {
      route: '/lore/saints',
      ico: '✠',
      eyebrow: 'Codex hagiographique',
      title: 'Saintes & Saints',
      description:
        'Saint Celestine, Saint Katherine, Saint Sabbat, Saint Drusus, Sebastian Thor, Saint Silvana, Saint Praxedes, Saint Sanguinaire. Les figures qui galvanisent un trillion de fidèles à travers la galaxie. Acta Saint, miracles, martyres.',
      meta: '',
      available: true,
    },
];
