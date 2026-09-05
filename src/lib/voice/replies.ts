/**
 * What the agent says back.
 *
 * Every rupee figure here is expanded from the kernel's own value by `speakAmount`. No template
 * below contains a digit of its own, and nothing the model produced reaches the synthesiser — the
 * model chose an ACTION, and these sentences are built from that action plus figures the kernel
 * computed. Same rule as the screen: numbers are computed once and only ever formatted.
 */

import type { Locale } from "@/lib/i18n/keys";
import type { Plan } from "@/lib/finance";
import { speakAmount } from "./bhashini";
import type { AgentAction, Category, Page } from "./agent";

type Say = Record<Locale, string>;

const fill = (t: string, params: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (whole, k) => (params[k] != null ? String(params[k]) : whole));

const CATEGORY_WORD: Record<Category, Say> = {
  dairy: { en: "dairy and livestock", hi: "डेयरी और पशुपालन", hinglish: "dairy aur pashupalan" },
  retail: { en: "retail and kirana", hi: "खुदरा और किराना", hinglish: "retail aur kirana" },
  textiles: { en: "textiles and tailoring", hi: "कपड़ा और सिलाई", hinglish: "kapda aur silai" },
  food: { en: "food processing", hi: "खाद्य प्रसंस्करण", hinglish: "food processing" },
  handicrafts: { en: "handicrafts", hi: "हस्तशिल्प", hinglish: "handicrafts" },
  services: { en: "local services", hi: "स्थानीय सेवाएँ", hinglish: "local services" },
};

const PAGE_WORD: Record<Page, Say> = {
  onboarding: { en: "the start", hi: "शुरुआत", hinglish: "shuruaat" },
  discover: { en: "what to start", hi: "क्या शुरू करें", hinglish: "kya shuru karein" },
  calculator: { en: "the money plan", hi: "पैसे की योजना", hinglish: "paise ka plan" },
  report: { en: "the feasibility report", hi: "व्यवहार्यता रिपोर्ट", hinglish: "feasibility report" },
  community: { en: "the community", hi: "समुदाय", hinglish: "community" },
  emi: { en: "your loan", hi: "आपका कर्ज़", hinglish: "aapka loan" },
  profile: { en: "the profile", hi: "प्रोफ़ाइल", hinglish: "profile" },
};

