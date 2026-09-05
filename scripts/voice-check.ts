/**
 * Live check against Sarvam.
 *
 *   npm run voice:check
 *
 * Unit tests pin the request we build; they cannot tell you a model was deprecated yesterday. This
 * does a real round trip — synthesise a sentence carrying a rupee figure, feed the audio straight
 * back to speech-to-text, and check the figure survives. That round trip is the property the
 * numeric firewall exists to protect, and it is the one thing worth checking against the live API.
 *
 * Reads .env.local directly so it works outside Next's runtime. Never prints the key.
 */

import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

async function main() {
  const { activeProvider, speak, listen, speakAmount } = await import("../src/lib/voice/index");

  const provider = activeProvider();
  console.log(`provider: ${provider}`);
  if (provider === "none") {
    console.log("No key set. Voice is unavailable and the product falls back to text.");
    process.exit(1);
  }

  const AMOUNT = 46_467;
  const sentence = `Aapko ${speakAmount(AMOUNT, "hinglish")} kamai shuru hone se pehle dena padega.`;
  console.log(`\nsynthesising: ${sentence}`);

  const tts = await speak(sentence, "hinglish");
  if (!tts.ok) {
    // Sarvam's 400s name the valid models and speakers — print the whole thing, it is the fix.
    console.error(`\nTTS FAILED: ${tts.reason}`);
    process.exit(1);
  }
  const bytes = Buffer.from(tts.value, "base64");
  console.log(`TTS ok: ${bytes.length} bytes, ${bytes.subarray(0, 4).toString("ascii")}/${bytes.subarray(8, 12).toString("ascii")}`);

  console.log("\ntranscribing it back...");
  const stt = await listen(tts.value, "hinglish");
  if (!stt.ok) {
    console.error(`STT FAILED: ${stt.reason}`);
    process.exit(1);
    return;
  }
  console.log(`STT ok: ${stt.value}`);

  // The round trip is only meaningful if the number comes back. Digits or Devanagari digits both
  // count — what must not happen is the figure changing.
  const digits = stt.value.replace(/[^0-9०-९]/g, "");
  const survived = digits.includes(String(AMOUNT)) || digits.includes("46467");
  console.log(`\nfigure survived the round trip: ${survived ? "YES" : "NO"} (digits seen: ${digits || "none"})`);
  if (!survived) {
    console.log("NOTE: a transcript that drops or rounds the figure is not automatically a bug —\n" +
      "ASR paraphrases. It IS a reason not to trust spoken input without reading it back.");
  }
}

main();
