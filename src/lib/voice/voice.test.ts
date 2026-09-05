import { describe, expect, it } from "vitest";

import {
  activeProvider,
  confirmationPrompt,
  listen,
  parseSpokenAmount,
  speak,
  speakAmount,
  spellDigits,
  toBhashiniLanguage,
  verdictAsSpeech,
} from "./index";
import { toSarvamLanguage } from "./sarvam";

describe("language mapping", () => {
  it("routes Hinglish through Hindi acoustics, because it has no model of its own", () => {
    expect(toBhashiniLanguage("hinglish")).toBe("hi");
    expect(toSarvamLanguage("hinglish")).toBe("hi-IN");
    expect(toBhashiniLanguage("en")).toBe("en");
    expect(toSarvamLanguage("en")).toBe("en-IN");
  });
});

describe("speaking money", () => {
  it("says a lakh as a lakh, not as digits", () => {
    expect(speakAmount(100_000, "en")).toBe("1 lakh rupees");
    expect(speakAmount(100_000, "hi")).toContain("लाख");
  });

  it("decomposes a real figure the way a person says it", () => {
    // ₹46,467 → "46 thousand 467"
    const en = speakAmount(46_467, "en");
    expect(en).toContain("46 thousand");
    expect(en).toContain("467");
    expect(en).not.toMatch(/4\s6\s4\s6\s7/); // never digit-by-digit
  });

  it("handles crore, lakh, thousand and remainder together", () => {
    const s = speakAmount(12_34_567, "en");
    expect(s).toContain("12 lakh");
    expect(s).toContain("34 thousand");
    expect(s).toContain("567");
  });

  it("says zero rather than nothing", () => {
    expect(speakAmount(0, "en")).toBe("zero rupees");
    expect(speakAmount(0, "hi")).toContain("शून्य");
  });

  it("spells digits for read-back confirmation", () => {
    expect(spellDigits(1_00_000, "en")).toBe("1 0 0 0 0 0");
    expect(spellDigits(105, "hi")).toBe("एक शून्य पाँच");
  });
});

describe("hearing money", () => {
  it("understands the ways people actually say an amount", () => {
    expect(parseSpokenAmount("1 lakh")).toBe(100_000);
    expect(parseSpokenAmount("ek lakh")).toBe(100_000);
    expect(parseSpokenAmount("एक लाख")).toBe(100_000);
    expect(parseSpokenAmount("50 hazaar")).toBe(50_000);
    expect(parseSpokenAmount("1.5 lakh")).toBe(150_000);
    expect(parseSpokenAmount("25000")).toBe(25_000);
  });

  it("returns null rather than guessing when it cannot read the amount", () => {
    // Guessing a loan amount is exactly the failure this product exists to prevent.
    expect(parseSpokenAmount("mujhe paisa chahiye")).toBeNull();
    expect(parseSpokenAmount("")).toBeNull();
  });

  it("always offers a read-back before acting on a spoken number", () => {
    const p = confirmationPrompt(100_000, "hinglish");
    expect(p).toContain("1 lakh");
    // Digits are read back the way they are SAID, not printed — "ek shunya shunya…" is what a
    // Hinglish speaker hears. Roman numerals here would be unspeakable by a TTS engine.
    expect(p).toMatch(/ek shunya shunya shunya shunya shunya/);
    expect(p.toLowerCase()).toMatch(/haan|yes|हाँ/);
  });

  it("reads digits back in the script the user chose", () => {
    expect(spellDigits(105, "en")).toBe("1 0 5");
    expect(spellDigits(105, "hi")).toBe("एक शून्य पाँच");
    expect(spellDigits(105, "hinglish")).toBe("ek shunya paanch");
  });
});

describe("verdict as speech", () => {
  const opts = {
    preIncomeObligation: 46_467,
    gestationMonths: 18,
    firstInstalmentMonth: 6,
    quarterlyInstalment: 9_001,
  };

  it("speaks the kernel's figures, never a digit string", () => {
    for (const locale of ["en", "hi", "hinglish"] as const) {
      const s = verdictAsSpeech(opts, locale);
      expect(s).toContain("18");
      expect(s).toContain("6");
      // The amount is spoken in words, not read out as raw digits.
      expect(s).not.toContain("46467");
      expect(s).toMatch(/46 (thousand|हज़ार|hazaar)/);
    }
  });

  it("produces distinct output per language", () => {
    const en = verdictAsSpeech(opts, "en");
    const hi = verdictAsSpeech(opts, "hi");
    const hg = verdictAsSpeech(opts, "hinglish");
    expect(new Set([en, hi, hg]).size).toBe(3);
    expect(hi).toMatch(/[ऀ-ॿ]/); // Devanagari
    expect(hg).not.toMatch(/[ऀ-ॿ]/); // Roman only
  });
});

describe("degradation", () => {
  it("reports no provider when no key is configured", () => {
    // The test environment has neither key set.
    expect(activeProvider()).toBe("none");
  });

  it("returns a reason instead of throwing when unconfigured", async () => {
    const s = await speak("test", "hi");
    expect(s.ok).toBe(false);
    expect(s.reason).toMatch(/SARVAM_API_KEY|BHASHINI/);

    const l = await listen("", "hi");
    expect(l.ok).toBe(false);
    expect(l.reason).toMatch(/SARVAM_API_KEY|BHASHINI/);
  });
});
