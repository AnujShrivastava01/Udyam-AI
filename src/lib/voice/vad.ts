/**
 * Hands-free listening with turn-taking.
 *
 * Push-to-talk asks the user to know when to hold a button. This watches the microphone instead
 * and decides for itself: it starts capturing when someone speaks and stops when they stop, so the
 * conversation takes turns the way a conversation does.
 *
 * Voice-activity detection here is deliberately plain — short-window RMS energy against a
 * threshold, with hysteresis. No model, no library. It is a few lines, it runs in a timer rather
 * than on a worklet thread, and its failure modes are the obvious ones (a noisy room raises the
 * floor). The alternative is shipping a WASM VAD to solve a problem that a loudness threshold
 * solves adequately for a demo on a phone held near someone's face.
 *
 * Three guards stop it from sending rubbish to a paid endpoint:
 *   MIN_SPEECH_MS   a click or a cough is not an utterance
 *   SILENCE_MS      how long a pause has to be before a turn is considered finished
 *   MAX_TURN_MS     a stuck recorder, or someone who never stops, is cut off rather than billed
 */

const POLL_MS = 50;
/** Rises above this to start a turn... */
const SPEECH_ON = 0.022;
/** ...and has to fall below this to end one. The gap prevents chattering at the boundary. */
const SPEECH_OFF = 0.013;
const MIN_SPEECH_MS = 350;
const SILENCE_MS = 1_100;
const MAX_TURN_MS = 15_000;

export type ListenerPhase = "waiting" | "speech";

export interface ContinuousListener {
  /** 0..1, for driving the orb. Read it every frame; it is cheap. */
  level(): number;
  /** Stop capturing without releasing the microphone — used while the agent is talking. */
  pause(): void;
  resume(): void;
  /** Tear down and release the microphone. */
  stop(): void;
}

export async function listenContinuously(opts: {
  /** Called once per finished turn, with 16 kHz mono WAV as base64. */
  onTurn: (wavBase64: string) => void;
  onPhase?: (phase: ListenerPhase) => void;
  onError?: (message: string) => void;
}): Promise<ContinuousListener> {
  const { toWavBase64 } = await import("./wav");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);

  let current = 0;
  let paused = false;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let speechStartedAt = 0;
  let lastLoudAt = 0;
  let phase: ListenerPhase = "waiting";

  const setPhase = (next: ListenerPhase) => {
    if (phase === next) return;
    phase = next;
    opts.onPhase?.(next);
  };

  const beginTurn = () => {
    chunks = [];
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      opts.onError?.("recording is not supported in this browser");
      return;
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
      chunks = [];
      recorder = null;
      if (blob.size < 1_000) return; // too short to be speech
      try {
        opts.onTurn(await toWavBase64(blob));
      } catch {
        opts.onError?.("could not encode the recording");
      }
    };
    recorder.start();
  };

  const endTurn = () => {
    setPhase("waiting");
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / samples.length);
    // Smoothed, so the orb breathes rather than flickers.
    current = current * 0.7 + Math.min(1, rms * 12) * 0.3;

    if (paused) return;
    const now = performance.now();

    if (phase === "waiting") {
      if (rms > SPEECH_ON) {
        setPhase("speech");
        speechStartedAt = now;
        lastLoudAt = now;
        beginTurn();
      }
      return;
    }

    if (rms > SPEECH_OFF) lastLoudAt = now;

    const spoken = now - speechStartedAt;
    const quietFor = now - lastLoudAt;
    if (spoken > MAX_TURN_MS || (quietFor > SILENCE_MS && spoken > MIN_SPEECH_MS)) {
      endTurn();
    } else if (quietFor > SILENCE_MS) {
      // Long enough silence but too little speech — a cough. Drop it without spending a call.
      setPhase("waiting");
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
        recorder = null;
        chunks = [];
      }
    }
  }, POLL_MS);

  return {
    level: () => current,
    pause: () => {
      paused = true;
      // Whatever was mid-capture when the agent started talking is not a turn.
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
        recorder = null;
        chunks = [];
      }
      setPhase("waiting");
    },
    resume: () => {
      paused = false;
      lastLoudAt = performance.now();
    },
    stop: () => {
      clearInterval(timer);
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
