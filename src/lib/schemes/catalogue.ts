/**
 * The schemes a rural micro-entrepreneur can actually reach, and what each one asks of them.
 *
 * ── HOW ELIGIBILITY IS EXPRESSED ────────────────────────────────────────────────────────────
 * Each criterion is a function returning `pass`, `fail` or `unknown`. `unknown` is a first-class
 * answer: if the applicant has not told us their social category, the honest output is "we cannot
 * say yet, and here is the question that decides it" — not a guess in either direction.
 *
 * The engine never says "you are eligible". It says the applicant MEETS THE PUBLISHED CRITERIA WE
 * HOLD, which is a different and weaker claim, and the only one a rules table is entitled to make.
 * Eligibility is determined by the administering agency on a filed application. `narrate.ts`
 * rejects the word "eligible" in model output for exactly this reason; a deterministic table gets
 * no more licence than the model does.
 *
 * ── ON ACCURACY ─────────────────────────────────────────────────────────────────────────────
 * Criteria and amounts here were assembled from public scheme pages and are marked
 * `needsVerification`. Ceilings move — income limits and MUDRA's tiers have both been revised in
 * recent years — so where a figure could not be confirmed it is DESCRIBED rather than asserted.
 * A wrong income ceiling shown to a borrower is worse than no ceiling at all.
 *
 * Every URL below returned HTTP 200 on 2026-09-05. Four first choices did not resolve from this
 * machine (nskfdc.nic.in, nhfdc.nic.in, the PMEGP portal, aajeevika.gov.in) and point at the
 * administering ministry or corporation instead rather than shipping a dead link.
 */

import type { Provenance } from "@/lib/finance/schemes";

export type SocialCategory =
  | "sc"
  | "st"
  | "obc"
  | "general"
  | "minority"
  | "pwd"
  | "safai-karamchari";

export interface ApplicantProfile {
  socialCategory?: SocialCategory[];
  gender?: "female" | "male" | "other";
  age?: number;
  annualFamilyIncome?: number;
  isStreetVendor?: boolean;
  isSHGMember?: boolean;
  educationClass8Plus?: boolean;
  enterpriseStage?: "new" | "existing";
  /** From the activity the user picked, where they have picked one. */
  activityClass?: string;
}

export type CriterionResult = "pass" | "fail" | "unknown";

export interface Criterion {
  id: string;
  /** Stated as the requirement, so a failure reads as the reason. */
  label: string;
  test: (a: ApplicantProfile) => CriterionResult;
}

export interface SchemeEntry {
  id: string;
  name: string;
  administrator: string;
  /** What the money is for, in one line. */
  funds: string;
  /** Amounts, only where confirmed. Empty when the figure could not be verified. */
  amountNote?: string;
  /** Subsidy, guarantee or interest benefit, where it exists. */
  benefitNote?: string;
  url: string;
  provenance: Provenance;
  criteria: Criterion[];
}

const src = (source: string, url: string): Provenance => ({
  source,
  url,
  retrievedAt: "2026-09-05",
  needsVerification: true,
});

// ── reusable criteria ────────────────────────────────────────────────────────────────────────

const category = (wanted: SocialCategory[], label: string): Criterion => ({
  id: `category-${wanted.join("-")}`,
  label,
  test: (a) => {
    if (!a.socialCategory || a.socialCategory.length === 0) return "unknown";
    return a.socialCategory.some((c) => wanted.includes(c)) ? "pass" : "fail";
  },
});

const incomeUnder = (ceiling: number, label: string): Criterion => ({
  id: `income-${ceiling}`,
  label,
  test: (a) =>
    a.annualFamilyIncome == null ? "unknown" : a.annualFamilyIncome <= ceiling ? "pass" : "fail",
});

const minimumAge = (years: number): Criterion => ({
  id: `age-${years}`,
  label: `At least ${years} years old`,
  test: (a) => (a.age == null ? "unknown" : a.age >= years ? "pass" : "fail"),
});

const NEW_UNIT: Criterion = {
  id: "new-unit",
  label: "For a new enterprise — existing units are not covered",
  test: (a) => (a.enterpriseStage == null ? "unknown" : a.enterpriseStage === "new" ? "pass" : "fail"),
};

const NON_FARM: Criterion = {
  id: "non-farm",
  label: "Non-farm income-generating activity",
  test: (a) => (a.activityClass == null ? "unknown" : a.activityClass === "agri" ? "fail" : "pass"),
};

// ── the catalogue ────────────────────────────────────────────────────────────────────────────

