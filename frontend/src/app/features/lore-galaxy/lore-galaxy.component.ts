import { AfterViewInit, Component, effect, ElementRef, OnDestroy, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import * as L from 'leaflet';

interface Segmentum {
  id: string;
  name: string;
  color: string;
  description: string;
  /** Polygon points in pixel-image-space (cx, cy). Contour réel non-wedge. */
  polygon: [number, number][];
}

interface HotZone {
  id: string;
  name: string;
  type: 'world' | 'rift' | 'nexus';
  cx: number;
  cy: number;
  r: number;
  color: string;
  description: string;
  conceptId?: string;
  external?: string;
  /** Optional category tag for sub-grouping (primarch-homeworld, segmentum-hq, etc.) */
  category?: 'primarch-homeworld' | 'segmentum-hq' | 'shrine-world' | 'forge-world' | 'death-world' | 'fortress-world' | 'eldar-craftworld' | 'war-zone' | 'standard';
  /**
   * Lien direct vers une page détail lore. Si absent, fallback vers /lore/concepts
   * (avec fragment conceptId si présent).
   */
  linkTo?: { type: 'primarch' | 'timeline' | 'saint' | 'ship'; id: string };
}


@Component({
  selector: 'app-lore-galaxy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="badge">✦ Imperius Dominatus · Carte des Cinq Segmenta</div>
        <h1>La Galaxie</h1>
        <p class="lede">
          Carte canonique de la Voie Lactée au M42. Cinq Segmenta administratifs depuis Terra,
          deux failles warp permanentes, et la Cicatrix Maledictum qui traverse la galaxie
          depuis la chute de Cadia. Survolez les pastilles colorées, cliquez pour explorer le lore.
        </p>
      </div>
    </section>

    <div class="layout">
      <main class="map-wrap">
        <div class="map-filters">
          <button class="map-filter-btn" [class.active]="showWorlds()" (click)="showWorlds.set(!showWorlds())">
            <span class="map-filter-dot" style="background:#f0d276;color:#f0d276"></span>
            Mondes <span class="map-filter-count">{{ countByType('world') }}</span>
          </button>
          <button class="map-filter-btn" [class.active]="showRifts()" (click)="showRifts.set(!showRifts())">
            <span class="map-filter-dot" style="background:#9c2680;color:#9c2680"></span>
            Failles warp <span class="map-filter-count">{{ countByType('rift') }}</span>
          </button>
          <button class="map-filter-btn" [class.active]="showSegmenta()" (click)="showSegmenta.set(!showSegmenta())">
            <span class="map-filter-dot" style="background:linear-gradient(135deg,#9c2680,#1d4ba0,#5fc97a,#3a6cc4,#f0d276);"></span>
            Segmenta
          </button>
        </div>
        <div #leafletMap class="leaflet-galaxy"></div>
        <div class="map-help">⊕ molette pour zoomer · clic-glissé pour déplacer · clic sur un point pour explorer</div>

        <div class="map-calib" [class.active]="calibrationMode()">
          <button class="calib-toggle" type="button" (click)="calibrationMode.set(!calibrationMode())"
                  [title]="calibrationMode() ? 'Désactiver le mode calibration' : 'Activer le mode calibration (markers draggables)'">
            <span class="calib-ico">🎯</span>
            <span class="calib-label">{{ calibrationMode() ? 'Calibration ON' : 'Mode calibration' }}</span>
          </button>
          @if (calibrationMode()) {
            <span class="calib-hint">Glisse les pastilles · Esc pour quitter le plein écran · ouvre F12 pour voir les coords</span>
            <button class="calib-export" type="button" (click)="exportCalibration()" title="Logguer + copier le JSON des markers déplacés">
              📋 Export JSON
            </button>
          }
        </div>
      </main>

      <aside class="legend">
        <h3>Les 5 Segmenta</h3>
        <div class="seg-grid">
          @for (seg of segmenta; track seg.id) {
            <div class="seg-card" [style.--seg-color]="seg.color">
              <div class="seg-dot"></div>
              <div>
                <div class="seg-name">{{ seg.name }}</div>
                <p>{{ seg.description }}</p>
              </div>
            </div>
          }
        </div>

        <h3>Failles warp</h3>
        <div class="rift-card eye">
          <div class="rift-name">Œil de la Terreur</div>
          <p>Plaie warp permanente née de la naissance de Slaanesh (M30).</p>
          <a class="rift-link" routerLink="/lore/concepts" fragment="eye-of-terror">Voir lore →</a>
        </div>
        <div class="rift-card maelstrom">
          <div class="rift-name">Maelstrom</div>
          <p>Tempête warp permanente du Segmentum Ultima.</p>
          <a class="rift-link" routerLink="/lore/concepts" fragment="maelstrom">Voir lore →</a>
        </div>
        <div class="rift-card cicatrix">
          <div class="rift-name">Cicatrix Maledictum</div>
          <p>Déchirure galactique née de la chute de Cadia (M41). Imperium Sanctus / Nihilus.</p>
          <a class="rift-link" routerLink="/lore/concepts" fragment="cicatrix-maledictum">Voir lore →</a>
        </div>

        <h3>Hot zones cliquables</h3>
        <ul class="hz-list">
          @for (hz of hotZones; track hz.id) {
            <li>
              <button class="hz-btn" (click)="goTo(hz)" [style.--hz-color]="hz.color">
                <span class="hz-bullet"></span>{{ hz.name }}
              </button>
            </li>
          }
        </ul>

        <div class="credit">
          Carte : <em>Imperius Dominatus, Imperial Record 0853</em> (M42).<br>
          Source : Warhammer 40K Wiki Fandom (CC BY-SA).
        </div>
      </aside>
    </div>

    <section class="cta-bottom">
      <div class="ornament"><span class="line"></span><span class="aigle">✠</span><span class="line"></span></div>
      <p class="cta-text">
        Une galaxie de mille milliards de mondes. Une cathédrale d'or qui se fissure.<br>
        Quelque part au centre, un homme cloué sur un Trône regarde sa lumière s'éteindre.
      </p>
      <div class="cta-actions">
        <a routerLink="/lore/concepts" class="cta-link">Encyclopédie des concepts →</a>
      </div>
    </section>
  `,
  styleUrls: ['./lore-galaxy.component.scss'],
})
export class LoreGalaxyComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly service = inject(WarhammerService);

  @ViewChild('leafletMap', { static: false }) leafletMapRef?: ElementRef<HTMLDivElement>;
  private map?: L.Map;
  private worldsLayer?: L.LayerGroup;
  private riftsLayer?: L.LayerGroup;
  private cicatrixLayer?: L.LayerGroup;
  private segmentaLayer?: L.LayerGroup;

  readonly hoveredId = signal<string | null>(null);
  readonly mapBgUrl = signal<string>('');
  readonly showWorlds = signal(true);
  readonly showRifts = signal(true);
  readonly showCicatrix = signal(true);
  readonly showSegmenta = signal(true);
  readonly calibrationMode = signal(false);

  private readonly markersById = new Map<string, L.Marker>();
  private readonly draggedCoords = new Map<string, [number, number]>();

  // Polygones EXACTS extraits via OpenCV de la map canon coloriée par l'utilisateur
  // (galaxy-map-segmenta.jpg, 3740×2300, color thresholding par segmentum).
  // Les Segmenta sont des AGRÉGATIONS de sectors → contours irréguliers (pas de
  // forme wedge canonique). Les wedges Terra-centrés s'appliqueront aux Sectors
  // quand on les attaquera.
  readonly segmenta: Segmentum[] = [
    { id: 'solar', name: 'Solar', color: '#c9a24a',
      description: 'Centre galactique. Terra, Mars, Trône d\'Or.',
      polygon: [[755,1043],[701,989],[686,1007],[673,1025],[661,1043],[649,1061],[640,1079],[631,1097],[624,1116],[618,1134],[613,1153],[609,1171],[607,1190],[606,1208],[606,1227],[607,1246],[610,1265],[613,1284],[618,1303],[625,1322],[632,1341],[641,1360],[651,1379],[662,1398],[674,1418],[688,1437],[703,1457],[655,1517],[678,1535],[702,1551],[725,1566],[749,1579],[772,1591],[795,1601],[818,1610],[842,1617],[865,1623],[888,1628],[911,1631],[934,1632],[957,1632],[980,1631],[1002,1628],[1025,1623],[1048,1617],[1071,1610],[1093,1601],[1116,1590],[1138,1578],[1161,1565],[1183,1550],[1206,1534],[1228,1516],[1168,1456],[1185,1437],[1200,1417],[1214,1398],[1226,1379],[1237,1359],[1247,1340],[1255,1321],[1262,1301],[1267,1282],[1272,1263],[1274,1244],[1275,1224],[1275,1205],[1274,1186],[1271,1166],[1266,1147],[1261,1128],[1253,1109],[1245,1089],[1235,1070],[1224,1051],[1211,1032],[1197,1012],[1181,993],[1164,974],[1295,864],[1289,857],[1283,850],[1277,844],[1272,838],[1266,832],[1260,826],[1254,821],[1248,815],[1242,811],[1236,806],[1230,801],[1224,797],[1218,793],[1212,789],[1206,786],[1200,782],[1194,779],[1188,776],[1182,774],[1176,771],[1170,769],[1164,767],[1158,766],[1152,764],[1146,763],[1050,993],[1037,988],[1025,983],[1012,979],[999,975],[987,972],[974,969],[962,967],[950,966],[938,966],[926,966],[914,966],[902,968],[890,970],[878,972],[867,976],[855,980],[844,984],[832,989],[821,995],[810,1001],[799,1008],[788,1016],[777,1024],[766,1033]] },
    { id: 'obscurus', name: 'Obscurus', color: '#7e3d8e',
      description: 'Nord galactique. Œil de la Terreur, Cadia (✝).',
      polygon: [[759,1041],[770,1032],[781,1023],[792,1015],[803,1007],[814,1000],[825,994],[836,988],[848,983],[859,979],[870,975],[882,972],[893,969],[905,967],[916,966],[928,965],[939,965],[951,965],[963,967],[975,968],[987,971],[999,974],[1011,977],[1023,982],[1035,986],[1047,992],[1150,764],[1155,765],[1161,766],[1166,768],[1172,769],[1177,771],[1183,773],[1188,776],[1194,779],[1200,781],[1205,785],[1211,788],[1217,792],[1223,795],[1228,800],[1234,804],[1240,809],[1246,813],[1252,819],[1258,824],[1264,829],[1270,835],[1276,841],[1283,848],[1289,854],[1295,861],[1814,340],[1796,324],[1777,308],[1759,293],[1740,277],[1721,263],[1702,248],[1682,234],[1663,220],[1643,207],[1623,194],[1603,181],[1583,168],[1562,156],[1541,144],[1520,133],[1499,122],[1478,111],[1456,100],[1435,90],[1413,80],[1390,71],[1368,62],[1346,53],[1323,44],[1300,36],[1079,29],[1074,109],[1051,107],[1028,106],[1006,106],[983,105],[960,105],[938,106],[915,106],[893,107],[870,109],[848,111],[825,113],[803,116],[781,119],[759,122],[736,126],[714,130],[692,135],[670,140],[648,145],[627,151],[605,157],[583,163],[561,170],[540,177],[518,185],[507,156],[489,162],[472,169],[454,176],[437,183],[420,191],[404,199],[387,207],[371,216],[355,225],[339,234],[323,244],[308,254],[293,264],[278,274],[263,285],[248,296],[234,308],[220,320],[206,332],[192,344],[179,357],[166,370],[152,383],[140,397],[127,411]] },
    { id: 'pacificus', name: 'Pacificus', color: '#3c7d80',
      description: 'Ouest galactique. Halo Stars, Calixis Sector.',
      polygon: [[703,983],[364,641],[326,685],[292,730],[260,775],[232,820],[207,865],[185,910],[166,955],[150,1000],[138,1046],[128,1091],[122,1137],[119,1183],[119,1229],[122,1275],[129,1321],[138,1367],[151,1414],[167,1460],[186,1507],[208,1554],[233,1601],[262,1648],[293,1695],[328,1743],[366,1790],[701,1455],[686,1435],[671,1415],[659,1395],[647,1375],[637,1356],[628,1336],[620,1317],[614,1297],[609,1278],[605,1259],[602,1240],[601,1221],[601,1202],[603,1183],[605,1164],[609,1146],[615,1127],[621,1109],[629,1091],[638,1072],[648,1054],[660,1036],[673,1018],[687,1001]] },
    { id: 'tempestus', name: 'Tempestus', color: '#a3322c',
      description: 'Sud galactique. Bakka, Veiled Region.',
      polygon: [[647,1509],[281,1873],[295,1886],[309,1899],[324,1912],[339,1925],[354,1937],[369,1948],[384,1960],[400,1971],[415,1982],[431,1992],[447,2002],[463,2012],[480,2021],[496,2030],[513,2039],[530,2047],[548,2055],[565,2063],[582,2071],[600,2078],[618,2084],[636,2091],[655,2097],[673,2103],[692,2108],[663,2222],[688,2228],[714,2234],[739,2239],[765,2243],[790,2247],[816,2250],[841,2252],[867,2254],[892,2256],[917,2257],[943,2257],[968,2257],[994,2256],[1019,2254],[1044,2252],[1070,2249],[1095,2246],[1121,2242],[1146,2238],[1171,2233],[1197,2227],[1222,2221],[1247,2214],[1273,2207],[1298,2199],[1318,2257],[1530,2253],[1541,2247],[1552,2241],[1563,2235],[1574,2229],[1585,2222],[1596,2216],[1607,2209],[1618,2202],[1628,2195],[1639,2188],[1649,2180],[1660,2173],[1670,2165],[1680,2157],[1690,2149],[1700,2141],[1710,2133],[1720,2124],[1730,2116],[1740,2107],[1749,2098],[1759,2089],[1768,2080],[1778,2070],[1787,2061],[1231,1511],[1207,1530],[1183,1547],[1159,1563],[1135,1578],[1112,1590],[1088,1601],[1064,1611],[1041,1619],[1017,1625],[993,1630],[970,1633],[947,1634],[923,1634],[900,1633],[877,1629],[853,1624],[830,1618],[807,1610],[784,1600],[761,1589],[738,1576],[715,1562],[693,1546],[670,1528]] },
    { id: 'ultima', name: 'Ultima', color: '#3559a0',
      description: 'Est galactique. Macragge, Ultramar, Maelstrom.',
      polygon: [[1173,1453],[1977,2253],[2695,2257],[2697,2255],[2699,2253],[2701,2251],[2702,2249],[2704,2247],[2706,2244],[2708,2242],[2710,2240],[2711,2237],[2713,2235],[2715,2232],[2717,2230],[2718,2227],[2720,2224],[2721,2222],[2723,2219],[2725,2216],[2726,2213],[2728,2210],[2729,2207],[2731,2204],[2733,2201],[2734,2198],[2736,2194],[2737,2191],[2652,2146],[2666,2120],[2679,2095],[2692,2070],[2704,2045],[2716,2020],[2727,1995],[2738,1971],[2749,1946],[2759,1922],[2769,1898],[2778,1874],[2787,1850],[2796,1827],[2804,1803],[2811,1780],[2818,1757],[2825,1734],[2831,1711],[2837,1688],[2843,1666],[2848,1644],[2852,1621],[2856,1600],[2860,1578],[2863,1556],[2950,1576],[2956,1540],[2961,1503],[2966,1467],[2970,1430],[2973,1394],[2976,1358],[2978,1321],[2980,1284],[2980,1248],[2981,1211],[2980,1175],[2979,1138],[2977,1101],[2975,1065],[2972,1028],[2968,991],[2964,954],[2959,918],[2954,881],[2947,844],[2941,807],[2933,770],[2925,733],[2916,696],[2907,659],[2731,704],[2726,684],[2721,664],[2715,645],[2710,625],[2704,606],[2698,587],[2691,568],[2685,549],[2678,530],[2671,511],[2664,493],[2656,474],[2649,456],[2641,438],[2633,420],[2625,402],[2616,384],[2607,367],[2598,349],[2589,332],[2580,315],[2570,298],[2560,281],[2550,265],[2540,248],[2614,206],[2610,199],[2606,191],[2602,184],[2598,177],[2594,170],[2590,162],[2586,155],[2582,148],[2577,141],[2573,134],[2569,127],[2564,120],[2560,113],[2555,106],[2550,99],[2546,92],[2541,85],[2536,78],[2531,71],[2526,65],[2521,58],[2516,51],[2511,44],[2505,38],[2500,31],[2125,29],[1170,979],[1186,998],[1200,1018],[1213,1037],[1225,1056],[1235,1076],[1245,1095],[1253,1114],[1259,1133],[1264,1152],[1268,1171],[1271,1190],[1273,1209],[1273,1228],[1272,1247],[1269,1266],[1265,1285],[1260,1304],[1254,1322],[1246,1341],[1237,1360],[1227,1379],[1215,1397],[1203,1416],[1188,1434]] },
  ];

  // Coordonnées best-effort sur la nouvelle map canon (3740×2300).
  // À recalibrer visuellement avec le zoom Leaflet — utilise console DevTools
  // sur popup → click marker → leaflet popup latlng pour ajuster.
  readonly hotZones: HotZone[] = [
    // === RIFTS ===
    { id: 'eye-of-terror', name: 'Œil de la Terreur', type: 'rift', cx: 794, cy: 640, r: 14, color: '#9c2680',
      description: 'Faille warp permanente née de la naissance de Slaanesh (M30). Repaire des Légions Chaos. Visible : tache noire entourée de Halo Stars.', conceptId: 'eye-of-terror' },
    { id: 'maelstrom', name: 'Maelstrom', type: 'rift', cx: 1712, cy: 1231, r: 12, color: '#c43a26',
      description: 'Tempête warp permanente du Segmentum Ultima. Bandes Chaos, pirates.', conceptId: 'maelstrom' },

    // === WORLDS — Solar Segmentum (centre — Terra & Mars label) ===
    { id: 'terra', name: 'Holy Terra', type: 'world', cx: 967, cy: 1255, r: 9, color: '#f0d276',
      description: 'Capitale sacrée de l\'Imperium. Trône d\'Or, Astronomican.', conceptId: 'holy-terra' },
    { id: 'mars', name: 'Mars', type: 'world', cx: 979, cy: 1259, r: 7, color: '#b85a3a',
      description: 'Capitale de l\'Adeptus Mechanicus.', conceptId: 'mars' },
    { id: 'titan', name: 'Titan', type: 'world', cx: 967, cy: 1265, r: 6, color: '#5a6878',
      description: 'Lune de Saturne. Monde-forteresse caché des Grey Knights.' },
    { id: 'cthonia', name: 'Cthonia (✝)', type: 'world', cx: 946, cy: 1254, r: 6, color: '#3a3a3a', category: 'primarch-homeworld',
      description: 'Monde-mère de Horus Lupercal et de la XVIᵉ Légion (Luna Wolves → Sons of Horus). Détruit après l\'Hérésie d\'Horus.',
      linkTo: { type: 'primarch', id: 'horus' } },

    // === WORLDS — Obscurus Segmentum (nord) ===
    { id: 'cadia', name: 'Cadia (✝)', type: 'world', cx: 812, cy: 784, r: 8, color: '#5a6878',
      description: 'Forteresse-monde tombée à la 13ᵉ Croisade Noire (M41). Origine de la Cicatrix.', conceptId: 'cadia',
      linkTo: { type: 'timeline', id: 'fall-of-cadia' } },
    { id: 'caliban', name: 'Caliban (✝)', type: 'world', cx: 829, cy: 568, r: 7, color: '#1a4f2a', category: 'primarch-homeworld',
      description: 'Monde forestier de Lion El\'Jonson (Dark Angels). Détruit pendant l\'Hérésie d\'Horus, fragments survivent dans The Rock.',
      linkTo: { type: 'primarch', id: 'lion-eljonson' } },
    { id: 'fenris', name: 'Fenris', type: 'world', cx: 1237, cy: 872, r: 7, color: '#9ab8d9', category: 'primarch-homeworld',
      description: 'Monde de glace et de tempêtes — patrie des Space Wolves de Leman Russ.',
      linkTo: { type: 'primarch', id: 'leman-russ' } },
    { id: 'prospero', name: 'Prospero (✝)', type: 'world', cx: 1423, cy: 1194, r: 7, color: '#c93c8b', category: 'primarch-homeworld',
      description: 'Monde-bibliothèque des Mille Fils de Magnus. Brûlé par Russ pendant l\'Hérésie (Burning of Prospero).',
      linkTo: { type: 'primarch', id: 'magnus' } },

    // === WORLDS — Ultima Segmentum (est) ===
    { id: 'macragge', name: 'Macragge', type: 'world', cx: 2484, cy: 1922, r: 10, color: '#1d4ba0', category: 'primarch-homeworld',
      description: 'Monde-mère des Ultramarines. Capitale d\'Ultramar (500 mondes).', conceptId: 'macragge',
      linkTo: { type: 'primarch', id: 'guilliman' } },
    { id: 'baal', name: 'Baal', type: 'world', cx: 1924, cy: 723, r: 8, color: '#c9302c', category: 'primarch-homeworld',
      description: 'Monde-mère des Blood Angels. Sanctuaire de Sanguinius. Système triple-soleils irradié.', conceptId: 'baal',
      linkTo: { type: 'primarch', id: 'sanguinius' } },
    { id: 'baal-secundus', name: 'Baal Secundus', type: 'world', cx: 1932, cy: 730, r: 6, color: '#a02020', category: 'primarch-homeworld',
      description: 'Lune de Baal où tomba Sanguinius enfant. Recrutement des aspirants Blood Angels.',
      linkTo: { type: 'primarch', id: 'sanguinius' } },
    { id: 'catachan', name: 'Catachan II', type: 'world', cx: 1445, cy: 1375, r: 7, color: '#3a6c2a', category: 'death-world',
      description: 'Monde-jungle hostile. Patrie des Catachan Jungle Fighters — death world où chaque plante peut tuer.' },

    // === WORLDS — Pacificus Segmentum (ouest) ===
    { id: 'tanith', name: 'Tanith (✝)', type: 'world', cx: 556, cy: 1782, r: 6, color: '#3a3a3a',
      description: 'Monde forestier détruit par les Chaos Marines au moment de la levée du régiment. Les Tanith First and Only sont les Fantômes — Premier et Dernier régiment d\'un monde mort.' },

    // === WORLDS — Tempestus Segmentum (sud) ===
    { id: 'krieg', name: 'Krieg', type: 'world', cx: 763, cy: 1635, r: 7, color: '#5a4a3a', category: 'death-world',
      description: 'Monde-quasi-mort post-apostasie nucléaire. Atmosphère toxique. Recrutement du Death Korps of Krieg.' },
    { id: 'armageddon', name: 'Armageddon', type: 'world', cx: 1178, cy: 976, r: 7, color: '#c47a26', category: 'war-zone',
      description: 'Monde-ruche tristement célèbre pour ses Trois Guerres entre Imperium et Ghazghkull Ork.',
      linkTo: { type: 'timeline', id: 'second-third-armageddon-war' } },

    // === CAPITALES SEGMENTA ===
    { id: 'cypra-mundi', name: 'Cypra Mundi', type: 'world', cx: 1080, cy: 614, r: 9, color: '#9c2680', category: 'segmentum-hq',
      description: 'Capitale du Segmentum Obscurus. Forteresse navale d\'où l\'Imperial Navy tient le nord galactique face à l\'Œil de la Terreur.' },
    { id: 'hydraphur', name: 'Hydraphur', type: 'world', cx: 702, cy: 994, r: 9, color: '#3a6cc4', category: 'segmentum-hq',
      description: 'Capitale du Segmentum Pacificus. Siège de la Navis Pacificus. Système triple-soleils, monde-cathédrale.' },
    { id: 'bakka', name: 'Bakka', type: 'world', cx: 1314, cy: 2089, r: 9, color: '#5fc97a', category: 'segmentum-hq',
      description: 'Capitale du Segmentum Tempestus. Forteresse-monde tenant les frontières sud face aux Tyranides et aux Tau.' },
    { id: 'kar-duniash', name: 'Kar Duniash', type: 'world', cx: 2497, cy: 1022, r: 9, color: '#1d4ba0', category: 'segmentum-hq',
      description: 'Capitale du Segmentum Ultima. Plus grande forteresse navale de l\'Imperium. Coordonne la guerre contre les Tyranides.' },

    // === MONDES NATALS PRIMARQUES MANQUANTS ===
    { id: 'inwit', name: 'Inwit', type: 'world', cx: 1156, cy: 1603, r: 7, color: '#9ab8d9', category: 'primarch-homeworld',
      description: 'Cluster glacé d\'Inwit — monde-mère de Rogal Dorn (Imperial Fists). Cités-forteresses dans une nuit éternelle.',
      linkTo: { type: 'primarch', id: 'rogal-dorn' } },
    { id: 'nostramo', name: 'Nostramo (✝)', type: 'world', cx: 2621, cy: 421, r: 7, color: '#3a3a3a', category: 'primarch-homeworld',
      description: 'Monde-mère de Konrad Curze (Night Lords). Hive-monde criminel détruit en colère par Curze lui-même pendant la Grande Croisade.',
      linkTo: { type: 'primarch', id: 'konrad-curze' } },
    { id: 'olympia', name: 'Olympia (✝)', type: 'world', cx: 2050, cy: 1163, r: 7, color: '#6a6a72', category: 'primarch-homeworld',
      description: 'Monde-cité d\'ingénieurs, mère de Perturabo (Iron Warriors). Pacifié brutalement par Perturabo, puis abandonné. Ruines silencieuses.',
      linkTo: { type: 'primarch', id: 'perturabo' } },
    { id: 'colchis', name: 'Colchis (✝)', type: 'world', cx: 393, cy: 917, r: 7, color: '#9c2680', category: 'primarch-homeworld',
      description: 'Monde-théocratique, mère de Lorgar (Word Bearers). Berceau du Culte de l\'Empereur. Rasé par Khorne pendant l\'Hérésie.',
      linkTo: { type: 'primarch', id: 'lorgar' } },
    { id: 'barbarus', name: 'Barbarus (✝)', type: 'world', cx: 833, cy: 1847, r: 7, color: '#5a7050', category: 'primarch-homeworld',
      description: 'Monde-marais empoisonné, mère de Mortarion (Death Guard). Détruit pendant l\'Hérésie. Désormais Plague Planet dans l\'Œil.',
      linkTo: { type: 'primarch', id: 'mortarion' } },
    { id: 'chemos', name: 'Chemos', type: 'world', cx: 1520, cy: 1272, r: 7, color: '#9c2680', category: 'primarch-homeworld',
      description: 'Monde-mine industriel, mère de Fulgrim (Emperor\'s Children). Transformé par Fulgrim avant son arrivée — un miracle d\'industrie.',
      linkTo: { type: 'primarch', id: 'fulgrim' } },
    { id: 'nocturne', name: 'Nocturne', type: 'world', cx: 1549, cy: 1681, r: 7, color: '#c93c1a', category: 'primarch-homeworld',
      description: 'Monde-volcan, mère de Vulkan (Salamanders). Sol entier tremble tous les 60 ans. Forge des Sept Artefacts Salamander.',
      linkTo: { type: 'primarch', id: 'vulkan' } },
    { id: 'medusa', name: 'Medusa', type: 'world', cx: 609, cy: 879, r: 7, color: '#a8a8a8', category: 'primarch-homeworld',
      description: 'Monde-volcan ferreux, mère de Ferrus Manus (Iron Hands). Tempêtes de métal. Doctrine Faiblesse de la Chair.',
      linkTo: { type: 'primarch', id: 'ferrus-manus' } },
    { id: 'chogoris', name: 'Chogoris', type: 'world', cx: 1729, cy: 1440, r: 7, color: '#e6dfce', category: 'primarch-homeworld',
      description: 'Monde-steppe, mère de Jaghatai Khan (White Scars). Tribus nomades, aigles, cavalerie céleste.',
      linkTo: { type: 'primarch', id: 'jaghatai-khan' } },
    { id: 'deliverance', name: 'Deliverance', type: 'world', cx: 1008, cy: 2045, r: 7, color: '#1a1a1a', category: 'primarch-homeworld',
      description: 'Lune-prison Lycaeus rebaptisée par Corvus Corax (Raven Guard) après la Révolution. Patrie des libérateurs d\'esclaves.',
      linkTo: { type: 'primarch', id: 'corvus-corax' } },

    // === MONDES ICONIQUES SUPPLÉMENTAIRES ===
    { id: 'tallarn', name: 'Tallarn', type: 'world', cx: 1272, cy: 1659, r: 6, color: '#c4a060', category: 'death-world',
      description: 'Monde-désert. Théâtre de la pire guerre de blindés de l\'Hérésie (vs Iron Warriors). Tallarn Desert Raiders.' },
    { id: 'damocles', name: 'Golfe de Damoclès', type: 'world', cx: 2638, cy: 1730, r: 7, color: '#3aa8c4', category: 'war-zone',
      description: 'Frontière Tau. Quatre Croisades de Damoclès depuis le M41. Zone de contact xeno la plus active.',
      linkTo: { type: 'timeline', id: 'damocles-gulf-crusade' } },
    { id: 'octarius', name: 'Octarius', type: 'world', cx: 1648, cy: 1362, r: 7, color: '#c43a26', category: 'war-zone',
      description: 'Empire Ork de Ghazghkull Thraka attaqué par Hive Fleet Leviathan — guerre Ork-Tyranide sans fin orchestrée par l\'Inquisition.' },
    { id: 'ulthwe', name: 'Ulthwé', type: 'world', cx: 885, cy: 673, r: 6, color: '#000000', category: 'eldar-craftworld',
      description: 'Vaisseau-monde Eldar de la Voyante Eldrad Ulthran. Orbite proche de l\'Œil de la Terreur — pacte permanent avec le Chaos pour le surveiller.' },
    { id: 'iyanden', name: 'Iyanden', type: 'world', cx: 2962, cy: 1673, r: 6, color: '#e0c060', category: 'eldar-craftworld',
      description: 'Vaisseau-monde Eldar décimé par Hive Fleet Kraken. Devenu un monde de Wraith — guerriers fantômes animés par les âmes des morts.' },

    // === FAILLES WARP / ANOMALIES (rifts) — positions estimées, à calibrer ===
    { id: 'inferni-gates', name: 'Inferni Gates', type: 'rift', cx: 1105, cy: 460, r: 10, color: '#9c2680',
      description: 'Faille warp d\'Obscurus à proximité de Cadia. Source d\'incursions daemoniaques mineures, surveillée par les Sisters of Battle.' },
    { id: 'bleak-coil', name: 'The Bleak Coil', type: 'rift', cx: 1335, cy: 488, r: 11, color: '#9c2680',
      description: 'Faille warp central-nord d\'Obscurus. Tempête psychique permanente, route astropathique impossible.' },
    { id: 'storm-of-the-emperors-wrath', name: 'Storm of the Emperor\'s Wrath', type: 'rift', cx: 1753, cy: 484, r: 12, color: '#9c2680',
      description: 'Tempête warp colossale d\'Obscurus apparue après la Cicatrix. Légende : la rage de l\'Empereur emprisonné se manifeste en orage psychique.' },
    { id: 'sominium-stars', name: 'Sominium Stars', type: 'rift', cx: 2793, cy: 815, r: 11, color: '#9c2680',
      description: 'Cluster d\'étoiles fantômes du Segmentum Ultima. Le sommeil ne vient plus aux astropaths qui s\'en approchent.' },
    { id: 'daemons-maw', name: 'The Daemon\'s Maw', type: 'rift', cx: 3157, cy: 413, r: 12, color: '#9c2680',
      description: 'Faille warp située à la limite extrême-est d\'Obscurus. Considérée comme la « bouche » de la Cicatrix Maledictum.' },
    { id: 'annihilus', name: 'Annihilus', type: 'rift', cx: 524, cy: 1863, r: 13, color: '#c43a26',
      description: 'Anomalie warp gigantesque du Segmentum Tempestus sud-ouest. Connue pour engloutir les flottes entières — un Cadian event en miniature.' },
    { id: 'the-shroud', name: 'The Shroud', type: 'rift', cx: 2355, cy: 2169, r: 11, color: '#9c2680',
      description: 'Voile warp obscurcissant le sud du Segmentum Tempestus. Les vaisseaux entrent et n\'en ressortent jamais — ou jamais à la même époque.' },
    { id: 'scourge-stars', name: 'The Scourge Stars', type: 'rift', cx: 2677, cy: 1886, r: 12, color: '#c43a26',
      description: 'Faille warp ultima-sud apparue avec la Cicatrix. Bande de planètes sœurs corrompues, plaque tournante des Death Guard.' },
    { id: 'hadex-anomaly', name: 'Hadex Anomaly (✝)', type: 'rift', cx: 2770, cy: 1796, r: 11, color: '#c43a26',
      description: 'Anomalie temporelle frontière Tau. Système entier supprimé du temps après la 4ᵉ Croisade de Damoclès.' },
    { id: 'nephilim-sector', name: 'Nephilim Sector', type: 'rift', cx: 1801, cy: 1832, r: 9, color: '#9c2680',
      description: 'Sector du Tempestus dont la moitié est tombée dans l\'Imperium Nihilus après la Cicatrix.' },

    // === MONDES ICONIQUES ADDITIONNELS — positions estimées, à calibrer ===
    { id: 'necromunda', name: 'Necromunda', type: 'world', cx: 1061, cy: 1500, r: 7, color: '#a05030', category: 'fortress-world',
      description: 'Monde-ruche emblématique du Segmentum Solar. 100 milliards d\'habitants empilés sur 50 km de hauteur. Cadre des séries Necromunda et Eisenhorn.' },
    { id: 'vigilus', name: 'Vigilus', type: 'world', cx: 879, cy: 739, r: 7, color: '#c47a26', category: 'war-zone',
      description: 'Monde-clé fortifié de l\'Indomitus Crusade (M42). Théâtre de Vigilus Defiant et Vigilus Ablaze — assauts conjoints Chaos / Genestealer Cults / Orks.',
      linkTo: { type: 'timeline', id: 'arks-of-omen' } },
    { id: 'belis-corona', name: 'Belis Corona', type: 'world', cx: 1027, cy: 781, r: 7, color: '#3a6cc4', category: 'fortress-world',
      description: 'Hub stratégique de l\'Imperium Sanctus post-Cicatrix. Quartier général d\'opérations face à l\'Œil de la Terreur après la chute de Cadia.' },
    { id: 'mordian', name: 'Mordian', type: 'world', cx: 1176, cy: 662, r: 6, color: '#1a3a6e', category: 'fortress-world',
      description: 'Monde-prison crépusculaire d\'Obscurus. Patrie des Mordian Iron Guard — discipline absolue, parades millénaires, fanatisme militaire.' },
    { id: 'cretacia', name: 'Cretacia', type: 'world', cx: 705, cy: 1981, r: 6, color: '#7b1113', category: 'death-world',
      description: 'Monde-jungle préhistorique de Tempestus. Patrie des Flesh Tearers — Successors des Blood Angels rongés par la Soif Rouge.' },
    { id: 'ophelia-vii', name: 'Ophelia VII', type: 'world', cx: 998, cy: 1706, r: 6, color: '#c93c1a', category: 'shrine-world',
      description: 'Monde-sanctuaire des Adepta Sororitas. Convent Sanctorum siège de l\'Order of Our Martyred Lady. Cathédrale-monde, terre sacrée.' },
    { id: 'ryza', name: 'Ryza', type: 'world', cx: 1376, cy: 1254, r: 6, color: '#b85a3a', category: 'forge-world',
      description: 'Forge World du Segmentum Solar. Spécialiste plasma weapons. Tombée plusieurs fois aux Orks, toujours reconquise.' },
    { id: 'gryphonne-iv', name: 'Gryphonne IV (✝)', type: 'world', cx: 1077, cy: 2151, r: 6, color: '#3a3a3a', category: 'forge-world',
      description: 'Forge World tombé pendant Hive Fleet Leviathan (M41). Catastrophe industrielle — production de Baneblades et titans cessée.' },
    { id: 'cypra-moren', name: 'Cypra Moren', type: 'world', cx: 1034, cy: 1241, r: 6, color: '#a89060', category: 'forge-world',
      description: 'Forge World du Segmentum Solar. Berceau d\'Adeptes Mécaniques d\'élite. Lieu de naissance présumé de Belisarius Cawl.' },
    { id: 'black-reach', name: 'Black Reach', type: 'world', cx: 2514, cy: 1985, r: 7, color: '#c43a26', category: 'war-zone',
      description: 'Monde-théâtre d\'invasion Ork (M41). Site de la première campagne Assault on Black Reach — affrontement Ultramarines vs Warlord Zanzag.' },
    { id: 'astrolan-sigma', name: 'Astrolan Sigma', type: 'world', cx: 2376, cy: 739, r: 6, color: '#f0d276', category: 'fortress-world',
      description: 'Astropathic Choir Central du Segmentum Ultima. Plus grand chœur d\'astropaths après Terra. 50 000 psykers en stase télépathique.' },
    { id: 'vraks', name: 'Vraks (✝)', type: 'world', cx: 492, cy: 1384, r: 6, color: '#5a3a3a', category: 'war-zone',
      description: 'Monde-arsenal renégat. Siège de Vraks (M41) : 17 ans de guerre des tranchées entre Krieg Death Korps et apostats. Saga Forge World.' },
    { id: 'malfactus', name: 'Malfactus (✝)', type: 'world', cx: 2503, cy: 102, r: 5, color: '#3a3a3a',
      description: 'Monde-frontière extrême-nord d\'Obscurus, détruit lors d\'une incursion daemonique mineure mais signalée comme avertissement.' },
    { id: 'pisina', name: 'Pisina (✝)', type: 'world', cx: 1158, cy: 762, r: 5, color: '#3a3a3a',
      description: 'Monde-fortin tombé à la 13ᵉ Croisade Noire en même temps que Cadia. Garrison cadienne pulvérisée.' },
    { id: 'vengeance', name: 'Vengeance', type: 'world', cx: 2979, cy: 1297, r: 6, color: '#c93c1a', category: 'shrine-world',
      description: 'Monde-sanctuaire de l\'extrême est ultima. Centre de pèlerinage pour les flottes en quête de bénédiction avant un assaut majeur.' },
    { id: 'planet-of-the-sorcerers', name: 'Planet of the Sorcerers', type: 'world', cx: 1423, cy: 1186, r: 6, color: '#9c2680', category: 'war-zone',
      description: 'Monde-Daemonique de Magnus le Rouge dans l\'Œil de la Terreur. Capitale spirituelle des Mille Fils, bibliothèque des secrets warp.',
      linkTo: { type: 'primarch', id: 'magnus' } },
    { id: 'sa-cea', name: 'Sa\'cea / T\'au Empire', type: 'world', cx: 2647, cy: 1694, r: 7, color: '#3aa8c4', category: 'war-zone',
      description: 'Capitale du Quatrième Sphère T\'au. Empire xenos jeune (~6 000 ans) en expansion rapide vers l\'Imperium. Doctrine du « Greater Good ».' },
    { id: 'lustria', name: 'Lustria', type: 'world', cx: 210, cy: 1486, r: 5, color: '#3a6c2a', category: 'death-world',
      description: 'Monde-jungle aux ruines pré-humaines (Lizardmen / Old Ones ?). Recueille des Heretek-archéologues maudits et exterminés sans relâche.' },
    { id: 'sanctum', name: 'Sanctum', type: 'world', cx: 616, cy: 1293, r: 5, color: '#3a6cc4', category: 'shrine-world',
      description: 'Monde-cathédrale du Segmentum Pacificus. Pilier ecclésiastique régional, abrite des reliques de Saint Drusus.',
      linkTo: { type: 'saint', id: 'saint-drusus' } },
    { id: 'luther-mcintyre', name: 'Luther McIntyre', type: 'world', cx: 1120, cy: 1608, r: 5, color: '#a89060', category: 'shrine-world',
      description: 'Monde-désert. Site de la Bataille de Luther McIntyre (M37) — défense glorieuse de l\'Astra Militarum face à une horde Ork.' },

    // === BONUS markers OCR canon (calibrés via OpenCV pipeline 2026-05-08) ===
    { id: 'nova-purgatoria', name: 'Nova Purgatoria', type: 'world', cx: 1611, cy: 1088, r: 5, color: '#7b1113', category: 'death-world',
      description: 'Monde-prison du Segmentum Solar, à proximité du Maelstrom. Système pénitencier Imperium pour psykers déviants et Renégats hauts profils.' },
    { id: 'ymga-monolith', name: 'The Ymga Monolith', type: 'world', cx: 2599, cy: 1472, r: 5, color: '#3a3a55', category: 'fortress-world',
      description: 'Monolithe Necron pré-Imperium dans le Segmentum Ultima. Pylône énigmatique de matériaux inconnus, étudié sous quarantaine inquisitoriale.' },
    { id: 'ultima-macharia', name: 'Ultima Macharia', type: 'world', cx: 506, cy: 1566, r: 5, color: '#c4a060', category: 'fortress-world',
      description: 'Monde-clé de la Croisade Macharienne (M41). Bastion conquis par le Lord Solar Macharius, point d\'ancrage stratégique dans le Pacificus profond.' },
  ];

  // Centre de Terra sur la map canon (3740×2300) — origine de toutes les radiales
  // et arcs concentriques qui délimitent les Segmenta (et plus tard les Sectors).
  private readonly TERRA_X = 967;
  private readonly TERRA_Y = 1255;
  /** Rayon du disque Solar — frontière commune aux 4 outers. À calibrer visuellement. */
  private readonly R_SOLAR = 320;
  /** Rayon externe générique pour les wedges outers — large, le crop fait le reste. */
  private readonly R_OUTER = 3100;

  /**
   * Sample N+1 points along an arc centered on Terra. Handles wrap-around when
   * theta2 < theta1 (e.g. Ultima 336° → 21°) by adding 360 to theta2 internally.
   */
  private sampleArc(theta1Deg: number, theta2Deg: number, r: number, samples: number): [number, number][] {
    const t2 = theta2Deg < theta1Deg ? theta2Deg + 360 : theta2Deg;
    const span = t2 - theta1Deg;
    const out: [number, number][] = [];
    for (let i = 0; i <= samples; i++) {
      const t = ((theta1Deg + (span * i) / samples) * Math.PI) / 180;
      out.push([this.TERRA_X + r * Math.cos(t), this.TERRA_Y + r * Math.sin(t)]);
    }
    return out;
  }

  /** Build a wedge polygon between rMin and rMax (inner arc + outer arc reversed). */
  private buildWedge(theta1Deg: number, theta2Deg: number, rMin: number, rMax: number, samples = 64): [number, number][] {
    const inner = this.sampleArc(theta1Deg, theta2Deg, rMin, samples);
    const outer = this.sampleArc(theta1Deg, theta2Deg, rMax, samples);
    return [...inner, ...outer.reverse()];
  }

  /**
   * Sutherland–Hodgman polygon clipping against an axis-aligned rectangle [0,W]×[0,H].
   * Output stays a closed convex polygon (or empty if fully outside).
   */
  private clipToRect(poly: [number, number][], W: number, H: number): [number, number][] {
    type Edge = 'L' | 'R' | 'T' | 'B';
    const inside = (p: [number, number], e: Edge): boolean =>
      e === 'L' ? p[0] >= 0 :
      e === 'R' ? p[0] <= W :
      e === 'T' ? p[1] >= 0 :
                  p[1] <= H;
    const intersect = (a: [number, number], b: [number, number], e: Edge): [number, number] => {
      const [ax, ay] = a, [bx, by] = b;
      if (e === 'L') { const t = (0 - ax) / (bx - ax); return [0, ay + t * (by - ay)]; }
      if (e === 'R') { const t = (W - ax) / (bx - ax); return [W, ay + t * (by - ay)]; }
      if (e === 'T') { const t = (0 - ay) / (by - ay); return [ax + t * (bx - ax), 0]; }
      const t = (H - ay) / (by - ay); return [ax + t * (bx - ax), H];
    };
    const clipEdge = (subj: [number, number][], e: Edge): [number, number][] => {
      if (!subj.length) return subj;
      const out: [number, number][] = [];
      for (let i = 0; i < subj.length; i++) {
        const cur = subj[i];
        const prev = subj[(i - 1 + subj.length) % subj.length];
        const cIn = inside(cur, e);
        const pIn = inside(prev, e);
        if (cIn) {
          if (!pIn) out.push(intersect(prev, cur, e));
          out.push(cur);
        } else if (pIn) {
          out.push(intersect(prev, cur, e));
        }
      }
      return out;
    };
    return clipEdge(clipEdge(clipEdge(clipEdge(poly, 'L'), 'R'), 'T'), 'B');
  }

  /**
   * Clip a polyline (open path, no wrap-around) against the rect [0,W]×[0,H].
   * Returns a list of clipped sub-segments (a polyline can split into chunks).
   */
  private clipPolylineToRect(line: [number, number][], W: number, H: number): [number, number][][] {
    const inside = (p: [number, number]) => p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H;
    const intersect = (a: [number, number], b: [number, number]): [number, number] => {
      const [ax, ay] = a, [bx, by] = b;
      const ts: number[] = [];
      if (bx !== ax) {
        ts.push((0 - ax) / (bx - ax), (W - ax) / (bx - ax));
      }
      if (by !== ay) {
        ts.push((0 - ay) / (by - ay), (H - ay) / (by - ay));
      }
      // Find the smallest t in (0,1] that lands on a boundary
      const inSeg = ts.filter(t => t > 1e-6 && t <= 1).sort((a, b) => a - b);
      for (const t of inSeg) {
        const x = ax + t * (bx - ax);
        const y = ay + t * (by - ay);
        if (x >= -0.5 && x <= W + 0.5 && y >= -0.5 && y <= H + 0.5) return [Math.max(0, Math.min(W, x)), Math.max(0, Math.min(H, y))];
      }
      return inside(b) ? b : a;
    };
    const out: [number, number][][] = [];
    let cur: [number, number][] = [];
    for (let i = 0; i < line.length; i++) {
      const p = line[i];
      const pIn = inside(p);
      if (i === 0) {
        if (pIn) cur.push(p);
        continue;
      }
      const prev = line[i - 1];
      const prIn = inside(prev);
      if (pIn && prIn) {
        cur.push(p);
      } else if (pIn && !prIn) {
        cur = [intersect(p, prev), p];
      } else if (!pIn && prIn) {
        cur.push(intersect(prev, p));
        if (cur.length >= 2) out.push(cur);
        cur = [];
      }
    }
    if (cur.length >= 2) out.push(cur);
    return out;
  }

  constructor() {
    // Carte canon GW (3740×2300) — bundlée localement pour éviter expirations
    // de tokens CDN. Inclut Segmenta labellés + Cicatrix en rouge + 200+ planètes.
    this.mapBgUrl.set('/galaxy-map.jpg');
  }

  hoveredZone(): HotZone | null {
    const id = this.hoveredId();
    if (!id) return null;
    return this.hotZones.find(z => z.id === id) ?? null;
  }

  goTo(hz: HotZone) {
    if (hz.linkTo) {
      const path = this.linkToPath(hz.linkTo);
      this.router.navigate([path]);
      return;
    }
    if (hz.conceptId) {
      this.router.navigate(['/lore/concepts'], { fragment: hz.conceptId });
      return;
    }
    this.router.navigate(['/lore/concepts']);
  }

  /**
   * Build the route path for a typed lore link. Mirrors app.routes.ts.
   */
  private linkToPath(link: NonNullable<HotZone['linkTo']>): string {
    switch (link.type) {
      case 'primarch': return `/lore/primarchs/${link.id}`;
      case 'timeline': return `/lore/timeline/${link.id}`;
      case 'saint':    return `/lore/saints/${link.id}`;
      case 'ship':     return `/lore/ships/${link.id}`;
    }
  }

  /** Returns the CTA href for a hot zone popup. */
  popupCtaUrl(hz: HotZone): string {
    if (hz.linkTo) return this.linkToPath(hz.linkTo);
    if (hz.conceptId) return `/lore/concepts#${hz.conceptId}`;
    return '/lore/concepts';
  }

  /** Returns the CTA label for a hot zone popup. */
  popupCtaLabel(hz: HotZone): string {
    if (!hz.linkTo) return 'Explorer le lore →';
    switch (hz.linkTo.type) {
      case 'primarch': return 'Voir le primarque →';
      case 'timeline': return 'Voir l\'événement →';
      case 'saint':    return 'Voir la sainte →';
      case 'ship':     return 'Voir le vaisseau →';
    }
  }

  typeLabel(t: HotZone['type']): string {
    return t === 'rift' ? 'Faille warp' : t === 'nexus' ? 'Nexus xenos' : 'Monde-clé';
  }

  categoryLabel(c: NonNullable<HotZone['category']>): string {
    const labels: Record<NonNullable<HotZone['category']>, string> = {
      'primarch-homeworld': 'Monde natal primarque',
      'segmentum-hq': 'Capitale Segmentum',
      'shrine-world': 'Monde-sanctuaire',
      'forge-world': 'Forge World',
      'death-world': 'Death World',
      'fortress-world': 'Monde-forteresse',
      'eldar-craftworld': 'Vaisseau-monde Eldar',
      'war-zone': 'Zone de guerre',
      'standard': '',
    };
    return labels[c] || '';
  }

  countByType(t: 'world' | 'rift' | 'nexus'): number {
    return this.hotZones.filter(hz => hz.type === t).length;
  }

  ngAfterViewInit(): void {
    // Dims réelles de l'image bundlée (galaxy-map.jpg)
    const W = 3740, H = 2300;
    const el = this.leafletMapRef?.nativeElement;
    if (!el) return;

    const map = L.map(el, {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 3,
      zoomSnap: 0.25,
      attributionControl: false,
      preferCanvas: false,
      zoomControl: true,
    });
    this.map = map;

    // Debug helper : clic sur la map → log coords pixel-image-space dans la console.
    // Pratique pour recalibrer les markers visuellement (ouvrir DevTools console).
    map.on('click', (e) => {
      const cx = Math.round(e.latlng.lng);
      const cy = Math.round(H - e.latlng.lat);
      // eslint-disable-next-line no-console
      console.log(`[map click] cx: ${cx}, cy: ${cy}`);
    });

    // Custom Fullscreen control (HTML5 Fullscreen API, no plugin)
    const FullscreenControl = L.Control.extend({
      options: { position: 'topleft' as L.ControlPosition },
      onAdd: () => {
        const wrap = L.DomUtil.create('div', 'leaflet-bar leaflet-control lf-fs-control');
        const btn = L.DomUtil.create('a', 'lf-fs-btn', wrap) as HTMLAnchorElement;
        btn.href = '#';
        btn.title = 'Plein écran (Esc pour quitter)';
        btn.setAttribute('aria-label', 'Plein écran');
        btn.innerHTML = '⛶';
        L.DomEvent.disableClickPropagation(wrap);
        L.DomEvent.on(btn, 'click', (e: Event) => {
          L.DomEvent.preventDefault(e);
          L.DomEvent.stop(e);
          const container = map.getContainer();
          const doc = document as Document & { webkitFullscreenElement?: Element };
          const fs = document.fullscreenElement ?? doc.webkitFullscreenElement;
          if (!fs) {
            const reqFull = (container as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).requestFullscreen
              ?? (container as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
            reqFull?.call(container);
          } else {
            const exitFull = document.exitFullscreen
              ?? (doc as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
            exitFull?.call(document);
          }
        });
        return wrap;
      },
    });
    new FullscreenControl().addTo(map);

    // Recompute Leaflet size when fullscreen toggles
    const onFsChange = () => {
      const container = map.getContainer();
      const isFs = !!document.fullscreenElement;
      container.classList.toggle('lf-is-fullscreen', isFs);
      setTimeout(() => map.invalidateSize(), 80);
      setTimeout(() => map.invalidateSize(), 250);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    // Bounds standard Leaflet : SW=[0,0] NE=[H,W]. Image overlay place l'image
    // de lat=0 (bas) à lat=H (haut). Pour utiliser des coords pixel-image-space
    // où (0,0) = top-left, on flip Y des markers : lat = H - cy_pixel.
    const bounds = L.latLngBounds([0, 0], [H, W]);
    L.imageOverlay(this.mapBgUrl(), bounds).addTo(map);
    map.fitBounds(bounds);
    map.setMaxBounds(bounds.pad(0.4));
    map.setMinZoom(map.getBoundsZoom(bounds) - 0.5);
    // Helper for pixel→latLng (Y-flip)
    const px = (cx: number, cy: number): L.LatLngTuple => [H - cy, cx];

    // Layer groups for filtering
    this.worldsLayer = L.layerGroup();
    this.riftsLayer = L.layerGroup();
    this.cicatrixLayer = L.layerGroup();
    this.segmentaLayer = L.layerGroup();

    // === Segmenta — polygons OpenCV (contours canon irréguliers) ===
    // 4 outer wedges first, Solar last so it's drawn on top.
    const renderOrder = ['obscurus', 'pacificus', 'tempestus', 'ultima', 'solar'];
    for (const id of renderOrder) {
      const seg = this.segmenta.find(s => s.id === id);
      if (!seg?.polygon?.length) continue;
      const pts: L.LatLngTuple[] = seg.polygon.map(([cx, cy]) => px(cx, cy));
      L.polygon(pts, {
        color: seg.color,
        weight: 1.5,
        opacity: 0.7,
        fillColor: seg.color,
        fillOpacity: id === 'solar' ? 0.45 : 0.32,
        interactive: false,
      }).addTo(this.segmentaLayer);
    }

    // Hot zone markers
    for (const hz of this.hotZones) {
      const isRift = hz.type === 'rift';
      // Bigger markers for visibility (was r*2+8, now r*3+16)
      const size = (hz.r * 3) + 16;
      const html = `
        <div class="lf-zone ${isRift ? 'lf-rift' : ''}" style="--c:${hz.color}; --size:${size}px">
          <div class="lf-zone-glow"></div>
          <div class="lf-zone-core"></div>
          <div class="lf-zone-label">${hz.name.toUpperCase()}</div>
        </div>`;
      const icon = L.divIcon({
        className: 'lf-zone-icon',
        html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker(px(hz.cx, hz.cy), { icon, riseOnHover: true, draggable: false });
      this.markersById.set(hz.id, marker);
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        const cx = Math.round(ll.lng);
        const cy = Math.round(H - ll.lat);
        this.draggedCoords.set(hz.id, [cx, cy]);
        // eslint-disable-next-line no-console
        console.log(`[drag ${hz.id}] cx: ${cx}, cy: ${cy}`);
      });
      const ctaUrl = this.popupCtaUrl(hz);
      const ctaLabel = this.popupCtaLabel(hz);
      const linkType = hz.linkTo?.type ?? (hz.conceptId ? 'concept' : 'concept-fallback');
      const linkId = hz.linkTo?.id ?? hz.conceptId ?? '';
      const cta = `<a class="lf-popup-cta" href="${ctaUrl}" data-link-type="${linkType}" data-link-id="${linkId}">${ctaLabel}</a>`;
      const subtypeLabel = hz.category ? ` · ${this.categoryLabel(hz.category)}` : '';
      const popupHtml = `
        <div class="lf-popup">
          <div class="lf-popup-img" data-name="${hz.name.replace(/"/g, '&quot;')}"></div>
          <div class="lf-popup-body">
            <div class="lf-popup-name" style="color:${hz.color}">${hz.name}</div>
            <div class="lf-popup-type">${this.typeLabel(hz.type)}${subtypeLabel}</div>
            <p>${hz.description}</p>
            ${cta}
          </div>
        </div>`;
      marker.bindPopup(popupHtml, { maxWidth: 340, className: 'lf-popup-wrapper' });
      marker.on('popupopen', (e: L.PopupEvent) => {
        const node = e.popup.getElement();
        // Async fetch wiki image
        const imgDiv = node?.querySelector<HTMLDivElement>('.lf-popup-img');
        if (imgDiv) {
          this.service.getWikiImage(hz.name).subscribe({
            next: r => {
              if (r.imageUrl) {
                imgDiv.style.backgroundImage = `url('${r.imageUrl}')`;
                imgDiv.classList.add('loaded');
              } else {
                imgDiv.classList.add('no-image');
              }
            },
            error: () => imgDiv.classList.add('no-image'),
          });
        }
        // CTA click handler — route via Angular Router based on link type/id.
        const a = node?.querySelector<HTMLAnchorElement>('a.lf-popup-cta');
        if (a) {
          a.addEventListener('click', (ev) => {
            ev.preventDefault();
            const t = a.getAttribute('data-link-type');
            const id = a.getAttribute('data-link-id') ?? '';
            if (t === 'primarch' && id) {
              this.router.navigate([`/lore/primarchs/${id}`]);
            } else if (t === 'timeline' && id) {
              this.router.navigate([`/lore/timeline/${id}`]);
            } else if (t === 'saint' && id) {
              this.router.navigate([`/lore/saints/${id}`]);
            } else if (t === 'ship' && id) {
              this.router.navigate([`/lore/ships/${id}`]);
            } else if (t === 'concept' && id) {
              this.router.navigate(['/lore/concepts'], { fragment: id });
            } else {
              this.router.navigate(['/lore/concepts']);
            }
            map.closePopup();
          });
        }
      });
      if (isRift) marker.addTo(this.riftsLayer!);
      else marker.addTo(this.worldsLayer!);
    }

    // Cicatrix Maledictum déjà visible en rouge sur la nouvelle carte canon.
    // On garde la layerGroup vide pour ne pas casser le filtre, mais elle est masquée par défaut.

    // Apply initial layer state
    this.applyLayerState();

    // Force size recompute after view settled (fixes initial sizing bugs)
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => { map.invalidateSize(); map.fitBounds(bounds); }, 600);
  }

  private applyLayerState(): void {
    if (!this.map) return;
    if (this.showWorlds()) this.worldsLayer?.addTo(this.map);
    else this.worldsLayer?.removeFrom(this.map);
    if (this.showRifts()) this.riftsLayer?.addTo(this.map);
    else this.riftsLayer?.removeFrom(this.map);
    if (this.showCicatrix()) this.cicatrixLayer?.addTo(this.map);
    else this.cicatrixLayer?.removeFrom(this.map);
    if (this.showSegmenta()) this.segmentaLayer?.addTo(this.map);
    else this.segmentaLayer?.removeFrom(this.map);
  }

  // React to filter signal changes
  private readonly filterEffect = effect(() => {
    // Read all signals so effect tracks them
    this.showWorlds();
    this.showRifts();
    this.showCicatrix();
    this.showSegmenta();
    if (this.map) this.applyLayerState();
  });

  // React to calibration mode toggle — enable/disable dragging on all markers
  private readonly calibEffect = effect(() => {
    const on = this.calibrationMode();
    this.markersById.forEach((m) => {
      const dh = (m as L.Marker & { dragging?: { enable: () => void; disable: () => void } }).dragging;
      if (on) dh?.enable();
      else dh?.disable();
    });
  });

  /** Export all dragged-marker coords as JSON. Logs to console + tries clipboard. */
  exportCalibration(): void {
    const out: Record<string, { cx: number; cy: number }> = {};
    this.draggedCoords.forEach(([cx, cy], id) => { out[id] = { cx, cy }; });
    const json = JSON.stringify(out, null, 2);
    // eslint-disable-next-line no-console
    console.log(`=== CALIBRATION EXPORT (${Object.keys(out).length} markers) ===`);
    // eslint-disable-next-line no-console
    console.log(json);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(
        () => console.log('→ Copié dans le presse-papier !'),
        () => console.log('→ Clipboard refusé, copier depuis la console'),
      );
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}
