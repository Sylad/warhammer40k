import { InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { atomicWriteJsonSync } from './atomic-write.js';
import { readContent, userDataPath } from './content.js';

/**
 * L76 — vidéos et chaînes : la référence (seed, dans l'image) et ce que l'utilisateur a
 * ajouté ou retiré (volume) sont gardés à part et fusionnés à la lecture.
 *
 * Avant L76, le volume portait une copie COMPLÈTE de la liste (`data/videos.json`,
 * `data/channels.json`) : une correction du seed (ex. les deux adresses YouTube corrigées par
 * 0171157) n'atteignait jamais la prod. Désormais le volume ne garde qu'une surcouche,
 * `data/<nom>-utilisateur.json` = `{ version: 1, ajouts: [...], retraits: [id…] }` :
 *
 * - liste affichée = seed privé des `retraits`, puis les `ajouts` dont l'identifiant n'est pas
 *   dans le seed (à identifiant égal, la référence gagne : une entrée reprise dans le seed y
 *   reçoit ses corrections) ;
 * - un ajout s'écrit dans `ajouts` ; un retrait d'une entrée du seed s'écrit dans `retraits`,
 *   celui d'un ajout l'ôte de `ajouts`.
 *
 * Migration (une fois, au premier démarrage sans surcouche) : l'ancien fichier complet est lu,
 * ses entrées absentes du seed — et qui n'en ont jamais fait partie — deviennent des `ajouts` ;
 * les entrées du seed qui y manquent deviennent des `retraits` (seulement si l'utilisateur peut
 * retirer : vidéos oui, chaînes non). L'ancien fichier n'est NI modifié NI supprimé (copie de
 * secours, retour arrière possible) ; il n'est plus lu dès que la surcouche existe.
 *
 * Un fichier illisible (surcouche, ou ancien fichier à migrer) ne fait pas tomber le backend :
 * la liste retombe sur le seed et toute écriture est refusée (500), pour ne jamais écraser des
 * données qu'on n'a pas pu lire.
 */
export interface Surcouche<T> {
  ajouts: T[];
  retraits: string[];
}

interface AvecId {
  id: string;
}

export function fusionner<T extends AvecId>(seed: readonly T[], s: Surcouche<T>): T[] {
  const retraits = new Set(s.retraits);
  const idsSeed = new Set(seed.map(e => e.id));
  return [...seed.filter(e => !retraits.has(e.id)), ...s.ajouts.filter(e => !idsSeed.has(e.id))];
}

export interface OptionsMigration {
  /** Identifiants qui ont figuré dans le seed puis en ont été ôtés : jamais repris comme ajouts. */
  idsRetiresDuSeed: readonly string[];
  /** L'utilisateur peut-il retirer une entrée (DELETE) ? Sinon une entrée du seed absente de l'ancien fichier n'est pas un retrait. */
  retraitsPossibles: boolean;
}

/** Surcouche équivalente à un ancien fichier complet du volume (avant L76), sans rien perdre de ce que l'utilisateur y avait mis. */
export function migrerAncienVolume<T extends AvecId>(ancien: readonly T[], seed: readonly T[], o: OptionsMigration): Surcouche<T> {
  const idsSeed = new Set(seed.map(e => e.id));
  const idsAnciens = new Set(ancien.map(e => e.id));
  const vus = new Set<string>();
  const ajouts = ancien.filter(e => {
    if (idsSeed.has(e.id) || o.idsRetiresDuSeed.includes(e.id) || vus.has(e.id)) return false;
    vus.add(e.id);
    return true;
  });
  const retraits = o.retraitsPossibles ? seed.filter(e => !idsAnciens.has(e.id)).map(e => e.id) : [];
  return { ajouts, retraits };
}

function estSurcouche(x: unknown): x is Surcouche<unknown> {
  const s = x as Surcouche<unknown> | null;
  return !!s && Array.isArray(s.ajouts) && Array.isArray(s.retraits) && s.retraits.every(r => typeof r === 'string');
}

export interface OptionsDepot<T> extends OptionsMigration {
  /** Nom de base : seed `<nom>.json`, ancien volume `data/<nom>.json`, surcouche `data/<nom>-utilisateur.json`. */
  nom: string;
  /** Entrées masquées à la lecture (chaînes retirées L41, vidéos supprimées L232). */
  masquee: (e: T) => boolean;
}

/** Liste seed + surcouche utilisateur, chargée une fois (au démarrage du service). */
export class DepotFusionne<T extends AvecId> {
  private readonly logger: Logger;
  private readonly seed: T[];
  private surcouche: Surcouche<T> = { ajouts: [], retraits: [] };
  /** Faux si un fichier du volume n'a pas pu être lu : on n'écrit alors rien. */
  private inscriptible = true;
  private liste: T[] = [];

  constructor(private readonly o: OptionsDepot<T>) {
    this.logger = new Logger(`DepotFusionne(${o.nom})`);
    this.seed = readContent<T[]>(`${o.nom}.json`, []);
    this.charger();
    this.liste = this.calculer();
  }

  static cheminSurcouche(nom: string): string {
    return userDataPath(`${nom}-utilisateur.json`);
  }

  private charger(): void {
    const chemin = DepotFusionne.cheminSurcouche(this.o.nom);
    const ancien = userDataPath(`${this.o.nom}.json`);
    try {
      if (fs.existsSync(chemin)) {
        const lue: unknown = JSON.parse(fs.readFileSync(chemin, 'utf-8'));
        if (!estSurcouche(lue)) throw new Error('format inattendu (ajouts / retraits)');
        this.surcouche = { ajouts: lue.ajouts as T[], retraits: lue.retraits };
        return;
      }
      if (fs.existsSync(ancien)) {
        const lu: unknown = JSON.parse(fs.readFileSync(ancien, 'utf-8'));
        if (!Array.isArray(lu)) throw new Error('ancien fichier : un tableau était attendu');
        this.surcouche = migrerAncienVolume(lu as T[], this.seed, this.o);
        this.ecrire();
        this.logger.log(
          `migration L76 depuis data/${this.o.nom}.json (laissé intact) : ${this.surcouche.ajouts.length} ajout(s), ` +
            `${this.surcouche.retraits.length} retrait(s) → ${chemin}`,
        );
      }
    } catch (e) {
      this.inscriptible = false;
      this.surcouche = { ajouts: [], retraits: [] };
      this.logger.error(`volume illisible, repli sur le seed seul, écritures refusées : ${(e as Error).message}`);
    }
  }

  private calculer(): T[] {
    return fusionner(this.seed, this.surcouche).filter(e => !this.o.masquee(e));
  }

  private ecrire(): void {
    atomicWriteJsonSync(DepotFusionne.cheminSurcouche(this.o.nom), { version: 1, ...this.surcouche });
  }

  private verifierInscriptible(): void {
    if (!this.inscriptible) {
      throw new InternalServerErrorException(
        `data/${this.o.nom}-utilisateur.json (ou l'ancien data/${this.o.nom}.json à migrer) est illisible : écriture refusée pour ne pas l'écraser`,
      );
    }
  }

  tout(): T[] {
    return this.liste;
  }

  ajouter(e: T): void {
    this.verifierInscriptible();
    this.surcouche = {
      ajouts: [...this.surcouche.ajouts.filter(a => a.id !== e.id), e],
      retraits: this.surcouche.retraits.filter(r => r !== e.id),
    };
    this.ecrire();
    this.liste = this.calculer();
  }

  /** Retire une entrée affichée ; faux si elle n'est pas dans la liste. */
  retirer(id: string): boolean {
    if (!this.liste.some(e => e.id === id)) return false;
    this.verifierInscriptible();
    const dansSeed = this.seed.some(e => e.id === id);
    this.surcouche = {
      ajouts: this.surcouche.ajouts.filter(a => a.id !== id),
      retraits: dansSeed && !this.surcouche.retraits.includes(id) ? [...this.surcouche.retraits, id] : this.surcouche.retraits,
    };
    this.ecrire();
    this.liste = this.calculer();
    return true;
  }
}
