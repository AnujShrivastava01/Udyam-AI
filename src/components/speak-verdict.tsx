"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";

import { useT } from "@/lib/i18n";

/**
 * Read the verdict aloud.
 *
 * The single most important accessibility gap in this product: the people it is for may not read
 * either script, and the Solvency Clock carries the whole argument visually. This is the smallest
 * honest version of the fix — the verdict, spoken, in the language already selected.
 *
 * The button sends kernel INPUTS, not text. The server computes the plan, builds the sentence from
 * its own figures and returns the audio together with the exact words spoken, which are shown as a
 * caption underneath. So the audio has a textual equivalent for anyone who cannot hear it, and the
 * figures can be checked against the card above by anyone who can.
 */
export function SpeakVerdict({
  marginCapital,
  activityId,
  annualHouseholdIncome,
  className = "",
}: {
  marginCapital: number;
  activityId?: string;
  annualHouseholdIncome?: number;
  className?: string;
}) {
  const { t, locale } = useT();
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [caption, setCaption] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // No reset effect here: a loaded clip belongs to one locale and one set of figures, so the
  // parent gives this component a key built from both. Changing either remounts it, which throws
  // the stale audio away without any state-syncing effect to keep correct.
  useEffect(() => () => audioRef.current?.pause(), []);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setState("idle");
  };

  const play = async () => {
    setState("loading");
    setDetail(null);
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginCapital, activityId, annualHouseholdIncome, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setDetail(data.error ?? `HTTP ${res.status}`);
        // The server sends the sentence even when synthesis fails, so a failed voice call still
        // leaves the user with the words rather than nothing.
        if (data.spokenText) setCaption(data.spokenText);
        return;
      }
      setCaption(data.spokenText);
      const el = new Audio(`data:${data.mimeType};base64,${data.audio}`);
      audioRef.current = el;
      el.onended = () => setState("idle");
      el.onerror = () => {
        setState("error");
        setDetail("playback failed");
      };
      await el.play();
      setState("playing");
    } catch (e) {
      setState("error");
      setDetail(e instanceof Error ? e.message : "request failed");
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={state === "playing" ? stop : play}
        disabled={state === "loading"}
        aria-label={state === "playing" ? t("voice.stop") : t("voice.listen")}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {state === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : state === "playing" ? (
          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {state === "playing" ? t("voice.stop") : t("voice.listen")}
      </button>

      {caption && (
        <p
          lang={locale === "hi" ? "hi" : locale === "hinglish" ? "hi-Latn" : "en"}
          className="mt-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
        >
          <span className="font-semibold text-foreground">{t("voice.caption")}</span> {caption}
        </p>
      )}
      {state === "error" && (
        <p role="status" className="mt-1.5 text-[11px] text-amber-800 dark:text-amber-400">
          {t("voice.unavailable")}
          {detail ? ` (${detail})` : ""}
        </p>
      )}
    </div>
  );
}
