"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, Loader2, MapPin, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityClass } from "@/lib/finance/activities";
import type { NearbyPlace } from "@/lib/market/places";
import { SECTOR_NAME, analyseSpread, type Spread } from "@/lib/market/spread";
import { VILLAGES, type Village } from "@/lib/market/villages";
import { useT, num } from "@/lib/i18n";

/**
 * The catchment, drawn — Leaflet and OpenStreetMap.
 *
 * Open source and keyless on purpose. Google Maps would need a billable API key shipped to the
 * browser (NEXT_PUBLIC_), which for a government submission means either a public key someone can
 * spend or a feature that does not work on the reviewer's machine. OSM needs neither, and the tile
 * attribution below is a licence requirement, not decoration.
 *
 * This is also not a decorative map. The two circles are the 5 km and 10 km radii the feasibility
 * engine actually integrates over — `catchment10km` is the population `addressableDemand`
 * multiplies by per-capita spend, so the outer ring is the denominator of the rupee figure in the
 * section below it.
 *
 * ── The competitor overlay ───────────────────────────────────────────────────────────────────
 * Given an `activityClass`, the map can also plot what Google has mapped nearby: each shop as a
 * pin with its distance, the nearest one called out, and the compass sector holding the fewest.
 * It is not fetched on mount — every call is billed, and a map that spends money because a page
 * loaded is a map that spends money on every page load.
 *
 * The direction line is drawn thin and dashed on purpose. A filled "recommended zone" would be a
 * site recommendation, and an empty sector is not a good site: it may be a lake, a cantonment, or
 * simply a direction nobody has added to the map. The line says go and look.
 *
 * Leaflet is imported dynamically because it touches `window` at module scope and would break the
 * server render.
 */

type LeafletMap = import("leaflet").Map;
type LeafletLayerGroup = import("leaflet").LayerGroup;

