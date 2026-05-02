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
  styles: [`
    :host { display: block; }

    .hero {
      position: relative;
      min-height: 280px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #080706;
      box-shadow: var(--shadow);
      margin-bottom: 32px;
      display: flex;
      align-items: end;
      padding: 50px 50px 44px;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 70% 40%, rgba(123, 17, 19, 0.42), transparent 55%),
        radial-gradient(circle at 30% 80%, rgba(201, 162, 74, 0.15), transparent 50%),
        linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.92) 80%);
    }
    .hero-content { position: relative; z-index: 1; max-width: 760px; }
    .eyebrow {
      color: var(--gold);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .eyebrow.small { font-size: 10px; margin-bottom: 8px; }
    .hero h1 {
      font-size: clamp(44px, 5vw, 68px);
      line-height: 1.05;
      margin: 0 0 18px;
      color: var(--gold-bright);
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 35px rgba(201, 162, 74, 0.25);
    }
    .lede { font-size: 16px; color: var(--text); line-height: 1.65; margin: 0; }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
      margin-bottom: 44px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 26px 26px 24px;
      border: 1px solid var(--border);
      background: rgba(11, 9, 7, 0.7);
      transition: border-color 0.2s, transform 0.2s;
      color: var(--text);
      min-height: 240px;
    }
    .card:hover:not(.disabled) {
      border-color: var(--border-strong);
      transform: translateY(-3px);
    }
    .card.disabled { opacity: 0.55; cursor: default; }
    .card-ico {
      font-size: 38px;
      color: var(--gold);
      line-height: 1;
      filter: drop-shadow(0 0 10px rgba(201, 162, 74, 0.4));
    }
    .card-ico.muted { color: var(--muted); filter: none; }
    .card h2 {
      font-size: 22px;
      margin: 4px 0 6px;
      color: var(--gold);
    }
    .card p {
      flex: 1;
      font-size: 13px;
      color: var(--muted);
      line-height: 1.6;
      margin: 0;
    }
    .card-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      margin-top: 8px;
    }
    .card-foot .meta {
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--gold);
    }
    .card-foot .arrow { color: var(--gold-bright); font-size: 18px; }
    .badge-soon {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      border: 1px solid var(--border);
      padding: 3px 8px;
    }

    .footnote {
      max-width: 720px;
      margin: 24px auto 8px;
      text-align: center;
    }
    .ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 16px;
    }
    .ornament .line {
      flex: 0 0 80px;
      height: 1px;
      background: linear-gradient(to right, transparent, var(--gold-soft), transparent);
    }
    .ornament .aigle { color: var(--gold); font-size: 18px; }
    .footnote p {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.7;
      font-style: italic;
    }
  `],
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
  ];
}
