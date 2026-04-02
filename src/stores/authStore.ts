import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (userId: string, email: string) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (userId, email) =>
    set({ userId, email, isAuthenticated: true, isLoading: false }),
  clearUser: () =>
    set({ userId: null, email: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
