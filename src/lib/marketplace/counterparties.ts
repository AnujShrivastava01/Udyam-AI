/**
 * Who would actually buy this, or sell it to you.
 *
 * The hard problem in any marketplace is liquidity: an empty board helps nobody, and the tempting
 * fix is to fill it with invented counterparties. This project already refused that once — the
 * three example listings on /marketplace exist precisely because there was nobody real behind
 * them.
 *
 * There is now. Google Places knows about the wholesalers, mandis, cold stores and shops around a
 * village, and those are real businesses with real phone numbers. So the board is not seeded with
 * fictional buyers; it is pointed at the ones already trading a few kilometres away.
 *
 * ── Why Text Search rather than place types ──────────────────────────────────────────────────
 * Nearby Search takes a fixed vocabulary of place types, and Google has no type for "milk
 * wholesaler", "pashu aahar dealer" or "atta chakki". A requirement is free text by nature, so the
 * queries below are free text too — "milk wholesaler", "milk cold storage" — which is what Text
 * Search is for. The curated rows exist because a naive `${product} buyer` query returns nothing
 * useful in Hindi-speaking markets, where the trade has its own word.
 */

import type { Requirement, RequirementSide } from "./requirement";

export interface CounterpartyQuery {
  /** What goes to Google. */
  query: string;
  /** What this search is looking for, shown to the user so a bad hit is legible as a bad hit. */
  label: string;
}

/**
 * Trade-specific search phrases, keyed by words that appear in the product line.
 *
 * Matched on substring against the lower-cased product, longest key first, so "cow milk" hits the
 * milk row rather than falling through to the generic one. Hindi and English keys both appear
 * because people write requirements in whichever comes to hand.
 */
const TRADE_PHRASES: { keys: string[]; selling: string[]; buying: string[] }[] = [
  {
    keys: ["milk", "doodh", "dairy", "paneer", "ghee", "curd", "dahi"],
    selling: ["milk wholesaler", "dairy", "sweet shop", "cold storage"],
    buying: ["dairy farm", "milk supplier", "cattle feed"],
  },
  {
    keys: ["goat", "bakri", "mutton", "sheep", "livestock"],
    selling: ["mutton shop", "livestock market", "meat wholesaler"],
    buying: ["livestock market", "veterinary", "cattle feed"],
  },
  {
    keys: ["poultry", "chicken", "murgi", "egg", "anda", "broiler"],
    selling: ["chicken shop", "poultry wholesaler", "restaurant"],
    buying: ["poultry feed", "hatchery", "veterinary"],
  },
  {
    keys: ["vegetable", "sabzi", "fruit", "onion", "potato", "tomato"],
    selling: ["vegetable mandi", "vegetable wholesaler", "cold storage"],
    buying: ["vegetable mandi", "seed shop", "fertilizer shop"],
  },
  {
    keys: ["grain", "wheat", "gehu", "atta", "flour", "rice", "chawal", "dal", "pulses"],
    selling: ["grain mandi", "wholesale grocery", "flour mill"],
    buying: ["grain mandi", "wholesale grocery"],
  },
  {
    keys: ["jaggery", "gud", "sugar", "honey", "shahad", "papad", "pickle", "achaar", "masala"],
    selling: ["kirana wholesaler", "grocery wholesaler", "supermarket"],
    buying: ["packaging supplier", "kirana wholesaler"],
  },
  {
    keys: ["cloth", "kapda", "tailor", "silai", "garment", "saree", "uniform"],
    selling: ["garment wholesaler", "cloth market", "boutique"],
    buying: ["cloth wholesaler", "tailoring material", "sewing machine shop"],
  },
  {
    keys: ["basket", "handicraft", "handloom", "pottery", "craft", "bamboo"],
    selling: ["handicraft emporium", "gift shop", "handicraft exporter"],
    buying: ["craft material supplier", "bamboo supplier"],
  },
  {
    keys: ["mushroom"],
    selling: ["vegetable mandi", "hotel", "restaurant"],
    buying: ["mushroom spawn supplier", "agriculture input"],
  },
];

/** Used when nothing in the table matches — still better than nothing, and clearly generic. */
function generic(product: string, side: RequirementSide): string[] {
  const p = product.trim();
  return side === "selling"
    ? [`${p} wholesaler`, `${p} shop`, "wholesale market"]
    : [`${p} supplier`, `${p} wholesaler`, "wholesale market"];
}

export function phrasesFor(product: string, side: RequirementSide): string[] {
  const needle = product.toLowerCase();
  // Longest key first: "cow milk" must reach the milk row, not stop at a shorter accidental match.
  const rows = TRADE_PHRASES.flatMap((r) => r.keys.map((k) => ({ k, r }))).sort(
    (a, b) => b.k.length - a.k.length,
  );
  const hit = rows.find(({ k }) => needle.includes(k));
  return hit ? hit.r[side] : generic(product, side);
}

/**
 * The searches to run for a requirement.
 *
 * Capped at three. Each one is a billed Places call, and a fourth phrase reliably returns the same
 * shops as the first three in a rural catchment.
 */
export function queriesFor(requirement: Pick<Requirement, "product" | "side">): CounterpartyQuery[] {
  const looking = requirement.side === "selling" ? "buyers" : "suppliers";
  return phrasesFor(requirement.product, requirement.side)
    .slice(0, 3)
    .map((query) => ({ query, label: `${looking}: ${query}` }));
}

/** Heading for the results panel — "Who might buy this" reads better than a type list. */
export function counterpartyHeading(side: RequirementSide): string {
  return side === "selling" ? "Who might buy this" : "Who might supply this";
}

/**
 * A phone number as `tel:` and `wa.me` targets.
 *
 * wa.me takes digits only, with the country code and no plus, and it FAILS SILENTLY on anything
 * else — no error, just a dead link — so the normalisation has to be right rather than roughly
 * right. Google returns two shapes and both need work:
 *
 *   internationalPhoneNumber   "+91 78287 75339"    -> 12 digits, already correct
 *   nationalPhoneNumber        "078287 75339"       -> 11 digits with the STD trunk prefix
 *                              "011 2345 6789"      -> landline, same trunk prefix
 *
 * The trunk `0` is the case a naive "if it is not ten digits it must have a country code" check
 * gets wrong: it produces wa.me/01123456789, which resolves to nothing. Every business this app
 * searches for is Indian, so a bare national number is given +91; anything that does not reduce
 * to a recognisable form returns null rather than a link that goes nowhere.
 */
export function contactLinks(phone: string | null): { tel: string; whatsapp: string } | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");

  // International access prefix, occasionally present instead of a plus.
  if (digits.startsWith("00")) digits = digits.slice(2);
  // STD trunk prefix — national only, and meaningless once a country code is attached.
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  const withCountry =
    digits.length === 10
      ? `91${digits}`
      : digits.length === 12 && digits.startsWith("91")
        ? digits
        : null;

  if (!withCountry) return null;
  return { tel: `tel:+${withCountry}`, whatsapp: `https://wa.me/${withCountry}` };
}

/** A Google Maps directions link. Uses coordinates, so it works without a place id. */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
