import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'entrepreneur' | 'ngo' | 'financial-institution' | 'mentor';
export type Language = 'hi' | 'en' | 'hinglish';

interface OnboardingInput {
  location: { village: string; block: string; district: string } | null;
  /**
   * null until the user actually types a figure.
   *
   * This was `number` defaulting to 100000, which no consumer could tell apart from an amount the
   * user had entered. `location` and `businessCategory` were given falsy defaults; the one field
   * carrying RUPEES was not. Downstream, that default enabled onboarding's Continue button before
   * the question was answered, pre-filled the capital field so the placeholder never showed, and
   * let the journey stepper tick Discover as done. Every one of those was the app asserting
   * something about the user's finances that the user had never said.
   */
  marginCapital: number | null;
  businessCategory: string;
}

interface AppState {
  userRole: UserRole;
  language: Language;
  onboardingInput: OnboardingInput;
  /**
   * Journey steps the user has actually opened.
   *
   * The stepper used to infer progress from array position — `index < currentStep` — so opening
   * the last step from the bottom nav drew green ticks on all five before it. The app had no
   * record of where the user had been, so it guessed, and the guess flattered.
   */
  visitedSteps: string[];
  setRole: (role: UserRole) => void;
  setLanguage: (lang: Language) => void;
  setOnboardingInput: (input: Partial<OnboardingInput>) => void;
  markStepVisited: (id: string) => void;
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
        marginCapital: null,
        businessCategory: '',
      },
      visitedSteps: [],
      setRole: (role) => set({ userRole: role }),
      setLanguage: (lang) => set({ language: lang }),
      setOnboardingInput: (input) =>
        set((state) => ({
          onboardingInput: { ...state.onboardingInput, ...input },
        })),
      markStepVisited: (id) =>
        set((state) =>
          state.visitedSteps.includes(id)
            ? state
            : { visitedSteps: [...state.visitedSteps, id] },
        ),
    }),
    {
      name: 'siddhi.session',
      // 2: marginCapital became nullable. Bumping drops persisted sessions carrying the old
      // 100000 default, which would otherwise be rehydrated as if the user had typed it.
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        userRole: s.userRole,
        language: s.language,
        onboardingInput: s.onboardingInput,
        visitedSteps: s.visitedSteps,
      }),
    },
  ),
);
