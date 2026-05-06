import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { TimelineEra, TimelineEvent } from '../../core/models/models';

interface EraDef {
  id: TimelineEra;
  label: string;
  range: string;
  sigil: string;
}

const ERAS: EraDef[] = [
  { id: 'pre-imperium',    label: 'Pré-Imperium',     range: 'M-30 → 005.M31', sigil: '✠' },
  { id: 'horus-heresy',    label: "Hérésie d'Horus",  range: '005.M31 → 014.M31', sigil: '☩' },
  { id: 'time-of-rebirth', label: 'Temps de la Renaissance', range: 'M31 → M32', sigil: '⚜' },
  { id: 'm32-m40',         label: 'Long Crépuscule',  range: 'M32 → M40', sigil: '⚖' },
  { id: 'm41',             label: '41ᵉ Millénaire',   range: 'M41', sigil: '⚔' },
  { id: 'm42',             label: 'Cicatrix & Indomitus', range: 'M42', sigil: '⚒' },
];

const ERA_LABEL: Record<TimelineEra, string> = ERAS.reduce((acc, e) => {
  acc[e.id] = e.label;
  return acc;
}, {} as Record<TimelineEra, string>);

const TAG_LABEL: Record<string, string> = {
  emperor: "L'Empereur",
  terra: 'Terra',
  warp: 'Warp',
  humanity: 'Humanité',
  primarchs: 'Primarques',
  'thunder-warriors': 'Thunder Warriors',
  mechanicum: 'Mechanicum',
  chaos: 'Chaos',
  'great-crusade': 'Grande Croisade',
  'space-marines': 'Space Marines',
  'horus-heresy': 'Hérésie',
  horus: 'Horus',
  magnus: 'Magnus',
  tzeentch: 'Tzeentch',
  nurgle: 'Nurgle',
  khorne: 'Khorne',
  'space-wolves': 'Space Wolves',
  'eye-of-terror': 'Œil de la Terreur',
  sanguinius: 'Sanguinius',
  guilliman: 'Guilliman',
  primaris: 'Primaris',
  imperium: 'Imperium',
  'imperial-fists': 'Imperial Fists',
  orks: 'Orks',
  ecclesiarchy: 'Ecclésiarchie',
  sororitas: 'Adepta Sororitas',
  macharius: 'Macharius',
  'imperial-guard': 'Astra Militarum',
  'grey-knights': 'Grey Knights',
  armageddon: 'Armageddon',
  ghazghkull: 'Ghazghkull',
  tyranids: 'Tyranides',
  ultramarines: 'Ultramarines',
  calgar: 'Calgar',
  macragge: 'Macragge',
  tau: "T'au",
  cadia: 'Cadia',
  abaddon: 'Abaddon',
  'imperium-nihilus': 'Imperium Nihilus',
  'imperium-sanctus': 'Imperium Sanctus',
  'blood-angels': 'Blood Angels',
  dante: 'Dante',
  necrons: 'Necrons',
  'death-guard': 'Death Guard',
  ultramar: 'Ultramar',
  aeldari: 'Aeldari',
  ynnari: 'Ynnari',
  psykers: 'Psykers',
  'silent-king': 'Roi Silencieux',
  vigilus: 'Vigilus',
  custodes: 'Adeptus Custodes',
  'hive-fleets': 'Flottes-Ruches',
};

@Component({
  selector: 'app-lore-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lore-timeline.component.html',
  styleUrls: ['./lore-timeline.component.scss'],
})
export class LoreTimelineComponent {
  private readonly service = inject(WarhammerService);

  readonly events = toSignal(this.service.timelineEvents$, { initialValue: [] as TimelineEvent[] });

  readonly filterEra = signal<'all' | TimelineEra>('all');
  readonly filterTag = signal<string>('all');
  readonly expandedId = signal<string | null>(null);
  readonly activeEra = signal<TimelineEra | null>(null);

  readonly heroImage = signal<string | null>(null);
  private readonly imgCache = signal<Record<string, string>>({});
  private readonly imgInflight = new Set<string>();

  readonly eras = ERAS;

  readonly tagOptions = computed(() => {
    const tags = new Set<string>();
    for (const ev of this.events()) {
      for (const t of ev.tags) tags.add(t);
    }
    return Array.from(tags).sort((a, b) => this.tagLabel(a).localeCompare(this.tagLabel(b), 'fr'));
  });

  readonly filtered = computed<TimelineEvent[]>(() => {
    const era = this.filterEra();
    const tag = this.filterTag();
    return this.events().filter(ev => {
      if (era !== 'all' && ev.era !== era) return false;
      if (tag !== 'all' && !ev.tags.includes(tag)) return false;
      return true;
    });
  });

  readonly grouped = computed<{ era: EraDef; items: TimelineEvent[] }[]>(() => {
    const list = this.filtered();
    return ERAS
      .map(era => ({
        era,
        items: list.filter(ev => ev.era === era.id),
      }))
      .filter(group => group.items.length > 0);
  });

  countByEra(era: TimelineEra): number {
    return this.events().filter(ev => ev.era === era).length;
  }

  countByTag(tag: string): number {
    return this.events().filter(ev => ev.tags.includes(tag)).length;
  }

  eraLabel(era: TimelineEra): string { return ERA_LABEL[era]; }
  tagLabel(tag: string): string { return TAG_LABEL[tag] ?? tag; }

  toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  scrollToEra(era: TimelineEra): void {
    if (this.filterEra() !== 'all') this.filterEra.set('all');
    if (this.filterTag() !== 'all') this.filterTag.set('all');
    this.expandedId.set(null);
    setTimeout(() => {
      const el = document.getElementById(`era-${era}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  resetFilters(): void {
    this.filterEra.set('all');
    this.filterTag.set('all');
    this.expandedId.set(null);
  }

  isLeft(index: number): boolean { return index % 2 === 0; }

  eventImg(id: string): string {
    const url = this.imgCache()[`tl:${id}`];
    return url ? `url('${url}')` : 'linear-gradient(135deg, #1a0a08 0%, #050403 100%)';
  }

  heroImg(): string {
    const url = this.heroImage();
    return url ? `url('${url}')` : 'linear-gradient(135deg, #2a1c10 0%, #050403 100%)';
  }

  constructor() {
    this.service.getWikiImage('Warhammer 40k Imperium history scroll codex').subscribe({
      next: r => { if (r.imageUrl) this.heroImage.set(r.imageUrl); },
      error: () => {},
    });

    effect(() => {
      const list = this.events();
      const cache = this.imgCache();
      for (const ev of list) {
        if (!ev.image) continue;
        const key = `tl:${ev.id}`;
        if (cache[key] || this.imgInflight.has(key)) continue;
        this.imgInflight.add(key);
        this.service.getWikiImage(ev.image).subscribe({
          next: r => {
            if (r.imageUrl) this.imgCache.update(c => ({ ...c, [key]: r.imageUrl! }));
            this.imgInflight.delete(key);
          },
          error: () => { this.imgInflight.delete(key); },
        });
      }
    });

    effect(() => {
      const groups = this.grouped();
      if (groups.length > 0) this.activeEra.set(groups[0].era.id);
    });
  }
}
