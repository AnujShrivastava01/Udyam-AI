"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Square, X } from "lucide-react";

import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { startRecording } from "@/lib/voice/wav";

interface Turn {
  you: string;
  agent: string;
}

interface AgentResponse {
  transcript: string;
  action: { kind: string };
  reply: string;
  audio: string | null;
  mimeType: string;
  context: {
    district?: string;
    block?: string;
    category?: string;
    marginCapital?: number | null;
    pendingAmount?: number | null;
  };
  navigateTo: string | null;
  error?: string;
}

/**
 * Talk to the app.
 *
 * One turn: hold the mic, say something, let go. The server transcribes it, Gemini picks one action
 * from a closed list, and the answer comes back as both text and speech. Everything it decides is
 * applied HERE — the store and the router are the client's, and the route only ever proposes.
 *
 * The transcript and the reply are both shown, always. A voice interface that gives you no written
 * record of what it thought you said is impossible to correct and impossible to trust, and this one
 * is setting a loan amount.
 */
export function VoiceAgent() {
  const { t, locale } = useT();
  const router = useRouter();
  const { onboardingInput, setOnboardingInput } = useAppStore();

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "recording" | "thinking" | "speaking">("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const recorder = useRef<{ stop: () => Promise<string> } | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      audioEl.current?.pause();
      void recorder.current?.stop().catch(() => {});
    },
    [],
  );

  const send = useCallback(
    async (audio: string) => {
      setState("thinking");
      try {
        const res = await fetch("/api/voice/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio,
            locale,
            context: {
              district: onboardingInput.location?.district,
              block: onboardingInput.location?.block,
              category: onboardingInput.businessCategory || undefined,
              marginCapital: onboardingInput.marginCapital,
              pendingAmount,
            },
          }),
        });
        const data: AgentResponse = await res.json();
        if (!res.ok) {
          setError(data.error ?? `HTTP ${res.status}`);
          setState("idle");
          return;
        }

        setTurns((prev) => [...prev, { you: data.transcript, agent: data.reply }]);
        setPendingAmount(data.context.pendingAmount ?? null);

        // Apply what it decided. An amount only lands here after the user has confirmed the
        // read-back, so nothing reaches the store on a single hearing.
        const c = data.context;
        const location = onboardingInput.location ?? { village: "", block: "", district: "" };
        if (c.district !== onboardingInput.location?.district || c.block !== onboardingInput.location?.block) {
          setOnboardingInput({
            location: { ...location, district: c.district ?? "", block: c.block ?? "" },
          });
        }
        if (c.category && c.category !== onboardingInput.businessCategory) {
          setOnboardingInput({ businessCategory: c.category });
        }
        if (c.marginCapital != null && c.marginCapital !== onboardingInput.marginCapital) {
          setOnboardingInput({ marginCapital: c.marginCapital });
        }

        if (data.audio) {
          const el = new Audio(`data:${data.mimeType};base64,${data.audio}`);
          audioEl.current = el;
          el.onended = () => {
            setState("idle");
            if (data.navigateTo) router.push(data.navigateTo);
          };
          setState("speaking");
          await el.play().catch(() => {
            setState("idle");
            if (data.navigateTo) router.push(data.navigateTo);
          });
        } else {
          setState("idle");
          if (data.navigateTo) router.push(data.navigateTo);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "request failed");
        setState("idle");
      }
    },
    [locale, onboardingInput, pendingAmount, router, setOnboardingInput],
  );

  const start = async () => {
    setError(null);
    try {
      recorder.current = await startRecording();
      setState("recording");
    } catch {
      // Almost always a denied microphone permission, which is the user's decision, not a fault.
      setError(t("agent.micDenied"));
      setState("idle");
    }
  };

  const stop = async () => {
    const r = recorder.current;
    recorder.current = null;
    if (!r) return;
    try {
      await send(await r.stop());
    } catch (e) {
      setError(e instanceof Error ? e.message : "recording failed");
      setState("idle");
    }
  };

  const busy = state === "thinking" || state === "speaking";

  return (
    <>
      {/* Sits above the mobile bottom nav so it never covers it. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("agent.open")}
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:bottom-6"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Mic className="h-6 w-6" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("agent.title")}
          className="fixed bottom-36 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border-2 bg-card shadow-2xl md:bottom-24"
        >
          <div className="border-b px-4 py-3">
            <p className="font-heading font-bold">{t("agent.title")}</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{t("agent.hint")}</p>
          </div>

          <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <p className="text-xs leading-relaxed text-muted-foreground">{t("agent.examples")}</p>
            )}
            {turns.map((turn, i) => (
              <div key={i} className="space-y-1.5">
                {/* What it THOUGHT you said, shown every time — the only way to catch a mishearing. */}
                <p className="rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                  <span className="font-semibold">{t("agent.youSaid")}</span> {turn.you}
                </p>
                <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm leading-relaxed">
                  {turn.agent}
                </p>
              </div>
            ))}
            {error && (
              <p role="status" className="text-xs text-amber-800 dark:text-amber-400">
                {error}
              </p>
            )}
          </div>

          <div className="border-t p-3">
            <button
              type="button"
              onClick={state === "recording" ? stop : start}
              disabled={busy}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
                state === "recording"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {state === "recording" ? (
                <>
                  <Square className="h-4 w-4" aria-hidden="true" /> {t("agent.stop")}
                </>
              ) : busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {state === "speaking" ? t("agent.speaking") : t("agent.thinking")}
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" aria-hidden="true" /> {t("agent.speak")}
                </>
              )}
            </button>
            {pendingAmount != null && (
              <p className="mt-2 text-center text-[11px] text-amber-800 dark:text-amber-400">
                {t("agent.awaitingConfirm")}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
