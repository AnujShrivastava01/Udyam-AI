/**
 * The Vertex call, on its own.
 *
 * Extracted from narrate.ts so the voice agent's intent step can use the identical client rather
 * than a second copy that drifts. The hard-won configuration lives here and is commented where it
 * cost time:
 *
 *   - `location` must be `global`, not a region. A regional endpoint returns 404 "model not found",
 *     which reads exactly like a wrong model id and sends you looking in the wrong place.
 *   - The project serves the `gemini-2.5-*` family. `gemini-2.0-*` 404s the same way.
 *   - `thinkingBudget` is model-dependent and getting it wrong is a hard 400, not a degradation:
 *     gemini-2.5-pro REFUSES a budget of 0, while flash accepts it. Pro gets the smallest it takes.
 */

export function isVertexConfigured(): boolean {
  return Boolean(process.env.VERTEX_PROJECT_ID && process.env.VERTEX_KEY_FILE);
}

export interface VertexOptions {
  temperature?: number;
  maxOutputTokens?: number;
  /** Ask for `application/json` so a structured answer does not arrive wrapped in prose. */
  json?: boolean;
}

/** Returns the model's text, or null when it is not configured or produced nothing. */
export async function generate(
  prompt: string,
  { temperature = 0.4, maxOutputTokens = 800, json = false }: VertexOptions = {},
): Promise<string | null> {
  if (!isVertexConfigured()) return null;

  // VERTEX_KEY_FILE explicitly, NOT GOOGLE_APPLICATION_CREDENTIALS — that variable is picked up
  // ambiently and can authenticate as a different identity, producing a 403 that looks like a
  // missing IAM role.
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    keyFile: process.env.VERTEX_KEY_FILE!,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const authed = await auth.getClient();

  const project = process.env.VERTEX_PROJECT_ID!;
  const location = process.env.VERTEX_LOCATION ?? "global";
  const modelId = process.env.VERTEX_MODEL ?? "gemini-2.5-pro";
  const host =
    location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;

  const res = await authed.request<{
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  }>({
    url: `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${modelId}:generateContent`,
    method: "POST",
    data: {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
        thinkingConfig: { thinkingBudget: modelId.includes("pro") ? 128 : 0 },
      },
    },
  });

  const text =
    res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  return text || null;
}

/** `generate` plus a tolerant JSON parse. Returns null rather than throwing on anything unusable. */
export async function generateJson<T = unknown>(
  prompt: string,
  options?: VertexOptions,
): Promise<T | null> {
  const text = await generate(prompt, { ...options, json: true });
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    // Models sometimes fence JSON even when asked not to. One salvage attempt, then give up —
    // a caller that gets null asks the user again, which is always safe.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
