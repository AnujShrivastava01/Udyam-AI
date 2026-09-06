import { describe, expect, it } from "vitest";

import { shouldPreventSmoothScroll } from "./prevent";

const node = (over: { attr?: boolean; scrollHeight?: number; clientHeight?: number } = {}) => ({
  hasAttribute: () => over.attr ?? false,
  scrollHeight: over.scrollHeight ?? 100,
  clientHeight: over.clientHeight ?? 100,
});

describe("what smooth scrolling must not touch", () => {
  it("leaves a panel that genuinely scrolls alone", () => {
    // The repayment schedule: max-h-[28rem] with a long table inside it. Before this, a wheel over
    // the table scrolled the page behind it and the schedule never moved.
    expect(shouldPreventSmoothScroll(node({ scrollHeight: 900, clientHeight: 448 }), "auto")).toBe(
      true,
    );
    expect(shouldPreventSmoothScroll(node({ scrollHeight: 900, clientHeight: 448 }), "scroll")).toBe(
      true,
    );
  });

  it("takes the wheel over an element that only looks scrollable", () => {
    // overflow-y-auto on a box whose content fits is the common case across this app's cards. The
    // page should still scroll over those, or the whole layout becomes a set of dead zones.
    expect(shouldPreventSmoothScroll(node({ scrollHeight: 100, clientHeight: 100 }), "auto")).toBe(
      false,
    );
  });

  it("ignores a tall element that cannot scroll", () => {
    expect(
      shouldPreventSmoothScroll(node({ scrollHeight: 900, clientHeight: 448 }), "hidden"),
    ).toBe(false);
    expect(
      shouldPreventSmoothScroll(node({ scrollHeight: 900, clientHeight: 448 }), "visible"),
    ).toBe(false);
  });

  it("absorbs sub-pixel rounding rather than claiming a one-pixel scroller", () => {
    // A box a fraction of a pixel taller than itself cannot be scrolled by a person, and handing
    // it the wheel would freeze the page over it.
    expect(
      shouldPreventSmoothScroll(node({ scrollHeight: 100.6, clientHeight: 100 }), "auto"),
    ).toBe(false);
    expect(shouldPreventSmoothScroll(node({ scrollHeight: 102, clientHeight: 100 }), "auto")).toBe(
      true,
    );
  });

  it("honours an explicit opt-out whatever the geometry says", () => {
    expect(
      shouldPreventSmoothScroll(
        node({ attr: true, scrollHeight: 100, clientHeight: 100 }),
        "visible",
      ),
    ).toBe(true);
  });
});
