# Warhammer 40K — Roadmap d'enrichissement

> Plan V1 complet le 2026-05-01. Audit V2 (cleanup + datasheet pattern + enrichissement seeds) le 2026-05-02.

## État actuel ✅ V1 COMPLET + AUDIT V2

- **Toutes les phases UX terminées** : P1-P9 + F4-F10 + Tweaks UX (breadcrumb, primarque overlay, fragment scroll)
- **17 factions parents** dans `factions.json` (toutes lore enrichies post-F4)
- **113 sous-factions** dans `subfactions.json` :
  - 12 chapitres Space Marines **enrichis** (loreLong, currentLeader, notableUnits, citation)
  - 8 régiments Astra Militarum **enrichis**
  - 9 légions Chaos **enrichies**
  - Custodes (6), Officio Assassinorum (4), Drukhari (10), Grey Knights (8), Votann (5), Genestealer Cults (6) **enrichis F4**
  - Aeldari (8 : Ulthwé/Saim-Hann/Iyanden/Biel-Tan/Alaitoc/Mymeara/Lugganath/Yme-Loc)
  - Tyranides (7 : Behemoth/Kraken/Leviathan/Jörmungandr/Hydra/Gorgon/Kronos)
  - Necrons (9 : Sautekh/Mephrit/Novokh/Nephrekh/Nihilakh-Trazyn/Thokt/Charnovokh/Maynarkh)
  - Orks (6), Sœurs (6), Tau (6), AdMech (4) — données minimales
