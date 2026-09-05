/**
 * Training utterances.
 *
 * Written by hand rather than generated, because the point is to cover the ways a real user says
 * these things — Hindi, Hinglish and English, with the code-mixing that actually happens ("meri
 * kist kitni hai", not a clean sentence in one language). A model trained on synthetic paraphrases
 * of my own phrasing would score beautifully on my own phrasing.
 *
 * The corpus deliberately includes:
 *   - the same intent in all three scripts, so the classifier cannot key on script alone;
 *   - near-misses between classes ("kitna paisa hai" is set_margin, "kitna dena hoga" is answer);
 *   - ASR-shaped misspellings, because the input to this model is transcribed speech, never typed;
 *   - a broad `unknown` class, since refusing is the correct answer more often than any single
 *     other label and an under-trained reject class is what makes an assistant act on noise.
 */

import type { IntentLabel } from "./model";

export interface Sample {
  text: string;
  label: IntentLabel;
}

export const CORPUS: Sample[] = [
  // ── set_district ──────────────────────────────────────────────────────────
  { text: "mera district Gwalior hai", label: "set_district" },
  { text: "main Gwalior se hoon", label: "set_district" },
  { text: "मेरा जिला ग्वालियर है", label: "set_district" },
  { text: "मैं श्योपुर से हूँ", label: "set_district" },
  { text: "my district is Sheopur", label: "set_district" },
  { text: "district Sheopur", label: "set_district" },
  { text: "hum Gwalior district mein rehte hain", label: "set_district" },
  { text: "zila gwalior", label: "set_district" },
  { text: "मेरा डिस्ट्रिक्ट ग्वालियर", label: "set_district" },
  { text: "i live in Gwalior", label: "set_district" },
  { text: "apna district Sheopur rakh do", label: "set_district" },
  { text: "district badal do Gwalior kar do", label: "set_district" },

  // ── set_block ─────────────────────────────────────────────────────────────
  { text: "mera block Ghatigaon hai", label: "set_block" },
  { text: "block Dabra", label: "set_block" },
  { text: "मेरा ब्लॉक भितरवार है", label: "set_block" },
  { text: "tehsil Dabra hai", label: "set_block" },
  { text: "my block is Bhitarwar", label: "set_block" },
  { text: "ब्लॉक डबरा कर दीजिए", label: "set_block" },
  { text: "block Ghatigaon chuniye", label: "set_block" },

  // ── set_category ──────────────────────────────────────────────────────────
  { text: "mujhe bakri palni hai", label: "set_category" },
  { text: "main dairy ka kaam karna chahta hoon", label: "set_category" },
  { text: "मुझे गाय पालनी है", label: "set_category" },
  { text: "doodh ka kaam", label: "set_category" },
  { text: "i want to open a kirana shop", label: "set_category" },
  { text: "dukaan kholni hai", label: "set_category" },
  { text: "मुझे सिलाई का काम करना है", label: "set_category" },
  { text: "tailoring ka kaam shuru karna hai", label: "set_category" },
  { text: "papad achaar banana chahti hoon", label: "set_category" },
  { text: "atta chakki lagani hai", label: "set_category" },
  { text: "मशरूम की खेती करनी है", label: "set_category" },
  { text: "murgi palan karna hai", label: "set_category" },
  { text: "handicraft ka kaam", label: "set_category" },
  { text: "food processing karna hai", label: "set_category" },

  // ── set_margin ────────────────────────────────────────────────────────────
  { text: "mere paas pachas hazaar rupaye hain", label: "set_margin" },
  { text: "mere paas ek lakh hai", label: "set_margin" },
  { text: "मेरे पास बीस हज़ार रुपये हैं", label: "set_margin" },
  { text: "i have fifty thousand rupees", label: "set_margin" },
  { text: "paas mein das hazaar rupaye", label: "set_margin" },
  { text: "meri poonji 30000 hai", label: "set_margin" },
  { text: "मेरे पास पूँजी एक लाख है", label: "set_margin" },
  { text: "margin money 25 hazaar", label: "set_margin" },
  { text: "apne paas 15000 rakhe hain", label: "set_margin" },
  { text: "kitna paisa hai mere paas pachas hazaar", label: "set_margin" },
  { text: "bees hazaar laga sakta hoon", label: "set_margin" },
  { text: "i can invest one lakh", label: "set_margin" },

  // ── confirmation ──────────────────────────────────────────────────────────
  { text: "haan", label: "confirm_yes" },
  { text: "haan sahi hai", label: "confirm_yes" },
  { text: "हाँ", label: "confirm_yes" },
  { text: "ji haan bilkul", label: "confirm_yes" },
  { text: "yes correct", label: "confirm_yes" },
  { text: "theek hai", label: "confirm_yes" },
  { text: "बिल्कुल सही", label: "confirm_yes" },
  { text: "ha ji", label: "confirm_yes" },
  { text: "nahi", label: "confirm_no" },
  { text: "nahi galat hai", label: "confirm_no" },
  { text: "नहीं", label: "confirm_no" },
  { text: "no wrong", label: "confirm_no" },
  { text: "na ji nahi", label: "confirm_no" },
  { text: "ये गलत है", label: "confirm_no" },
  { text: "galat suna aapne", label: "confirm_no" },

  // ── navigate ──────────────────────────────────────────────────────────────
  { text: "paise ka plan kholiye", label: "navigate" },
  { text: "calculator kholo", label: "navigate" },
  { text: "रिपोर्ट दिखाइए", label: "navigate" },
  { text: "open the report", label: "navigate" },
  { text: "mujhe report dekhni hai", label: "navigate" },
  { text: "community page kholo", label: "navigate" },
  { text: "मेरा लोन दिखाओ", label: "navigate" },
  { text: "profile kholiye", label: "navigate" },
  { text: "kya shuru karein wala page", label: "navigate" },
  { text: "go to the calculator", label: "navigate" },
  { text: "emi wala page dikhao", label: "navigate" },
  { text: "shuru se shuru karein", label: "navigate" },

  // ── explain ───────────────────────────────────────────────────────────────
  { text: "yeh samjhaiye", label: "explain" },
  { text: "samjhao mujhe", label: "explain" },
  { text: "यह क्या है समझाइए", label: "explain" },
  { text: "explain this to me", label: "explain" },
  { text: "iska matlab kya hai", label: "explain" },
  { text: "मुझे समझ नहीं आया समझाइए", label: "explain" },
  { text: "thoda detail mein bataiye", label: "explain" },
  { text: "ye sab kya hai", label: "explain" },

  // ── answer ────────────────────────────────────────────────────────────────
  { text: "meri kist kitni hai", label: "answer" },
  { text: "kitna dena padega har teen mahine", label: "answer" },
  { text: "मेरी किस्त कितनी है", label: "answer" },
  { text: "EMI kya banegi", label: "answer" },
  { text: "har quarter kitne paise", label: "answer" },
  { text: "kamai kab se shuru hogi", label: "answer" },
  { text: "कमाई कब से शुरू होगी", label: "answer" },
  { text: "kaunsi yojana milegi", label: "answer" },
  { text: "which scheme do i get", label: "answer" },
  { text: "project ki laagat kitni hai", label: "answer" },
  { text: "परियोजना लागत कितनी है", label: "answer" },
  { text: "kamai se pehle kitna dena hoga", label: "answer" },
  { text: "total kitna byaj lagega", label: "answer" },
  { text: "gestation kitne mahine hai", label: "answer" },
  { text: "installment kitni hogi", label: "answer" },
  { text: "kist kitne ki hai", label: "answer" },

  // ── unknown ───────────────────────────────────────────────────────────────
  // Broad on purpose. Refusing is right more often than any single other label, and a thin reject
  // class is what makes an assistant act confidently on noise.
  { text: "mausam kaisa hai", label: "unknown" },
  { text: "आप कैसे हैं", label: "unknown" },
  { text: "kya kar rahe ho", label: "unknown" },
  { text: "gaana bajao", label: "unknown" },
  { text: "hello hello", label: "unknown" },
  { text: "test test one two", label: "unknown" },
  { text: "मुझे भूख लगी है", label: "unknown" },
  { text: "call my brother", label: "unknown" },
  { text: "cricket score batao", label: "unknown" },
  { text: "abcd", label: "unknown" },
  { text: "kuch nahi", label: "unknown" },
  { text: "arre suno", label: "unknown" },
  { text: "बस ऐसे ही", label: "unknown" },
  { text: "photo kheencho", label: "unknown" },
  { text: "time kya hua hai", label: "unknown" },
  { text: "mera naam Ramesh hai", label: "unknown" },
  { text: "aap kaun ho", label: "unknown" },
  { text: "थोड़ा रुकिए", label: "unknown" },
  { text: "band karo", label: "unknown" },
  { text: "dhanyawad", label: "unknown" },
];

