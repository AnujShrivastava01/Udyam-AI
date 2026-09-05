import { useAppStore } from "./store";

/**
 * Chrome + landing copy.
 *
 * Separate from src/lib/i18n/, which carries the ENGINE's message keys and typed numeric slots.
 * This file is free prose; that one must never let a number through a translation table. Both are
 * three-language, because the app boots in Hinglish — a Hinglish reader used to land on an English
 * landing page, an English nav and an English stepper, which is the first impression the product
 * makes.
 *
 * Hinglish here means Roman-script Hindi with the English technical nouns kept as-is (loan, EMI,
 * subsidy). Translating those into Sanskritised Hindi is what makes government copy unreadable to
 * the people it is written for.
 */
const dictionary = {
  en: {
    // Chrome
    "app.title": "Udyam",
    "app.titleSuffix": "AI",
    "nav.discover": "Discover",
    "nav.calculator": "Finance",
    "nav.community": "Community",
    "nav.profile": "Profile",
    "nav.language": "Language",
    "nav.primary": "Main sections",
    "nav.skipToContent": "Skip to content",
    "user.name": "Rajesh Kumar",

    // JourneyStepper
    "step.discover": "Discover",
    "step.analyse": "Analyse",
    "step.finance": "Finance",
    "step.connect": "Connect",
    "step.manage": "Manage",
    "step.grow": "Grow",
    "step.completed": "completed",

    // Hero panel (live engine output)
    "hero.panel.caption": "Live output from the engine on this page",
    "hero.panel.case": "₹1,00,000 goat unit · NSFDC Micro Finance",
    "hero.panel.preIncome": "falls due before the first rupee of income",
    "hero.panel.gestation": "Gestation (NABARD)",
    "hero.panel.moratorium": "Moratorium (NSFDC)",
    "hero.panel.gap": "Unfunded gap",
    "hero.panel.instalment": "Quarterly instalment",
    "hero.panel.months": "months",
    "hero.panel.verdict": "Gestation gap",

    // Capital stack illustration
    "stack.demo.title": "One project cost, two ways to fund it",
    "stack.demo.cost": "Project cost",
    "stack.demo.spec": "Single-scheme route",
    "stack.demo.best": "Optimised capital stack",
    "stack.demo.subsidy": "Subsidy",
    "stack.demo.loan": "Loan",
    "stack.demo.own": "Your money",
    "stack.demo.saving": "cheaper over the life of the loan",

    // Footer CTA
    "footer.title": "Find out before you sign.",
    "footer.subtitle": "Enter what you have. The engine returns what the scheme actually costs you — with every figure traceable to the guideline it came from.",

    // Landing Page
    "landing.badge": "Built for SIH 2026 · PS 26091",
    "landing.headline.part1": "It doesn't tell you what you can borrow. ",
    "landing.headline.part2": "It tells you what you can repay.",
    "landing.description":
      "NABARD publishes how long a rural activity takes to earn. NSFDC publishes when repayment starts. Nobody had joined the two tables. We did — and on a ₹1,00,000 goat unit, ₹46,467 falls due before the first rupee of income arrives.",
    "landing.cta.start": "Start Your Journey",
    "landing.cta.explore": "Explore Market Data",

    // Trusted By
    "landing.trusted.title": "BUILT ON PUBLISHED GUIDELINES FROM",

    // Bento Grid Features
    "landing.feature1.title": "Hyper-local Market Intelligence",
    "landing.feature1.desc":
      "Competitor density, addressable demand and saturation for your own block — each figure carrying its source and its confidence, so you can see which numbers are measured and which are estimated.",

    "landing.feature2.title": "The Solvency Clock",
    "landing.feature2.desc":
      "Every scheme's moratorium laid against the activity's real gestation period. If money falls due before income starts, we say so before you sign — not after.",

    "landing.feature3.title": "Automated Financial Structuring",
    "landing.feature3.desc":
      "Project cost, tier routing, subsidy eligibility and a reducing-balance schedule computed to the rupee — with the multi-scheme capital stack that single-scheme routing leaves on the table.",
  },
  hi: {
    // Chrome
    "app.title": "उद्यम",
    "app.titleSuffix": "AI",
    "nav.discover": "खोजें",
    "nav.calculator": "वित्त",
    "nav.community": "समुदाय",
    "nav.profile": "प्रोफ़ाइल",
    "nav.language": "भाषा",
    "nav.primary": "मुख्य अनुभाग",
    "nav.skipToContent": "मुख्य सामग्री पर जाएँ",
    "user.name": "राजेश कुमार",

    // JourneyStepper
    "step.discover": "खोजें",
    "step.analyse": "विश्लेषण",
    "step.finance": "वित्त",
    "step.connect": "जुड़ें",
    "step.manage": "प्रबंधन",
    "step.grow": "विकास",
    "step.completed": "पूरा हुआ",

    // Hero panel (live engine output)
    "hero.panel.caption": "इसी पेज पर चल रहे इंजन का सीधा परिणाम",
    "hero.panel.case": "₹1,00,000 की बकरी इकाई · NSFDC माइक्रो फाइनेंस",
    "hero.panel.preIncome": "पहली कमाई से पहले ही चुकाने पड़ते हैं",
    "hero.panel.gestation": "गेस्टेशन अवधि (NABARD)",
    "hero.panel.moratorium": "मोहलत अवधि (NSFDC)",
    "hero.panel.gap": "बिना आय का अंतराल",
    "hero.panel.instalment": "त्रैमासिक किस्त",
    "hero.panel.months": "महीने",
    "hero.panel.verdict": "गेस्टेशन गैप",

    // Capital stack illustration
    "stack.demo.title": "एक ही परियोजना लागत, फिर भी दो रास्ते",
    "stack.demo.cost": "परियोजना लागत",
    "stack.demo.spec": "एकल-योजना मार्ग",
    "stack.demo.best": "बेहतर पूँजी संरचना",
    "stack.demo.subsidy": "सब्सिडी",
    "stack.demo.loan": "कर्ज़",
    "stack.demo.own": "आपका पैसा",
    "stack.demo.saving": "कर्ज़ की पूरी अवधि में सस्ता",

    // Footer CTA
    "footer.title": "हस्ताक्षर से पहले जानिए।",
    "footer.subtitle": "आपके पास जो है, वह भरिए। इंजन बताएगा कि योजना आपको वास्तव में कितने की पड़ेगी — हर आँकड़े के साथ उसका स्रोत।",

    // Landing Page
    "landing.badge": "SIH 2026 · समस्या 26091 के लिए",
    "landing.headline.part1": "यह नहीं बताता कि आप कितना कर्ज़ ले सकते हैं। ",
    "landing.headline.part2": "यह बताता है कि आप कितना चुका सकते हैं।",
    "landing.description":
      "NABARD बताता है कि किसी ग्रामीण कारोबार को कमाई शुरू करने में कितना समय लगता है। NSFDC बताता है कि किस्त कब से शुरू होगी। इन दोनों को किसी ने जोड़ा नहीं था। हमने जोड़ा — और ₹1,00,000 की बकरी इकाई पर पहली कमाई से पहले ही ₹46,467 चुकाने पड़ते हैं।",
    "landing.cta.start": "अपनी यात्रा शुरू करें",
    "landing.cta.explore": "बाज़ार डेटा देखें",

    // Trusted By
    "landing.trusted.title": "इन विभागों के प्रकाशित दिशानिर्देशों पर आधारित",

    // Bento Grid Features
    "landing.feature1.title": "अपने ब्लॉक का बाज़ार विश्लेषण",
    "landing.feature1.desc":
      "आपके अपने ब्लॉक के लिए प्रतिस्पर्धा घनत्व, संभावित माँग और संतृप्ति — हर आँकड़े के साथ उसका स्रोत और भरोसे का स्तर, ताकि आप देख सकें कि कौन सा आँकड़ा मापा गया है और कौन सा अनुमान है।",

    "landing.feature2.title": "सॉल्वेंसी क्लॉक",
    "landing.feature2.desc":
      "हर योजना की मोहलत अवधि, कारोबार की असली गेस्टेशन अवधि के सामने रखी हुई। अगर कमाई शुरू होने से पहले किस्त आ जाती है, तो हम आपको हस्ताक्षर से पहले बताते हैं — बाद में नहीं।",

    "landing.feature3.title": "स्वचालित वित्तीय संरचना",
    "landing.feature3.desc":
      "परियोजना लागत, योजना का चयन, सब्सिडी पात्रता और घटती-शेष किस्त तालिका — रुपये तक सटीक, साथ में वह बहु-योजना पूँजी संरचना जो एकल-योजना मार्ग छोड़ देता है।",
  },
  hinglish: {
    // Chrome
    "app.title": "Udyam",
    "app.titleSuffix": "AI",
    "nav.discover": "Khojein",
    "nav.calculator": "Finance",
    "nav.community": "Community",
    "nav.profile": "Profile",
    "nav.language": "Bhasha",
    "nav.primary": "Mukhya sections",
    "nav.skipToContent": "Seedha content par jayein",
    "user.name": "Rajesh Kumar",

    // JourneyStepper
    "step.discover": "Khojein",
    "step.analyse": "Vishleshan",
    "step.finance": "Finance",
    "step.connect": "Judein",
    "step.manage": "Prabandhan",
    "step.grow": "Vikas",
    "step.completed": "pura hua",

    // Hero panel (live engine output)
    "hero.panel.caption": "Isi page par chal rahe engine ka seedha output",
    "hero.panel.case": "₹1,00,000 ki bakri unit · NSFDC Micro Finance",
    "hero.panel.preIncome": "pehli kamai se pehle hi chukane padte hain",
    "hero.panel.gestation": "Gestation period (NABARD)",
    "hero.panel.moratorium": "Moratorium (NSFDC)",
    "hero.panel.gap": "Bina aamdani ka gap",
    "hero.panel.instalment": "Quarterly EMI",
    "hero.panel.months": "mahine",
    "hero.panel.verdict": "Gestation gap",

    // Capital stack illustration
    "stack.demo.title": "Ek hi project cost, funding ke do raste",
    "stack.demo.cost": "Project cost",
    "stack.demo.spec": "Single-scheme route",
    "stack.demo.best": "Behtar capital stack",
    "stack.demo.subsidy": "Subsidy",
    "stack.demo.loan": "Loan",
    "stack.demo.own": "Aapka paisa",
    "stack.demo.saving": "loan ki poori avadhi mein sasta",

    // Footer CTA
    "footer.title": "Sign karne se pehle jaan lijiye.",
    "footer.subtitle": "Aapke paas jo hai wo bhariye. Engine batayega ki scheme asal mein aapko kitne ki padegi — har figure ke saath uska source.",

    // Landing Page
    "landing.badge": "SIH 2026 · Problem 26091 ke liye",
    "landing.headline.part1": "Yeh nahi batata ki aap kitna loan le sakte hain. ",
    "landing.headline.part2": "Yeh batata hai ki aap kitna chuka sakte hain.",
    "landing.description":
      "NABARD batata hai ki kisi rural kaam ko kamai shuru karne mein kitna time lagta hai. NSFDC batata hai ki EMI kab se shuru hogi. In dono ko kisi ne joda nahi tha. Humne joda — aur ₹1,00,000 ki bakri unit par pehli kamai se pehle hi ₹46,467 chukane padte hain.",
    "landing.cta.start": "Apni journey shuru karein",
    "landing.cta.explore": "Market data dekhein",

    // Trusted By
    "landing.trusted.title": "IN VIBHAGON KE PUBLISHED GUIDELINES PAR AADHARIT",

    // Bento Grid Features
    "landing.feature1.title": "Apne block ka market analysis",
    "landing.feature1.desc":
      "Aapke apne block ke liye competition density, sambhavit demand aur saturation — har figure ke saath uska source aur confidence level, taaki aap dekh sakein kaunsa number napa gaya hai aur kaunsa anumaan hai.",

    "landing.feature2.title": "Solvency Clock",
    "landing.feature2.desc":
      "Har scheme ki moratorium period, kaam ki asli gestation period ke saamne rakhi hui. Agar kamai shuru hone se pehle EMI aa jaati hai, to hum aapko sign karne se pehle batate hain — baad mein nahi.",

    "landing.feature3.title": "Automatic financial structuring",
    "landing.feature3.desc":
      "Project cost, scheme ka chunaav, subsidy eligibility aur reducing-balance EMI table — rupaye tak sahi, saath mein wo multi-scheme capital stack jo single-scheme route chhod deta hai.",
  },
} as const;

export type DictionaryKeys = keyof typeof dictionary.en;

export function useTranslation() {
  const { language } = useAppStore();

  const t = (key: DictionaryKeys): string => {
    const table = dictionary[language] ?? dictionary.en;
    return table[key] || dictionary.en[key] || key;
  };

  return { t, language };
}