- **133 unités** : 119 ont une datasheet JPEG bundlée dans `backend/public/datasheets/<unit-id>.jpg`, 14 reposent sur le wiki proxy en fallback
- **33 séries Black Library** seedées avec readBooks/badges/tags
- **40 entrées lore-feed** (ticker dashboard)
- **35 artworks** curés (multi-factions wiki-fed)
- **15 lore-concepts** (Trône d'Or, Astronomican, Webway, Œil, Maelstrom, Cicatrix, Codex, Sanctus/Nihilus, Terra, Macragge, Cadia, Fenris, Caliban, Baal)
- **Galerie complète** : 1468+ images perso + 35 catalog + import (Wiki/Reddit/URL) + multi-catégorisation chips + catégories dynamiques (built-in + factions + customs)
- **Backend** : 15+ modules NestJS, endpoints `/api/lore/{emperor,primarchs,chaos-gods,imperial-orgs,concepts}`, `/api/images/datasheets/:unitId`, `/api/wiki-image`, `/api/image-import`, `/api/image-meta`, etc.

---

## Plan d'enrichissement à venir

### Phase F3 — Compléter les 51 sous-factions existantes
Ajouter `loreLong`, `currentLeader`, `notableUnits` aux entrées qui ont juste les minimums :

- **Aeldari** : Eldrad détaillé, Yriel élargi, Phoenix Lords (Asurmen/Maugan Ra/Karandras/Fuegan/Baharroth/Jain Zar), Wraithseers
- **Tyranides** : Swarmlord, Old One Eye, Norn Emissary, Hive Tyrants
- **Necrons** : Trazyn the Infinite (Sautekh), Anrakyr, Szarekh (Silent King) ressuscité, Crypteks
- **Orks** : Mad Dok Grotsnik, Big Mek, Wazdakka Gutsmek (Evil Sunz), Boss Snikrot (Blood Axes)
- **Sœurs** : Saint Celestine (vivante saint M42), Ephrael Stern, Cassia Orsinio (Sister Repentia)
- **Tau** : Shadowsun (O'Shaserra), Farsight détaillé, Aun'Shi (Ethéré)
- **AdMech** : Belisarius Cawl (Mars), Skitarii Marshal, Tech-Priest Dominus

### Phase F4 — Factions manquantes (top-level)

#### Drukhari (Dark Eldar)
- Faction parent : ennemis sadiques des Aeldari, vivent à Commorragh dans le Webway
- Sous-factions :
  - Kabales : Black Heart, Obsidian Rose, Poisoned Tongue, Flayed Skull
  - Wych Cults : Cult of Strife, Cult of the Cursed Blade, Cult of the Red Grief
  - Haemonculus Covens : Prophets of Flesh, Black Descent, Dark Creed
- Personnages : Asdrubael Vect (Suprême Overlord), Lelith Hesperax (championne Wych), Drazhar (Master of Blades)

#### Adeptus Custodes (Custodes)
- Faction parent : garde personnelle de l'Empereur, créés un par un par lui-même
- Sous-factions (Shield Hosts) :
  - Shadowkeepers (gardent les prisonniers du Trône)
  - Hykanatoi (gardiens du Palais Impérial)
  - Solar Watch (intervention rapide système solaire)
  - Aquilan Shield, Eternal, Emissaries Imperatus
- Personnages : Trajann Valoris (Captain-General), Constantin Valdor (legend Hérésie), Sœurs du Silence (alliés blank)

#### Grey Knights
- Faction parent : chapitre psyker secret anti-démon, succursale Ordo Malleus
- 8 Brotherhoods (1ère à 8ème)
- Personnages : Kaldor Draigo (Supreme Grand Master, perdu dans le Warp), Castellan Crowe, Lord Kaldor Draigo

#### Leagues of Votann (Squats nouvelle ère)
- Faction parent : descendants des humains augmentés génétiquement, mineurs-ingénieurs
- Sous-factions (Kindreds) : Trans-Hyperian Alliance, Greater Thurian, Kronus Hegemony, Ymyr Conglomerate, Urani-Surtr
- Personnages : Ûthar the Destined, Grimnyr (psyker)

#### Genestealer Cults
- Faction parent : cultes hybrides infiltrés sous les ruches impériales, précurseurs Tyranides
- Sous-factions : Cult of the Four-Armed Emperor, Twisted Helix, Bladed Cog, Hivecult, Pauper Princes, Rusted Claw
- Personnages : Patriarch (génétic ancestor), Magus, Primus, Acolyte Iconward

#### Officio Assassinorum (4 temples)
- Faction parent : 4 temples spécialisés, force d'élite de l'Empereur
- 4 sous-factions (temples) :
  - **Callidus** : infiltration polymorphique, polymorphine
  - **Vindicare** : sniper longue portée, exitus rifle
  - **Eversor** : frénésie chimique, drogues neurogen
  - **Culexus** : anti-psyker, animus speculum
- Personnages célèbres : Vindicare M'Shen (tueur de Konrad Curze)

### Phase F5 — Special entities (entités uniques, pages dédiées)

#### L'Empereur de l'Humanité
Page `/lore/emperor` :
- Origine mystique sur Terra (M30 ou avant — sacrifice des chamans)
- Grande Croisade et création des 20 primarques
- Hérésie d'Horus + duel final
- Trône d'Or : maintien artificiel, focal de l'Astronomican
- Apparitions au M42 (Yvraine et Ynnari, Guilliman, miracles)
- Statut actuel : Cadavre vivant ? Dieu en gestation ?

#### Les 20 Primarques
Page `/lore/primarchs` ou faction spéciale :
- 10 Loyalistes : Guilliman, Lion, Russ, Dorn, Vulkan, Khan, Ferrus, Corax, Sanguinius (mort), Khan disparu
- 9 Traîtres + Horus : tous Daemon-Princes ou morts
- 2 Disparus : II (Anonyme) et XI (Anonyme) — censurés des archives
- Statut actuel par primarque

#### Saintes & figures vivantes de l'Ecclesiarchy
- Saint Celestine (vivante actuellement)
- Ephrael Stern (Daemonifuge)
- Saint Katherine (martyrisée)
- Saint Sebastian Thor (M37)
- Sebastian Thor (Apostasy)

### Phase F6 — Chaos Pantheon
Page `/lore/chaos-gods` :

| Dieu | Sphère | Daemons mineurs | Daemons élite | Greater Daemon | Primarques |
|------|--------|-----------------|---------------|----------------|------------|
| **Khorne** | Sang, rage, combat | Bloodletters | Flesh Hounds, Bloodcrushers | Bloodthirster, Skarbrand (banni) | Angron |
| **Tzeentch** | Changement, savoir | Horrors (Pink/Blue) | Flamers, Screamers | Lord of Change, Kairos | Magnus |
| **Nurgle** | Maladie, désespoir | Plaguebearers | Nurglings, Beasts | Great Unclean One, Rotigus | Mortarion |
| **Slaanesh** | Excès, plaisir | Daemonettes | Fiends, Seekers | Keeper of Secrets, Shalaxi | Fulgrim |

Plus :
- Chaos Undivided (Renégats sans dieu)
- Daemons Princes (héros mortels élevés)
- Star Children / Renegade Knights / Lost and Damned

### Phase F7 — Lore concepts (encyclopédie)
Page `/lore` ou `/encyclopedia` :

**Concepts impériaux**
- Trône d'Or — siège mécanique maintenant l'Empereur en quasi-vie + Astronomican
- Astronomican — phare psychique guidant les vaisseaux dans le Warp
- Imperium Sanctus / Nihilus — division galactique post-Cicatrice
- Cicatrix Maledictum — grande déchirure psychique post-13ème Croisade
- Codex Astartes — bible militaire de Guilliman

**Régions warp / interstellaires**
- Œil de la Terreur — faille warp permanente, repaire Chaos
- Maelstrom — autre faille warp Segmentum Ultima
- Webway — réseau Aeldari
- Warp — dimension psychique parallèle

**Mondes notables**
- Holy Terra (capitale Imperium)
- Mars (capitale Mechanicus)
- Ultramar (empire stellaire UM)
- Cadia (forteresse-monde détruit M41)
- Macragge (capitale UM)
- Nuceria (Angron), Barbarus (Mortarion), Fenris (Russ), Caliban (Lion)

### Phase F8 — Galaxie & carte
Page `/galaxy` avec carte SVG interactive :
- 5 Segmenta : Solar (Terra), Pacificus, Tempestus, Obscurus, Ultima
- Œil de la Terreur, Maelstrom, Cicatrix Maledictum tracés
- Hot zones cliquables (Cadia, Armageddon, Macragge, Krieg, Vraks, etc.)
- Imperium Sanctus vs Nihilus visualisé en couleurs distinctes
- Routes warp principales

### Phase F9 — Civils impériaux (les rouages humains)
Page ou section sur les divers ordres civils :
- **Adepta Administratum** : bureaucrates de l'Imperium, gestion administrative trillion-paperasse
- **Adeptus Arbites** : police impériale, Arbitrators et Judges
- **Adeptus Ministorum / Ecclesiarchy** : église impériale, Confesseurs, Missionaires, Frateris Militia
- **Rogue Traders** : marchands-explorateurs avec Warrants of Trade impériaux
- **Inquisition** (Ordo Hereticus / Xenos / Malleus) : Inquisiteurs, Acolytes, Stormtroopers de l'Inquisition
- **Schola Progenium** : orphelinats militaires (origine des Commissaires + Sisters of Battle)
- **Remembrancers** : artistes/poètes documentant la Grande Croisade (les "raconteurs des exploits Astartes" — Hérésie d'Horus)
- **Navigators** : guides warp humains mutés (mutation autorisée)
- **Astropaths** : psykers communicants à longue distance
- **Sœurs du Silence (Sororitas Silentia)** : femmes blank, escortent les Custodes
- **Adeptus Astra Telepathica** : organisation des psykers humains
- **Imperial Knight Households** : nobles humains pilotant des Knights

### Phase F10 — Intégration galerie ↔ factions
Modifier la galerie : les **noms de toutes les factions** doivent apparaître dans les suggestions de catégorie quand on catégorise une image perso. Backend `/api/image-meta/categories` retourne :
- 6 catégories built-in (Space Marines/Chaos/Xénos/Imperium/Personnages/Véhicules)
- 11 noms de factions (Space Marines, Chaos Space Marines, Astra Militarum, etc.)
- Custom catégories de l'utilisateur

### Bonus — Tweaks UX
- **Breadcrumb** : navigation Factions › Space Marines › Ultramarines › Marneus Calgar avec chaque crumb cliquable
- **Catégorize combobox CSS** : remplacer datalist natif par un dropdown custom stylé
- **Faction page** : ajouter image du primarque + portrait + chapitre master à côté de la sous-faction card

---

## Ordre d'attaque (historique)
1. ~~**Finance Tracker**~~ — chantier toujours en attente (refonte React+shadcn)
2. ✅ **Phase F4** : Custodes + Officio Assassinorum (session 8, 2026-05-01)
3. ✅ **Phase F5** : L'Empereur + 20 Primarques (session 8, 2026-05-01)
4. ✅ **Phase F4** suite : Drukhari + Grey Knights + Votann + Genestealer Cults (session 8/9)
5. ✅ **Phase F6** : Chaos Pantheon (session 8, 2026-05-01)
6. ✅ **Phase F9** : Civils impériaux (session 9, 2026-05-01)
7. ✅ **Phase F7** : Lore concepts encyclopédie (15 concepts dont Baal — session 10, 2026-05-01)
8. ✅ **Phase F8** : Galaxy map SVG (8 hot zones calibrées — session 10, 2026-05-01)
9. ✅ **Phase F10** : Intégration galerie ↔ factions (catégories dynamiques — session 11, 2026-05-02)
10. ✅ **Tweaks UX** : breadcrumb, primarque overlay, fragment scroll, /galerie redirect (session 10, 2026-05-01)
11. ✅ **Audit V2** : cleanup mort code + datasheet locale prioritaire + enrichissement seeds (session 11, 2026-05-02)
12. ✅ **Phase F3 résiduelle** : +70 notableUnits xenos + 52 personnages Hérésie d'Horus (session 12, 2026-05-02)
13. ✅ **Datasheets manquantes** : 14 unités pourvues (12 wiki, 2 Lexicanum) — **133/133 couvert** (session 12)
14. ✅ **Series xénos** : +5 séries (Drukhari/GK ×2/Genestealer Cults ×2 ; Votann reste absent — corpus BL maigre) (session 12)
15. ✅ **Imperial-orgs +3** : Imperial Navy, Collegia Titanica, Conseil du Sigillite (Malcador, Valdor) (session 12)
16. ✅ **Page /lore/equipment** : 69 pièces (armes, armures, reliques) avec backend + frontend complet (session 12)
17. ✅ **Lightbox shared** : modal plein écran sur /lore/civilians + /lore/primarchs + /lore/chaos-gods avec mini-galerie + lien vers /gallery (session 12)
18. ✅ **Wiki queries 40K-spécifiques** : chaos-gods et primarchs, Lexicanum dans À propos (session 12)
19. ✅ **Fix infra** : nginx %2F decode → endpoint /images/imported/:filename (session 12)
20. ✅ **Gallery search filtre cats** : recherche filtre dynamiquement les cards de catégorie (session 12)
21. 🟡 **Auth multi-rôles** : read public / write authentifié — chantier infra séparé, jamais entamé.
22. 🟡 **Lightbox extension** : appliquer à /lore/equipment et /lore/concepts (polish optionnel).

---

## Sauvegardes utiles
- Données : `/volume2/docker/developpeur/data/warhammer/`
  - `factions.json` (**17 factions** — toutes lore enrichies post-F4)
  - `subfactions.json` (**113 entrées** — F4 + xenos V2 + 52 personnages Hérésie V2)
  - `units.json` (**133 unités**, **133/133 datasheets locales** post-V2)
  - `series.json` (**38 séries** — +5 xenos V2)
  - `lore-feed.json` (**40 entrées** ticker)
  - `artworks.json` (**35 entrées**)
  - `lore-concepts.json` (**15 concepts** dont Baal)
  - `equipment.json` (**69 pièces** — NOUVEAU V2)
  - `emperor.json` (6 sections + 5 stats)
  - `primarchs.json` (20 entrées — wikiQuery simplifiés V2)
  - `chaos-gods.json` (4 dieux — wikiQuery → Greater Daemons V2)
  - `imperial-orgs.json` (**13 organisations** — +3 V2 : Imperial Navy, Collegia Titanica, Conseil du Sigillite)
  - `image-meta.json`, `imported/`, `artwork-collections.json`, `channels.json`, `videos.json`
- Datasheets locales : `warhammer40k/backend/public/datasheets/<unit-id>.jpg` (133 fichiers, bundled Docker)
- Code backend : `warhammer40k/backend/src/modules/` (15+ modules dont subfactions, image-import, image-meta, lore-feed étendu avec equipment + endpoint dédié `/api/images/imported/:filename`)
- Code frontend : `warhammer40k/frontend/src/app/features/` :
  - V1 : dashboard, factions, faction-detail, subfaction-detail, unit-detail, series, videos, gallery, about
  - F5-F9 : lore-hub, lore-emperor, lore-primarchs, lore-chaos-gods, lore-civilians, lore-concepts, lore-galaxy
  - V2 : lore-equipment (NOUVEAU)
  - Shared : breadcrumb (global), figure-lightbox (V2 — modal plein écran réutilisable)

## Commits GitHub

V1 (2026-05-01) :
- `b91cb30 feat: Phase F4 + F5 + F6 + Dashboard refonte`
- `1ac2ef6 feat: Phase F9 — Civils impériaux`
- `18b3d4f feat: tweak UX — breadcrumb global`
- `46502b0 feat: tweaks UX — primarque mini-portrait + galaxy clean`
- `3c7f196 chore: cleanup mort code + fix liens cassés post-audit`

V2 (2026-05-02) :
- `354204f feat: enrichissement seeds + datasheet locale prioritaire + cleanup audit V2`
- `9706704 feat: 14 datasheets locales manquantes (133/133 couvert)`
- `b569114 fix: ork-makari + am-corbec via Lexicanum (visuels dédiés)`
- `7d112da feat: F3 résiduelle — +70 notableUnits xenos + 5 séries BL xenos`
- `c3a2c32 feat: imperial-orgs +3 — Imperial Navy, Collegia Titanica, Conseil du Sigillite`
- `20f3a74 feat: +52 personnages Hérésie d'Horus dans subfactions xenos/SM/CSM`
- `2c385e0 feat: codex de l'arsenal — page /lore/equipment (69 pièces) + fix images Civils`
- `0a9b912 feat: lightbox plein écran sur les figures notables`
- `1f68936 refactor: lightbox extrait en shared component + appliqué à 3 surfaces lore`
- `1b673e5 fix: chaos-gods images 40k-spécifiques`
- `c1c2a6f fix: primarch wikiQuery simplifiés vers le nom direct`
- `e34e428 fix: images importées via URL — endpoint dédié /images/imported/:filename`
- `bca4c55 feat: gallery — la recherche filtre aussi les cards de catégorie`

Repo : https://github.com/Sylad/warhammer40k (privé)
