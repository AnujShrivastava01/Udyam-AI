export interface FeasibilityReport {
  feasibilityScore: number;
  summary: string;
  marketReach: { radiusKm: number; estimatedConsumers: number; channels: string[] };
  opportunities: { title: string; confidence: number }[];
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  threats: { label: string; severity: 'low' | 'medium' | 'high' }[];
  competitors: { name: string; lat: number; lng: number; distanceKm: number }[];
  saturationScore: number;
  pricing: { min: number; max: number; recommended: number };
}

export interface SchemeResult {
  projectCost: number;
  maxLoanAmount: number;
  scheme: 'micro-finance' | 'term-loan';
  interestRate: number;
  tenureYears: number;
  moratoriumMonths: number;
  emiSchedule: { quarter: number; principal: number; interest: number; balance: number }[];
}

export const mockFeasibilityReport: FeasibilityReport = {
  feasibilityScore: 82,
  summary: "High potential for organic dairy in this block. Low competition and growing semi-urban demand.",
  marketReach: {
    radiusKm: 15,
    estimatedConsumers: 12500,
    channels: ["Local Mandi", "Direct to Consumer (Delivery)", "Nearby Sweet Shops"],
  },
  opportunities: [
    { title: "A2 Milk Premium Segment", confidence: 85 },
    { title: "Paneer & Value-added Dairy", confidence: 78 },
  ],
  swot: {
    strengths: ["Low operational cost", "Local fodder availability"],
    weaknesses: ["Cold chain logistics", "Veterinary access"],
    opportunities: ["Government subsidies for cattle", "Urban migration driving demand"],
    threats: ["Summer yield drop", "Large corporate dairies entering area"],
  },
  threats: [
    { label: "Summer Water Scarcity", severity: "high" },
    { label: "Disease Outbreak (FMD)", severity: "medium" },
    { label: "Price Volatility in Feed", severity: "medium" },
  ],
  competitors: [
    { name: "Yadav Dairy Farm", lat: 25.4358, lng: 78.5678, distanceKm: 4.2 },
    { name: "Mishra Milk Point", lat: 25.4501, lng: 78.5401, distanceKm: 7.1 },
  ],
  saturationScore: 35, // 0-100, lower means less saturated
  pricing: {
    min: 45,
    max: 65,
    recommended: 55, // per litre
  },
};

export function calculateSchemeEligibility(marginCapital: number): SchemeResult {
  const projectCost = marginCapital / 0.10;
  const maxLoanAmount = projectCost * 0.90;
  
  let scheme: 'micro-finance' | 'term-loan';
  let interestRate: number;
  let tenureYears: number;
  let moratoriumMonths: number;

  if (projectCost <= 140000) {
    scheme = 'micro-finance';
    interestRate = 6.5;
    tenureYears = 3;
    moratoriumMonths = 3;
  } else {
    scheme = 'term-loan';
    interestRate = 8.0;
    tenureYears = 7;
    moratoriumMonths = 6;
  }

  // Generate a mock EMI schedule (quarterly)
  const emiSchedule = [];
  const quarters = tenureYears * 4;
  const moratoriumQuarters = Math.floor(moratoriumMonths / 3);
  let balance = maxLoanAmount;
  
  // simple straight-line mock calculation for visual purposes
  const principalPerQuarter = maxLoanAmount / (quarters - moratoriumQuarters);
  
  for (let q = 1; q <= quarters; q++) {
    let interest = (balance * (interestRate / 100)) / 4;
    let principal = q <= moratoriumQuarters ? 0 : principalPerQuarter;
    
    if (q <= moratoriumQuarters) {
      // Interest accrues but no principal payment
      balance += interest;
    } else {
      balance -= principal;
    }
    
    emiSchedule.push({
      quarter: q,
      principal: Math.round(principal),
      interest: Math.round(interest),
      balance: Math.max(0, Math.round(balance)),
    });
  }

  return {
    projectCost,
    maxLoanAmount,
    scheme,
    interestRate,
    tenureYears,
    moratoriumMonths,
    emiSchedule,
  };
}
