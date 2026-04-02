import { create } from 'zustand';
import type { NovelInfo, NovelSource } from './sources/types';
import { getAllSources } from './sources';

interface DiscoverState {
  activeSourceId: string;
  searchQuery: string;
  tab: 'popular' | 'latest' | 'search';
  novels: NovelInfo[];
  loading: boolean;
  page: number;
  hasNextPage: boolean;

  setActiveSource: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setTab: (tab: 'popular' | 'latest' | 'search') => void;
  setNovels: (novels: NovelInfo[]) => void;
  appendNovels: (novels: NovelInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setPage: (page: number) => void;
  setHasNextPage: (has: boolean) => void;
  reset: () => void;
}

const defaultSourceId = getAllSources()[0]?.id ?? '';

export const useDiscoverStore = create<DiscoverState>((set) => ({
  activeSourceId: defaultSourceId,
  searchQuery: '',
  tab: 'popular',
  novels: [],
  loading: false,
  page: 1,
  hasNextPage: false,

  setActiveSource: (activeSourceId) => set({ activeSourceId, novels: [], page: 1, hasNextPage: false }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTab: (tab) => set({ tab, novels: [], page: 1, hasNextPage: false }),
  setNovels: (novels) => set({ novels }),
  appendNovels: (newNovels) => set((s) => ({ novels: [...s.novels, ...newNovels] })),
  setLoading: (loading) => set({ loading }),
  setPage: (page) => set({ page }),
  setHasNextPage: (hasNextPage) => set({ hasNextPage }),
  reset: () => set({ novels: [], page: 1, hasNextPage: false, searchQuery: '', loading: false }),
}));
