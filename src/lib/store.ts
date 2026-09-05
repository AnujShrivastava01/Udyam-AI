import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { CommunityPost } from '@/lib/community/posts';
import type { Requirement } from '@/lib/marketplace/requirement';

export type UserRole = 'entrepreneur' | 'ngo' | 'financial-institution' | 'mentor';
export type Language = 'hi' | 'en' | 'hinglish';

/**
 * Three states, not two.
 *
 * 'system' is a real preference, not the absence of one — a user who has set their phone to switch
 * at sunset is telling us something, and a two-state toggle would silently override that for good
 * the first time they tapped it. 'system' stays the default and stays reachable.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

export interface OnboardingInput {
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
  theme: ThemeMode;
  onboardingInput: OnboardingInput;
  /**
   * Journey steps the user has actually opened.
   *
   * The stepper used to infer progress from array position — `index < currentStep` — so opening
   * the last step from the bottom nav drew green ticks on all five before it. The app had no
   * record of where the user had been, so it guessed, and the guess flattered.
   */
  visitedSteps: string[];
  /**
   * Posts this user wrote, in this browser.
   *
   * Not a feed. There is no server and no other users, so this holds exactly one person's writing
   * and the community screen renders it as such — beside the illustrative examples, visibly
   * distinct from them. Persisted so the interaction survives a reload, which is the whole of what
   * it claims to demonstrate.
   */
  communityPosts: CommunityPost[];
  /** Requirements the user composed on the marketplace screen. Same scope, same honesty. */
  requirements: Requirement[];
  /**
   * The day the loan money actually reached the user, as yyyy-mm-dd. Null until they say so.
   *
   * The one fact this product cannot compute and cannot guess. With it, the repayment screen
   * places every instalment on a real calendar; without it, that screen stays a projection and
   * says so. It is emphatically NOT evidence that a loan exists — there is no lender here — which
   * is why nothing else in the app reads it.
   */
  disbursedOn: string | null;
  setRole: (role: UserRole) => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setOnboardingInput: (input: Partial<OnboardingInput>) => void;
  markStepVisited: (id: string) => void;
  addCommunityPost: (post: CommunityPost) => void;
  deleteCommunityPost: (id: string) => void;
  addRequirement: (requirement: Requirement) => void;
  deleteRequirement: (id: string) => void;
  setDisbursedOn: (iso: string | null) => void;
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
      theme: 'system',
      onboardingInput: {
        location: null,
        marginCapital: null,
        businessCategory: '',
      },
      visitedSteps: [],
      communityPosts: [],
      requirements: [],
      disbursedOn: null,
      setRole: (role) => set({ userRole: role }),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
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
      // Newest first in the array, so no consumer has to sort to render a feed in the order a
      // reader expects.
      addCommunityPost: (post) =>
        set((state) => ({ communityPosts: [post, ...state.communityPosts] })),
      deleteCommunityPost: (id) =>
        set((state) => ({ communityPosts: state.communityPosts.filter((p) => p.id !== id) })),
      addRequirement: (requirement) =>
        set((state) => ({ requirements: [requirement, ...state.requirements] })),
      deleteRequirement: (id) =>
        set((state) => ({ requirements: state.requirements.filter((r) => r.id !== id) })),
      setDisbursedOn: (iso) => set({ disbursedOn: iso }),
    }),
    {
      name: 'siddhi.session',
      /**
       * 5: disbursedOn added — additive, defaults to null, which is "no loan taken".
       * 4: communityPosts and requirements added — purely additive, so nothing is discarded.
       * 3: the districts on offer changed from three UP names to the gazetteer's own.
       * 2: marginCapital became nullable.
       *
       * Bumping the version without supplying `migrate` makes zustand log
       * "State loaded from storage couldn't be migrated" and throw the session away — the outcome
       * was what I wanted, but an error in the console is not how you express an intention.
       */
      version: 5,
      migrate: (persisted, from) => {
        const s = (persisted ?? {}) as Partial<AppState>;
        // v1 stored marginCapital as a plain number defaulting to 100000, and nothing recorded
        // whether the user had typed it. It cannot be told apart from an untouched default, so it
        // is dropped rather than promoted into an assertion about their finances — which is the
        // whole reason the field became nullable.
        // v1/v2 stored a district from a hardcoded UP list that no village in the gazetteer
        // matches, so the location is dropped too. Both mean the question gets asked again.
        // v4 only ADDED collections, so a v3 session keeps everything it had and simply gains two
        // empty arrays. Defaulting them here rather than relying on the initial state matters:
        // zustand merges the persisted object over the initial one, and a persisted `undefined`
        // would win over `[]` and crash the first `.map`.
        const collections = {
          communityPosts: s.communityPosts ?? [],
          requirements: s.requirements ?? [],
          disbursedOn: s.disbursedOn ?? null,
        };

        if (from < 3) {
          return {
            ...s,
            ...collections,
            onboardingInput: {
              location: null,
              marginCapital: null,
              businessCategory: s.onboardingInput?.businessCategory ?? '',
            },
            visitedSteps: s.visitedSteps ?? [],
          };
        }
        return { ...s, ...collections };
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        userRole: s.userRole,
        language: s.language,
        theme: s.theme,
        onboardingInput: s.onboardingInput,
        visitedSteps: s.visitedSteps,
        communityPosts: s.communityPosts,
        requirements: s.requirements,
        disbursedOn: s.disbursedOn,
      }),
    },
  ),
);
