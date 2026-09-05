import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sarvamSynthesise, sarvamTranscribe } from "./sarvam";

/**
 * The Sarvam wire contract, pinned.
 *
 * This module was written from documentation and shipped without ever being executed. All three of
 * the things below were wrong, and every one of them was a hard 400 — the module could not have
 * worked at all. They are pinned here because the contract has already drifted twice and the
 * failure mode is silent until someone presses the button.
 *
 * These tests stub fetch. They assert the REQUEST we build, not Sarvam's behaviour — a unit test
 * cannot tell you a model was deprecated yesterday. The live check is `npm run voice:check`.
 */

const ORIGINAL_KEY = process.env.SARVAM_API_KEY;
let calls: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
  calls = [];
  process.env.SARVAM_API_KEY = "test-key";
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ audios: ["QUJD"], transcript: "test" }),
      text: async () => "",
    } as unknown as Response;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_KEY === undefined) delete process.env.SARVAM_API_KEY;
  else process.env.SARVAM_API_KEY = ORIGINAL_KEY;
});

describe("text-to-speech", () => {
  it("does not ask for a retired model or a speaker that no longer exists", async () => {
    // Shipped as bulbul:v1 with speaker "meera". Live response:
    //   "Model 'bulbul:v2' has been deprecated. Please use 'bulbul:v3' instead."
    //   "speaker: Input should be 'anushka', 'abhilash', 'manisha', ..."
    await sarvamSynthesise("test", "hinglish");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.model).toBe("bulbul:v3");
    expect(body.speaker).not.toBe("meera");
    // bulbul:v3 serves a narrower speaker list than v2 — anushka is v2-only and 400s on v3.
    expect(body.speaker).not.toBe("anushka");
  });

  it("sends one text and the mapped language code", async () => {
    await sarvamSynthesise("test", "hi");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.inputs).toEqual(["test"]);
    expect(body.target_language_code).toBe("hi-IN");
    expect(calls[0].url).toContain("/text-to-speech");
  });
});

describe("speech-to-text", () => {
  it("posts multipart with a file part, not a JSON base64 body", async () => {
    // Shipped as JSON {audio, language_code, model}. Live response:
    //   400 {"error":{"message":"body.file : Field required"}}
    await sarvamTranscribe(Buffer.from("hello").toString("base64"), "hinglish");
    const { init } = calls[0];
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get("file")).toBeInstanceOf(Blob);
    expect(form.get("language_code")).toBe("hi-IN");
    expect(form.get("model")).not.toBe("saarika:v2"); // deprecated
  });

  it("lets fetch set the multipart boundary rather than forcing a content type", async () => {
    // Setting Content-Type by hand omits the boundary and the request is unparseable.
    await sarvamTranscribe("QUJD", "en");
    const headers = (calls[0].init.headers ?? {}) as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("content-type");
    expect(headers["api-subscription-key"]).toBe("test-key");
  });
});

describe("failure is quiet and safe", () => {
  it("returns a reason rather than throwing when the key is missing", async () => {
    delete process.env.SARVAM_API_KEY;
    const r = await sarvamSynthesise("test", "en");
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("never puts the key in the failure reason", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 401,
      text: async () => "unauthorised",
      json: async () => ({}),
    }) as unknown as Response);
    const r = await sarvamSynthesise("test", "en");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).not.toContain("test-key");
  });
});
