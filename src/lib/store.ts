import { create } from 'zustand';

export type UserRole = 'entrepreneur' | 'ngo' | 'financial-institution' | 'mentor';

interface OnboardingInput {
  location: { village: string; block: string; district: string; lat: number; lng: number } | null;
  marginCapital: number;
  businessCategory: string;
}

interface AppState {
  userRole: UserRole;
  language: 'hi' | 'en';
  onboardingInput: OnboardingInput;
  setRole: (role: UserRole) => void;
  setLanguage: (lang: 'hi' | 'en') => void;
  setOnboardingInput: (input: Partial<OnboardingInput>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  userRole: 'entrepreneur',
  language: 'hi', // default to Hindi per requirements
  onboardingInput: {
    location: null,
    marginCapital: 100000,
    businessCategory: '',
  },
  setRole: (role) => set({ userRole: role }),
  setLanguage: (lang) => set({ language: lang }),
  setOnboardingInput: (input) =>
    set((state) => ({
      onboardingInput: { ...state.onboardingInput, ...input },
    })),
}));
