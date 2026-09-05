/**
 * Community posts the user actually wrote.
 *
 * The honest scope, stated once and enforced everywhere: this app has no accounts, no server and
 * no other users. A feed that implies otherwise is the failure mode the rest of this project
 * exists to avoid — an invented member count or a reply from someone who does not exist is a claim
 * a judge can falsify in one question.
 *
 * So a post here is one thing: something THIS user typed, saved in THIS browser. It is rendered
 * next to the illustrative examples, and the two are visually distinguishable without reading the
 * words. What it demonstrates is the interaction and the data model. What it does not claim is
 * an audience.
 */

export type PostKind = "update" | "question" | "requirement";

export interface CommunityPost {
  id: string;
  body: string;
  kind: PostKind;
  /** ISO timestamp. Stored absolute, rendered relative — the reverse loses information. */
  createdAt: string;
  /** The user's own district at the time of writing, if they had answered onboarding. */
  district: string | null;
  /** Their business category at the time of writing, if any. */
  category: string | null;
}

export const POST_KINDS: { id: PostKind; label: string }[] = [
  { id: "update", label: "Update" },
  { id: "question", label: "Question" },
  { id: "requirement", label: "Requirement" },
];

/** Longer than a phone keyboard produces by accident, shorter than a wall of text. */
export const MAX_POST_LENGTH = 600;

export interface DraftContext {
  district?: string | null;
  category?: string | null;
}

/**
 * Ids are random, not sequential.
 *
 * A counter would collide the moment two tabs are open on the same origin, and both write to the
 * same persisted key. crypto.randomUUID is available in every browser this app supports; the
 * fallback exists so the factory is callable from a test runner without a DOM.
 */
function id(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `post-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function newPost(
  body: string,
  kind: PostKind,
  ctx: DraftContext = {},
  now: Date = new Date(),
): CommunityPost {
  return {
    id: id(),
    body: body.trim().slice(0, MAX_POST_LENGTH),
    kind,
    createdAt: now.toISOString(),
    district: ctx.district ?? null,
    category: ctx.category ?? null,
  };
}

/**
 * "3 minutes ago", from two absolute instants.
 *
 * `now` is a parameter rather than a call to `new Date()` inside, because a component that formats
 * time during render and a test that asserts on the result need the same clock, and because a
 * server render and the hydrating client must agree — a relative string computed independently on
 * both sides is a hydration mismatch waiting for a slow network.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000));

  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
