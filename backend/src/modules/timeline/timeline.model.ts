export type TimelineEra =
  | 'pre-imperium'
  | 'horus-heresy'
  | 'time-of-rebirth'
  | 'm32-m40'
  | 'm41'
  | 'm42';

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  era: TimelineEra;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  image?: string;
  sources: string[];
}
