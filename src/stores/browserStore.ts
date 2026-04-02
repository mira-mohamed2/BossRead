import { create } from 'zustand';

interface BrowserState {
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isReaderMode: boolean;
  pageTitle: string;

  setUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  setCanGoBack: (can: boolean) => void;
  setCanGoForward: (can: boolean) => void;
  toggleReaderMode: () => void;
  setReaderMode: (mode: boolean) => void;
  setPageTitle: (title: string) => void;
  reset: () => void;
}

const initialState = {
  url: '',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  isReaderMode: false,
  pageTitle: '',
};

export const useBrowserStore = create<BrowserState>((set) => ({
  ...initialState,

  setUrl: (url) => set({ url }),
  setLoading: (isLoading) => set({ isLoading }),
  setCanGoBack: (canGoBack) => set({ canGoBack }),
  setCanGoForward: (canGoForward) => set({ canGoForward }),
  toggleReaderMode: () => set((s) => ({ isReaderMode: !s.isReaderMode })),
  setReaderMode: (isReaderMode) => set({ isReaderMode }),
  setPageTitle: (pageTitle) => set({ pageTitle }),
  reset: () => set(initialState),
}));
