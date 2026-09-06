import { NextRequest, NextResponse } from "next/server";

import { callerKey, throttled } from "@/lib/api/throttle";
import { PLACES_ATTRIBUTION, isConfigured, textSearch, type NearbyPlace } from "@/lib/market/places";
import { queriesFor } from "@/lib/marketplace/counterparties";
import type { RequirementSide } from "@/lib/marketplace/requirement";

/**
 * Real counterparties for a requirement.
 *
 *     browser -> this route -> Google Places Text Search (New), up to 3 phrases
 *
 * Separate from /api/market/nearby because it does a different job at a different price. The
 * competitor scan runs a single typed search and never needs a phone number; this one runs several
 * free-text phrases and asks for contact fields, which sit in a costlier SKU. Keeping them apart
 * means the map on the report page cannot quietly start billing at the higher rate.
 *
 * Results are merged and deduplicated by place id — "milk wholesaler" and "dairy" return the same
 * shop often enough that a merged list without dedup looks padded, and a padded counterparty list
 * is exactly the impression this feature must not give.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  lat?: number;
  lng?: number;
  product?: string;
  side?: RequirementSide;
  radius?: number;
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Places is not configured", detail: "GOOGLE_MAPS_API_KEY is not set" },
      { status: 503 },
    );
  }
  // Three Places calls per request, so the per-minute cap is lower than the single-search route's.
  if (throttled(callerKey(req), 8)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { lat, lng, product, side } = body;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  if (!product?.trim() || (side !== "selling" && side !== "buying")) {
    return NextResponse.json({ error: "product and side are required" }, { status: 400 });
  }

  const radius = typeof body.radius === "number" ? body.radius : 25_000;
  const queries = queriesFor({ product: product.trim(), side });

  // Concurrently: three sequential round trips to Google would put this over a serverless
  // timeout on a slow connection.
  const settled = await Promise.all(
    queries.map((q) =>
      textSearch({ query: q.query, lat, lng, radius, maxResults: 10, includeContact: true }),
    ),
  );

  const byId = new Map<string, NearbyPlace & { foundBy: string[] }>();
  const failures: string[] = [];

  settled.forEach((result, i) => {
    if (!result.ok) {
      failures.push(`${queries[i].query}: ${result.reason}`);
      return;
    }
    for (const place of result.places) {
      const existing = byId.get(place.id);
      if (existing) {
        // A shop matching two phrases is a stronger match, and the UI says which phrases found it.
        existing.foundBy.push(queries[i].query);
      } else {
        byId.set(place.id, { ...place, foundBy: [queries[i].query] });
      }
    }
  });

  if (byId.size === 0 && failures.length === queries.length) {
    console.error("[counterparties] every query failed:", failures);
    return NextResponse.json({ error: "lookup failed", detail: failures[0] }, { status: 502 });
  }

  const places = [...byId.values()].sort(
    // Matched by more phrases first, then nearest — a wholesaler found by two searches is a better
    // lead than a slightly closer shop found by one.
    (a, b) => b.foundBy.length - a.foundBy.length || a.distanceKm - b.distanceKm,
  );

  return NextResponse.json({
    places,
    /** How many carry a phone number — the ones that are actually actionable today. */
    contactable: places.filter((p) => p.phone).length,
    searched: queries.map((q) => q.query),
    radiusKm: radius / 1000,
    attribution: PLACES_ATTRIBUTION,
  });
}
