"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
 * section below it. Every coordinate plotted comes from the gazetteer; nothing is invented, and the
 * population figures inside the rings carry the same seeded marker they carry everywhere else.
 *
 * Leaflet is imported dynamically because it touches `window` at module scope and would break the
 * server render.
 */
export function VillageMap({
  village,
  onSelect,
}: {
  village: Village;
  onSelect?: (id: string) => void;
}) {
  const { t } = useT();
  const holder = useRef<HTMLDivElement>(null);
  // Keeps the latest handler without re-running the map effect and rebuilding the whole map.
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !holder.current) return;

      map = L.map(holder.current, {
        center: [village.lat, village.lng],
        zoom: 10,
        scrollWheelZoom: false, // the page scrolls past this; trapping the wheel is hostile
        attributionControl: true,
      });

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

      // A plain dot rather than Leaflet's default pin, whose icon assets 404 under a bundler
      // unless they are copied into the public directory.
      const dot = (colour: string, size: number) =>
        L.divIcon({
          className: "",
          html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${colour};box-shadow:0 0 0 2px #fff,0 1px 3px rgba(0,0,0,.4)"></span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

      L.marker([village.lat, village.lng], { icon: dot(teal, 16), title: village.name })
        .addTo(map)
        .bindTooltip(village.name, { permanent: false });

      for (const v of VILLAGES) {
        if (v.id === village.id) continue;
        L.marker([v.lat, v.lng], { icon: dot("#94a3b8", 11), title: v.name })
          .addTo(map)
          .bindTooltip(v.name)
          .on("click", () => select.current?.(v.id));
      }

      // The container is sized by CSS; Leaflet needs telling once the layout has settled.
      setTimeout(() => map?.invalidateSize(), 0);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [village]);

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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums shrink-0">{value}</dd>
    </div>
  );
}
