import NativeLiftoff from './NativeLiftoff';
import type { Checkpoint, Measurement, Report } from './types';

type RawCheckpoint = { name: string; timestamp: number };

const measurements: Measurement[] = [];
let anchor: { monotonicMs: number; wallMs: number } | null = null;

function getAnchor(): { monotonicMs: number; wallMs: number } {
  if (!anchor) anchor = NativeLiftoff.getAnchor();
  return anchor;
}

function toWallMs(monotonicMs: number): number {
  const a = getAnchor();
  return a.wallMs + (monotonicMs - a.monotonicMs);
}

function decorateCheckpoint(raw: RawCheckpoint): Checkpoint {
  const wallTime = toWallMs(raw.timestamp);
  return { ...raw, wallTime, wallTimeIso: new Date(wallTime).toISOString() };
}

export function mark(name: string): number {
  return NativeLiftoff.mark(name);
}

export function measure(
  name: string,
  fromMark: string,
  toMark: string
): Measurement {
  const raw = NativeLiftoff.getCheckpoints() as RawCheckpoint[];
  const from = raw.find((c) => c.name === fromMark);
  const to = raw.find((c) => c.name === toMark);
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
  const raw = NativeLiftoff.getCheckpoints() as RawCheckpoint[];
  return {
    checkpoints: raw.map(decorateCheckpoint),
    measurements: [...measurements],
  };
}

export function clear(): void {
  NativeLiftoff.clear();
  measurements.length = 0;
  // anchor is NOT reset — valid for the process lifetime
}
