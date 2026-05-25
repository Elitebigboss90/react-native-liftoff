import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../NativeLiftoff', () => ({
  __esModule: true,
  default: {
    mark: jest.fn(),
    getCheckpoints: jest.fn(() => []),
    clear: jest.fn(),
  },
}));

import NativeLiftoff from '../NativeLiftoff';
import { mark, measure, getReport, clear } from '../core';
import { createPageScope } from '../page';

const mockMark = jest.mocked(NativeLiftoff.mark);
const mockGetCheckpoints = jest.mocked(NativeLiftoff.getCheckpoints);
const mockClear = jest.mocked(NativeLiftoff.clear);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCheckpoints.mockReturnValue([]);
  clear();
});

describe('mark', () => {
  it('delegates to native with the given name', () => {
    mark('app:start');
    expect(mockMark).toHaveBeenCalledWith('app:start');
  });
});

describe('measure', () => {
  it('returns a measurement with correct durationMs', () => {
    mockGetCheckpoints.mockReturnValue([
      { name: 'start', timestamp: 100 },
      { name: 'end', timestamp: 250 },
    ]);
    const m = measure('boot', 'start', 'end');
    expect(m).toEqual({
      name: 'boot',
      from: 'start',
      to: 'end',
      durationMs: 150,
    });
  });

  it('throws when the from mark is missing', () => {
    mockGetCheckpoints.mockReturnValue([{ name: 'end', timestamp: 250 }]);
    expect(() => measure('boot', 'start', 'end')).toThrow(
      "[liftoff] Mark 'start' not found"
    );
  });

  it('throws when the to mark is missing', () => {
    mockGetCheckpoints.mockReturnValue([{ name: 'start', timestamp: 100 }]);
    expect(() => measure('boot', 'start', 'end')).toThrow(
      "[liftoff] Mark 'end' not found"
    );
  });
});

describe('clear', () => {
  it('calls native clear and empties the measurements list', () => {
    mockGetCheckpoints.mockReturnValue([
      { name: 'a', timestamp: 0 },
      { name: 'b', timestamp: 10 },
    ]);
    measure('ab', 'a', 'b');
    clear();
    expect(mockClear).toHaveBeenCalled();
    expect(getReport().measurements).toEqual([]);
  });
});

describe('getReport', () => {
  it('returns fresh checkpoints alongside stored measurements', () => {
    const checkpoints = [
      { name: 'x', timestamp: 0 },
      { name: 'y', timestamp: 20 },
    ];
    mockGetCheckpoints.mockReturnValue(checkpoints);
    const m = measure('xy', 'x', 'y');
    const report = getReport();
    expect(report.checkpoints).toEqual(checkpoints);
    expect(report.measurements).toEqual([m]);
  });
});

describe('createPageScope', () => {
  it('prefixes mark names with page:<name>:', () => {
    const scope = createPageScope('Home');
    scope.mark('render');
    expect(mockMark).toHaveBeenCalledWith('page:Home:render');
  });

  it('markTTI resolves to page:<name>:tti', () => {
    const scope = createPageScope('Home');
    scope.markTTI();
    expect(mockMark).toHaveBeenCalledWith('page:Home:tti');
  });

  it('measure prefixes name, from, and to', () => {
    mockGetCheckpoints.mockReturnValue([
      { name: 'page:Home:start', timestamp: 0 },
      { name: 'page:Home:end', timestamp: 30 },
    ]);
    const scope = createPageScope('Home');
    const m = scope.measure('load', 'start', 'end');
    expect(m).toEqual({
      name: 'page:Home:load',
      from: 'page:Home:start',
      to: 'page:Home:end',
      durationMs: 30,
    });
  });

  it('getReport filters checkpoints and measurements to the page scope', () => {
    // Seed global list with a cross-scope measurement first.
    mockGetCheckpoints.mockReturnValue([
      { name: 'page:Other:start', timestamp: 0 },
      { name: 'page:Other:end', timestamp: 10 },
    ]);
    measure('page:Other:load', 'page:Other:start', 'page:Other:end');

    // Now provide checkpoints for both pages.
    const mixed = [
      { name: 'page:Home:start', timestamp: 0 },
      { name: 'page:Home:end', timestamp: 40 },
      { name: 'global:init', timestamp: 5 },
      { name: 'page:Other:start', timestamp: 0 },
      { name: 'page:Other:end', timestamp: 10 },
    ];
    mockGetCheckpoints.mockReturnValue(mixed);

    const scope = createPageScope('Home');
    scope.measure('load', 'start', 'end');

    const report = scope.getReport();
    expect(report.checkpoints).toEqual([
      { name: 'page:Home:start', timestamp: 0 },
      { name: 'page:Home:end', timestamp: 40 },
    ]);
    expect(report.measurements).toHaveLength(1);
    expect(report.measurements[0]!.name).toBe('page:Home:load');
  });
});
