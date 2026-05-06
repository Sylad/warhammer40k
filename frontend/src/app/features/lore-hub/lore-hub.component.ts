import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
      @for (c of cards; track c.route) {
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
  cards: LoreCard[] = [
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
        '10 Loyalistes, 9 Traîtres, 2 Disparus. Lion El\'Jonson, Sanguinius, Guilliman, Horus, Magnus, Angron, Mortarion… leur statut au M42, leurs légions, leurs morts ou résurrections.',
      meta: '20 fiches',
      available: true,
    },
    {
      route: '/lore/chaos-gods',
      ico: '☠',
      eyebrow: 'Les Quatre',
      title: 'Le Panthéon Chaos',
      description:
        'Khorne, Tzeentch, Nurgle, Slaanesh — les quatre puissances ruineuses du Warp. Leurs sphères, leurs daemons, leurs primarques corrompus.',
      meta: '4 dieux · 8 daemons notables',
      available: true,
    },
    {
      route: '/lore/civilians',
      ico: '⚙',
      eyebrow: 'Les rouages humains',
      title: 'Civils Impériaux',
      description:
        'Administratum, Ministorum, Arbites, Navigators, Astropaths, Sœurs du Silence, Rogue Traders, Knight Households… les ordres invisibles qui font tenir l\'Imperium debout.',
      meta: '10 organisations · 30+ fonctions',
      available: true,
    },
    {
      route: '/lore/concepts',
      ico: '📜',
      eyebrow: 'Encyclopédie',
      title: 'Concepts &amp; Lieux',
      description:
        'Trône d\'Or, Astronomican, Œil de la Terreur, Cicatrix Maledictum, Codex Astartes, Cadia, Holy Terra, Macragge… les piliers et les fissures de la galaxie.',
      meta: '14 concepts · 4 catégories',
      available: true,
    },
    {
      route: '/lore/galaxy',
      ico: '✦',
      eyebrow: 'Carte galactique',
      title: 'La Galaxie',
      description:
        'Les 5 Segmenta, l\'Œil de la Terreur, le Maelstrom, la Cicatrice Maledictum, les mondes-clés. Carte SVG interactive avec hot zones cliquables.',
      meta: '11 hot zones · 3 failles warp',
      available: true,
    },
    {
      route: '/lore/equipment',
      ico: '⚒',
      eyebrow: 'Codex de l\'arsenal',
      title: 'Armement & Reliques',
      description:
        'Bolters, plasma, melta, marteaux-tonnerre, wraithbone, gauss, daemon weapons, Mark IV-X, Cataphractii, reliques nommées (Drach\'nyen, Black Sword, Mjalnar)… armes, armures, et objets sacrés ou damnés.',
      meta: '69 pièces · 4 types',
      available: true,
    },
    {
      route: '/lore/timeline',
      ico: '⌬',
      eyebrow: 'Codex chronologique',
      title: 'Chronologie',
      description:
        'De la Vieille Nuit à la Cicatrix Maledictum, les jalons gravés dans la pierre des reliquaires impériaux. Trente millénaires d\'agonie, de conquête et de foi — Hérésie, Croisades, Chutes de Cadia et Indomitus.',
      meta: '29 événements · 6 ères',
      available: true,
    },
  ];
}
