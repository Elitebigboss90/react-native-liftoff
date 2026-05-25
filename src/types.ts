export type Checkpoint = { name: string; timestamp: number };
export type Measurement = {
  name: string;
  from: string;
  to: string;
  durationMs: number;
};
export type Report = { checkpoints: Checkpoint[]; measurements: Measurement[] };
