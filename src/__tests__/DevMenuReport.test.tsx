// @jest/globals must be imported first so `jest` is initialized before any
// import below triggers a mock factory (factories run lazily on first require).
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import { NativeEventEmitter } from 'react-native';

// Inline jest.fn() in factories — never reference outer const/let, they
// would be in the temporal dead zone when the hoisted factory first runs.
jest.mock('../NativeLiftoff', () => ({
  __esModule: true,
  default: {
    mark: jest.fn(),
    getCheckpoints: jest.fn(() => []),
    clear: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

jest.mock('../core', () => ({
  getReport: jest.fn(() => ({ checkpoints: [], measurements: [] })),
  clear: jest.fn(),
}));

// Imports after mocks so the component picks up the mocked modules.
import { DevMenuReport } from '../DevMenuReport';
import * as core from '../core';

// NativeEventEmitter spy — captures the LiftoffShowReport callback.
let capturedListener: (() => void) | null = null;
const mockSubRemove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  capturedListener = null;
  jest
    .mocked(core.getReport)
    .mockReturnValue({ checkpoints: [], measurements: [] });

  jest
    .spyOn(NativeEventEmitter.prototype, 'addListener')
    .mockImplementation((event: string | number | symbol, handler: unknown) => {
      if (event === 'LiftoffShowReport') {
        capturedListener = handler as () => void;
      }
      return { remove: mockSubRemove };
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('DevMenuReport', () => {
  it('renders null when __DEV__ is false', () => {
    const g = globalThis as Record<string, unknown>;
    const orig = g.__DEV__;
    g.__DEV__ = false;
    const { toJSON } = render(<DevMenuReport />);
    expect(toJSON()).toBeNull();
    g.__DEV__ = orig;
  });

  it('shows the modal when the LiftoffShowReport event fires', async () => {
    const { getByTestId } = render(<DevMenuReport />);

    expect(capturedListener).not.toBeNull();
    await act(async () => {
      capturedListener!();
    });

    const modal = getByTestId('liftoff-modal');
    expect(modal.props.visible).toBe(true);
  });

  it('calls clear() and hides the modal when the Clear button is pressed', async () => {
    const { getByTestId, queryByTestId } = render(<DevMenuReport />);

    await act(async () => {
      capturedListener!();
    });

    fireEvent.press(getByTestId('liftoff-clear-btn'));

    expect(jest.mocked(core.clear)).toHaveBeenCalledTimes(1);
    // The jest-preset Modal mock renders null when visible={false}.
    expect(queryByTestId('liftoff-modal')).toBeNull();
  });

  it('removes the event subscription on unmount', () => {
    const { unmount } = render(<DevMenuReport />);
    unmount();
    expect(mockSubRemove).toHaveBeenCalledTimes(1);
  });
});