export const SCHEMES_CATALOGUE: SchemeEntry[] = [
  {
    id: "nsfdc",
    name: "NSFDC — Micro Finance and Term Loan",
    administrator: "National Scheduled Castes Finance & Development Corporation, MoSJE",
    funds: "Self-employment for Scheduled Caste families below the income ceiling. The scheme this app structures against in detail.",
    amountNote: "Micro Finance up to ₹1.25 lakh; Term Loan for larger projects.",
    benefitNote: "Concessional interest, routed through a State Channelizing Agency.",
    url: "https://nsfdc.nic.in/",
    provenance: src("NSFDC", "https://nsfdc.nic.in/"),
    criteria: [
      category(["sc"], "Scheduled Caste applicant"),
      incomeUnder(300_000, "Annual family income within the scheme ceiling (about ₹3 lakh — confirm the current figure)"),
    ],
  },
  {
    id: "nbcfdc",
    name: "NBCFDC — term and micro credit",
    administrator: "National Backward Classes Finance & Development Corporation, MoSJE",
    funds: "The same shape of self-employment credit, for Other Backward Classes.",
    url: "https://nbcfdc.gov.in/",
    provenance: src("NBCFDC", "https://nbcfdc.gov.in/"),
    criteria: [
      category(["obc"], "Other Backward Class applicant"),
      incomeUnder(300_000, "Annual family income within the scheme ceiling (confirm the current figure)"),
    ],
  },
  {
    id: "nskfdc",
    name: "NSKFDC — credit for safai karamcharis",
    administrator: "National Safai Karamcharis Finance & Development Corporation, MoSJE",
    funds: "Self-employment credit for safai karamcharis, manual scavengers and their dependants.",
    url: "https://socialjustice.gov.in/",
    provenance: src("Ministry of Social Justice and Empowerment", "https://socialjustice.gov.in/"),
    criteria: [category(["safai-karamchari"], "Safai karamchari, or a dependant")],
  },
  {
    id: "nhfdc",
    name: "NHFDC — credit for persons with disability",
    administrator: "National Handicapped Finance & Development Corporation, DEPwD",
    funds: "Self-employment credit for persons with benchmark disability.",
    url: "https://depwd.gov.in/",
    provenance: src("Department of Empowerment of Persons with Disabilities", "https://depwd.gov.in/"),
    criteria: [category(["pwd"], "Person with a benchmark disability (40% or more)")],
  },
  {
    id: "nmdfc",
    name: "NMDFC — credit for minorities",
    administrator: "National Minorities Development & Finance Corporation",
    funds: "Term loan and micro credit for notified minority communities.",
    url: "https://nmdfc.org/",
    provenance: src("NMDFC", "https://nmdfc.org/"),
    criteria: [
      category(["minority"], "Member of a notified minority community"),
      incomeUnder(800_000, "Annual family income within the scheme ceiling (confirm the current figure)"),
    ],
  },
  {
    id: "pmegp",
    name: "PMEGP — Prime Minister's Employment Generation Programme",
    administrator: "KVIC, Ministry of MSME",
    funds: "New micro-enterprises, manufacturing or service. The subsidy rail in this app's capital stack.",
    benefitNote: "Margin-money subsidy, higher for rural areas and for SC/ST/women/OBC/minority/PwD applicants. The subsidy is a grant, not a loan.",
    url: "https://www.kvic.gov.in/",
    provenance: src("Khadi and Village Industries Commission", "https://www.kvic.gov.in/"),
    criteria: [
      minimumAge(18),
      NEW_UNIT,
      {
        id: "pmegp-education",
        label: "Class 8 pass, required only above the higher project-cost thresholds",
        test: (a) => (a.educationClass8Plus == null ? "unknown" : "pass"),
      },
    ],
  },
  {
    id: "mudra",
    name: "PM MUDRA Yojana — Shishu, Kishore, Tarun",
    administrator: "MUDRA / member lending institutions",
    funds: "Non-farm income-generating micro enterprises. Collateral-free by design.",
    amountNote: "Shishu up to ₹50,000; Kishore ₹50,000 to ₹5 lakh; Tarun ₹5 lakh to ₹10 lakh.",
    url: "https://www.mudra.org.in/",
    provenance: src("MUDRA", "https://www.mudra.org.in/"),
    criteria: [NON_FARM],
  },
  {
    id: "standup",
    name: "Stand-Up India",
    administrator: "SIDBI / scheduled commercial banks",
    funds: "A greenfield enterprise — manufacturing, services, trading or allied agriculture.",
    amountNote: "₹10 lakh to ₹1 crore.",
    url: "https://www.standupmitra.in/",
    provenance: src("Stand-Up Mitra", "https://www.standupmitra.in/"),
    criteria: [
      {
        id: "standup-who",
        label: "Scheduled Caste, Scheduled Tribe, or a woman entrepreneur",
        test: (a) => {
          const cats = a.socialCategory;
          const woman = a.gender === "female";
          if (cats == null && a.gender == null) return "unknown";
          if (woman) return "pass";
          if (cats == null) return "unknown";
          return cats.some((c) => c === "sc" || c === "st") ? "pass" : "fail";
        },
      },
      minimumAge(18),
      NEW_UNIT,
    ],
  },
  {
    id: "svanidhi",
    name: "PM SVANidhi",
    administrator: "Ministry of Housing and Urban Affairs",
    funds: "Working capital for street vendors.",
    amountNote: "₹10,000 in the first tranche, rising on timely repayment.",
    url: "https://pmsvanidhi.mohua.gov.in/",
    provenance: src("PM SVANidhi", "https://pmsvanidhi.mohua.gov.in/"),
    criteria: [
      {
        id: "svanidhi-vendor",
        label: "Street vendor",
        test: (a) => (a.isStreetVendor == null ? "unknown" : a.isStreetVendor ? "pass" : "fail"),
      },
    ],
  },
  {
    id: "pmfme",
    name: "PMFME — micro food processing enterprises",
    administrator: "Ministry of Food Processing Industries",
    funds: "Upgrading or setting up a micro food-processing unit.",
    benefitNote: "Credit-linked capital subsidy.",
    url: "https://pmfme.mofpi.gov.in/",
    provenance: src("PMFME", "https://pmfme.mofpi.gov.in/"),
    criteria: [
      {
        id: "pmfme-food",
        label: "A food-processing activity",
        test: (a) =>
          a.activityClass == null
            ? "unknown"
            : a.activityClass === "manufacturing" || a.activityClass === "agri"
              ? "pass"
              : "fail",
      },
    ],
  },
  {
    id: "aif",
    name: "Agriculture Infrastructure Fund",
    administrator: "Department of Agriculture and Farmers Welfare",
    funds: "Post-harvest infrastructure — storage, cold chain, primary processing.",
    benefitNote: "Interest subvention and credit-guarantee support.",
    url: "https://agriinfra.dac.gov.in/",
    provenance: src("Agri Infrastructure Fund", "https://agriinfra.dac.gov.in/"),
    criteria: [
      {
        id: "aif-agri",
        label: "Post-harvest or agriculture-allied infrastructure",
        test: (a) =>
          a.activityClass == null
            ? "unknown"
            : ["agri", "dairy", "livestock", "poultry"].includes(a.activityClass)
              ? "pass"
              : "fail",
      },
    ],
  },
  {
    id: "nrlm",
    name: "DAY-NRLM — SHG credit",
    administrator: "Ministry of Rural Development",
    funds: "Bank linkage for self-help group members, at concessional rates.",
    url: "https://rural.gov.in/",
    provenance: src("Ministry of Rural Development", "https://rural.gov.in/"),
    criteria: [
      {
        id: "nrlm-shg",
        label: "Member of a self-help group",
        test: (a) => (a.isSHGMember == null ? "unknown" : a.isSHGMember ? "pass" : "fail"),
      },
    ],
  },
  {
    id: "cgtmse",
    name: "CGTMSE — credit guarantee",
    administrator: "CGTMSE, Ministry of MSME and SIDBI",
    funds: "Not a loan. A guarantee that lets a lender advance without collateral.",
    url: "https://www.cgtmse.in/",
    provenance: src("CGTMSE", "https://www.cgtmse.in/"),
    criteria: [
      {
        id: "cgtmse-msme",
        label: "An MSME borrower — the lender applies for the cover, not you",
        test: () => "pass",
      },
    ],
  },
  {
    id: "udyam",
    name: "Udyam Registration",
    administrator: "Ministry of MSME",
    funds: "Free MSME registration. Several schemes above require the certificate before they will look at an application.",
    url: "https://udyamregistration.gov.in/",
    provenance: src("Udyam Registration", "https://udyamregistration.gov.in/"),
    criteria: [{ id: "udyam-anyone", label: "Any micro, small or medium enterprise", test: () => "pass" }],
  },
];

export const CATALOGUE_NOTE =
  "These are the published criteria we hold, not a decision. Eligibility is determined by the " +
  "administering agency on a filed application, and scheme ceilings change — every entry here is " +
  "marked for first-hand re-verification before it is quoted to a borrower.";
