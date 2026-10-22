/** How central a lesson is to building on AWS: 3 core, 2 important, 1 supporting. */
export type Importance = 1 | 2 | 3;
export const IMPORTANCE_NAMES = { 3: "core", 2: "important", 1: "supporting" } as const;

/** Derived from how often the topic comes up in the source material; the count itself is never shown. */
export function importanceOf(questions: number): Importance {
  return questions >= 50 ? 3 : questions >= 25 ? 2 : 1;
}

export interface Concept {
  id: string;
  title: string;
  importance: Importance;
  /** Questions about this lesson across the six SAA-C03 practice tests. */
  questions: number;
  /** true when counted from {id}/list_qa.md, false when it is overview.md's keyword estimate. */
  exact: boolean;
}

/** What the browser gets: no counts from the source material. */
export interface RoadmapLayer {
  n: number;
  name: string;
  concepts: Pick<Concept, "id" | "title" | "importance">[];
}

export interface Layer {
  n: number;
  name: string;
  concepts: Concept[];
}

// Learning order for SAA-C03. Ids are the study folders in solution-architect-aws/;
// titles and question counts are read from overview.md and list_qa.md at build time
// (see exam.ts), so the roadmap always matches the exam material.
export const LAYERS: { n: number; name: string; ids: string[] }[] = [
  { n: 0, name: "Nền tảng", ids: ["global-infra"] },
  { n: 1, name: "Networking", ids: ["vpc", "route53", "cloudfront"] },
  { n: 2, name: "Security & Identity", ids: ["iam", "kms", "security", "cognito"] },
  { n: 3, name: "Compute", ids: ["ec2", "elb", "asg", "containers", "lambda"] },
  { n: 4, name: "Storage", ids: ["s3", "storage", "storage-migration"] },
  { n: 5, name: "Database", ids: ["rds", "dynamodb", "analytics"] },
  { n: 6, name: "Integration, Monitoring & vận hành", ids: ["messaging", "kinesis", "monitoring", "iac", "backup-dr", "others"] },
];

/** Lessons that are not a row in overview.md. */
export const EXTRA_TITLES: Record<string, string> = {
  "global-infra": "Global Infrastructure: Region, AZ, Edge",
};

export function findConcept(layers: Layer[], id: string) {
  for (const layer of layers) {
    const concept = layer.concepts.find((c) => c.id === id);
    if (concept) return { ...concept, layer };
  }
  return undefined;
}
