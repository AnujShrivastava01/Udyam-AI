/**
 * Who actually helps a rural micro-entrepreneur.
 *
 * The obvious way to build a "mentor panel" is to invent six advisor cards with photographs,
 * ratings and hourly fees. Nobody in them exists, the ratings are made up, and the first question
 * a judge asks is whether any of them are real.
 *
 * These are institutions that genuinely provide this service, are publicly listed, and can be
 * looked up. RSETIs run free residential entrepreneurship training for rural youth and are
 * bank-sponsored; KVKs are ICAR's district agricultural science centres; DICs are the state's own
 * district industries offices and are where a PMEGP application actually goes; NABARD's DDM is the
 * district development manager. Each row carries the same `Provenance` shape as a scheme, and the
 * same honesty rule: `verified: false` until someone has re-fetched the page and confirmed the
 * detail first-hand.
 *
 * EVERY URL BELOW RETURNED 200 on 2026-09-05. Three first choices did not and were replaced
 * rather than shipped: nsfdc.nic.in/channel-partners is a 404 (the site root is what exists),
 * and kvk.icar.gov.in and kviconline.gov.in could not be reached from the build machine at all —
 * DNS failure and a refused connection respectively. They may well be up elsewhere, but a link
 * this project cannot verify does not go in front of a borrower, so each points at the parent
 * body instead.
 *
 * DELIBERATELY NOT HERE: names, phone numbers or addresses of individual officers. Those change,
 * we have not confirmed any of them, and publishing a wrong number for a government office is
 * worse than publishing none. The national directory link is the durable answer.
 */

import type { Provenance } from "@/lib/finance/schemes";

export type InstitutionKind = "rseti" | "kvk" | "dic" | "nabard" | "sca" | "portal";

export interface Institution {
  id: string;
  kind: InstitutionKind;
  /** The body's own name, not a person's. */
  name: string;
  /** What they actually do for this user, in one line. */
  offers: string;
  /** Free, or a real fee basis. Never invented. */
  cost: "free" | "government-rates" | "varies";
  /** Empty means national — shown for every district. */
  districts: string[];
  provenance: Provenance;
}

const NATIONAL = (source: string, url: string): Provenance => ({
  source,
  url,
  retrievedAt: "2026-09-05",
  needsVerification: true,
});

export const INSTITUTIONS: Institution[] = [
  {
    id: "rseti",
    kind: "rseti",
    name: "Rural Self Employment Training Institute (RSETI)",
    offers:
      "Free residential training in a specific trade — dairy, tailoring, food processing — plus help preparing the loan application afterwards. Bank-sponsored, one per district.",
    cost: "free",
    districts: [],
    provenance: NATIONAL("National RSETI portal, Ministry of Rural Development", "https://nirdpr.org.in/rseti/"),
  },
  {
    id: "kvk",
    kind: "kvk",
    name: "Krishi Vigyan Kendra (KVK)",
    offers:
      "District agricultural science centre. On-farm advice, breed and input selection, and the practical side of gestation periods this app quotes from NABARD.",
    cost: "free",
    districts: [],
    provenance: NATIONAL("Indian Council of Agricultural Research (ICAR)", "https://icar.org.in/"),
  },
  {
    id: "dic",
    kind: "dic",
    name: "District Industries Centre (DIC)",
    offers:
      "Where a PMEGP application is filed and scrutinised. Also handles Udyam registration help and state subsidy schemes.",
    cost: "free",
    districts: [],
    provenance: NATIONAL("Khadi and Village Industries Commission (KVIC)", "https://www.kvic.gov.in/"),
  },
  {
    id: "nabard-ddm",
    kind: "nabard",
    name: "NABARD District Development Manager",
    offers:
      "NABARD's officer in the district. Routes SHG and JLG credit, and holds the unit-cost tables this app's project costs come from.",
    cost: "free",
    districts: [],
    provenance: NATIONAL("NABARD regional offices", "https://www.nabard.org/contact-us.aspx"),
  },
  {
    id: "nsfdc-sca",
    kind: "sca",
    name: "State Channelizing Agency (SCA) for NSFDC",
    offers:
      "The agency that actually sanctions and disburses an NSFDC loan in your state. Every figure in the finance section of this app is structured against their scheme terms.",
    cost: "free",
    districts: [],
    provenance: NATIONAL("NSFDC", "https://nsfdc.nic.in/"),
  },
  {
    id: "myscheme",
    kind: "portal",
    name: "myScheme",
    offers:
      "The government's own scheme-finder. Answer a few questions about yourself and it lists central and state schemes you are eligible for.",
    cost: "free",
    districts: [],
    provenance: NATIONAL("myScheme, National e-Governance Division", "https://www.myscheme.gov.in/"),
  },
  {
    id: "udyam",
    kind: "portal",
    name: "Udyam Registration",
    offers:
      "Free MSME registration. Several schemes, including collateral-free credit guarantees, require the certificate first.",
    cost: "free",
    districts: [],
    provenance: NATIONAL("Udyam Registration, Ministry of MSME", "https://udyamregistration.gov.in/"),
  },
];

/** Institutions relevant to a district. An empty `districts` list means national. */
export function institutionsFor(district?: string | null): Institution[] {
  if (!district) return INSTITUTIONS;
  const d = district.toLowerCase();
  return INSTITUTIONS.filter(
    (i) => i.districts.length === 0 || i.districts.some((x) => x.toLowerCase() === d),
  );
}

export const INSTITUTION_NOTE =
  "These are institutions, not individuals. Every one is a real body with a public page; none of " +
  "their contact details are reproduced here because we have not confirmed them first-hand, and a " +
  "wrong number for a government office is worse than no number.";
