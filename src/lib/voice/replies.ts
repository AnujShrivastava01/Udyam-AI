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
  district: {
    en: "Alright, {name}. Now choose your block.",
    hi: "ठीक है, {name}। अब अपना ब्लॉक चुनिए।",
    hinglish: "Theek hai, {name}. Ab apna block chuniye.",
  } satisfies Say,
  block: {
    en: "Got it, {name}. Now tell me how much capital you have.",
    hi: "समझ गया, {name}। अब बताइए आपके पास कितनी पूँजी है।",
    hinglish: "Samajh gaya, {name}. Ab bataiye aapke paas kitni poonji hai.",
  } satisfies Say,
  category: {
    en: "Noted, {name}.",
    hi: "{name}, नोट कर लिया।",
    hinglish: "{name}, note kar liya.",
  } satisfies Say,
  marginAccepted: {
    en: "Noted. Opening your money plan.",
    hi: "नोट कर लिया। आपकी पैसे की योजना खोल रहा हूँ।",
    hinglish: "Note kar liya. Aapka paise ka plan khol raha hoon.",
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
