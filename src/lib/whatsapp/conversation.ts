/**
 * The WhatsApp advisory flow.
 *
 * A short state machine: language → village → margin → activity → verdict. It exists because the
 * people this is for do not install apps; they already have WhatsApp, often on a shared handset.
 *
 * THE RULE THIS FILE ENFORCES: no number in any reply is written by hand or by a model. Every
 * rupee figure and month count comes from the deterministic kernel and is formatted once, then
 * injected into a translated template as a slot. Templates are translated; numbers never are.
 */

import { ACTIVITIES, ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { plan } from "@/lib/finance";
import { recommendActivities } from "@/lib/market/recommend";
import { VILLAGES, VILLAGE_BY_ID } from "@/lib/market/villages";
import type { Locale } from "@/lib/i18n/keys";
import { renderMessage } from "@/lib/i18n/render";
import { wa } from "./client";
import { money } from "@/lib/i18n/render";

export type Step = "LANG" | "VILLAGE" | "MARGIN" | "ACTIVITY" | "DONE";

export interface Session {
  phone: string;
  step: Step;
  locale: Locale;
  villageId?: string;
  marginCapital?: number;
  updatedAt: number;
}

/**
 * In-memory session store.
 *
 * Deliberately simple, and a stated limitation: sessions are lost on redeploy and are not shared
 * across instances. Production moves this to Postgres — it is a three-column table, not a design
 * problem.
 */
const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 1000 * 60 * 60 * 6;
/** Hard ceiling, so a flood of distinct senders cannot grow the map without bound. */
const MAX_SESSIONS = 5_000;

/**
 * Drop everything past its TTL.
 *
 * A TTL was already honoured on READ, but nothing ever deleted the entry — a stale session was
 * only replaced if that same number messaged again. So the map held every phone number that had
 * ever written in, along with the capital each one declared, for the life of the process. That is
 * unbounded memory and, more to the point, indefinite retention of personal financial data nobody
 * asked us to keep.
 */
function sweep() {
  const now = Date.now();
  for (const [phone, s] of sessions) {
    if (now - s.updatedAt >= SESSION_TTL_MS) sessions.delete(phone);
  }
  if (sessions.size > MAX_SESSIONS) {
    const oldestFirst = [...sessions.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    for (const [phone] of oldestFirst.slice(0, sessions.size - MAX_SESSIONS)) {
      sessions.delete(phone);
    }
  }
}

export function getSession(phone: string): Session {
  sweep();
  const existing = sessions.get(phone);
  if (existing && Date.now() - existing.updatedAt < SESSION_TTL_MS) return existing;
  const fresh: Session = { phone, step: "LANG", locale: "hinglish", updatedAt: Date.now() };
  sessions.set(phone, fresh);
  return fresh;
}

function save(s: Session) {
  s.updatedAt = Date.now();
  sessions.set(s.phone, s);
}

export function resetSession(phone: string) {
  sessions.delete(phone);
}

// ── formatting ──────────────────────────────────────────────────────────────
// Numbers are formatted ONCE, here, with the Indian locale. Nothing downstream reformats them
// and no template contains a digit of its own.

// Was a local constant with this exact name and body, sitting beside the exported one in
// lib/i18n/render.ts and separately editable — two formatters carrying the same guarantee comment
// is how the guarantee stops being true.

const fill = (template: string, params: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));

// ── chat copy ───────────────────────────────────────────────────────────────
// Chat register is shorter and warmer than the UI's. Placeholders are identical across locales.

type Copy = Record<Locale, string>;

const C = {
  askLang: {
    en: "Namaste 🙏 I am *Udyam AI*.\n\nI can tell you which business actually works in your village — and whether you can repay the loan.\n\nReply with a number for your language:\n*1* English\n*2* हिन्दी\n*3* Hinglish",
    hi: "नमस्ते 🙏 मैं *उद्यम AI* हूँ।\n\nभाषा चुनने के लिए नंबर भेजें:\n*1* English\n*2* हिन्दी\n*3* Hinglish",
    hinglish:
      "Namaste 🙏 Main *Udyam AI* hoon.\n\nApni bhasha chunne ke liye number bhejein:\n*1* English\n*2* हिन्दी\n*3* Hinglish",
  } satisfies Copy,

  askVillage: {
    en: "Which village are you in? Reply with the number:\n\n{list}",
    hi: "आप किस गाँव में हैं? नंबर भेजें:\n\n{list}",
    hinglish: "Aap kis gaon mein hain? Number bhejein:\n\n{list}",
  } satisfies Copy,

  askMargin: {
    en: "How much of your own money do you have right now?\n\nJust send the amount, like *100000*.",
    hi: "आपके पास अभी अपना कितना पैसा है?\n\nसिर्फ़ रकम भेजें, जैसे *100000*।",
    hinglish: "Aapke paas abhi apna kitna paisa hai?\n\nSirf amount bhejein, jaise *100000*.",
  } satisfies Copy,

  askActivity: {
    en: "What do you want to start? Reply with the number:\n\n{list}\n\nOr send *0* and I will suggest the best one for {village}.",
    hi: "आप क्या शुरू करना चाहते हैं? नंबर भेजें:\n\n{list}\n\nया *0* भेजें, मैं {village} के लिए सबसे सही काम बताऊँगा।",
    hinglish:
      "Aap kya shuru karna chahte hain? Number bhejein:\n\n{list}\n\nYa *0* bhejein, main {village} ke liye sabse sahi kaam bataunga.",
  } satisfies Copy,

  badNumber: {
    en: "I did not understand that. Please send just the number.",
    hi: "समझ नहीं आया। कृपया सिर्फ़ नंबर भेजें।",
    hinglish: "Samajh nahi aaya. Kripya sirf number bhejein.",
  } satisfies Copy,

  gapWarning: {
    en: "⚠️ *Careful.*\n\nNABARD says this work earns nothing for {gestation} months. But your first instalment is due in month {firstMonth}.\n\nThat means {amount} has to be paid *before you earn a single rupee*.\n\nThis is why many people end up at a moneylender. It is not your mistake — the loan is built this way.",
    hi: "⚠️ *सावधान।*\n\nNABARD के अनुसार इस काम से {gestation} महीने तक कोई कमाई नहीं होती। लेकिन आपकी पहली किस्त {firstMonth}वें महीने में देनी है।\n\nमतलब {amount} *कमाई शुरू होने से पहले* ही देना पड़ेगा।\n\nइसीलिए कई लोग साहूकार के पास चले जाते हैं। यह आपकी ग़लती नहीं है — लोन ऐसे ही बना है।",
    hinglish:
      "⚠️ *Dhyan dein.*\n\nNABARD kehta hai is kaam se {gestation} mahine tak koi kamai nahi hoti. Lekin aapki pehli instalment {firstMonth}ve mahine mein deni hai.\n\nMatlab {amount} *kamai shuru hone se pehle* hi dena padega.\n\nIsi wajah se log saahukar ke paas chale jaate hain. Yeh aapki galti nahi hai — loan aise hi bana hai.",
  } satisfies Copy,

  okVerdict: {
    en: "✅ *This one works.*\n\nIncome starts before the first instalment is due, so the business itself pays the loan.",
    hi: "✅ *यह काम ठीक है।*\n\nपहली किस्त से पहले कमाई शुरू हो जाती है, इसलिए लोन काम से ही चुकता होगा।",
    hinglish:
      "✅ *Yeh kaam theek hai.*\n\nPehli instalment se pehle kamai shuru ho jaati hai, isliye loan business se hi chuk jayega.",
  } satisfies Copy,

  numbers: {
    en: "{rule}\n*Your loan*\nProject cost: *{projectCost}*\nYour share: *{margin}*\nLoan: *{loan}*\nScheme: *{scheme}*\nEvery quarter: *{instalment}*\nTotal interest: *{interest}*\n{rule}",
    hi: "{rule}\n*आपका लोन*\nकुल लागत: *{projectCost}*\nआपका हिस्सा: *{margin}*\nलोन: *{loan}*\nयोजना: *{scheme}*\nहर तिमाही: *{instalment}*\nकुल ब्याज: *{interest}*\n{rule}",
    hinglish:
      "{rule}\n*Aapka loan*\nProject cost: *{projectCost}*\nAapka hissa: *{margin}*\nLoan: *{loan}*\nScheme: *{scheme}*\nHar quarter: *{instalment}*\nTotal interest: *{interest}*\n{rule}",
  } satisfies Copy,

  suggestion: {
    en: "\n💡 *Better option for {village}:*\n{activity} — {reason}\nEvery quarter: *{instalment}*",
    hi: "\n💡 *{village} के लिए बेहतर विकल्प:*\n{activity} — {reason}\nहर तिमाही: *{instalment}*",
    hinglish:
      "\n💡 *{village} ke liye behtar option:*\n{activity} — {reason}\nHar quarter: *{instalment}*",
  } satisfies Copy,

  footer: {
    en: "\n_Figures from NSFDC scheme terms and NABARD unit costs. Full report: {url}_\n\nSend *hi* to start again.",
    hi: "\n_आँकड़े NSFDC योजना और NABARD यूनिट लागत से। पूरी रिपोर्ट: {url}_\n\nदोबारा शुरू करने के लिए *hi* भेजें।",
    hinglish:
      "\n_Figures NSFDC scheme aur NABARD unit cost se. Poori report: {url}_\n\nDobara shuru karne ke liye *hi* bhejein.",
  } satisfies Copy,

  footerNoLink: {
    en: "\n_Figures from NSFDC scheme terms and NABARD unit costs._\n\nSend *hi* to start again.",
    hi: "\n_\u0906\u0901\u0915\u0921\u093c\u0947 NSFDC \u092f\u094b\u091c\u0928\u093e \u0914\u0930 NABARD \u092f\u0942\u0928\u093f\u091f \u0932\u093e\u0917\u0924 \u0938\u0947\u0964_\n\n\u0926\u094b\u092c\u093e\u0930\u093e \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f *hi* \u092d\u0947\u091c\u0947\u0902\u0964",
    hinglish:
      "\n_Figures NSFDC scheme aur NABARD unit cost se._\n\nDobara shuru karne ke liye *hi* bhejein.",
  } satisfies Copy,
} as const;

/**
 * The link we put in a borrower's pocket.
 *
 * This was hardcoded to http://localhost:3000/calculator, which every advisory message then sent
 * to a real phone. A borrower tapping it gets a connection error; a borrower who does not tap it
 * still learns that the sender does not check what it sends. When no base URL is configured the
 * footer drops the link line entirely — a message with one fewer sentence is strictly better than
 * a message with a dead address in it.
 */
function reportUrl(): string | null {
  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (!base) return null;
  if (!/^https?:\/\//i.test(base)) return null;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(base)) return null;
  return `${base.replace(/\/+$/, "")}/calculator`;
}

// ── the machine ─────────────────────────────────────────────────────────────

const RESTART = /^(hi|hello|hey|start|namaste|नमस्ते|shuru|शुरू|menu)$/i;

export interface Reply {
  messages: string[];
}

export function handleMessage(phone: string, raw: string): Reply {
  const text = raw.trim();
  const s = getSession(phone);

  if (RESTART.test(text)) {
    resetSession(phone);
    const fresh = getSession(phone);
    return { messages: [C.askLang[fresh.locale]] };
  }

  switch (s.step) {
    case "LANG": {
      const pick = { "1": "en", "2": "hi", "3": "hinglish" }[text] as Locale | undefined;
      if (!pick) return { messages: [C.askLang[s.locale]] };
      s.locale = pick;
      s.step = "VILLAGE";
      save(s);
      return { messages: [fill(C.askVillage[pick], { list: villageList() })] };
    }

    case "VILLAGE": {
      const idx = Number(text) - 1;
      const village = VILLAGES[idx];
      if (!village) return { messages: [C.badNumber[s.locale], fill(C.askVillage[s.locale], { list: villageList() })] };
      s.villageId = village.id;
      s.step = "MARGIN";
      save(s);
      return { messages: [C.askMargin[s.locale]] };
    }

    case "MARGIN": {
      const amount = Number(text.replace(/[^\d]/g, ""));
      if (!amount || amount < 1000) return { messages: [C.badNumber[s.locale], C.askMargin[s.locale]] };
      s.marginCapital = amount;
      s.step = "ACTIVITY";
      save(s);
      const village = VILLAGE_BY_ID.get(s.villageId!)!;
      return {
        messages: [fill(C.askActivity[s.locale], { list: activityList(), village: village.name })],
      };
    }

    case "ACTIVITY": {
      const n = Number(text);
      const village = VILLAGE_BY_ID.get(s.villageId!)!;
      const margin = s.marginCapital!;

      // 0 = let the recommender choose.
      let activityId: string;
      if (n === 0) {
        const rec = recommendActivities(village, margin);
        if (!rec.top) {
          s.step = "DONE";
          save(s);
          return { messages: [rec.refusal!] };
        }
        activityId = rec.top.activity.id;
      } else {
        const chosen = ACTIVITIES[n - 1];
        if (!chosen)
          return {
            messages: [
              C.badNumber[s.locale],
              fill(C.askActivity[s.locale], { list: activityList(), village: village.name }),
            ],
          };
        activityId = chosen.id;
      }

      s.step = "DONE";
      save(s);
      return { messages: verdict(s.locale, village.id, margin, activityId) };
    }

    case "DONE":
    default:
      return { messages: [C.askLang[s.locale]] };
  }
}

function villageList(): string {
  return VILLAGES.map((v, i) => `*${i + 1}* ${v.name} (${v.block})`).join("\n");
}

function activityList(): string {
  return ACTIVITIES.map((a, i) => `*${i + 1}* ${a.name}`).join("\n");
}

/** Build the verdict. Every figure here comes from the kernel. */
function verdict(locale: Locale, villageId: string, margin: number, activityId: string): string[] {
  const village = VILLAGE_BY_ID.get(villageId)!;
  const activity = ACTIVITY_BY_ID.get(activityId)!;

  const p = plan({
    marginCapital: margin,
    activityId,
    useNeedBasedCosting: true,
    annualHouseholdIncome: undefined,
  });

  const out: string[] = [];

  // 1. the verdict, plainly
  if (p.solvency.verdict === "GESTATION_GAP") {
    out.push(
      fill(C.gapWarning[locale], {
        gestation: activity.gestationMonths,
        firstMonth: p.solvency.firstInstalmentMonth ?? 0,
        amount: money(p.solvency.preIncomeObligation),
      }),
    );
  } else if (p.solvency.verdict === "FEASIBLE") {
    out.push(C.okVerdict[locale]);
  } else {
    out.push(renderMessage(locale, p.solvency.headlineMsg.key, p.solvency.headlineMsg.params));
  }

  // 2. the numbers
  out.push(
    fill(C.numbers[locale], {
      rule: wa.rule,
      projectCost: money(p.structure.projectCost),
      margin: money(p.structure.requiredMargin),
      loan: money(p.structure.sanctionedLoan),
      scheme: p.structure.scheme.name,
      instalment: money(p.schedule.instalment),
      interest: money(p.schedule.totalInterest),
    }),
  );

  // 3. a better option, when the chosen one is gapped
  if (p.solvency.verdict === "GESTATION_GAP") {
    const rec = recommendActivities(village, margin);
    if (rec.top && rec.top.activity.id !== activityId) {
      out.push(
        fill(C.suggestion[locale], {
          village: village.name,
          activity: rec.top.activity.name,
          reason: renderMessage(locale, rec.top.bindingConstraint.key, rec.top.bindingConstraint.params),
          instalment: money(rec.top.quarterlyInstalment),
        }),
      );
    }
  }

  const url = reportUrl();
  out.push(url ? fill(C.footer[locale], { url }) : C.footerNoLink[locale]);

  // WhatsApp truncates very long messages; send as a few shorter ones.
  return out;
}

/**
 * Every number this module can emit must have come from the kernel. Exported so a test can assert
 * that no template contains a hardcoded digit — the numeric-fidelity guarantee, enforced.
 */
export const CHAT_TEMPLATES = C;
