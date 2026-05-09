# P5 — RESUME context

État au 2026-05-07 (pause user, à reprendre).

## Ce qui est livré (P1-P4)

- ✅ P1 : unit-detail template — hide placeholders Capacités/Équipement/Stats si data absente
- ✅ P2 : 8 factions enrichies (lore + stats + liensRapides + resources) → 17/17
- ✅ P4 : 14 héros enrichis full data → 15/133

## Ce qui reste pour P5

### P5b — 57 héros restants à enrichir
Inventaire complet généré dans cette session. Liste par faction :

- **adeptus-mechanicus (2)** : admech-dominus, admech-magos
- **aeldari (6)** : eld-farseer, eld-warlock, eld-avatar, eld-jain-zar, eld-asurmen, eld-yriel
- **astra-militarum (6)** : am-commissar, am-primaris-psyker, am-gaunt, am-corbec, am-creed, am-macharius
- **chaos-space-marines (9)** : csm-daemon-prince, csm-sorceleur, csm-angron, csm-magnus, csm-mortarion, csm-fulgrim, csm-kharn, csm-typhus, csm-ahriman
- **inquisition (7)** : inq-ravenor, inq-coteaz, inq-karamazov, inq-valeria, inq-vindicare, inq-eversor, inq-callidus
- **necrons (4)** : nec-overlord, nec-cryptek, nec-nightbringer, nec-szarekh
- **orks (4)** : ork-warboss, ork-mek, ork-weirdboy, ork-makari
- **soeurs-de-bataille (4)** : sob-canoness, sob-hospitaler, sob-imagifier, sob-katherine
- **space-marines (8)** : sm-captain, sm-chaplain, sm-librarian, sm-mephiston, sm-dante, sm-lion, sm-leman-russ-prim, sm-lemartes
- **tau (4)** : tau-commander, tau-ethereal, tau-farsight, tau-aun-va
- **tyranides (3)** : tyr-hive-tyrant, tyr-broodlord, tyr-swarmlord

### P5c — 61 generic units (lightweight enrichment)
description + role + 2-3 capacités génériques + image. Liste par faction dans cette session.

### P5d — IMPORTANT NEW REQUIREMENT (ajouté pendant la pause user)

> "warhammer 40K est un univers très visuel, il doit y avoir des images!"

Doit être appliqué partout dans P5 :
1. **À chaque enrichissement Unit** : ajouter `wikiQuery` ou `imageUrl` minimum
2. **UnitEquipment** : étendre le modèle pour supporter une image (champ `image?: string` à ajouter)
3. **Template unit-detail** : ajouter rendu d'image par equipment item, par capacity (artwork inline), par variant
4. **Sidebar** : ajouter section "Galerie liée" avec thumbnails artworks.json filtrés par factionId/unitId

Memory créée : `warhammer_visual_first.md`

## Workflow déploiement

- Sources sur WSL `/home/sylvain_ladoire/projects/developpeur/warhammer40k/`
- Build via `bash scripts/build-deploy.sh frontend|backend|all`
- NAS opère en mode image-only (sources non persistées)
- Seed JSON dual-sync nécessaire si on touche au backend : `backend/seed/*.json` ET `/volume2/docker/developpeur/data/warhammer/*.json`

## Reprise prévue

`/apex -r 03` ou simplement charger la mémoire et continuer. Privilégier P5d (template + modèle UnitEquipment) AVANT P5b/c pour que les nouveaux enrichissements aient déjà la structure image-ready.
