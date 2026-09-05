"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, X } from "lucide-react";

import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { listenContinuously, type ContinuousListener } from "@/lib/voice/vad";

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

type Phase = "connecting" | "listening" | "hearing" | "thinking" | "speaking" | "error";

/**
 * Hands-free voice mode.
 *
 * Open it and talk. The listener decides when a turn ends from the microphone itself, so nobody
 * has to hold a button, and the loop runs until it is closed: listen, answer, listen again.
 *
 * The microphone is PAUSED while the agent speaks. Without that the reply is captured as the next
 * turn and the agent talks to itself — which is the failure everyone hits first, and echo
 * cancellation does not reliably prevent it through a phone speaker.
 *
 * The transcript stays on screen throughout. A voice interface that hides what it thought you said
 * cannot be corrected, and this one sets a loan amount.
 */
export function VoiceAgent() {
  const { t, locale } = useT();
  const router = useRouter();
  const { onboardingInput, setOnboardingInput } = useAppStore();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const listener = useRef<ContinuousListener | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const busy = useRef(false);
  const frame = useRef(0);

  // Rendered, so it has to be state — a ref does not re-render, and this line is the only thing
  // telling the user the agent is holding an amount waiting for a yes.
  const [awaitingAmount, setAwaitingAmount] = useState(false);

  // The async handler needs the CURRENT values without being rebuilt every keystroke, so it reads
  // through refs. Both are synced in an effect: assigning during render is a write React is
  // entitled to discard.
  const store = useRef(onboardingInput);
  const pending = useRef<number | null>(null);
  useEffect(() => {
    store.current = onboardingInput;
  }, [onboardingInput]);

  const teardown = useCallback(() => {
    cancelAnimationFrame(frame.current);
    listener.current?.stop();
    listener.current = null;
    audioEl.current?.pause();
    audioEl.current = null;
    busy.current = false;
    pending.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const handleTurn = useCallback(
    async (audio: string) => {
      // One turn at a time. A second utterance arriving mid-request is dropped rather than queued:
      // answering a question the user has already moved past is worse than missing it.
      if (busy.current) return;
      busy.current = true;
      listener.current?.pause();
      setPhase("thinking");

      try {
        const res = await fetch("/api/voice/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio,
            locale,
            context: {
              district: store.current.location?.district,
              block: store.current.location?.block,
              category: store.current.businessCategory || undefined,
              marginCapital: store.current.marginCapital,
              pendingAmount: pending.current,
            },
          }),
        });
        const data: AgentResponse = await res.json();
        if (!res.ok) {
          setError(data.error ?? `HTTP ${res.status}`);
          setPhase("listening");
          listener.current?.resume();
          return;
        }

        setTurns((prev) => [...prev, { you: data.transcript, agent: data.reply }]);
        pending.current = data.context.pendingAmount ?? null;
        setAwaitingAmount(pending.current != null);

        const c = data.context;
        const location = store.current.location ?? { village: "", block: "", district: "" };
        if (
          c.district !== store.current.location?.district ||
          c.block !== store.current.location?.block
        ) {
          setOnboardingInput({
            location: { ...location, district: c.district ?? "", block: c.block ?? "" },
          });
        }
        if (c.category && c.category !== store.current.businessCategory) {
          setOnboardingInput({ businessCategory: c.category });
        }
        if (c.marginCapital != null && c.marginCapital !== store.current.marginCapital) {
          setOnboardingInput({ marginCapital: c.marginCapital });
        }

        const resume = () => {
          if (data.navigateTo) router.push(data.navigateTo);
          setPhase("listening");
          listener.current?.resume();
          busy.current = false;
        };

        if (data.audio) {
          const el = new Audio(`data:${data.mimeType};base64,${data.audio}`);
          audioEl.current = el;
          el.onended = resume;
          el.onerror = resume;
          setPhase("speaking");
          await el.play().catch(resume);
        } else {
          resume();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "request failed");
        setPhase("listening");
        listener.current?.resume();
        busy.current = false;
      }
    },
    [locale, router, setOnboardingInput],
  );

  // `busy` is cleared by the audio's onended, so it is reset here for the paths that do not play.
  useEffect(() => {
    if (phase === "listening") busy.current = false;
  }, [phase]);

  const begin = useCallback(async () => {
    setError(null);
    setPhase("connecting");
    try {
      listener.current = await listenContinuously({
        onTurn: handleTurn,
        onPhase: (p) =>
          setPhase((current) =>
            current === "listening" || current === "hearing"
              ? p === "speech"
                ? "hearing"
                : "listening"
              : current,
          ),
        onError: (m) => setError(m),
      });
      setPhase("listening");

      const tick = () => {
        setLevel(listener.current?.level() ?? 0);
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    } catch {
      setError(t("agent.micDenied"));
      setPhase("error");
    }
  }, [handleTurn, t]);

  const close = () => {
    teardown();
    setOpen(false);
    setLevel(0);
  };

  const label: Record<Phase, string> = {
    connecting: t("agent.connecting"),
    listening: t("agent.listening"),
    hearing: t("agent.hearing"),
    thinking: t("agent.thinking"),
    speaking: t("agent.speaking"),
    error: error ?? t("agent.micDenied"),
  };

  // The orb answers to the microphone while listening and pulses on its own while speaking, so
  // there is always something telling you whose turn it is.
  const scale =
    phase === "hearing" || phase === "listening"
      ? 1 + level * 0.35
      : phase === "speaking"
        ? 1.12
        : 1;

  return (
    <>
      {/* The launcher hides while the panel is up — the panel sits on the same anchor, and two
          controls stacked on one corner is how you get a mis-tap. */}
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTurns([]);
            void begin();
          }}
          aria-label={t("agent.open")}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:bottom-6"
        >
          <Mic className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/*
        A panel, not a takeover.

        This was full-screen, which is wrong for THIS agent: it fills fields and moves between
        pages, and a fullscreen overlay hides the very thing it is driving. Anchored in the corner,
        the user watches the district land in the form and the calculator open while they talk.

        Not a modal either — no aria-modal, no focus trap, no backdrop. The rest of the page stays
        live and operable on purpose, so someone can keep tapping while the agent listens.
      */}
      {open && (
        <div
          role="dialog"
          aria-label={t("agent.title")}
          className="fixed bottom-20 right-4 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/95 text-neutral-100 shadow-2xl backdrop-blur-md md:bottom-6"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
            <p className="text-sm font-semibold">{t("agent.title")}</p>
            <button
              type="button"
              onClick={close}
              aria-label={t("agent.close")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col items-center px-4 pb-4 pt-5">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div
                className="absolute h-24 w-24 rounded-full blur-2xl transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(circle, rgba(99,102,241,0.55), rgba(56,189,248,0.25))",
                  opacity: phase === "thinking" ? 0.35 : 0.55 + level * 0.4,
                }}
              />
              <div
                className={cn(
                  "voice-orb relative h-20 w-20 rounded-full",
                  phase === "speaking" && "voice-orb-speaking",
                  phase === "thinking" && "voice-orb-thinking",
                )}
                style={{ transform: `scale(${scale})` }}
                aria-hidden="true"
              />
            </div>

            <p role="status" className="mt-4 text-center text-sm font-medium text-neutral-200">
              {label[phase]}
            </p>

            {turns.length === 0 && phase === "listening" && (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-neutral-400">
                {t("agent.examples")}
              </p>
            )}

            {/* The exchange, in words. Scrolls rather than growing the panel off-screen. */}
            {turns.length > 0 && (
              <div className="mt-4 max-h-40 w-full space-y-2 overflow-y-auto">
                {turns.slice(-4).map((turn, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[11px] text-neutral-500">
                      <span className="font-semibold">{t("agent.youSaid")}</span> {turn.you}
                    </p>
                    <p className="text-sm leading-relaxed text-neutral-100">{turn.agent}</p>
                  </div>
                ))}
              </div>
            )}

            {awaitingAmount && (
              <p className="mt-3 text-center text-[11px] text-amber-300">
                {t("agent.awaitingConfirm")}
              </p>
            )}

            <button
              type="button"
              onClick={close}
              className="mt-4 w-full rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t("agent.end")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
