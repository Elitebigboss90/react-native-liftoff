import { mark, measure, getReport } from './core';
import type { Measurement, Report } from './types';

export interface PageScope {
  mark(name: string): void;
  markTTI(): void;
  measure(name: string, from: string, to: string): Measurement;
  getReport(): Report;
}

export function createPageScope(pageName: string): PageScope {
  const prefix = `page:${pageName}:`;
  return {
    mark: (name: string) => mark(prefix + name),
    markTTI: () => mark(prefix + 'tti'),
    measure: (name: string, f: string, t: string) =>
      measure(prefix + name, prefix + f, prefix + t),
    getReport: () => {
      const r = getReport();
      return {
        checkpoints: r.checkpoints.filter((c) => c.name.startsWith(prefix)),
        measurements: r.measurements.filter((m) => m.name.startsWith(prefix)),
      };
    },
  };
}
