import { describe, expect, it } from "vitest";

import { contactLinks, counterpartyHeading, directionsUrl, phrasesFor, queriesFor } from "./counterparties";

describe("trade phrases", () => {
  it("uses the trade's own word rather than a generic one", () => {
    // `${product} buyer` returns nothing useful in a rural market. The trade has a name, and the
    // name is what is on the shopfront Google indexed.
    expect(phrasesFor("A2 cow milk", "selling")).toContain("milk wholesaler");
    expect(phrasesFor("desi murgi", "selling")).toContain("chicken shop");
    expect(phrasesFor("wheat", "selling")).toContain("grain mandi");
  });

  it("matches the longest key, so a compound product reaches the right row", () => {
    // "cow milk" must not stop at some shorter accidental substring.
    expect(phrasesFor("cow milk", "selling")).toContain("milk wholesaler");
  });

  it("matches Hindi words as readily as English ones", () => {
    expect(phrasesFor("doodh", "selling")).toContain("milk wholesaler");
    expect(phrasesFor("bakri", "selling")).toContain("mutton shop");
    expect(phrasesFor("sabzi", "selling")).toContain("vegetable mandi");
  });

  it("looks the other way round when the user is buying", () => {
    // Selling milk needs buyers; buying milk needs producers. Same product, opposite search.
    expect(phrasesFor("milk", "selling")).toContain("milk wholesaler");
    expect(phrasesFor("milk", "buying")).toContain("dairy farm");
    expect(phrasesFor("milk", "buying")).not.toContain("sweet shop");
  });

  it("falls back to a generic phrase rather than returning nothing", () => {
    const p = phrasesFor("brass idols", "selling");
    expect(p.length).toBeGreaterThan(0);
    expect(p[0]).toContain("brass idols");
  });

  it("is case-insensitive about the product", () => {
    expect(phrasesFor("MILK", "selling")).toEqual(phrasesFor("milk", "selling"));
  });
});

describe("queries", () => {
  it("caps at three, because each one is a billed call", () => {
    expect(queriesFor({ product: "milk", side: "selling" })).toHaveLength(3);
  });

  it("labels each search so a bad hit is legible as a bad hit", () => {
    const q = queriesFor({ product: "milk", side: "selling" });
    expect(q[0].label).toContain("buyers");
    expect(queriesFor({ product: "milk", side: "buying" })[0].label).toContain("suppliers");
  });
});

describe("headings", () => {
  it("asks the question from the user's side of the trade", () => {
    expect(counterpartyHeading("selling")).toBe("Who might buy this");
    expect(counterpartyHeading("buying")).toBe("Who might supply this");
  });
});

describe("contact links", () => {
  it("adds the Indian country code to a bare ten-digit number", () => {
    // wa.me silently fails on a number without a country code — no error, just a dead link.
    const l = contactLinks("78287 75339")!;
    expect(l.whatsapp).toBe("https://wa.me/917828775339");
    expect(l.tel).toBe("tel:+917828775339");
  });

  it("keeps a number that already carries one", () => {
    expect(contactLinks("+91 78287 75339")!.whatsapp).toBe("https://wa.me/917828775339");
  });

  it("strips the formatting Google returns", () => {
    expect(contactLinks("011 2345 6789")!.tel).toBe("tel:+911123456789");
  });

  it("returns null rather than a broken link when there is no usable number", () => {
    expect(contactLinks(null)).toBeNull();
    expect(contactLinks("")).toBeNull();
    expect(contactLinks("12345")).toBeNull();
  });
});

describe("directions", () => {
  it("routes by coordinates, so it works without a place id", () => {
    expect(directionsUrl(26.0966, 78.0913)).toContain("destination=26.0966,78.0913");
  });
});
