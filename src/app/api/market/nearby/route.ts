import { NextRequest, NextResponse } from "next/server";

import { callerKey, throttled } from "@/lib/api/throttle";
import {
  PLACES_ATTRIBUTION,
  TYPES_FOR_CLASS,
  isConfigured,
  nearbySearch,
  textSearch,
} from "@/lib/market/places";
import type { ActivityClass } from "@/lib/finance/activities";

/**
 * The backend half of the Places integration.
 *
 *     browser  ->  this route  ->  Google Places API (New)
 *
 * The key lives only here. It has no NEXT_PUBLIC_ prefix, so it is never inlined into the client
 * bundle and cannot be read out of the page source — which is the arrangement Google asks for with
 * a server key, and the reason the browser is not allowed to call Places directly.
 *
 * Two modes, because Google splits them and they are not interchangeable: a `query` string goes to
 * Text Search, a trade goes to Nearby Search with the place types that stand in for it.
 */

export const runtime = "nodejs";
export const maxDuration = 20;

interface Body {
  lat?: number;
  lng?: number;
  /** Free text — routes to Text Search. */
  query?: string;
  /** A trade — routes to Nearby Search via the proxy types for its class. */
  activityClass?: ActivityClass;
  /** Metres. */
  radius?: number;
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Places is not configured", detail: "GOOGLE_MAPS_API_KEY is not set" },
      { status: 503 },
    );
  }
  // Every call here is billed. The cap is per caller per minute.
  if (throttled(callerKey(req), 20)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { lat, lng } = body;
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

  const radius = typeof body.radius === "number" ? body.radius : 5000;

  if (body.query?.trim()) {
    const result = await textSearch({ query: body.query, lat, lng, radius });
    return respond(result, { mode: "text", query: body.query.trim() });
  }

  const cls = body.activityClass;
  if (!cls || !(cls in TYPES_FOR_CLASS)) {
    return NextResponse.json({ error: "query or activityClass is required" }, { status: 400 });
  }

  const { types, proxy } = TYPES_FOR_CLASS[cls];
  if (types.length === 0) {
    // Deliberately a 200, not an error. "Google has no category that stands in for goat rearing" is
    // an ANSWER, and the screen should say it rather than showing a failed request.
    return NextResponse.json({
      applicable: false,
      reason: "Google has no place category that stands in for this trade.",
      places: [],
      attribution: PLACES_ATTRIBUTION,
    });
  }

  const result = await nearbySearch({ lat, lng, types, radius });
  return respond(result, { mode: "nearby", proxy });
}

function respond(
  result: Awaited<ReturnType<typeof nearbySearch>>,
  meta: Record<string, unknown>,
) {
  if (!result.ok) {
    console.error("[places]", result.reason);
    return NextResponse.json(
      { error: "lookup failed", detail: result.reason },
      { status: result.status && result.status < 500 ? 502 : 502 },
    );
  }

  return NextResponse.json({
    applicable: true,
    ...meta,
    places: result.places,
    radiusKm: result.radiusKm,
    /**
     * The count is of what GOOGLE HAS MAPPED, and the field is named so a consumer cannot
     * accidentally render it as a count of businesses. Coverage in rural India is thin; a zero
     * here means nothing is on the map, not that nothing is there.
     */
    mappedCount: result.places.length,
    attribution: PLACES_ATTRIBUTION,
  });
}
