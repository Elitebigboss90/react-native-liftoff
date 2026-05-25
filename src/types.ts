export type Checkpoint = {
  name: string;
  timestamp: number; // monotonic ms — source of truth for diffs
  wallTime: number; // unix epoch ms, derived from anchor
  wallTimeIso: string; // ISO 8601 string
};
export type Measurement = {
  name: string;
  from: string;
  to: string;
  durationMs: number;
};
export type Report = { checkpoints: Checkpoint[]; measurements: Measurement[] };