export function VillageMap({
  village,
  onSelect,
  activityClass,
}: {
  village: Village;
  onSelect?: (id: string) => void;
  /** Supply this to offer the competitor scan. Without it the map behaves exactly as before. */
  activityClass?: ActivityClass;
}) {
  const { t } = useT();
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LeafletLayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  /**
   * The scan remembers WHICH village it was run for.
   *
   * Clearing it from an effect on `village.id` is the obvious version and React lints it for good
   * reason: it renders the previous village's shops over the new village for one frame before
   * wiping them. Carrying the id and treating a mismatch as "no scan" has no such frame, and is
   * the same shape the layout shell uses to close its menu on navigation.
   */
  const [scan, setScan] = useState<{
    villageId: string;
    places: NearbyPlace[];
    spread: Spread | null;
    capped: boolean;
    error: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const current = scan?.villageId === village.id ? scan : null;
  const places = current?.places ?? null;
  const spread = current?.spread ?? null;
  const error = current?.error ?? null;
  const capped = current?.capped ?? false;

  // Keeps the latest handler without re-running the map effect and rebuilding the whole map.
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !holder.current) return;

      leafletRef.current = L;
      map = L.map(holder.current, {
        center: [village.lat, village.lng],
        zoom: 10,
        scrollWheelZoom: false, // the page scrolls past this; trapping the wheel is hostile
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        // Required by the OSM tile usage policy.
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const teal = "#0d9488";
      L.circle([village.lat, village.lng], {
        radius: 10_000,
        color: teal,
        weight: 1,
        opacity: 0.45,
        fillColor: teal,
        fillOpacity: 0.07,
        interactive: false,
      }).addTo(map);
      L.circle([village.lat, village.lng], {
        radius: 5_000,
        color: teal,
        weight: 1.5,
        opacity: 0.7,
        fillColor: teal,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);

      L.marker([village.lat, village.lng], { icon: dot(L, teal, 16), title: village.name })
        .addTo(map)
        .bindTooltip(village.name, { permanent: false });

      for (const v of VILLAGES) {
        if (v.id === village.id) continue;
        L.marker([v.lat, v.lng], { icon: dot(L, "#94a3b8", 11), title: v.name })
          .addTo(map)
          .bindTooltip(v.name)
          .on("click", () => select.current?.(v.id));
      }

      overlayRef.current = L.layerGroup().addTo(map);

      // The container is sized by CSS; Leaflet needs telling once the layout has settled.
      setTimeout(() => map?.invalidateSize(), 0);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, [village]);

  /** Draw the overlay. Separate from the map build so a rescan does not rebuild the whole map. */
  useEffect(() => {
    const L = leafletRef.current;
    const group = overlayRef.current;
    const map = mapRef.current;
    if (!L || !group || !map) return;

    group.clearLayers();
    if (!places?.length) return;

    for (const p of places) {
      L.marker([p.lat, p.lng], { icon: dot(L, "#f59e0b", 10), title: p.name })
        .bindTooltip(`${p.name} · ${p.distanceKm} km`)
        .addTo(group);
    }

    // One thin dashed spoke towards the sector holding the fewest mapped shops. Not a filled
    // zone: see the note at the top of this file.
    if (spread && spread.total > 0 && spread.fewestMapped.length <= 3) {
      const bearing = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 }[
        spread.fewestMapped[0]
      ];
      const rad = (bearing * Math.PI) / 180;
      // 8 km out, converted to degrees. Longitude is scaled by cos(lat) or the line bends east.
      const dLat = (8 / 111) * Math.cos(rad);
      const dLng = ((8 / 111) * Math.sin(rad)) / Math.cos((village.lat * Math.PI) / 180);
      L.polyline(
        [
          [village.lat, village.lng],
          [village.lat + dLat, village.lng + dLng],
        ],
        { color: "#0d9488", weight: 2, opacity: 0.7, dashArray: "6 6" },
      )
        .bindTooltip(`Fewest mapped shops this way (${SECTOR_NAME[spread.fewestMapped[0]]})`)
        .addTo(group);
    }

    map.fitBounds(
      L.latLngBounds([
        [village.lat, village.lng],
        ...places.map((p) => [p.lat, p.lng] as [number, number]),
      ]).pad(0.2),
    );
  }, [places, spread, village.lat, village.lng]);

  async function runScan() {
    if (!activityClass) return;
    // Captured now: the user can change village mid-request, and the result must not be filed
    // under whichever village happens to be selected when it lands.
    const forVillage = village.id;
    const centre = { lat: village.lat, lng: village.lng };
    const put = (patch: Partial<NonNullable<typeof scan>>) =>
      setScan({
        villageId: forVillage,
        places: [],
        spread: null,
        capped: false,
        error: null,
        ...patch,
      });

    setBusy(true);
    try {
      const res = await fetch("/api/market/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...centre, activityClass, radius: 5000 }),
      });
      const json = await res.json();
      if (!res.ok) {
        put({
          error:
            res.status === 503
              ? "The shop scan is not configured on this deployment."
              : res.status === 429
                ? "Too many scans. Wait a minute."
                : "The lookup failed.",
        });
        return;
      }
      if (!json.applicable) {
        put({ error: json.reason ?? "No shop category stands in for this trade." });
        return;
      }
      const found: NearbyPlace[] = json.places ?? [];
      put({ places: found, spread: analyseSpread(centre, found), capped: Boolean(json.capped) });
    } catch {
      put({ error: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          {t("map.title")}
        </CardTitle>
        <CardDescription>{t("map.subtitle")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div
          ref={holder}
          role="img"
          aria-label={t("map.alt", { village: village.name, district: village.district })}
          className="h-[320px] w-full overflow-hidden rounded-xl border bg-muted/30"
        />

        {activityClass && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={runScan} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Store className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {places ? "Scan again" : "Show shops already here"}
            </Button>
            {places && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {places.length}
                {capped ? "+" : ""} mapped within 5 km · Google Places
              </Badge>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {spread && <SpreadPanel spread={spread} />}

        {/* The same figures in text, always — the map is a second way to read them, not the only
            way. A screen-reader user and a reader on a dead connection both get the numbers. */}
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Figure label={t("map.within5")} value={num(village.catchment5km)} />
          <Figure label={t("map.within10")} value={num(village.catchment10km)} />
          <Figure label={t("map.toMandi")} value={`${village.distanceToMandiKm} km`} />
          <Figure label={t("map.toBank")} value={`${village.distanceToBankKm} km`} />
        </dl>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t("map.note")}</p>
      </CardContent>
    </Card>
  );
}

/**
 * A plain dot rather than Leaflet's default pin, whose icon assets 404 under a bundler unless they
 * are copied into the public directory.
 */
function dot(L: typeof import("leaflet"), colour: string, size: number) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${colour};box-shadow:0 0 0 2px #fff,0 1px 3px rgba(0,0,0,.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const CROWDING_TEXT: Record<Spread["crowding"], string> = {
  "on-top": "The nearest mapped shop is on the same street.",
  close: "The nearest mapped shop is within walking distance.",
  spaced: "The nearest mapped shop is in a different neighbourhood.",
  clear: "Nothing mapped in the immediate area.",
  unknown: "Nothing of this kind is on Google's map here.",
};

function SpreadPanel({ spread }: { spread: Spread }) {
  const busiest = spread.bySector.filter((s) => s.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="mt-3 space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="flex items-baseline gap-1.5">
          <span className="font-heading text-2xl font-bold tabular-nums">
            {spread.nearestKm == null ? "—" : `${spread.nearestKm} km`}
          </span>
          <span className="text-xs text-muted-foreground">to the nearest</span>
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {spread.within1km} within 1 km · {spread.within2km} within 2 km
          {spread.medianKm != null ? ` · typical ${spread.medianKm} km` : ""}
        </span>
      </div>

      <p className="text-sm">{CROWDING_TEXT[spread.crowding]}</p>

      {busiest.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {busiest.map((s) => (
            <span
              key={s.sector}
              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] text-amber-800 dark:text-amber-300"
            >
              {s.count} to the {s.name}
              {s.nearestKm != null ? ` · nearest ${s.nearestKm} km` : ""}
            </span>
          ))}
        </div>
      )}

      {spread.total > 0 && spread.fewestMapped.length <= 4 && (
        <p className="flex items-start gap-2 text-sm">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Fewest mapped shops to the{" "}
            <strong>{spread.fewestMapped.map((s) => SECTOR_NAME[s]).join(" and ")}</strong>.{" "}
            {/* The caveat travels with the claim. An empty sector is not a good site, and the
                whole feature is worthless — worse than worthless — if a borrower reads it as one. */}
            <span className="text-muted-foreground">
              That is a place to go and look, not a recommendation: an empty direction on Google
              may be a canal, a cantonment, or simply somewhere nobody has added shops to the map.
            </span>
          </span>
        </p>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums shrink-0">{value}</dd>
    </div>
  );
}
