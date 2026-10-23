// List prices used by the cost estimators in lessons (USD, on-demand, without free tier or discounts).
// Check the AWS pricing pages before budgeting: prices change, and these leave out request charges.
export const PRICES_CHECKED = "2026-10";

export type PriceRegion = "ap-southeast-1" | "ap-northeast-1" | "us-east-1";

export const REGION_NAMES: Record<PriceRegion, { vi: string; en: string }> = {
  "ap-southeast-1": { vi: "Singapore", en: "Singapore" },
  "ap-northeast-1": { vi: "Tokyo", en: "Tokyo" },
  "us-east-1": { vi: "N. Virginia", en: "N. Virginia" },
};

/** NAT gateway: per hour for each gateway, and per GB processed. https://aws.amazon.com/vpc/pricing/ */
export const NAT: Record<PriceRegion, { hour: number; gb: number }> = {
  "ap-southeast-1": { hour: 0.059, gb: 0.059 },
  "ap-northeast-1": { hour: 0.062, gb: 0.062 },
  "us-east-1": { hour: 0.045, gb: 0.045 },
};

export const HOURS_PER_MONTH = 730;

export function natMonthly(region: PriceRegion, gateways: number, gb: number) {
  const p = NAT[region];
  return { hours: gateways * HOURS_PER_MONTH * p.hour, data: gb * p.gb, total: gateways * HOURS_PER_MONTH * p.hour + gb * p.gb };
}

/**
 * S3 storage classes in us-east-1: storage per GB-month, retrieval per GB, minimum storage days, and
 * whether objects must be restored before reading. https://aws.amazon.com/s3/pricing/
 */
export const S3_CLASSES = [
  { id: "standard", name: "S3 Standard", gbMonth: 0.023, retrieval: 0, minDays: 0, restore: false },
  { id: "standard-ia", name: "S3 Standard-IA", gbMonth: 0.0125, retrieval: 0.01, minDays: 30, restore: false },
  { id: "onezone-ia", name: "S3 One Zone-IA", gbMonth: 0.01, retrieval: 0.01, minDays: 30, restore: false },
  { id: "glacier-ir", name: "S3 Glacier Instant Retrieval", gbMonth: 0.004, retrieval: 0.03, minDays: 90, restore: false },
  { id: "glacier-fr", name: "S3 Glacier Flexible Retrieval", gbMonth: 0.0036, retrieval: 0.01, minDays: 90, restore: true },
  { id: "deep-archive", name: "S3 Glacier Deep Archive", gbMonth: 0.00099, retrieval: 0.02, minDays: 180, restore: true },
] as const;

/** Monthly storage plus retrieval of `readShare` (0–1) of the data each month. */
export function s3Monthly(c: (typeof S3_CLASSES)[number], gb: number, readShare: number) {
  const storage = gb * c.gbMonth;
  const retrieval = gb * readShare * c.retrieval;
  return { storage, retrieval, total: storage + retrieval };
}