const T = {
  // Acknowledgements only. These used to hardcode what came next — "Now choose your block", "Now
  // tell me how much capital you have" — which built a fixed chain of district, block, capital,
  // plan. The business category was never in that chain, so the agent NEVER ASKED what work the
  // user wanted to do, even though setting it was one of the actions it could take. The next
  // question is now derived from what is actually still missing; see `nextQuestion`.
  district: {
    en: "Alright, {name}.",
    hi: "ठीक है, {name}।",
    hinglish: "Theek hai, {name}.",
  } satisfies Say,
  block: {
    en: "Got it, {name}.",
    hi: "समझ गया, {name}।",
    hinglish: "Samajh gaya, {name}.",
  } satisfies Say,
  category: {
    en: "Noted, {name}.",
    hi: "{name}, नोट कर लिया।",
    hinglish: "{name}, note kar liya.",
  } satisfies Say,
  marginAccepted: {
    en: "Noted.",
    hi: "नोट कर लिया।",
    hinglish: "Note kar liya.",
  } satisfies Say,
  marginRejected: {
    en: "No problem. Please say the amount again.",
    hi: "कोई बात नहीं। कृपया रकम दोबारा बोलिए।",
    hinglish: "Koi baat nahi. Rakam dobara boliye.",
  } satisfies Say,
  navigate: {
    en: "Opening {name}.",
    hi: "{name} खोल रहा हूँ।",
    hinglish: "{name} khol raha hoon.",
  } satisfies Say,
  noPlanYet: {
    en: "I need your capital and your work first. Tell me how much money you have.",
    hi: "पहले आपकी पूँजी और काम बताइए। आपके पास कितने पैसे हैं?",
    hinglish: "Pehle aapki poonji aur kaam bataiye. Aapke paas kitne paise hain?",
  } satisfies Say,
  unknown: {
    en: "Sorry, I did not catch that. You can say: my district is Gwalior, I have fifty thousand rupees, open the money plan, or explain this.",
    hi: "माफ़ कीजिए, समझ नहीं आया। आप कह सकते हैं: मेरा ज़िला ग्वालियर है, मेरे पास पचास हज़ार रुपये हैं, पैसे की योजना खोलिए, या यह समझाइए।",
    hinglish:
      "Maaf kijiye, samajh nahi aaya. Aap keh sakte hain: mera district Gwalior hai, mere paas pachas hazaar rupaye hain, paise ka plan kholiye, ya yeh samjhaiye.",
  } satisfies Say,
  answer: {
    instalment: {
      en: "Your instalment is {amount} every quarter.",
      hi: "आपकी किस्त हर तिमाही {amount} है।",
      hinglish: "Aapki kist har quarter {amount} hai.",
    } satisfies Say,
    gap: {
      en: "{amount} falls due before this work earns anything.",
      hi: "इस काम की कमाई शुरू होने से पहले {amount} देना पड़ेगा।",
      hinglish: "Is kaam ki kamai shuru hone se pehle {amount} dena padega.",
    } satisfies Say,
    noGap: {
      en: "Nothing falls due before this work starts earning.",
      hi: "कमाई शुरू होने से पहले कुछ नहीं देना पड़ता।",
      hinglish: "Kamai shuru hone se pehle kuch nahi dena padta.",
    } satisfies Say,
    scheme: {
      en: "This routes to {scheme}, and the loan is {amount}.",
      hi: "यह {scheme} में जाता है, और कर्ज़ {amount} है।",
      hinglish: "Yeh {scheme} mein jaata hai, aur loan {amount} hai.",
    } satisfies Say,
    project_cost: {
      en: "The project cost is {amount}.",
      hi: "परियोजना लागत {amount} है।",
      hinglish: "Project cost {amount} hai.",
    } satisfies Say,
    gestation: {
      en: "This work earns from month {months}.",
      hi: "इस काम से {months}वें महीने से कमाई होती है।",
      hinglish: "Is kaam se {months}ve mahine se kamai hoti hai.",
    } satisfies Say,
    gestationNone: {
      en: "This work earns from the first month.",
      hi: "इस काम से पहले महीने से ही कमाई होती है।",
      hinglish: "Is kaam se pehle mahine se hi kamai hoti hai.",
    } satisfies Say,
  },
};

/**
 * The four things onboarding needs, and how the agent asks for each.
 *
 * The category prompt lists the choices out loud. A closed set the user cannot see has to be read
 * to them, or the only way to discover the options is to guess — and a voice-first product for
 * users who may not read the screen cannot rely on the screen.
 */
const ASK = {
  district: {
    en: "Which district are you in?",
    hi: "आप किस ज़िले में हैं?",
    hinglish: "Aap kis zile mein hain?",
  } satisfies Say,
  block: {
    en: "Which block?",
    hi: "कौन सा ब्लॉक?",
    hinglish: "Kaun sa block?",
  } satisfies Say,
  category: {
    en: "What work do you want to do? You can say dairy, a kirana shop, tailoring, food processing, handicrafts, or local services.",
    hi: "आप कौन सा काम करना चाहते हैं? आप कह सकते हैं डेयरी, किराना दुकान, सिलाई, खाद्य प्रसंस्करण, हस्तशिल्प, या स्थानीय सेवाएँ।",
    hinglish:
      "Aap kaun sa kaam karna chahte hain? Aap keh sakte hain dairy, kirana dukaan, silai, food processing, handicrafts, ya local services.",
  } satisfies Say,
  margin: {
    en: "How much money can you put in yourself?",
    hi: "आप अपनी तरफ़ से कितने पैसे लगा सकते हैं?",
    hinglish: "Aap apni taraf se kitne paise laga sakte hain?",
  } satisfies Say,
  done: {
    en: "That is everything I need. Opening your money plan.",
    hi: "मुझे बस इतना ही चाहिए था। आपकी पैसे की योजना खोल रहा हूँ।",
    hinglish: "Mujhe bas itna hi chahiye tha. Aapka paise ka plan khol raha hoon.",
  } satisfies Say,
};

