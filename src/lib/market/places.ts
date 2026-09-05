/**
 * Google Places API (New) — server side only.
 *
 * WHY THIS EXISTS. The feasibility engine's own note says it plainly: it cannot count competitors,
 * so its saturation index falls back to total establishment density against a national rural
 * average, and it calls that "a weaker claim than counting the competitors". This module counts
 * them, for the trades where Google has anything to count.
 *
 * WHAT IT IS CAREFUL ABOUT. Google's coverage of a village in Sheopur is not the coverage of a
 * metro. A search that returns two shops does not mean there are two shops; it means Google knows
 * about two. Reporting that as "2 competitors" would be worse than the honest weaker claim it
 * replaces, so every result carries `mapped` in its name and the UI says so. Zero results are
 * reported as "none on Google's map", never as "no competition".
 *
 * KEY HANDLING. `GOOGLE_MAPS_API_KEY` has no NEXT_PUBLIC_ prefix, so Next will not inline it into
 * the browser bundle: the key stays on the server and the client talks to our own route. That is
 * the arrangement Google recommends for a server key, and it means the key cannot be lifted out of
 * the page source.
 *
 * BILLING. Field masks are mandatory on the New API and they decide the SKU you are billed under.
 * The masks below are the narrowest that render the UI — id, name, location, address, and the two
 * rating fields. Nothing requests photos, reviews, opening hours or contact details, which are the
 * expensive tiers.
 */

import type { ActivityClass } from "@/lib/finance/activities";

const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const TEXT_URL = "https://places.googleapis.com/v1/places:searchText";

/** The narrowest mask that fills the card. Every extra field moves the request up a billing tier. */
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
].join(",");

export interface NearbyPlace {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  /** Straight-line kilometres from the search centre, to one decimal. */
  distanceKm: number;
  rating: number | null;
  ratingCount: number | null;
  kind: string | null;
}

export type PlacesOutcome =
  | { ok: true; places: NearbyPlace[]; searchedTypes: string[]; radiusKm: number }
  | { ok: false; reason: string; status?: number };

/**
 * Which Google place types stand in for a trade's competition.
 *
 * Each is a PROXY and is described as one. Google has no "atta chakki" type and no "goat rearing"
 * type, so for several activity classes the honest answer is that a nearby search cannot speak to
 * competition at all — those return an empty type list and the UI says the scan does not apply
 * rather than searching for something unrelated and reporting the count as if it meant something.
 */
export const TYPES_FOR_CLASS: Record<ActivityClass, { types: string[]; proxy: string }> = {
  retail: {
    types: ["convenience_store", "grocery_store", "supermarket"],
    proxy: "shops selling everyday groceries",
  },
  dairy: {
    types: ["grocery_store", "convenience_store"],
    proxy: "shops that would stock milk — Google has no dairy-vendor type",
  },
  manufacturing: {
    types: ["clothing_store", "tailor", "bakery"],
    proxy: "tailoring and small food-manufacturing outlets",
  },
  services: {
    types: ["hardware_store", "electronics_store"],
    proxy: "small trade and repair outlets",
  },
  agri: {
    types: ["farm", "garden_center"],
    proxy: "farms and input suppliers Google has mapped",
  },
  poultry: {
    types: ["grocery_store", "restaurant"],
    proxy: "buyers of poultry rather than producers",
  },
  // Google has no type that stands in for these at all. Searching anyway would produce a number
  // that looks like evidence and is not.
  livestock: { types: [], proxy: "" },
  plantation: { types: [], proxy: "" },
  construction: { types: [], proxy: "" },
};

export function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

/** Great-circle distance in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
}

/** Normalise Google's shape into ours, dropping anything without an id or a position. */
export function normalise(
  raw: RawPlace[],
  centre: { lat: number; lng: number },
): NearbyPlace[] {
  const out: NearbyPlace[] = [];
  for (const p of raw) {
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    if (!p.id || typeof lat !== "number" || typeof lng !== "number") continue;
    out.push({
      id: p.id,
      name: p.displayName?.text ?? "Unnamed",
      address: p.formattedAddress ?? null,
      lat,
      lng,
      distanceKm: haversineKm(centre, { lat, lng }),
      // A rating of 0 does not exist on Google's scale; absent means absent.
      rating: typeof p.rating === "number" ? p.rating : null,
      ratingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
      kind: p.primaryTypeDisplayName?.text ?? null,
    });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

export interface NearbyInput {
  lat: number;
  lng: number;
  types: string[];
  /** Metres. Google caps this at 50,000. */
  radius?: number;
  maxResults?: number;
}

/**
 * Nearby Search (New).
 *
 * POST with a field mask, per the current API — the legacy GET endpoint is a different product
 * with different billing and is not used here.
 */
export async function nearbySearch({
  lat,
  lng,
  types,
  radius = 5000,
  maxResults = 20,
}: NearbyInput): Promise<PlacesOutcome> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, reason: "GOOGLE_MAPS_API_KEY is not set" };
  if (types.length === 0) {
    return { ok: false, reason: "no place type stands in for this trade" };
  }

  try {
    const res = await fetch(NEARBY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: types,
        maxResultCount: Math.min(20, Math.max(1, maxResults)),
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(50_000, Math.max(100, radius)),
          },
        },
      }),
      // A slow third party must not hold a serverless invocation open indefinitely.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, status: res.status, reason: detail.slice(0, 300) || res.statusText };
    }

    const json = (await res.json()) as { places?: RawPlace[] };
    return {
      ok: true,
      // An empty result set comes back as `{}`, not `{places: []}`. Treating a missing key as an
      // error would report "search failed" for the very common rural case of nothing mapped.
      places: normalise(json.places ?? [], { lat, lng }),
      searchedTypes: types,
      radiusKm: radius / 1000,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "request failed" };
  }
}

/**
 * Text Search (New) — for a phrase rather than a category.
 *
 * Nearby Search takes place TYPES; anything the user types freely ("atta chakki", "Amul dealer")
 * has to go here instead. Kept biased to the area with a location bias rather than a hard
 * restriction, so a good match just outside the ring still surfaces.
 */
export async function textSearch({
  query,
  lat,
  lng,
  radius = 10_000,
  maxResults = 20,
}: {
  query: string;
  lat: number;
  lng: number;
  radius?: number;
  maxResults?: number;
}): Promise<PlacesOutcome> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, reason: "GOOGLE_MAPS_API_KEY is not set" };
  if (!query.trim()) return { ok: false, reason: "empty query" };

  try {
    const res = await fetch(TEXT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query.trim().slice(0, 200),
        maxResultCount: Math.min(20, Math.max(1, maxResults)),
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(50_000, Math.max(100, radius)),
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, status: res.status, reason: detail.slice(0, 300) || res.statusText };
    }

    const json = (await res.json()) as { places?: RawPlace[] };
    return {
      ok: true,
      places: normalise(json.places ?? [], { lat, lng }),
      searchedTypes: [],
      radiusKm: radius / 1000,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "request failed" };
  }
}

/** Google's terms require visible attribution wherever Places data is shown without a Google map. */
export const PLACES_ATTRIBUTION = "Business listings from Google Places";
