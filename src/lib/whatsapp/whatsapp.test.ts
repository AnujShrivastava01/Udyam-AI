import { describe, expect, it, beforeEach } from "vitest";

import { normaliseRecipient } from "./client";
import { CHAT_TEMPLATES, handleMessage, resetSession } from "./conversation";

const PHONE = "919000000001";

beforeEach(() => resetSession(PHONE));

describe("recipient normalisation", () => {
  it("strips WhatsApp suffixes and punctuation", () => {
    expect(normaliseRecipient("919244524591@s.whatsapp.net")).toBe("919244524591");
    expect(normaliseRecipient("+91 92445 24591")).toBe("919244524591");
    expect(normaliseRecipient("919244524591")).toBe("919244524591");
  });
});

describe("numeric fidelity — the guarantee", () => {
  it("no chat template hardcodes a rupee figure in any language", () => {
    // Money must arrive through a {placeholder} that the kernel filled. A digit next to a ₹ in a
    // template means someone wrote a number by hand, which is exactly what this product promises
    // never to do.
    for (const [key, copy] of Object.entries(CHAT_TEMPLATES)) {
      for (const [locale, text] of Object.entries(copy)) {
        expect(
          /₹\s*\d/.test(text),
          `${key}.${locale} contains a hardcoded rupee amount`,
        ).toBe(false);
      }
    }
  });

  it("keeps the same placeholders in every language", () => {
    const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");
    for (const [key, copy] of Object.entries(CHAT_TEMPLATES)) {
      const en = placeholders(copy.en);
      expect(placeholders(copy.hi), `${key}.hi placeholders drifted`).toBe(en);
      expect(placeholders(copy.hinglish), `${key}.hinglish placeholders drifted`).toBe(en);
    }
  });

  it("offers all three languages", () => {
    for (const copy of Object.values(CHAT_TEMPLATES)) {
      expect(Object.keys(copy).sort()).toEqual(["en", "hi", "hinglish"]);
    }
  });
});

describe("conversation flow", () => {
  it("walks language → village → margin → activity → verdict", () => {
    const greet = handleMessage(PHONE, "hi");
    expect(greet.messages[0]).toMatch(/Udyam AI/);

    const lang = handleMessage(PHONE, "3"); // Hinglish
    expect(lang.messages[0]).toMatch(/gaon/i);

    const village = handleMessage(PHONE, "1"); // Ghatigaon
    expect(village.messages[0]).toMatch(/paisa/i);

    const margin = handleMessage(PHONE, "10000");
    expect(margin.messages[0]).toMatch(/shuru karna/i);

    const activity = handleMessage(PHONE, "2"); // goat 20 does
    const all = activity.messages.join("\n");

    // The verdict must carry the kernel's real figure, not a template digit.
    expect(all).toMatch(/46,467/);
    expect(all).toMatch(/9,001/);
    expect(all).toMatch(/Dhyan dein/);
  });

  it("recommends a better activity when the chosen one is gapped AND an alternative is affordable", () => {
    handleMessage(PHONE, "hi");
    handleMessage(PHONE, "1"); // English
    handleMessage(PHONE, "1"); // Ghatigaon
    handleMessage(PHONE, "25000"); // enough to fund the ₹23,000 margin on the dairy unit
    const out = handleMessage(PHONE, "2").messages.join("\n"); // goat — gapped

    expect(out).toMatch(/Better option/i);
    expect(out).toMatch(/cows/i); // the zero-gestation dairy unit
  });

  it("finds a cheap zero-gestation trade for a small-margin borrower", () => {
    // With the non-farm trades in the catalog, ₹10,000 of margin now reaches a tailoring unit
    // (₹75,000, earns from month one) instead of leaving the borrower with livestock only.
    handleMessage(PHONE, "hi");
    handleMessage(PHONE, "1");
    handleMessage(PHONE, "1");
    handleMessage(PHONE, "10000");
    const out = handleMessage(PHONE, "2").messages.join("\n"); // goat — gapped

    expect(out).toMatch(/before you earn a single rupee/i); // the warning still lands
    expect(out).toMatch(/Better option/i);
    expect(out).toMatch(/Tailoring/i);
  });

  it("offers NO alternative when the borrower can afford nothing at all", () => {
    // Below the cheapest margin requirement the honest answer is silence, not the least-bad
    // option. Dangling something unaffordable is the harm this product exists to avoid.
    handleMessage(PHONE, "hi");
    handleMessage(PHONE, "1");
    handleMessage(PHONE, "1");
    handleMessage(PHONE, "4000");
    const out = handleMessage(PHONE, "2").messages.join("\n");

    expect(out).not.toMatch(/Better option/i);
  });

  it("lets the recommender choose when the user sends 0", () => {
    handleMessage(PHONE, "hi");
    handleMessage(PHONE, "1");
    handleMessage(PHONE, "1");
    handleMessage(PHONE, "100000");
    const out = handleMessage(PHONE, "0").messages.join("\n");
    expect(out).toMatch(/cows|works/i);
  });

  it("re-prompts instead of guessing when input is not a number", () => {
    handleMessage(PHONE, "hi");
    handleMessage(PHONE, "2"); // Hindi
    const bad = handleMessage(PHONE, "मेरा गाँव");
    expect(bad.messages[0]).toMatch(/समझ नहीं आया/);
  });

  it("restarts on a greeting at any point", () => {
    handleMessage(PHONE, "hi");
    handleMessage(PHONE, "1");
    handleMessage(PHONE, "1");
    const restart = handleMessage(PHONE, "namaste");
    expect(restart.messages[0]).toMatch(/Udyam AI/);
  });

  it("rejects a margin that is implausibly small rather than accepting it", () => {
    handleMessage(PHONE, "hi");
    handleMessage(PHONE, "1");
    handleMessage(PHONE, "1");
    const out = handleMessage(PHONE, "50");
    expect(out.messages[0]).toMatch(/did not understand/i);
  });
});
