/** Zones cliquables de la carte galactique (3740×2300). Source unique : la carte et le sommaire du lore en tirent leurs compteurs. */
export interface HotZone {
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

// Coordonnées best-effort sur la nouvelle map canon (3740×2300).
// À recalibrer visuellement avec le zoom Leaflet — utilise console DevTools
// sur popup → click marker → leaflet popup latlng pour ajuster.
export const HOT_ZONES: HotZone[] = [
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
