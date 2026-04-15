export type {
  NovelSource,
  NovelInfo,
  ChapterInfo,
  ChapterContent,
  NovelFilter,
  SourcePage,
} from './types';

export { AllNovelFullSource } from './AllNovelFull';
export { RoyalRoadSource } from './RoyalRoad';
export { LightNovelPubSource } from './LightNovelPub';
export { NovelBinSource } from './NovelBin';
export { FreeWebNovelSource } from './FreeWebNovel';

import { AllNovelFullSource } from './AllNovelFull';
import { RoyalRoadSource } from './RoyalRoad';
import { LightNovelPubSource } from './LightNovelPub';
import { NovelBinSource } from './NovelBin';
import { FreeWebNovelSource } from './FreeWebNovel';
import type { NovelSource } from './types';

/** Registry of all available sources */
const ALL_SOURCES: NovelSource[] = [
  new AllNovelFullSource(),
  new RoyalRoadSource(),
  new NovelBinSource(),
  new FreeWebNovelSource(),
  new LightNovelPubSource(),
];

export function getAllSources(): NovelSource[] {
  return ALL_SOURCES;
}

export function getSourceById(id: string): NovelSource | undefined {
  return ALL_SOURCES.find((s) => s.id === id);
}
