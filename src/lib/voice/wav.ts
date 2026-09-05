/**
 * Microphone capture, encoded as WAV.
 *
 * Sarvam's speech-to-text is verified against WAV (see sarvam.ts). MediaRecorder gives you webm/opus
 * in Chrome and mp4 in Safari, and guessing which container a provider will accept is exactly the
 * kind of assumption that shipped three broken calls in this module already. So the browser records
 * in whatever it likes, and this decodes that to raw samples and writes a WAV by hand — one format
 * leaves the client, and it is the one that was tested.
 *
 * Downmixed to mono and resampled to 16 kHz: speech recognition gains nothing from stereo or from
 * 48 kHz, and this is going up a rural connection.
 */

const TARGET_RATE = 16_000;

/** Average the channels down to one and resample by linear interpolation. */
function toMono16k(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  const source = buffer.getChannelData(0);
  const mixed = new Float32Array(source.length);
  mixed.set(source);
  for (let c = 1; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < mixed.length; i++) mixed[i] += data[i];
  }
  if (channels > 1) {
    for (let i = 0; i < mixed.length; i++) mixed[i] /= channels;
  }

  if (buffer.sampleRate === TARGET_RATE) return mixed;

  const ratio = buffer.sampleRate / TARGET_RATE;
  const out = new Float32Array(Math.floor(mixed.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const at = i * ratio;
    const low = Math.floor(at);
    const high = Math.min(low + 1, mixed.length - 1);
    out[i] = mixed[low] + (mixed[high] - mixed[low]) * (at - low);
  }
  return out;
}

/** 16-bit PCM WAV, mono. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, 1, true); // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Whatever the browser recorded, as base64 WAV. */
export async function toWavBase64(recorded: Blob): Promise<string> {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(await recorded.arrayBuffer());
    const wav = encodeWav(toMono16k(decoded), TARGET_RATE);
    const bytes = new Uint8Array(await wav.arrayBuffer());
    let binary = "";
    // Chunked, because String.fromCharCode(...bytes) blows the call stack on anything long enough
    // to be a sentence.
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  } finally {
    void ctx.close();
  }
}

/** A recorder that yields WAV. Caller must stop() to get the audio and release the microphone. */
export async function startRecording(): Promise<{ stop: () => Promise<string> }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  return {
    stop: () =>
      new Promise<string>((resolve, reject) => {
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          try {
            resolve(await toWavBase64(new Blob(chunks, { type: recorder.mimeType })));
          } catch (e) {
            reject(e);
          }
        };
        recorder.stop();
      }),
  };
}
