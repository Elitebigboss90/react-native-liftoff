import NativeLiftoff from './NativeLiftoff';
import type { Checkpoint, Measurement, Report } from './types';

const measurements: Measurement[] = [];

export function mark(name: string): void {
  NativeLiftoff.mark(name);
}

export function measure(
  name: string,
  fromMark: string,
  toMark: string
): Measurement {
  const cps: Checkpoint[] = NativeLiftoff.getCheckpoints();
  const from = cps.find((c) => c.name === fromMark);
  const to = cps.find((c) => c.name === toMark);
  if (!from) throw new Error(`[liftoff] Mark '${fromMark}' not found`);
  if (!to) throw new Error(`[liftoff] Mark '${toMark}' not found`);
  const m: Measurement = {
    name,
    from: fromMark,
    to: toMark,
    durationMs: to.timestamp - from.timestamp,
  };
  measurements.push(m);
  return m;
}

export function getReport(): Report {
  return {
    checkpoints: NativeLiftoff.getCheckpoints(),
    measurements: [...measurements],
  };
}

export function clear(): void {
  NativeLiftoff.clear();
  measurements.length = 0;
}