export type MissingField = "district" | "block" | "category" | "margin";

export interface OnboardingState {
  district?: string;
  block?: string;
  category?: string;
  marginCapital?: number | null;
}

/**
 * The first thing still unanswered, in the order the plan actually needs them.
 *
 * District before block because the block list is filtered by district; category before margin
 * because the trade decides the unit cost that the margin is checked against. Returns null when
 * there is nothing left to ask.
 */
export function firstMissing(ctx: OnboardingState): MissingField | null {
  if (!ctx.district) return "district";
  if (!ctx.block) return "block";
  if (!ctx.category) return "category";
  if (ctx.marginCapital == null || ctx.marginCapital <= 0) return "margin";
  return null;
}

/**
 * What the agent should ask next, given everything it now knows.
 *
 * Appended to the acknowledgement so a turn both confirms what was heard and moves the
 * conversation on — which is what makes the agent drive onboarding rather than merely answer.
 */
export function nextQuestion(ctx: OnboardingState, locale: Locale): string {
  const missing = firstMissing(ctx);
  return missing ? ASK[missing][locale] : ASK.done[locale];
}

/** True once every question has an answer, so the caller knows it may open the plan. */
export function onboardingComplete(ctx: OnboardingState): boolean {
  return firstMissing(ctx) === null;
}

/** The sentence the agent speaks for an action. Numbers come from `plan`, never from the model. */
export function replyFor(action: AgentAction, locale: Locale, plan: Plan | null): string {
  switch (action.kind) {
    case "set_district":
      return fill(T.district[locale], { name: action.district });
    case "set_block":
      return fill(T.block[locale], { name: action.block });
    case "set_category":
      return fill(T.category[locale], { name: CATEGORY_WORD[action.category][locale] });
    case "confirm":
      return action.yes ? T.marginAccepted[locale] : T.marginRejected[locale];
    case "navigate":
      return fill(T.navigate[locale], { name: PAGE_WORD[action.page][locale] });
    case "answer": {
      if (!plan || plan.structure.sanctionedLoan <= 0) return T.noPlanYet[locale];
      const a = T.answer;
      switch (action.topic) {
        case "instalment":
          return fill(a.instalment[locale], {
            amount: speakAmount(plan.schedule.instalment, locale),
          });
        case "gap":
          return plan.solvency.preIncomeObligation > 0
            ? fill(a.gap[locale], {
                amount: speakAmount(plan.solvency.preIncomeObligation, locale),
              })
            : a.noGap[locale];
        case "scheme":
          return fill(a.scheme[locale], {
            scheme: plan.structure.scheme.name,
            amount: speakAmount(plan.structure.sanctionedLoan, locale),
          });
        case "project_cost":
          return fill(a.project_cost[locale], {
            amount: speakAmount(plan.structure.projectCost, locale),
          });
        case "gestation": {
          const months = plan.activity?.gestationMonths ?? 0;
          return months > 0 ? fill(a.gestation[locale], { months }) : a.gestationNone[locale];
        }
      }
      return T.unknown[locale];
    }
    default:
      return T.unknown[locale];
  }
}

export const UNKNOWN_REPLY = (locale: Locale) => T.unknown[locale];
export const NO_PLAN_REPLY = (locale: Locale) => T.noPlanYet[locale];