/**
 * Held out for evaluation, never trained on.
 *
 * Phrased differently from the corpus above on purpose — same intents, wording a different person
 * would use, plus the misspellings ASR actually produces. Testing on paraphrases of the training
 * set measures memorisation, not generalisation.
 */
export const HELD_OUT: Sample[] = [
  { text: "hum gwalior zile ke hain", label: "set_district" },
  { text: "जिला श्योपुर रखिए", label: "set_district" },
  { text: "block bhitarwar rakhna hai", label: "set_block" },
  { text: "mujhe gaay bhains ka kaam karna hai", label: "set_category" },
  { text: "kirana store kholna chahta hoon", label: "set_category" },
  { text: "मेरे पास चालीस हज़ार रुपये हैं", label: "set_margin" },
  { text: "paas mein pachattar hazaar hai", label: "set_margin" },
  { text: "haan ji theek", label: "confirm_yes" },
  { text: "नहीं नहीं गलत", label: "confirm_no" },
  { text: "loan wala page kholiye", label: "navigate" },
  { text: "report par le chalo", label: "navigate" },
  { text: "zara samjha dijiye", label: "explain" },
  { text: "meri installment kitne ki banegi", label: "answer" },
  { text: "byaj kitna lagega total", label: "answer" },
  { text: "कमाई कितने महीने बाद", label: "answer" },
  { text: "khana kha liya kya", label: "unknown" },
  { text: "bijli chali gayi hai", label: "unknown" },
  { text: "ok ok", label: "unknown" },
];
