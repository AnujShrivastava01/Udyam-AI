/**
 * Should smooth scrolling keep its hands off this element?
 *
 * Lenis calls `preventDefault` on the wheel and drives the window itself. That is fine over the
 * page and wrong over anything that scrolls on its own — the repayment schedule, a select
 * dropdown, the voice transcript — where the wheel has to reach the panel under the cursor
 * instead of moving the page behind it.
 *
 * Extracted from the component so it can be tested. The rule is behavioural rather than a list of
 * selectors: an element is left alone when it genuinely has overflow to scroll, so a panel added
 * next month is covered without anybody remembering to tag it. `data-lenis-prevent` stays
 * supported as a deliberate override.
 */

export interface ScrollableNode {
  hasAttribute(name: string): boolean;
  scrollHeight: number;
  clientHeight: number;
}

/** The overflow values that produce a scrollable box. `hidden` and `visible` do not. */
const SCROLLABLE = new Set(["auto", "scroll", "overlay"]);

export function shouldPreventSmoothScroll(
  node: ScrollableNode,
  overflowY: string,
): boolean {
  if (node.hasAttribute("data-lenis-prevent")) return true;
  // The +1 absorbs sub-pixel rounding: a box whose content is a fraction of a pixel taller than
  // itself is not scrollable in any way a person can use, and treating it as such would hand the
  // wheel to an element that cannot move.
  return SCROLLABLE.has(overflowY) && node.scrollHeight > node.clientHeight + 1;
}
