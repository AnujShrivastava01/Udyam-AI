import { NextRequest, NextResponse } from "next/server";

import { isConfigured, normaliseRecipient, sendText } from "@/lib/whatsapp/client";
import { handleMessage } from "@/lib/whatsapp/conversation";

/**
 * Whapi webhook.
 *
 * Configure the callback URL in the Whapi panel as:
 *   https://<your-tunnel>/api/whatsapp/webhook
 * and add a custom header:
 *   x-webhook-secret: <WHATSAPP_WEBHOOK_SECRET>
 *
 * The secret is checked on every callback. Without it this endpoint is an open relay that anyone
 * who guesses the path can drive messages through. It is deliberately NOT accepted from the query
 * string — see `authorised`.
 */

export const runtime = "nodejs";
// The reply is computed synchronously from the in-process kernel — no model call, no external
// fetch except the send itself — so this comfortably fits inside a serverless invocation.
export const maxDuration = 30;

interface WhapiMessage {
  from?: string;
  from_me?: boolean;
  chat_id?: string;
  type?: string;
  text?: { body?: string };
}

function authorised(req: NextRequest): boolean {
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expected) return false;

  // HEADER ONLY. The secret used to be accepted from ?secret= as well, which writes it in
  // cleartext into request logs, the Next dev trace, browser history and any proxy in between —
  // it had already leaked into .next/dev/trace on this machine. A query-string secret is a secret
  // you have to assume is public.
  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  // Whapi pings the URL to verify it is reachable.
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, configured: isConfigured() });
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  let payload: { messages?: WhapiMessage[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const incoming = (payload.messages ?? []).filter(
    (m) => !m.from_me && m.type === "text" && m.text?.body,
  );

  // Acknowledge fast. WhatsApp gateways retry aggressively on a slow 200.
  const results: { to: string; sent: number; failed: number }[] = [];

  for (const m of incoming) {
    const from = normaliseRecipient(m.from ?? m.chat_id ?? "");
    const body = m.text?.body ?? "";
    if (!from || !body) continue;

    const { messages } = handleMessage(from, body);

    let sent = 0;
    let failed = 0;
    for (const text of messages) {
      const res = await sendText({ to: from, body: text });
      if (res.ok) sent++;
      else {
        failed++;
        // Log the failure reason but never the token.
        console.error("[whatsapp] send failed:", res.error);
      }
    }
    results.push({ to: from, sent, failed });
  }

  return NextResponse.json({ ok: true, handled: results.length, results });
}
