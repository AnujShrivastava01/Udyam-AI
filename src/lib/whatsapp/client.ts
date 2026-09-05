/**
 * WhatsApp gateway client.
 *
 * The interface here is deliberately gateway-agnostic. Today it speaks to Whapi.cloud, which
 * drives a real WhatsApp session and is quick to stand up for a demo. It is NOT the production
 * path: a government deployment needs Meta's Business Cloud API, because an unofficial gateway
 * can get the number banned and carries no delivery guarantee.
 *
 * Swapping is a matter of reimplementing `sendText` / `sendImage` against the Cloud API — nothing
 * above this file changes.
 */

export interface OutboundText {
  to: string;
  body: string;
}

export interface OutboundImage {
  to: string;
  /** Base64 data URI or a public URL. */
  media: string;
  caption?: string;
}

export interface GatewayResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function config() {
  const baseUrl = process.env.WHAPI_BASE_URL ?? "https://gate.whapi.cloud";
  const token = process.env.WHAPI_TOKEN;
  return { baseUrl, token };
}

/** True when the gateway is configured. Lets routes degrade politely instead of throwing. */
export function isConfigured(): boolean {
  return Boolean(process.env.WHAPI_TOKEN);
}

async function post(path: string, payload: unknown): Promise<GatewayResult> {
  const { baseUrl, token } = config();
  if (!token) return { ok: false, error: "WHAPI_TOKEN is not set" };

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      // Never echo the token back into a log line.
      return { ok: false, error: `${res.status} ${text.slice(0, 300)}` };
    }
    let id: string | undefined;
    try {
      const json = JSON.parse(text);
      id = json?.message?.id ?? json?.id;
    } catch {
      /* the gateway does not always return JSON */
    }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Normalise a WhatsApp identifier to the bare digits the gateway expects.
 * Accepts "919000000001", "+91 90000 00001", "919000000001@s.whatsapp.net".
 *
 * The examples used to be a real-looking number. It is not ours, we never verified it is unassigned,
 * and it sat in a public repo next to WhatsApp send code — the reserved 9000000001 pattern costs
 * nothing and cannot ring anybody.
 */
export function normaliseRecipient(raw: string): string {
  return raw.replace(/@.*$/, "").replace(/\D/g, "");
}

export async function sendText({ to, body }: OutboundText): Promise<GatewayResult> {
  return post("/messages/text", { to: normaliseRecipient(to), body });
}

export async function sendImage({ to, media, caption }: OutboundImage): Promise<GatewayResult> {
  return post("/messages/image", { to: normaliseRecipient(to), media, caption });
}

/**
 * WhatsApp renders a narrow column in a proportional font, so anything that relies on column
 * alignment falls apart. Send figures as labelled lines, never as an ASCII table.
 */
export function line(label: string, value: string): string {
  return `${label}: *${value}*`;
}

/** WhatsApp bold/italic are single asterisks/underscores — not Markdown. */
export const wa = {
  bold: (s: string) => `*${s}*`,
  italic: (s: string) => `_${s}_`,
  mono: (s: string) => `\`\`\`${s}\`\`\``,
  rule: "──────────────",
};
