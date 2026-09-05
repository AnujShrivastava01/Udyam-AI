import { describe, expect, it } from "vitest";

import { MAX_POST_LENGTH, newPost, relativeTime } from "./posts";

describe("newPost", () => {
  const now = new Date("2026-09-05T10:00:00.000Z");

  it("trims and stamps", () => {
    const p = newPost("  bakri palan shuru kiya  ", "update", {}, now);
    expect(p.body).toBe("bakri palan shuru kiya");
    expect(p.createdAt).toBe("2026-09-05T10:00:00.000Z");
  });

  it("caps the body rather than accepting a wall of text", () => {
    const p = newPost("x".repeat(MAX_POST_LENGTH + 500), "update", {}, now);
    expect(p.body).toHaveLength(MAX_POST_LENGTH);
  });

  it("captures the district and category at the time of writing", () => {
    // Snapshotted, not looked up on render: a post written while in Gwalior does not silently
    // relabel itself when the user changes district.
    const p = newPost("hi", "question", { district: "Gwalior", category: "dairy" }, now);
    expect(p.district).toBe("Gwalior");
    expect(p.category).toBe("dairy");
  });

  it("records null rather than a placeholder when onboarding is unfinished", () => {
    const p = newPost("hi", "question", {}, now);
    expect(p.district).toBeNull();
    expect(p.category).toBeNull();
  });

  it("gives two posts made in the same millisecond different ids", () => {
    expect(newPost("a", "update", {}, now).id).not.toBe(newPost("a", "update", {}, now).id);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-09-05T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("reads the recent past the way a person would", () => {
    expect(relativeTime(ago(5_000), now)).toBe("just now");
    expect(relativeTime(ago(5 * 60_000), now)).toBe("5 minutes ago");
    expect(relativeTime(ago(60 * 60_000), now)).toBe("1 hour ago");
    expect(relativeTime(ago(3 * 24 * 3600_000), now)).toBe("3 days ago");
  });

  it("singularises", () => {
    expect(relativeTime(ago(60_000), now)).toBe("1 minute ago");
    expect(relativeTime(ago(24 * 3600_000), now)).toBe("1 day ago");
  });

  it("does not produce a negative duration from a clock skew", () => {
    // A post stamped slightly in the future — two tabs, or a system clock adjustment — must not
    // render "-3 minutes ago".
    expect(relativeTime(new Date(now.getTime() + 60_000).toISOString(), now)).toBe("just now");
  });

  it("returns an empty string for an unparseable stamp instead of NaN", () => {
    expect(relativeTime("rubbish", now)).toBe("");
  });
});
