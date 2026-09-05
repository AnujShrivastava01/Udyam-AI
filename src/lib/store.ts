import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'entrepreneur' | 'ngo' | 'financial-institution' | 'mentor';
export type Language = 'hi' | 'en' | 'hinglish';

interface OnboardingInput {
  location: { village: string; block: string; district: string; lat: number; lng: number } | null;
  marginCapital: number;
  businessCategory: string;
}

interface AppState {
  userRole: UserRole;
  language: Language;
  onboardingInput: OnboardingInput;
  setRole: (role: UserRole) => void;
  setLanguage: (lang: Language) => void;
  setOnboardingInput: (input: Partial<OnboardingInput>) => void;
}

/**
 * Persisted, but deliberately NOT rehydrated during store creation.
 *
 * The language drives server-rendered text. If the store read localStorage synchronously on the
 * client, a user whose saved language is Hindi would hydrate Devanagari over a server tree rendered
 * in the Hinglish default, and React would throw a hydration mismatch on every load. `skipHydration`
 * defers the read to a mount effect (see StoreHydration), so the first paint always matches the
 * server and the saved choice is applied one frame later.
 *
 * Before this, choosing a language survived client-side navigation but not a reload — which is
 * exactly the case that matters, because a shared link is a fresh load.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userRole: 'entrepreneur',
      language: 'hinglish', // rural users read Roman-script Hinglish faster than either pure language
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
    }),
    {
      name: 'siddhi.session',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        userRole: s.userRole,
        language: s.language,
        onboardingInput: s.onboardingInput,
      }),
    },
  ),
);
