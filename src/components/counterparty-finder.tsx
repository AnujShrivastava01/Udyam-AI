"use client";

import { useState } from "react";
import { ExternalLink, Globe, Loader2, MessageCircle, Navigation, Phone, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NearbyPlace } from "@/lib/market/places";
import {
  asMessage,
  type Requirement,
} from "@/lib/marketplace/requirement";
import {
  contactLinks,
  counterpartyHeading,
  directionsUrl,
} from "@/lib/marketplace/counterparties";

/**
 * The other side of the trade — real businesses, from Google Places.
 *
 * This is what makes the board a marketplace rather than a form. A requirement with nobody to send
 * it to is a note to yourself; a requirement next to four wholesalers within twenty kilometres,
 * each with a working phone number, is a morning's work.
 *
 * It is also the honest answer to the liquidity problem. A new marketplace has no users, and the
 * usual fix is to seed it with plausible-looking counterparties — which this project refused, which
 * is why /marketplace has carried three listings marked "Example" with offering disabled. The
 * counterparties here were not invented and are not users of this app: they are businesses already
 * trading nearby, and the panel says so.
 *
 * Nothing is sent on the user's behalf. Call opens the dialler, WhatsApp opens a chat with the
 * requirement text prefilled — the user picks send.
 */

type Lead = NearbyPlace & { foundBy?: string[] };

interface Result {
  places: Lead[];
  contactable: number;
  searched: string[];
  radiusKm: number;
  attribution: string;
}

export function CounterpartyFinder({
  requirement,
  lat,
  lng,
}: {
  requirement: Requirement;
  lat: number;
  lng: number;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function find() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/market/counterparties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          product: requirement.product,
          side: requirement.side,
          radius: 25_000,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Business search is not configured on this deployment."
            : res.status === 429
              ? "Too many searches. Wait a minute."
              : "The lookup failed.",
        );
        return;
      }
      setResult(json as Result);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const pitch = asMessage(requirement);

  return (
    <div className="border-t p-4">
      {!result && (
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-full"
          onClick={find}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Users className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {counterpartyHeading(requirement.side)}
        </Button>
      )}

      {error && (
        <p role="alert" className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">
              {counterpartyHeading(requirement.side)}
              <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                {result.places.length} within {result.radiusKm} km · {result.contactable} with a
                phone number
              </span>
            </p>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={find} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Search again"}
            </Button>
          </div>

          {result.places.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Nothing matching{" "}
              <span className="text-foreground">{result.searched.join(", ")}</span> is on
              Google&apos;s map within {result.radiusKm} km. In a rural block that is as likely to
              mean nobody has listed them as that nobody is there — ask at the mandi.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {result.places.map((p) => {
                const links = contactLinks(p.phone);
                return (
                  <li key={p.id} className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        {p.address && (
                          <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                        )}
                        {/* Which phrase found them. A "sweet shop" surfacing under a milk
                            requirement is a reasonable lead; the user should be able to see why
                            it is here and judge it. */}
                        {p.foundBy?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.foundBy.map((q) => (
                              <Badge
                                key={q}
                                variant="outline"
                                className="text-[10px] text-muted-foreground"
                              >
                                {q}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {p.distanceKm} km
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {links ? (
                        <>
                          <a href={links.tel}>
                            <Button size="sm" variant="outline" className="h-7 rounded-full text-xs">
                              <Phone className="mr-1.5 h-3 w-3" aria-hidden="true" /> Call
                            </Button>
                          </a>
                          {/* Prefilled, not sent. The user picks send in WhatsApp. */}
                          <a
                            href={`${links.whatsapp}?text=${encodeURIComponent(pitch)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" className="h-7 rounded-full text-xs">
                              <MessageCircle className="mr-1.5 h-3 w-3" aria-hidden="true" /> Send
                              requirement
                            </Button>
                          </a>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          No phone number listed
                        </Badge>
                      )}
                      <a
                        href={directionsUrl(p.lat, p.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs">
                          <Navigation className="mr-1.5 h-3 w-3" aria-hidden="true" /> Directions
                        </Button>
                      </a>
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs">
                            <Globe className="mr-1.5 h-3 w-3" aria-hidden="true" /> Website
                            <ExternalLink className="ml-1 h-2.5 w-2.5" aria-hidden="true" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {result.attribution}. These are businesses already trading nearby — they are not users
            of this app and have not seen your requirement. Searched: {result.searched.join(", ")}.
          </p>
        </div>
      )}
    </div>
  );
}
