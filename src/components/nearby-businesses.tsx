"use client";

import { useState } from "react";
import { Crosshair, Loader2, MapPin, Search, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ActivityClass } from "@/lib/finance/activities";
import type { NearbyPlace } from "@/lib/market/places";

/**
 * Who else is trading nearby, from Google Places.
 *
 * The honest framing is the whole point of this component. Google's coverage of a village in
 * Sheopur is not its coverage of a city: a search returning three shops means Google knows about
 * three, not that there are three. So nothing here is labelled "competitors" and no count is
 * presented as a census — the heading says mapped, the empty state says "none on Google's map",
 * and the caveat sits under the results rather than behind a tooltip.
 *
 * That matters because the number is decision-relevant. A borrower told "no competition" who then
 * opens the fourth kirana shop on a street Google has never surveyed has been actively misled, and
 * this product's entire argument is that its numbers can be trusted.
 */

interface Props {
  /** Search centre — normally the user's village from the gazetteer. */
  lat: number;
  lng: number;
  placeLabel: string;
  activityClass?: ActivityClass;
}

interface Result {
  applicable: boolean;
  reason?: string;
  places: NearbyPlace[];
  mappedCount?: number;
  capped?: boolean;
  radiusKm?: number;
  proxy?: string;
  attribution: string;
}

export function NearbyBusinesses({ lat, lng, placeLabel, activityClass }: Props) {
  const [centre, setCentre] = useState({ lat, lng, label: placeLabel });
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/market/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Places is not configured on this deployment."
            : res.status === 429
              ? "Too many searches. Wait a minute."
              : (json.detail ?? "The lookup failed."),
        );
        setResult(null);
        return;
      }
      setResult(json as Result);
    } catch {
      setError("Could not reach the server.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  /**
   * GPS, asked for only when the user taps the button.
   *
   * Never on mount: a location prompt that appears because a page loaded is the kind of thing
   * people deny once and then cannot easily re-grant.
   */
  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("This browser cannot report a location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "your current location",
        };
        setCentre(next);
        void run({ lat: next.lat, lng: next.lng, activityClass, query: query.trim() || undefined });
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was refused, so the search stays on your village."
            : "Could not get a location fix.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> Businesses mapped near{" "}
          {centre.label}
        </CardTitle>
        <CardDescription className="leading-relaxed">
          What Google has on its map within a few kilometres. Useful as a floor, not a count — many
          rural shops are not listed anywhere.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search
              className="absolute left-3 top-2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Search a shop or trade by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  void run({ lat: centre.lat, lng: centre.lng, query: query.trim() });
                }
              }}
              aria-label="Search businesses by name"
            />
          </div>
          <Button
            className="rounded-full"
            disabled={busy}
            onClick={() =>
              void run({
                lat: centre.lat,
                lng: centre.lng,
                activityClass,
                query: query.trim() || undefined,
              })
            }
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Search
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={useMyLocation}
            disabled={locating}
          >
            {locating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Crosshair className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Use my location
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            {error}
          </p>
        )}

        {result && !result.applicable && (
          <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            {result.reason} Try a name search instead — &ldquo;goat market&rdquo;, &ldquo;pashu
            aahar&rdquo;, &ldquo;dairy&rdquo;.
          </p>
        )}

        {result?.applicable && (
          <>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-heading text-2xl font-bold tabular-nums">
                {result.mappedCount ?? result.places.length}
                {/* Google returns at most 20 per request. Near Najafgarh that ceiling is reached,
                    so a bare "20" would read as a count and make a dense market look like a
                    middling one. */}
                {result.capped ? "+" : ""}
              </span>
              <span className="text-sm text-muted-foreground">
                mapped within {result.radiusKm ?? 5} km
                {result.capped ? " — Google returns at most 20 at a time" : ""}
              </span>
              {result.proxy && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {result.proxy}
                </Badge>
              )}
            </div>

            {result.places.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nothing of this kind is on Google&apos;s map here.{" "}
                <strong className="text-foreground">
                  That is not the same as nothing being there.
                </strong>{" "}
                In most villages the shops that exist have never been listed, so treat this as
                &ldquo;unknown&rdquo;, not as an open market.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {result.places.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      {p.address && (
                        <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                      )}
                      {p.kind && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{p.kind}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">{p.distanceKm} km</p>
                      {p.rating != null && (
                        <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground tabular-nums">
                          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                          {p.rating.toFixed(1)}
                          {p.ratingCount != null ? ` (${p.ratingCount})` : ""}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Google's terms require visible attribution wherever Places data is shown outside a
                Google map. It is also the provenance line, which is how everything else in this
                product is presented. */}
            <p className="text-[11px] text-muted-foreground">
              {result.attribution} · distances are straight-line from{" "}
              {centre.lat.toFixed(3)}, {centre.lng.toFixed(3)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
